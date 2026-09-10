/*
 * Real Anime4K-WebGPU bridge for VakDab.
 * The source video is copied into a GPU texture, passed through an upstream
 * Anime4K preset, and only the preset output texture is rendered to canvas.
 * Any capability/runtime failure is deliberately fail-open: the HTML video
 * remains visible and playback continues normally.
 */

const ANIME4K_CDN = 'https://cdn.jsdelivr.net/npm/anime4k-webgpu@1.0.0/lib/index.js';
let anime4kModulePromise = null;

function loadAnime4KModule() {
    if (globalThis['anime4k-webgpu']) return Promise.resolve(globalThis['anime4k-webgpu']);
    if (anime4kModulePromise) return anime4kModulePromise;
    anime4kModulePromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-vakdab-anime4k]');
        const finish = () => {
            const module = globalThis['anime4k-webgpu'];
            if (module) resolve(module);
            else reject(new Error('Anime4K module did not expose a global API'));
        };
        if (existing) {
            existing.addEventListener('load', finish, { once: true });
            existing.addEventListener('error', reject, { once: true });
            if (globalThis['anime4k-webgpu']) finish();
            return;
        }
        const script = document.createElement('script');
        script.src = ANIME4K_CDN;
        script.async = true;
        script.dataset.vakdabAnime4k = '1';
        script.onload = finish;
        script.onerror = () => reject(new Error('Anime4K module failed to load'));
        document.head.appendChild(script);
    });
    return anime4kModulePromise;
}

const FULLSCREEN_SHADER = `
struct VertexOutput { @builtin(position) position: vec4f, @location(0) uv: vec2f, };
@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> VertexOutput {
    var positions = array<vec2f, 6>(vec2f(-1.0,-1.0),vec2f(1.0,-1.0),vec2f(-1.0,1.0),vec2f(-1.0,1.0),vec2f(1.0,-1.0),vec2f(1.0,1.0));
    var uvs = array<vec2f, 6>(vec2f(0.0,1.0),vec2f(1.0,1.0),vec2f(0.0,0.0),vec2f(0.0,0.0),vec2f(1.0,1.0),vec2f(1.0,0.0));
    var output: VertexOutput; output.position = vec4f(positions[index],0.0,1.0); output.uv = uvs[index]; return output;
}
@group(0) @binding(0) var frameSampler: sampler;
@group(0) @binding(1) var frameTexture: texture_2d<f32>;
@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f { return textureSample(frameTexture, frameSampler, input.uv); }
`;

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(globalThis.navigator?.userAgent || '');

export class Anime4KWebGPUBridge {
    constructor(video, host) {
        this.video = video;
        this.host = host;
        this.canvas = null;
        this.context = null;
        this.device = null;
        this.active = false;
        this.started = false;
        this.frameHandle = null;
        this.rafHandle = null;
        this.inputTexture = null;
        this.pipeline = null;
        this.renderPipeline = null;
        this.bindGroup = null;
        this._frameCount = 0;
        this._frameTimeTotal = 0;
        this._firstFramePresented = false;
        this._onPlay = () => this._queueNextFrame();
        this._onVisibility = () => { if (!document.hidden) this._queueNextFrame(); };
    }

    static isSupported() {
        return Boolean(globalThis.navigator?.gpu && globalThis.GPUTextureUsage && globalThis.GPUShaderStage);
    }

