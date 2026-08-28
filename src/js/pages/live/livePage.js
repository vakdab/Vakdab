import { loadLiveState } from '../../components/live/liveStream.js?v=20260827-live-screen-v2';

let refreshTimer = null;
let countdownTimer = null;
let hlsInstance = null;
let currentSource = '';

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function episodeLabel(state) {
    const start = Number(state?.episodeStart || 0);
    const end = Number(state?.episodeEnd || 0);
    const count = Number(state?.episodeCount || 0);
    if (start && end) return `Серії ${start}–${end}${count ? ` · ${count} ${count === 1 ? 'серія' : 'серій'}` : ''}`;
    if (state?.isMovie) return 'Фільм';
    return count ? `${count} ${count === 1 ? 'серія' : 'серій'}` : 'Серії ще не вибрані';
}

function formatRemaining(target) {
    const total = Math.max(0, Math.floor((Number(target || 0) - Date.now()) / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return hours ? `${hours} год ${String(minutes).padStart(2, '0')} хв` : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function statusLabel(status) {
    return ({ running: 'Ефір триває', ready: 'Готово до старту', draft: 'Налаштування', finished: 'Ефір завершено' })[status] || 'Live';
}

function stopVideo() {
    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }
    currentSource = '';
}

function mountVideo(video, source) {
    stopVideo();
    currentSource = source;
    if (!source) return;
    if (window.Hls?.isSupported?.() && /\.m3u8(?:[?#]|$)/i.test(source)) {
        hlsInstance = new window.Hls({ enableWorker: true, lowLatencyMode: true });
        hlsInstance.loadSource(source);
        hlsInstance.attachMedia(video);
        hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    } else {
        video.src = source;
        video.play().catch(() => {});
    }
}

function renderLoading(container) {
    container.innerHTML = '<section class="anime-live-page anime-live-page--loading"><div class="anime-live-loading">Підключення до Anime Live…</div></section>';
}

function renderIdle(container) {
    stopVideo();
    container.innerHTML = `<section class="anime-live-page anime-live-page--empty"><div class="anime-live-topbar"><button type="button" class="anime-live-back" data-live-back aria-label="На головну">←</button><div><span class="anime-live-kicker">VAKDAB LIVE</span><h1>Аніме Ефір</h1></div></div><div class="anime-live-empty-card"><span class="anime-live-empty-icon">●</span><h2>Ефір зараз не запущено</h2><p>Власник VakDab налаштує наступну трансляцію в Telegram.</p><button type="button" class="anime-live-primary" data-live-back>На головну</button></div></section>`;
    bindBackButtons(container);
}

function renderPage(container, state) {
    stopVideo();
    const poster = escapeHtml(state.poster || '');
    const rawSource = String(state.videoUrl || '');
    const source = /\.(?:m3u8|mp4)(?:[?#].*)?$/i.test(rawSource) || /[?&]url=[^&]*(?:m3u8|mp4)/i.test(rawSource) ? rawSource : '';
    const countdownTarget = state.status === 'running' ? state.endsAt : state.startsAt;
    container.innerHTML = `<section class="anime-live-page${state.status === 'running' ? ' is-running' : ''}" aria-labelledby="animeLiveTitle">
        <div class="anime-live-topbar">
            <button type="button" class="anime-live-back" data-live-back aria-label="На головну">←</button>
            <div><span class="anime-live-kicker">VAKDAB LIVE</span><h1 id="animeLiveTitle">Аніме Ефір</h1></div>
            <span class="anime-live-status"><i></i>${escapeHtml(statusLabel(state.status))}</span>
        </div>
        <div class="anime-live-layout">
            <main class="anime-live-main">
                <div class="anime-live-video-wrap">
                    ${source ? `<video id="animeLiveVideo" class="anime-live-video" autoplay muted playsinline preload="auto"${poster ? ` poster="${poster}"` : ''}></video>` : '<div class="anime-live-video-missing">Відео трансляції готується…</div>'}
                    <div class="anime-live-live-badge"><i></i> LIVE</div>
                    <div class="anime-live-video-caption"><strong data-live-title>${escapeHtml(state.animeTitle || 'VakDab')}</strong><span data-live-episode>${escapeHtml(episodeLabel(state))} · ${escapeHtml(state.dub || 'Озвучка')}</span></div>
                </div>
                <section class="anime-live-info-card">
                    <div class="anime-live-info-heading"><div><span class="anime-live-kicker">ЗАРАЗ В ЕФІРІ</span><h2 data-live-info-title>${escapeHtml(state.animeTitle || 'Спільний перегляд')}</h2></div><span class="anime-live-viewer-dot">● наживо</span></div>
                    <p data-live-info-meta>${escapeHtml(episodeLabel(state))} · ${escapeHtml(state.dub || 'Озвучка не вказана')}${state.season ? ` · ${escapeHtml(state.season)}` : ''}</p>
                    ${state.availableEpisodeCount ? `<small>Доступно серій: ${escapeHtml(state.availableEpisodeCount)}</small>` : ''}
                    <div class="anime-live-countdown" data-live-countdown>${countdownTarget ? `${state.status === 'running' ? 'До завершення' : 'До старту'}: <strong data-target="${countdownTarget}">${formatRemaining(countdownTarget)}</strong>` : ''}</div>
                </section>
            </main>
            <aside class="anime-live-chat" aria-label="Чат трансляції">
                <div class="anime-live-chat-heading"><strong>Чат трансляції</strong><span>Спільнота VakDab</span></div>
                <div class="anime-live-chat-messages"><p><b>VakDab:</b> Приємного перегляду!</p><p><b>Луна:</b> Ефір іде наживо — приєднуйся.</p><p><b>Система:</b> ${escapeHtml(state.animeTitle || 'Аніме')} · ${escapeHtml(state.dub || 'озвучка')}</p></div>
                <div class="anime-live-chat-input" aria-hidden="true">Написати в чат <span>☺</span></div>
            </aside>
        </div>
    </section>`;
    bindBackButtons(container);
    const video = container.querySelector('#animeLiveVideo');
    if (video && source) mountVideo(video, source);
}

function updatePage(container, state) {
    if (!state || state.status === 'idle') {
        renderIdle(container);
        return;
    }
    const rawSource = String(state.videoUrl || '');
    const source = /\.(?:m3u8|mp4)(?:[?#].*)?$/i.test(rawSource) || /[?&]url=[^&]*(?:m3u8|mp4)/i.test(rawSource) ? rawSource : '';
    const video = container.querySelector('#animeLiveVideo');
    if (source && (!video || currentSource !== source)) {
        renderPage(container, state);
        return;
    }
    container.querySelector('[data-live-title]')?.replaceChildren(document.createTextNode(state.animeTitle || 'VakDab'));
    container.querySelector('[data-live-info-title]')?.replaceChildren(document.createTextNode(state.animeTitle || 'Спільний перегляд'));
    container.querySelector('[data-live-episode]')?.replaceChildren(document.createTextNode(`${episodeLabel(state)} · ${state.dub || 'Озвучка'}`));
    const target = state.status === 'running' ? state.endsAt : state.startsAt;
    const countdown = container.querySelector('[data-live-countdown]');
    if (countdown) countdown.innerHTML = target ? `${state.status === 'running' ? 'До завершення' : 'До старту'}: <strong data-target="${target}">${formatRemaining(target)}</strong>` : '';
}

function bindBackButtons(container) {
    container.querySelectorAll('[data-live-back]').forEach(button => button.addEventListener('click', () => { window.location.hash = 'main'; }));
}

export function destroyLivePage() {
    if (refreshTimer) clearInterval(refreshTimer);
    if (countdownTimer) clearInterval(countdownTimer);
    refreshTimer = null;
    countdownTimer = null;
    const video = document.getElementById('animeLiveVideo');
    video?.pause();
    stopVideo();
}

export function renderLivePage() {
    const container = document.getElementById('livePageContainer');
    if (!container) return;
    if (refreshTimer) clearInterval(refreshTimer);
    if (countdownTimer) clearInterval(countdownTimer);
    renderLoading(container);
    loadLiveState().then(state => {
        if (window.location.hash.slice(1).split('?')[0] !== 'live') return;
        if (!state || state.status === 'idle') {
            renderIdle(container);
            return;
        }
        renderPage(container, state);
        refreshTimer = window.setInterval(() => loadLiveState().then(next => updatePage(container, next)).catch(() => {}), 15000);
        countdownTimer = window.setInterval(() => {
            const target = container.querySelector('[data-live-countdown] strong');
            if (!target) return;
            const stateTarget = Number(target.dataset.target || 0);
            if (stateTarget) target.textContent = formatRemaining(stateTarget);
        }, 1000);
        const target = state.status === 'running' ? state.endsAt : state.startsAt;
        container.querySelector('[data-live-countdown] strong')?.setAttribute('data-target', String(target || 0));
    }).catch(() => renderIdle(container));
}
