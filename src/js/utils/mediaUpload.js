import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../config/constants.js';
import { escapeHtml } from './string.js';
import { showToast, showToastProgress, Router, renderProfilePage, renderSettingsPage } from '../legacy/app-legacy.js?v=20260912-team-selector-v6';
import { getProfile, saveProfile } from '../services/profile/profileStorage.js';

export async function uploadToCloudinary(file, maxW, maxH, quality) {
    // Compress image locally, returns a Blob
    const compressedBlob = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(ev) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let w = img.width, hh = img.height;
                if (w > maxW) { hh = hh * (maxW / w); w = maxW; }
                if (hh > maxH) { w = w * (maxH / hh); hh = maxH; }
                canvas.width = Math.round(w);
                canvas.height = Math.round(hh);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // toBlob is async and returns Blob, not dataURL
                canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas toBlob failed'));
                }, 'image/jpeg', quality);
            };
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = ev.target.result;
        };
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(file);
    });

    // Upload Blob to Cloudinary
    const formData = new FormData();
    formData.append('file', compressedBlob, 'upload.jpg');
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const resp = await fetch(uploadUrl, { method: 'POST', body: formData, mode: 'cors', credentials: 'omit' });
    if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error('Cloudinary upload failed: ' + resp.status + ' ' + errText.substring(0,100));
    }
    const data = await resp.json();
    if (!data.secure_url) throw new Error('Cloudinary: no secure_url in response');
    return data.secure_url;
}

// Checks if a URL points to a GIF (by extension or query param).
export function isGifUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.gif') || lower.includes('.gif?') || lower.includes('.gif/');
}

// Applies 'is-gif' class to an <img> inside a given container if the src is a GIF.
export function applyGifClass(container, imgSelector) {
    if (!container) return;
    const img = container.querySelector(imgSelector || 'img');
    if (img && img.src && isGifUrl(img.src)) {
        img.classList.add('is-gif');
    }
}

// Uploads a file/blob to Cloudinary AS-IS, no canvas resize/compression.
// Used for GIFs so the animation survives (canvas would flatten it to 1 frame).
export async function uploadRawToCloudinary(fileOrBlob, filename, resourceType = 'image') {
    const formData = new FormData();
    formData.append('file', fileOrBlob, filename || (resourceType === 'video' ? 'upload.mp4' : 'upload.gif'));
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
    const resp = await fetch(uploadUrl, { method: 'POST', body: formData, mode: 'cors', credentials: 'omit' });
    if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error('Cloudinary upload failed: ' + resp.status + ' ' + errText.substring(0, 180));
    }
    const data = await resp.json();
    if (!data.secure_url) throw new Error('Cloudinary: no secure_url in response');
    return data.secure_url;
}

export const CLOUDINARY_IMAGE_FILE_LIMIT = 10 * 1024 * 1024;
export const LARGE_GIF_CAPTURE_MS = 12000;

// A free Cloudinary environment accepts images/GIFs only up to 10 MB, while
// video uploads have a much larger limit. Capture an oversized animated GIF
// as a browser video without drawing it to a still-image canvas. The GIF's
// frames continue to advance while MediaRecorder records the canvas stream.
export async function convertLargeGifToVideo(file) {
    if (!file || file.size <= CLOUDINARY_IMAGE_FILE_LIMIT) return file;
    if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
        throw new Error('GIF понад 10 МБ потребує браузер із підтримкою відеозапису');
    }

    const objectUrl = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = objectUrl;
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () => reject(new Error('Не вдалося прочитати GIF для конвертації'));
        });

        const maxDimension = 1280;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(2, Math.round((image.naturalWidth || 2) * scale));
        canvas.height = Math.max(2, Math.round((image.naturalHeight || 2) * scale));
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Браузер не підтримує підготовку GIF-відео');

        const mimeType = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
        ].find((type) => MediaRecorder.isTypeSupported(type));
        if (!mimeType) throw new Error('Браузер не підтримує формат відео для великого GIF');

        const stream = canvas.captureStream(30);
        const chunks = [];
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
        const recordingFinished = new Promise((resolve, reject) => {
            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size) chunks.push(event.data);
            };
            recorder.onerror = () => reject(new Error('Не вдалося записати великий GIF як відео'));
            recorder.onstop = () => resolve();
        });

        const drawFrame = () => {
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
        };
        const frameTimer = window.setInterval(drawFrame, 1000 / 30);
        drawFrame();
        recorder.start(250);

        await new Promise((resolve) => window.setTimeout(resolve, LARGE_GIF_CAPTURE_MS));
        window.clearInterval(frameTimer);
        recorder.stop();
        await recordingFinished;
        stream.getTracks().forEach((track) => track.stop());

        const outputType = mimeType.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
        const outputExtension = outputType === 'video/mp4' ? 'mp4' : 'webm';
        const outputBlob = new Blob(chunks, { type: outputType });
        if (!outputBlob.size) throw new Error('Великий GIF не вдалося перетворити у відео');
        return new File([outputBlob], String(file.name || 'upload.gif').replace(/\.gif$/i, `.${outputExtension}`), { type: outputType });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export async function uploadGifToCloudinary(file, filename = 'profile.gif') {
    if (!file || file.size <= CLOUDINARY_IMAGE_FILE_LIMIT) {
        return uploadRawToCloudinary(file, filename, 'image');
    }
    const videoFile = await convertLargeGifToVideo(file);
    return uploadRawToCloudinary(videoFile, videoFile.name || filename.replace(/\.gif$/i, '.webm'), 'video');
}

