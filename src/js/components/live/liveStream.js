const LIVE_API_URL = 'https://vakdab.animegran8.workers.dev/api/live';
const REFRESH_MS = 15000;

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
    return ({ polling: 'Голосування триває', scheduled: 'Стрім заплановано', running: 'Ефір триває', finished: 'Стрім завершено' })[status] || 'Live';
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
    host.innerHTML = `<section class="live-stream-card live-stream-card--idle" aria-labelledby="liveStreamTitle"><div class="live-stream-card__header"><div><span class="live-kicker">LIVE VAKDAB</span><h2 id="liveStreamTitle">Спільний перегляд</h2></div><span class="live-status">Очікування</span></div><p class="live-stream-card__hint">Коли бот запустить голосування, тут з’являться результати вибору аніме, серії, озвучки та тривалості.</p></section>`;
}

function renderState(host, state) {
    latestState = state;
    if (!state || state.status === 'idle') return renderIdle(host);
    const poll = state.poll || {};
    const isRunning = state.status === 'running';
    const isScheduled = state.status === 'scheduled';
    const hasWatch = Boolean(state.animeUrl);
    const telegramLink = state.telegramUrl ? `<a class="live-action live-action--secondary" href="${escapeHtml(state.telegramUrl)}" target="_blank" rel="noopener">Голосувати в Telegram</a>` : '';
    const watch = hasWatch ? `<button type="button" class="live-action live-action--primary" id="liveWatchButton">${isRunning ? 'Дивитися зараз' : 'Відкрити стрім'}</button>` : '';
    const selectionType = state.isMovie ? 'Фільм' : state.episodeCount ? `${escapeHtml(state.episodeCount)} ${state.episodeCount === 1 ? 'серія' : 'серій'}` : `Серія ${escapeHtml(state.episode || '—')}`;
    const duration = state.durationHours ? ` · ${escapeHtml(state.durationHours)} год.` : '';
    const selected = state.animeTitle ? `<div class="live-selection"><strong>${escapeHtml(state.animeTitle)}</strong><span>${selectionType} · ${escapeHtml(state.dub || 'Озвучка не вказана')}${duration}</span></div>` : '';
    const countdownTarget = isRunning ? state.endsAt : state.startsAt;
    const countdown = countdownTarget ? `<span class="live-countdown" data-live-countdown="${Number(countdownTarget)}">${formatRemaining(countdownTarget)}</span>` : '';
    host.innerHTML = `<section class="live-stream-card${isRunning ? ' is-running' : ''}" aria-labelledby="liveStreamTitle"><div class="live-stream-card__header"><div><span class="live-kicker">LIVE VAKDAB</span><h2 id="liveStreamTitle">${isRunning ? 'Зараз дивимося разом' : 'Готуємо наступний стрім'}</h2></div><span class="live-status">${escapeHtml(statusLabel(state.status))}</span></div>${selected}<div class="live-stream-card__meta">${poll.stageLabel ? `<span>${escapeHtml(poll.stageLabel)}</span>` : ''}${countdown ? `<span>${isRunning ? 'До завершення' : 'До старту'}: ${countdown}</span>` : ''}</div>${poll.question ? `<div class="live-poll"><div class="live-poll__title">${escapeHtml(poll.question)}</div>${renderOptions(poll)}</div>` : ''}<div class="live-stream-card__actions">${watch}${telegramLink}</div></section>`;
    host.querySelector('#liveWatchButton')?.addEventListener('click', () => {
        if (typeof window.openPlayerPage !== 'function') return;
        window.openPlayerPage(state.animeUrl, { liveEpisode: state.episode, liveDub: state.dub, liveMode: true });
    });
}

function tickCountdown(host) {
    host.querySelectorAll('[data-live-countdown]').forEach(element => {
        element.textContent = formatRemaining(element.dataset.liveCountdown);
    });
}

async function refreshLiveStream(host) {
    try {
        const response = await fetch(LIVE_API_URL, { cache: 'no-store', headers: { accept: 'application/json' } });
        if (!response.ok) throw new Error(`LIVE_HTTP_${response.status}`);
        const payload = await response.json();
        renderState(host, payload?.live || payload);
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
