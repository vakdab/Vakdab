/*
 * Anime4K-WebGPU integration for VakDab.
 * Upstream project: https://github.com/Anime4KWebBoost/Anime4K-WebGPU
 * The package is loaded lazily so browsers without WebGPU never pay the cost.
 */

const ANIME4K_CDN = 'https://cdn.jsdelivr.net/npm/anime4k-webgpu@1.0.0/lib/index.js';
let anime4kModulePromise = null;

function loadAnime4KModule() {
    if (globalThis['anime4k-webgpu']) return Promise.resolve(globalThis['anime4k-webgpu']);
    if (anime4kModulePromise) return anime4kModulePromise;
    anime4kModulePromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-vakdab-anime4k]');
        if (existing) {
            existing.addEventListener('load', () => resolve(globalThis['anime4k-webgpu']), { once: true });
            existing.addEventListener('error', reject, { once: true });
            return;
        }
        const script = document.createElement('script');
        script.src = ANIME4K_CDN;
        script.async = true;
        script.dataset.vakdabAnime4k = '1';
        script.onload = () => {
            const module = globalThis['anime4k-webgpu'];
            if (module) resolve(module);
            else reject(new Error('Anime4K module did not expose a global API'));
        };
        script.onerror = () => reject(new Error('Anime4K module failed to load'));
        document.head.appendChild(script);
    });
    return anime4kModulePromise;
}

const FULLSCREEN_SHADER = `
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@vertex
fn vertexMain(@builtin(vertex_index) index: u32) -> VertexOutput {
    var positions = array<vec2f, 6>(
        vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
        vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
    );
    var uvs = array<vec2f, 6>(
        vec2f(0.0, 1.0), vec2f(1.0, 1.0), vec2f(0.0, 0.0),
        vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(1.0, 0.0)
    );
    var output: VertexOutput;
    output.position = vec4f(positions[index], 0.0, 1.0);
    output.uv = uvs[index];
    return output;
}

@group(0) @binding(0) var frameSampler: sampler;
@group(0) @binding(1) var frameTexture: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    return textureSample(frameTexture, frameSampler, input.uv);
}
`;

export class Anime4KWebGPUBridge {
    constructor(video, host) {
        this.video = video;
        this.host = host;
        this.canvas = null;
        this.device = null;
        this.active = false;
        this.started = false;
        this.frameHandle = null;
        this.rafHandle = null;
        this.inputTexture = null;
        this.pipelines = [];
        this._frameCount = 0;
        this._frameTimeTotal = 0;
    }

    static isSupported() {
        return Boolean(globalThis.navigator?.gpu && globalThis.GPUTextureUsage);
    }

    _fallback() {
        this.stop();
        return false;
    }

    _targetDimensions() {
        const sourceWidth = this.video.videoWidth;
        const sourceHeight = this.video.videoHeight;
        const rect = this.host.getBoundingClientRect();
        const dpr = Math.min(globalThis.devicePixelRatio || 1, 1.5);
        const displayWidth = Math.max(1, Math.round(rect.width * dpr));
        const displayHeight = Math.max(1, Math.round(displayWidth * sourceHeight / sourceWidth));
        const scale = Math.max(1, displayWidth / sourceWidth, displayHeight / sourceHeight);
        const maxPixels = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ? 1920 * 1080 : 2560 * 1440;
        const limitedScale = Math.min(scale, Math.sqrt(maxPixels / (sourceWidth * sourceHeight)) || 1);
        return {
            width: Math.max(1, Math.round(sourceWidth * limitedScale)),
            height: Math.max(1, Math.round(sourceHeight * limitedScale)),
        };
    }