export async function uploadVideoToCloudinary(file, filename) {
    return uploadRawToCloudinary(file, filename || 'profile-video.mp4', 'video');
}

export function isVideoFile(file) {
    return !!file && (String(file.type || '').startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name || ''));
}

export function isVideoUrl(url) {
    return !!url && (/\/video\/upload\//i.test(url) || /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(url));
}

export function profileMediaTransformStyle(settings) {
    if (!settings || typeof settings !== 'object') return '';
    const numberInRange = (value, fallback, min, max) => {
        const n = Number(value);
        return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
    };
    const zoom = numberInRange(settings.zoom, 1, 1, 3);
    const x = numberInRange(settings.x, 0, -100, 100);
    const y = numberInRange(settings.y, 0, -100, 100);
    const mirrorX = settings.mirrorX ? -1 : 1;
    const mirrorY = settings.mirrorY ? -1 : 1;
    return `transform:translate(${x}%, ${y}%) scale(${(zoom * mirrorX).toFixed(4)}, ${(zoom * mirrorY).toFixed(4)});transform-origin:center center;`;
}

function animatedMediaSources(url) {
    if (!url || typeof url !== 'string') return { mp4: '', webm: '', original: url || '' };
    const cleanUrl = url.split('#')[0];
    const query = url.slice(cleanUrl.length);
    const extensionMatch = cleanUrl.match(/\.(gif|webm|mp4|mov|m4v|ogv)$/i);
    if (!extensionMatch) return { mp4: '', webm: '', original: url };
    const baseUrl = cleanUrl.slice(0, -extensionMatch[0].length);
    const extension = extensionMatch[1].toLowerCase();
    const mp4 = `${baseUrl}.mp4${query}`;
    const webm = `${baseUrl}.webm${query}`;
    return {
        mp4: extension === 'mp4' ? url : mp4,
        webm: extension === 'webm' ? url : webm,
        original: url
    };
}

export function profileMediaMarkup(url, className, alt, settings) {
    if (!url) return '';
    const safeUrl = escapeHtml(url);
    const style = escapeHtml(profileMediaTransformStyle(settings));
    const styleAttr = style ? ` style="${style}"` : '';
    const animated = isVideoUrl(url) || isGifUrl(url);
    if (animated) {
        const sources = animatedMediaSources(url);
        const safeMp4 = escapeHtml(sources.mp4);
        const safeWebm = escapeHtml(sources.webm);
        const safeOriginal = escapeHtml(sources.original);
        const animatedClass = `${className || ''}${className ? ' ' : ''}is-animated-media`;
        const sourceMarkup = `${safeMp4 ? `<source src="${safeMp4}" type="video/mp4">` : ''}${safeWebm && safeWebm !== safeMp4 ? `<source src="${safeWebm}" type="video/webm">` : ''}`;
        return `<video class="${animatedClass}"${styleAttr} autoplay muted loop playsinline webkit-playsinline="true" preload="auto" aria-label="${escapeHtml(alt || '')}">${sourceMarkup}<img src="${safeOriginal}" alt="${escapeHtml(alt || '')}"></video>`;
    }
    return `<img class="${className}" src="${safeUrl}"${styleAttr} alt="${escapeHtml(alt || '')}" loading="lazy">`;
}

// Uploads an already-cropped Blob (from the image editor canvas) to Cloudinary.
export async function uploadBlobToCloudinary(blob, filename) {
    return uploadRawToCloudinary(blob, filename || 'upload.jpg');
}

export function _imgeditClamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export function openImageEditor(file, mode, onSaved, initialBannerFormat = 'narrow') {
    // mode: 'avatar' (1:1 circle) or 'banner' (narrow/wide profile banner)
    const normalizedBannerFormat = mode === 'banner' && initialBannerFormat === 'wide' ? 'wide' : 'narrow';
    const objectUrl = URL.createObjectURL(file);
    const isVideo = isVideoFile(file);
    const isGif = !isVideo && (file.type === 'image/gif' || /\.gif$/i.test(file.name || ''));
    const isAnimated = isVideo || isGif;
    const isPng = !isAnimated && (file.type === 'image/png' || String(file.name || '').toLowerCase().endsWith('.png'));
    const previousBodyOverflow = document.body.style.overflow;
    const overlay = document.createElement('div');
    overlay.className = `imgedit-overlay${mode === 'banner' ? ' imgedit-banner-overlay' : ' imgedit-avatar-overlay'}`;
    document.body.style.overflow = 'hidden';
    overlay.innerHTML = `
        <div class="imgedit-topbar">
            <button class="imgedit-back" id="imgeditBack" title="Скасувати">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button class="imgedit-save" id="imgeditSave">Зберегти</button>
        </div>
        <div class="imgedit-stage" id="imgeditStage">
            ${isVideo ? `<video class="imgedit-img" id="imgeditImg" src="${objectUrl}" muted autoplay loop playsinline preload="metadata"></video>` : `<img class="imgedit-img${isGif ? ' imgedit-animated-gif' : ''}" id="imgeditImg" src="${objectUrl}" alt="">`}
            <div class="imgedit-frame" id="imgeditFrame"></div>
            <div id="imgeditGuides"></div>
        </div>
        ${mode === 'banner' ? `<div class="imgedit-format-row" role="group" aria-label="Формат банера">
            <button class="imgedit-format-btn${normalizedBannerFormat === 'narrow' ? ' active' : ''}" id="imgeditNarrow" aria-pressed="${normalizedBannerFormat === 'narrow'}">Вузький</button>
            <button class="imgedit-format-btn${normalizedBannerFormat === 'wide' ? ' active' : ''}" id="imgeditWide" aria-pressed="${normalizedBannerFormat === 'wide'}">Широкий</button>
        </div>` : ''}
        <div class="imgedit-bottombar">
            <div class="imgedit-tools-row">
                <button class="imgedit-tool-btn" id="imgeditCenterBtn" title="По центру">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
                </button>
                <button class="imgedit-tool-btn" id="imgeditMirrorHBtn" title="Віддзеркалити по горизонталі">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v18"/><path d="M8 6l-3 3 3 3"/><path d="M16 6l3 3-3 3"/><rect x="3" y="15" width="18" height="6" rx="1" opacity="0.3"/></svg>
                </button>
                <button class="imgedit-tool-btn" id="imgeditMirrorVBtn" title="Віддзеркалити по вертикалі">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h18"/><path d="M6 8l3-3 3 3"/><path d="M6 16l3 3 3-3"/><rect x="15" y="3" width="6" height="18" rx="1" opacity="0.3"/></svg>
                </button>
            </div>
            <div class="imgedit-zoom-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15" y2="15"/><line x1="7" y1="10" x2="13" y2="10"/></svg>
                <input type="range" class="imgedit-zoom-slider" id="imgeditZoom" min="100" max="300" value="100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15" y2="15"/><line x1="10" y1="7" x2="10" y2="13"/></svg>
            </div>
            ${mode === 'banner' ? `<div class="imgedit-caption">Виберіть формат банера. Вузький показує банер тонкою смугою, широкий — вищим і з більшою видимою областю.</div>` : `<div class="imgedit-caption">Перемістіть і масштабуйте ${isVideo ? 'відео' : (isGif ? 'GIF' : 'фото')}, щоб обрати область для аватарки.</div>`}
        </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const stage = overlay.querySelector('#imgeditStage');
    const mediaEl = overlay.querySelector('#imgeditImg');
    const frameEl = overlay.querySelector('#imgeditFrame');
    const guidesEl = overlay.querySelector('#imgeditGuides');
    const zoomSlider = overlay.querySelector('#imgeditZoom');
    const saveBtn = overlay.querySelector('#imgeditSave');
    const backBtn = overlay.querySelector('#imgeditBack');
    const centerBtn = overlay.querySelector('#imgeditCenterBtn');
    const mirrorHBtn = overlay.querySelector('#imgeditMirrorHBtn');
    const mirrorVBtn = overlay.querySelector('#imgeditMirrorVBtn');
    const narrowBtn = overlay.querySelector('#imgeditNarrow');
    const wideBtn = overlay.querySelector('#imgeditWide');

    let frameW, frameH, frameX, frameY;
    let natW = 0, natH = 0;
    let baseScale = 1, scale = 1, minScale = 1;
    let tx = 0, ty = 0;
    let mirrorX = false, mirrorY = false;
    let bannerFormat = normalizedBannerFormat;
    let dragging = false, dragStartX = 0, dragStartY = 0, startTx = 0, startTy = 0;

    function layoutFrame() {
        const stageRect = stage.getBoundingClientRect();
        const zoomRatio = minScale > 0 ? scale / minScale : 1;
        if (mode === 'avatar') {
            const size = Math.min(stageRect.width, stageRect.height) * 0.72;
            frameW = size; frameH = size;
        } else {
            frameW = stageRect.width * 0.92;
            const formatRatio = bannerFormat === 'wide' ? (9 / 16) : 0.24;
            frameH = Math.min(stageRect.height * (bannerFormat === 'wide' ? 0.82 : 0.55), frameW * formatRatio);
        }
        frameX = (stageRect.width - frameW) / 2;
        frameY = (stageRect.height - frameH) / 2;
        frameEl.style.width = frameW + 'px';
        frameEl.style.height = frameH + 'px';
        frameEl.style.left = frameX + 'px';
        frameEl.style.top = frameY + 'px';
        frameEl.classList.toggle('circle', mode === 'avatar');

        if (natW && natH && minScale > 0) {
            minScale = Math.max(frameW / natW, frameH / natH);
            scale = minScale * Math.max(1, zoomRatio);
        }

        guidesEl.innerHTML = '';
    }

    function clampPan() {
        const w = natW * scale, h = natH * scale;
        const minTx = frameX + frameW - w, maxTx = frameX;
        const minTy = frameY + frameH - h, maxTy = frameY;
        tx = _imgeditClamp(tx, Math.min(minTx, maxTx), Math.max(minTx, maxTx));
        ty = _imgeditClamp(ty, Math.min(minTy, maxTy), Math.max(minTy, maxTy));
    }

    function applyTransform() {
        const scaledW = natW * scale;
        const scaledH = natH * scale;
        const scaleX = mirrorX ? -1 : 1;
        const scaleY = mirrorY ? -1 : 1;
        const renderTx = mirrorX ? tx + scaledW : tx;
        const renderTy = mirrorY ? ty + scaledH : ty;
        mediaEl.style.transform = `translate(${renderTx}px, ${renderTy}px) scale(${scale * scaleX}, ${scale * scaleY})`;
    }

    function centerImage() {
        const w = natW * scale, h = natH * scale;
        tx = frameX + (frameW - w) / 2;
        ty = frameY + (frameH - h) / 2;
        clampPan();
        applyTransform();
    }

    const handleMediaReady = () => {
        natW = isVideo ? mediaEl.videoWidth : mediaEl.naturalWidth;
        natH = isVideo ? mediaEl.videoHeight : mediaEl.naturalHeight;
        layoutFrame();
        baseScale = Math.max(frameW / natW, frameH / natH);
        minScale = baseScale;
        scale = baseScale;
        mediaEl.style.width = natW + 'px';
        mediaEl.style.height = natH + 'px';
        zoomSlider.value = 100;
        centerImage();
    };
    if (isVideo) {
        mediaEl.addEventListener('loadedmetadata', handleMediaReady, { once: true });
        if (mediaEl.readyState >= 1) handleMediaReady();
    } else mediaEl.onload = handleMediaReady;

    stage.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.imgedit-tool-btn') || e.target === zoomSlider) return;
        dragging = true;
        dragStartX = e.clientX; dragStartY = e.clientY;
        startTx = tx; startTy = ty;
        stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        tx = startTx + (e.clientX - dragStartX);
        ty = startTy + (e.clientY - dragStartY);
        clampPan();
        applyTransform();
    });
    ['pointerup', 'pointercancel'].forEach(ev => stage.addEventListener(ev, () => { dragging = false; }));

    stage.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        const newScale = _imgeditClamp(scale + delta * scale, minScale, minScale * 3);
        scale = newScale;
        zoomSlider.value = Math.round((scale / minScale) * 100);
        clampPan();
        applyTransform();
    }, { passive: false });

    zoomSlider.addEventListener('input', () => {
        scale = minScale * (parseFloat(zoomSlider.value) / 100);
        clampPan();
        applyTransform();
    });

    if (mode === 'banner') {
        const setBannerFormat = (format) => {
            bannerFormat = format === 'wide' ? 'wide' : 'narrow';
            narrowBtn?.classList.toggle('active', bannerFormat === 'narrow');
            wideBtn?.classList.toggle('active', bannerFormat === 'wide');
            narrowBtn?.setAttribute('aria-pressed', String(bannerFormat === 'narrow'));
            wideBtn?.setAttribute('aria-pressed', String(bannerFormat === 'wide'));
            layoutFrame();
            if (natW && natH) centerImage();
        };
        narrowBtn?.addEventListener('click', () => setBannerFormat('narrow'));
        wideBtn?.addEventListener('click', () => setBannerFormat('wide'));
    }

    // Центрування
    centerBtn.addEventListener('click', () => centerImage());

    // Віддзеркалення по горизонталі
    mirrorHBtn.addEventListener('click', () => {
        mirrorX = !mirrorX;
        mirrorHBtn.classList.toggle('active', mirrorX);
        applyTransform();
    });

    // Віддзеркалення по вертикалі
    mirrorVBtn.addEventListener('click', () => {
        mirrorY = !mirrorY;
        mirrorVBtn.classList.toggle('active', mirrorY);
        applyTransform();
    });

    function closeEditor() {
        overlay.classList.remove('open');
        window.removeEventListener('resize', layoutFrame);
        setTimeout(() => {
            overlay.remove();
            URL.revokeObjectURL(objectUrl);
            document.body.style.overflow = previousBodyOverflow;
        }, 200);
    }
    backBtn.addEventListener('click', closeEditor);

    saveBtn.addEventListener('click', () => {
        saveBtn.disabled = true;
        saveBtn.textContent = '...';
        try {
            if (isAnimated) {
                const centeredTx = frameX + (frameW - natW * scale) / 2;
                const centeredTy = frameY + (frameH - natH * scale) / 2;
                const zoom = _imgeditClamp(scale / Math.max(minScale, 0.0001), 1, 3);
                closeEditor();
                onSaved({
                    zoom: Number(zoom.toFixed(4)),
                    x: Number((((tx - centeredTx) / Math.max(frameW, 1)) * 100).toFixed(4)),
                    y: Number((((ty - centeredTy) / Math.max(frameH, 1)) * 100).toFixed(4)),
                    mirrorX: !!mirrorX,
                    mirrorY: !!mirrorY,
                    bannerFormat: mode === 'banner' ? bannerFormat : undefined
                });
                return;
            }
            const outScale = mode === 'avatar' ? (480 / frameW) : (Math.max(1, 1200 / frameW));
            const outW = Math.round(frameW * outScale);
            const outH = Math.round(frameH * outScale);
            const canvas = document.createElement('canvas');
            canvas.width = outW; canvas.height = outH;
            const ctx = canvas.getContext('2d');
            const sx = (frameX - tx) / scale;
            const sy = (frameY - ty) / scale;
            const sW = frameW / scale;
            const sH = frameH / scale;

            ctx.save();
            if (mirrorX) {
                ctx.translate(outW, 0);
                ctx.scale(-1, 1);
            }
            if (mirrorY) {
                ctx.translate(0, outH);
                ctx.scale(1, -1);
            }
            ctx.drawImage(mediaEl, sx, sy, sW, sH, 0, 0, outW, outH);
            ctx.restore();

            const format = isPng ? 'image/png' : 'image/jpeg';
            const quality = isPng ? undefined : 0.88;
            canvas.toBlob(blob => {
                if (!blob) { showToast('Помилка обробки зображення'); saveBtn.disabled = false; saveBtn.textContent = 'Зберегти'; return; }
                closeEditor();
                onSaved(blob, { bannerFormat: mode === 'banner' ? bannerFormat : undefined });
            }, format, quality);
        } catch (err) {
            console.error('Image editor save failed:', err);
            showToast('Помилка кадрування');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Зберегти';
        }
    });

    window.addEventListener('resize', () => {
        layoutFrame();
        if (natW && natH) {
            centerImage();
        }
    });
}

export async function editExistingProfileImage(url, mode) {
    if (!url) return;
    showToast('Підготовка редактора зображення...');
    try {
        const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (!response.ok) throw new Error('Не вдалося завантажити зображення');
        const blob = await response.blob();
        const type = blob.type || 'image/jpeg';
        const extension = type === 'image/png' ? 'png' : 'jpg';
        const file = new File([blob], `${mode}.${extension}`, { type });
        const currentProfile = getProfile();
        openImageEditor(file, mode, async (croppedBlob, editorState) => {
            try {
                showToast(mode === 'avatar' ? 'Збереження аватарки...' : 'Збереження банера...');
                const imageUrl = await uploadBlobToCloudinary(croppedBlob, `${mode}.${extension}`);
                const profile = getProfile();
                if (mode === 'avatar') {
                    profile.avatar = imageUrl;
                    profile.avatarVideo = '';
                    profile.avatarVideoSettings = null;
                } else {
                    profile.banner = imageUrl;
                    profile.bannerVideo = '';
                    profile.bannerVideoSettings = null;
                    profile.bannerFormat = editorState?.bannerFormat === 'wide' ? 'wide' : (profile.bannerFormat === 'wide' ? 'wide' : 'narrow');
                }
                saveProfile(profile);
                if (Router.currentRoute === 'profile') renderProfilePage();
                if (Router.currentRoute === 'settings') renderSettingsPage();
                showToast(mode === 'avatar' ? 'Аватарку оновлено' : 'Банер оновлено');
            } catch (err) {
                console.error('Edited profile image upload error:', err);
                showToast('Не вдалося зберегти відредаговане зображення');
            }
        }, mode === 'banner' ? currentProfile.bannerFormat : 'narrow');
    } catch (err) {
        console.error('Existing profile image editor error:', err);
        showToast('Не вдалося відкрити редактор зображення');
    }
}

export async function editExistingProfileVideo(url, mode) {
    if (!url) return;
    showToast(isGifUrl(url) ? 'Підготовка редактора GIF...' : 'Підготовка редактора відео...');
    try {
        const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (!response.ok) throw new Error('Не вдалося завантажити відео');
        const blob = await response.blob();
        const isGif = String(blob.type || '').toLowerCase() === 'image/gif' || isGifUrl(url);
        const file = new File([blob], `${mode}.${isGif ? 'gif' : 'mp4'}`, { type: isGif ? 'image/gif' : (blob.type || 'video/mp4') });
        const currentProfile = getProfile();
        openImageEditor(file, mode, (settings) => {
            const profile = getProfile();
            const videoKey = mode === 'avatar' ? 'avatarVideo' : 'bannerVideo';
            const imageKey = mode === 'avatar' ? 'avatar' : 'banner';
            if (isGif && !profile[videoKey] && profile[imageKey] === url) {
                profile[videoKey] = url;
                profile[imageKey] = '';
            }
            profile[mode === 'avatar' ? 'avatarVideoSettings' : 'bannerVideoSettings'] = settings;
            if (mode === 'banner') profile.bannerFormat = settings?.bannerFormat === 'wide' ? 'wide' : (currentProfile.bannerFormat === 'wide' ? 'wide' : 'narrow');
            saveProfile(profile);
            if (Router.currentRoute === 'profile') renderProfilePage();
            if (Router.currentRoute === 'settings') renderSettingsPage();
            showToast(isGif ? (mode === 'avatar' ? 'GIF-аватарку оновлено' : 'GIF-банер оновлено') : (mode === 'avatar' ? 'Відео-аватарку оновлено' : 'Відео-банер оновлено'));
        }, mode === 'banner' ? currentProfile.bannerFormat : 'narrow');
    } catch (err) {
        console.error('Existing profile video editor error:', err);
        showToast('Не вдалося відкрити редактор відео');
    }
}

export function compressImage(file, maxW, maxH, quality, callback) {
    const reader = new FileReader();
    reader.onload = function(ev) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let w = img.width, hh = img.height;
            if (w > maxW) { hh = hh * (maxW / w); w = maxW; }
            if (hh > maxH) { w = w * (maxH / hh); hh = maxH; }
            canvas.width = Math.round(w);
            canvas.height = Math.round(hh);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            let result = canvas.toDataURL('image/jpeg', quality);
            if (result.length > 500000) result = canvas.toDataURL('image/jpeg', 0.4);
            if (result.length > 500000) result = canvas.toDataURL('image/jpeg', 0.2);
            callback(result);
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

export async function removeFlatStickerBackground(blob, tolerance = 46) {
    const url = URL.createObjectURL(blob);
    try {
        const image = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
        const maxSide = 900;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const w = canvas.width;
        const h = canvas.height;
        const sample = (x, y) => {
            const i = (y * w + x) * 4;
            return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
        };
        const corners = [sample(0, 0), sample(w - 1, 0), sample(0, h - 1), sample(w - 1, h - 1)];
        if (corners.some(c => c[3] < 20)) return blob;
        const average = corners.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]).map(v => v / corners.length);
        const cornerSpread = Math.max(...corners.map(c => Math.hypot(c[0] - average[0], c[1] - average[1], c[2] - average[2])));
        if (cornerSpread > tolerance * 1.5) return blob;
        const distance = (i) => Math.hypot(pixels[i] - average[0], pixels[i + 1] - average[1], pixels[i + 2] - average[2]);
        const visited = new Uint8Array(w * h);
        const queue = [];
        const enqueue = (x, y) => {
            if (x < 0 || y < 0 || x >= w || y >= h) return;
            const pos = y * w + x;
            if (visited[pos]) return;
            visited[pos] = 1;
            queue.push(pos);
        };
        for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
        for (let y = 1; y < h - 1; y++) { enqueue(0, y); enqueue(w - 1, y); }
        for (let cursor = 0; cursor < queue.length; cursor++) {
            const pos = queue[cursor];
            const i = pos * 4;
            if (distance(i) > tolerance || pixels[i + 3] < 20) continue;
            const edge = Math.max(0, Math.min(1, (tolerance - distance(i)) / 18));
            pixels[i + 3] = Math.round(pixels[i + 3] * edge);
            const x = pos % w;
            const y = Math.floor(pos / w);
            enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1);
        }
        ctx.putImageData(imageData, 0, 0);
        return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    } finally {
        URL.revokeObjectURL(url);
    }
}

export let stickerBackgroundRemoverPromise = null;
export async function removeStickerBackground(blob) {
    try {
        if (!stickerBackgroundRemoverPromise) {
            stickerBackgroundRemoverPromise = import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm')
                .then(module => module.default || module.removeBackground || module);
        }
        const removeBackground = await stickerBackgroundRemoverPromise;
        if (typeof removeBackground !== 'function') throw new Error('AI background remover недоступний');
        const config = {
            model: 'isnet_fp16',
            device: 'cpu',
            output: { format: 'image/png', type: 'foreground' }
        };
        const statusMessages = [
            'AI готує модель… це може зайняти до 1 хвилини',
            'AI аналізує об’єкт…',
            'AI вирізає фон…',
            'AI створює прозорий PNG…'
        ];
        let statusIndex = 0;
        showToastProgress(statusMessages[statusIndex]);
        const statusTimer = setInterval(() => {
            statusIndex = (statusIndex + 1) % statusMessages.length;
            showToastProgress(statusMessages[statusIndex]);
        }, 3200);
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('AI-обробка перевищила 2 хвилини')), 120000));
        let result;
        try {
            result = await Promise.race([removeBackground(blob, config), timeout]);
        } finally {
            clearInterval(statusTimer);
        }
        if (!(result instanceof Blob) || result.size < 100) throw new Error('AI не повернув прозорий PNG');
        showToastProgress('AI фон видалено — зберігаю результат…');
        return result;
    } catch (error) {
        console.error('AI background removal failed:', error);
        stickerBackgroundRemoverPromise = null;
        throw error;
    }
}
