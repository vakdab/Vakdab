const LIVE_API_URL = 'https://vakdab.animegran8.workers.dev/api/live';
const LIVE_VIDEO_PROXY_URL = 'https://monoanime.animegran8.workers.dev';
const REFRESH_MS = 15000;
const videoResolutionCache = new Map();

let refreshTimer = null;
let countdownTimer = null;
let latestState = null;

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function formatRemaining(target) {
    const ms = Math.max(0, Number(target || 0) - Date.now());
    const total = Math.floor(ms / 1000);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return hours ? `${hours} год ${String(minutes).padStart(2, '0')} хв` : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function statusLabel(status) {
    return ({ draft: 'Налаштування', ready: 'Готово до запуску', running: 'Ефір триває', finished: 'Стрім завершено' })[status] || 'Live';
}

async function resolveLiveVideoSource(source) {
    const value = String(source || '').trim();
    if (!value) return '';
    if (/\.(?:m3u8|mp4)(?:[?#].*)?$/i.test(value) || /[?&]url=[^&]*(?:m3u8|mp4)/i.test(value)) {
        return value.startsWith(LIVE_VIDEO_PROXY_URL) ? value : `${LIVE_VIDEO_PROXY_URL}?url=${encodeURIComponent(value)}&force_ua=mobile`;
    }
    if (videoResolutionCache.has(value)) return videoResolutionCache.get(value);
    try {
        const response = await fetch(`${LIVE_VIDEO_PROXY_URL}?url=${encodeURIComponent(value)}&force_ua=mobile`, { cache: 'no-store', headers: { accept: 'text/html,application/xhtml+xml' } });
        if (!response.ok) throw new Error(`LIVE_SOURCE_HTTP_${response.status}`);
        const html = String(await response.text()).replace(/\\u002F/g, '/').replace(/\\\//g, '/');
        const manifest = (html.match(/https?:\/\/[^"'<>\s]+\.m3u8(?:\?[^"'<>\s]*)?/i) || [])[0] || '';
        const resolved = manifest ? `${LIVE_VIDEO_PROXY_URL}?url=${encodeURIComponent(manifest)}&force_ua=mobile` : '';
        videoResolutionCache.set(value, resolved);
        return resolved;
    } catch (error) {
        console.warn('[VakDab] live source resolution failed:', error);
        videoResolutionCache.set(value, '');
        return '';
    }
}

function renderOptions(poll) {
    const options = Array.isArray(poll?.options) ? poll.options : [];
    const total = options.reduce((sum, item) => sum + Number(item.votes || 0), 0);
    if (!options.length) return '<p class="live-empty">Варіанти ще формуються…</p>';
    return `<div class="live-poll-options">${options.map(item => {
        const votes = Number(item.votes || 0);
        const percent = total ? Math.round(votes / total * 100) : 0;
        return `<div class="live-poll-option"><div class="live-poll-option__head"><span>${escapeHtml(item.label)}</span><strong>${votes} · ${percent}%</strong></div><div class="live-poll-option__bar"><span style="width:${percent}%"></span></div></div>`;
    }).join('')}</div>`;
}

function renderIdle(host) {
    host.innerHTML = `<section class="live-stream-card live-stream-card--idle" aria-labelledby="liveStreamTitle"><div class="live-stream-card__header"><div><span class="live-kicker">LIVE VAKDAB</span><h2 id="liveStreamTitle">Спільний перегляд</h2></div><span class="live-status">Очікування</span></div><p class="live-stream-card__hint">Власник VakDab налаштує аніме, серії та озвучку в Telegram, після чого запустить ефір.</p></section>`;
}

function episodeLabel(state) {
    const start = Number(state.episodeStart || 0);
    const end = Number(state.episodeEnd || 0);
    const count = Number(state.episodeCount || 0);
    if (start && end) return `Серії ${start}–${end}${count ? ` (${count} ${count === 1 ? 'серія' : 'серій'})` : ''}`;
    if (state.isMovie) return 'Фільм';
    return count ? `${count} ${count === 1 ? 'серія' : 'серій'}` : 'Серії ще не вибрані';
}

function renderVideoStage(state) {
    const videoUrl = String(state.videoUrl || '');
    if (!state.animeUrl && !videoUrl) {
        return `<div class="live-video-stage live-video-stage--missing"><div class="live-video-stage__missing">Відео трансляції готується…</div><div class="live-video-stage__live"><i></i>LIVE</div></div>`;
    }
    const poster = escapeHtml(state.poster || '');
    const directVideo = /\.(?:m3u8|mp4)(?:[?#].*)?$/i.test(videoUrl) || /[?&]url=[^&]*(?:m3u8|mp4)/i.test(videoUrl);
    const media = directVideo
        ? `<video id="liveVideoElement" class="live-video-stage__video" autoplay muted playsinline preload="auto"${poster ? ` poster="${poster}"` : ''} src="${escapeHtml(videoUrl)}"></video>`
        : `<div class="live-video-stage__connecting"${poster ? ` style="background-image:linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.82)),url('${poster}')"` : ''}>Підключення до трансляції…</div>`;
    return `<div class="live-video-stage${directVideo ? ' live-video-stage--direct' : ''}">${media}<div class="live-video-stage__live"><i></i>${state.status === 'running' ? 'LIVE' : 'ПРЕВʼЮ'}</div><div class="live-video-stage__caption"><strong>${escapeHtml(state.animeTitle)}</strong><span>${escapeHtml(episodeLabel(state))} · ${escapeHtml(state.dub || 'Озвучка не вказана')}</span></div></div>`;
}

function renderState(host, state) {
    latestState = state;
    const previousVideo = host.querySelector('#liveVideoElement');
    const previousSource = previousVideo?.getAttribute('src') || previousVideo?.currentSrc || '';
    const previousWasPlaying = Boolean(previousVideo && !previousVideo.paused);
    if (!state || state.status === 'idle') return renderIdle(host);
    const isRunning = state.status === 'running';
    const hasWatch = Boolean(state.animeUrl);
    const telegramBaseUrl = String(state.telegramUrl || 'https://t.me/vakdabprobot').trim();
    const telegramLiveUrl = `${telegramBaseUrl}${telegramBaseUrl.includes('?') ? '&' : '?'}startapp=live`;
    const expandLink = (isRunning || hasWatch) ? `<a class="live-action live-action--primary" data-live-expand href="${escapeHtml(telegramLiveUrl)}">Розгорнути</a>` : '';
    const videoStage = (isRunning || hasWatch) ? renderVideoStage(state) : '';
    const countdownTarget = isRunning ? state.endsAt : state.startsAt;
    const countdownLine = countdownTarget ? `<div class="live-stream-card__meta"><span>${isRunning ? 'До завершення' : 'До старту'}: <span class="live-countdown" data-live-countdown="${countdownTarget}">${formatRemaining(countdownTarget)}</span></span></div>` : '';
    host.innerHTML = `<section class="live-stream-card live-stream-card--compact${isRunning ? ' is-running' : ''}" aria-label="Поточний Anime Live ефір">${videoStage}${countdownLine}<div class="live-stream-card__actions">${expandLink}</div></section>`;
    const renderedVideo = host.querySelector('#liveVideoElement');
    const sameSource = Boolean(renderedVideo && previousVideo && previousSource && previousSource === renderedVideo.getAttribute('src'));
    if (sameSource) renderedVideo.replaceWith(previousVideo);
    const liveVideo = host.querySelector('#liveVideoElement');
    if (liveVideo && liveVideo !== previousVideo) {
        const startVideo = () => liveVideo.play().catch(error => console.warn('[VakDab] autoplay blocked:', error));
        liveVideo.addEventListener('loadedmetadata', startVideo, { once: true });
        liveVideo.addEventListener('canplay', startVideo, { once: true });
        startVideo();
    } else if (liveVideo && previousWasPlaying && liveVideo.paused) {
        liveVideo.play().catch(error => console.warn('[VakDab] autoplay resume blocked:', error));
    }
}


export async function loadLiveState() {
    const response = await fetch(LIVE_API_URL, { cache: 'no-store', headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`LIVE_HTTP_${response.status}`);
    const payload = await response.json();
    const liveState = payload?.live || payload;
    if (liveState?.videoUrl) {
        const resolvedVideo = await resolveLiveVideoSource(liveState.videoUrl);
        if (resolvedVideo) liveState.videoUrl = resolvedVideo;
    }
    return liveState;
}

function tickCountdown(host) {
    host.querySelectorAll('[data-live-countdown]').forEach(element => {
        element.textContent = formatRemaining(element.dataset.liveCountdown);
    });
}

async function refreshLiveStream(host) {
    try {
        renderState(host, await loadLiveState());
    } catch (error) {
        console.warn('[VakDab] live stream state unavailable:', error);
        if (!latestState) renderIdle(host);
    }
}

export function initLiveStream() {
    const host = document.getElementById('liveStreamContainer');
    if (!host || host.dataset.liveInitialized === 'true') return;
    host.dataset.liveInitialized = 'true';
    refreshLiveStream(host);
    refreshTimer = window.setInterval(() => refreshLiveStream(host), REFRESH_MS);
    countdownTimer = window.setInterval(() => tickCountdown(host), 1000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') refreshLiveStream(host);
    }, { passive: true });
    window.addEventListener('beforeunload', () => {
        if (refreshTimer) clearInterval(refreshTimer);
        if (countdownTimer) clearInterval(countdownTimer);
    }, { once: true });
}