    _makeCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.className = 'lp-anime4k-canvas';
        canvas.width = width;
        canvas.height = height;
        canvas.setAttribute('aria-hidden', 'true');
        this.host.appendChild(canvas);
        this.canvas = canvas;
        return canvas;
    }

    async start() {
        if (this.started || !Anime4KWebGPUBridge.isSupported()) return false;
        if (!this.video || !this.host || !this.video.videoWidth || !this.video.videoHeight) return false;
        this.started = true;
        try {
            const api = await loadAnime4KModule();
            if (!this.started) return false;
            const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
            if (!this.started || !adapter) return this._fallback();
            this.device = await adapter.requestDevice();
            if (!this.started) return this._fallback();
            this.device.lost.then(() => { if (this.started) this._fallback(); }).catch(() => {});

            const native = { width: this.video.videoWidth, height: this.video.videoHeight };
            const target = this._targetDimensions();
            const canvas = this._makeCanvas(target.width, target.height);
            const context = canvas.getContext('webgpu');
            if (!context) return this._fallback();
            const format = navigator.gpu.getPreferredCanvasFormat();
            context.configure({ device: this.device, format, alphaMode: 'premultiplied' });

            this.inputTexture = this.device.createTexture({
                size: [native.width, native.height, 1],
                format: 'rgba16float',
                usage: GPUTextureUsage.TEXTURE_BINDING
                    | GPUTextureUsage.COPY_DST
                    | GPUTextureUsage.RENDER_ATTACHMENT,
            });
            // ModeB uses the lighter CNNSoft restore path on mobile; desktop can
            // afford ModeA's stronger restore while remaining real-time oriented.
            const Preset = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')
                ? api.ModeB
                : api.ModeA;
            const preset = new Preset({
                device: this.device,
                inputTexture: this.inputTexture,
                nativeDimensions: native,
                targetDimensions: target,
            });
            this.pipelines = [preset];

            const bindLayout = this.device.createBindGroupLayout({
                entries: [
                    { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
                    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
                ],
            });
            const renderPipeline = this.device.createRenderPipeline({
                layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindLayout] }),
                vertex: { module: this.device.createShaderModule({ code: FULLSCREEN_SHADER }), entryPoint: 'vertexMain' },
                fragment: { module: this.device.createShaderModule({ code: FULLSCREEN_SHADER }), entryPoint: 'fragmentMain', targets: [{ format }] },
                primitive: { topology: 'triangle-list' },
            });
            const bindGroup = this.device.createBindGroup({
                layout: bindLayout,
                entries: [
                    { binding: 0, resource: this.device.createSampler({ magFilter: 'linear', minFilter: 'linear' }) },
                    { binding: 1, resource: preset.getOutputTexture().createView() },
                ],
            });

            this.active = true;
            this.video.style.visibility = 'hidden';
            canvas.classList.add('is-ready');
            const frame = () => {
                if (!this.active || !this.device || !this.canvas) return;
                try {
                    const frameStart = performance.now();
                    if (!this.video.paused && this.video.readyState >= 2) {
                        this.device.queue.copyExternalImageToTexture(
                            { source: this.video }, { texture: this.inputTexture }, [native.width, native.height],
                        );
                    }
                    const encoder = this.device.createCommandEncoder();
                    this.pipelines.forEach(pipeline => pipeline.pass(encoder));
                    const pass = encoder.beginRenderPass({
                        colorAttachments: [{
                            view: context.getCurrentTexture().createView(),
                            clearValue: { r: 0, g: 0, b: 0, a: 1 },
                            loadOp: 'clear', storeOp: 'store',
                        }],
                    });
                    pass.setPipeline(renderPipeline);
                    pass.setBindGroup(0, bindGroup);
                    pass.draw(6);
                    pass.end();
                    this.device.queue.submit([encoder.finish()]);
                    const frameCost = performance.now() - frameStart;
                    this._frameCount += 1;
                    this._frameTimeTotal += frameCost;
                    // If the GPU cannot sustain a safe cadence, return silently
                    // to the normal video instead of making playback stutter.
                    if (this._frameCount >= 30 && this._frameTimeTotal / this._frameCount > 55) {
                        this._fallback();
                        return;
                    }
                } catch (error) {
                    console.warn('[VakDab] Anime4K fallback:', error);
                    this._fallback();
                    return;
                }
                if (typeof this.video.requestVideoFrameCallback === 'function') {
                    this.frameHandle = this.video.requestVideoFrameCallback(frame);
                } else {
                    this.rafHandle = requestAnimationFrame(frame);
                }
            };
            frame();
            return true;
        } catch (error) {
            console.warn('[VakDab] Anime4K unavailable, using normal video:', error);
            return this._fallback();
        }
    }

    stop() {
        this.active = false;
        this.started = false;
        if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
        this.rafHandle = null;
        if (this.device?.destroy) this.device.destroy();
        this.device = null;
        this.pipelines = [];
        this._frameCount = 0;
        this._frameTimeTotal = 0;
        this.inputTexture = null;
        if (this.canvas) this.canvas.remove();
        this.canvas = null;
        if (this.video) this.video.style.visibility = '';
    }
}