    _targetDimensions() {
        const sourceWidth = this.video.videoWidth;
        const sourceHeight = this.video.videoHeight;
        const rect = this.host.getBoundingClientRect();
        const dpr = Math.min(globalThis.devicePixelRatio || 1, 1.5);
        const displayWidth = Math.max(1, Math.round(rect.width * dpr));
        const displayHeight = Math.max(1, Math.round(displayWidth * sourceHeight / sourceWidth));
        const scale = Math.max(1, displayWidth / sourceWidth, displayHeight / sourceHeight);
        const maxPixels = isMobile() ? 1920 * 1080 : 2560 * 1440;
        const limitedScale = Math.min(scale, Math.sqrt(maxPixels / (sourceWidth * sourceHeight)) || 1);
        return { width: Math.max(1, Math.round(sourceWidth * limitedScale)), height: Math.max(1, Math.round(sourceHeight * limitedScale)) };
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

    _scheduleFallbackFrame() {
        if (!this.active || this.video.paused || document.hidden || this.rafHandle) return;
        this.rafHandle = requestAnimationFrame(() => {
            this.rafHandle = null;
            this._renderFrame();
            if (this.active && !this.video.paused && !document.hidden && typeof this.video.requestVideoFrameCallback !== 'function') {
                this._scheduleFallbackFrame();
            }
        });
    }

    _queueNextFrame() {
        if (!this.active || this.video.paused || document.hidden) return;
        if (typeof this.video.requestVideoFrameCallback === 'function') {
            this.frameHandle = this.video.requestVideoFrameCallback(() => {
                this.frameHandle = null;
                this._renderFrame();
                this._queueNextFrame();
            });
        } else this._scheduleFallbackFrame();
    }

    _renderFrame() {
        if (!this.active || !this.device || !this.canvas || this.video.paused || document.hidden || this.video.readyState < 2) return false;
        try {
            const startedAt = performance.now();
            this.device.queue.copyExternalImageToTexture(
                { source: this.video },
                { texture: this.inputTexture },
                [this.video.videoWidth, this.video.videoHeight],
            );
            const encoder = this.device.createCommandEncoder();
            this.pipeline.pass(encoder);
            const pass = encoder.beginRenderPass({ colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: 'clear', storeOp: 'store',
            }] });
            pass.setPipeline(this.renderPipeline);
            pass.setBindGroup(0, this.bindGroup);
            pass.draw(6);
            pass.end();
            this.device.queue.submit([encoder.finish()]);
            this._frameCount += 1;
            this._frameTimeTotal += performance.now() - startedAt;
            if (!this._firstFramePresented) {
                this._firstFramePresented = true;
                this.video.style.visibility = 'hidden';
                this.canvas.classList.add('is-ready');
            }
            // Fail open before this enhancement can make playback visibly stutter.
            if (this._frameCount >= 30 && this._frameTimeTotal / this._frameCount > 55) {
                this._fallback();
                return false;
            }
            return true;
        } catch (error) {
            console.warn('[VakDab] Anime4K frame fallback:', error);
            this._fallback();
            return false;
        }
    }

    async start() {
        if (this.started || !Anime4KWebGPUBridge.isSupported()) return false;
        if (!this.video || !this.host || this.video.readyState < 1 || !this.video.videoWidth || !this.video.videoHeight) return false;
        this.started = true;
        this.video.addEventListener('play', this._onPlay, { passive: true });
        document.addEventListener('visibilitychange', this._onVisibility, { passive: true });
        try {
            const api = await loadAnime4KModule();
            if (!this.started) return false;
            const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
            if (!adapter) return this._fallback();
            this.device = await adapter.requestDevice();
            if (!this.started) return this._fallback();
            this.device.lost.then(() => { if (this.started) this._fallback(); }).catch(() => {});

            const native = { width: this.video.videoWidth, height: this.video.videoHeight };
            const target = this._targetDimensions();
            const canvas = this._makeCanvas(target.width, target.height);
            this.context = canvas.getContext('webgpu');
            if (!this.context) return this._fallback();
            const format = navigator.gpu.getPreferredCanvasFormat();
            this.context.configure({ device: this.device, format, alphaMode: 'premultiplied' });
            this.inputTexture = this.device.createTexture({
                size: [native.width, native.height, 1], format: 'rgba16float',
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            });
            const Preset = isMobile() ? api.ModeB : api.ModeA;
            if (typeof Preset !== 'function') throw new Error('Anime4K preset unavailable');
            this.pipeline = new Preset({ device: this.device, inputTexture: this.inputTexture, nativeDimensions: native, targetDimensions: target });

            const layout = this.device.createBindGroupLayout({ entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
            ] });
            const shader = this.device.createShaderModule({ code: FULLSCREEN_SHADER });
            this.renderPipeline = this.device.createRenderPipeline({
                layout: this.device.createPipelineLayout({ bindGroupLayouts: [layout] }),
                vertex: { module: shader, entryPoint: 'vertexMain' },
                fragment: { module: shader, entryPoint: 'fragmentMain', targets: [{ format }] },
                primitive: { topology: 'triangle-list' },
            });
            this.bindGroup = this.device.createBindGroup({ layout, entries: [
                { binding: 0, resource: this.device.createSampler({ magFilter: 'linear', minFilter: 'linear' }) },
                { binding: 1, resource: this.pipeline.getOutputTexture().createView() },
            ] });
            this.active = true;
            // Do not hide video until a real processed frame has reached canvas.
            this._queueNextFrame();
            return true;
        } catch (error) {
            console.warn('[VakDab] Anime4K unavailable, using normal video:', error);
            return this._fallback();
        }
    }

    _fallback() {
        this.stop();
        return false;
    }

    stop() {
        this.active = false;
        this.started = false;
        this.video?.removeEventListener('play', this._onPlay);
        document.removeEventListener('visibilitychange', this._onVisibility);
        if (this.frameHandle != null && this.video?.cancelVideoFrameCallback) {
            try { this.video.cancelVideoFrameCallback(this.frameHandle); } catch (_) { /* ignore */ }
        }
        if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
        this.frameHandle = null;
        this.rafHandle = null;
        try { this.device?.destroy?.(); } catch (_) { /* ignore */ }
        this.device = null;
        this.context = null;
        this.pipeline = null;
        this.renderPipeline = null;
        this.bindGroup = null;
        this.inputTexture = null;
        if (this.canvas) this.canvas.remove();
        this.canvas = null;
        if (this.video) this.video.style.visibility = '';
        this._firstFramePresented = false;
        this._frameCount = 0;
        this._frameTimeTotal = 0;
    }
}
