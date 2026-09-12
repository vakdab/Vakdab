import { showToast } from '../../legacy/app-legacy.js';

const aniSkipCache = new Map();
const aniSkipMalIdCache = new Map();
let currentAniSkipCleanup = null;

export function getDirectAniSkipMalId(anime) {
    const candidates = [
        anime?.externalIds?.mal_id,
        anime?.externalIds?.malId,
        anime?.external_ids?.mal_id,
        anime?.external_ids?.malId,
        anime?.mal_id,
        anime?.malId
    ];
    const value = candidates.map(Number).find(id => Number.isInteger(id) && id > 0);
    return value || 0;
}

export async function resolveAniSkipMalId(anime) {
    const direct = getDirectAniSkipMalId(anime);
    if (direct) return direct;
    const title = String(anime?.title || anime?.name || '').trim();
    if (!title) return 0;
    const key = title.toLowerCase();
    if (aniSkipMalIdCache.has(key)) return aniSkipMalIdCache.get(key);
    const request = (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        try {
            const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=5`, {
                signal: controller.signal, headers: { Accept: 'application/json' }
            });
            if (!response.ok) return 0;
            const payload = await response.json();
            const normalized = value => String(value || '').toLowerCase().replace(/[^a-z0-9а-яіїєґ]+/gi, ' ').trim();
            const wanted = normalized(title);
            const exact = (payload?.data || []).find(item => [item.title, item.title_english, item.title_japanese]
                .some(candidate => normalized(candidate) === wanted));
            return Number(exact?.mal_id || payload?.data?.[0]?.mal_id || 0);
        } catch (_) { return 0; }
        finally { clearTimeout(timer); }
    })();
    aniSkipMalIdCache.set(key, request);
    return request;
}

export async function getAniSkipSegments(anime, episode) {
    const id = await resolveAniSkipMalId(anime);
    const ep = Number(episode);
    console.debug('[AniSkip] MAL ID:', id);
    console.debug('[AniSkip] Episode:', ep);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(ep) || ep <= 0) {
        console.debug('[AniSkip] Request: skipped (missing MAL ID or episode)');
        return [];
    }
    const cacheKey = `${id}:${ep}`;
    if (aniSkipCache.has(cacheKey)) {
        console.debug('[AniSkip] Response: memory cache', cacheKey);
        return aniSkipCache.get(cacheKey);
    }
    const storageKey = `vakdab:aniskip:v2:${cacheKey}`;
    try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (Array.isArray(stored)) {
            console.debug('[AniSkip] Response: local cache', stored);
            const cached = Promise.resolve(stored);
            aniSkipCache.set(cacheKey, cached);
            return cached;
        }
    } catch (_) { /* storage unavailable or invalid */ }

    const requestUrl = `https://api.aniskip.com/v2/skip-times/${id}/${ep}?types=op&types=ed&types=recap&episodeLength=0`;
    console.debug('[AniSkip] Request:', requestUrl);
    const request = (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        try {
            const response = await fetch(requestUrl, {
                signal: controller.signal, headers: { Accept: 'application/json' }
            });
            let payload = null;
            try { payload = await response.json(); } catch (_) { payload = null; }
            console.debug('[AniSkip] Response:', response.status, payload);
            if (!response.ok || payload?.found !== true || !Array.isArray(payload.results)) return [];
            const segments = payload.results.map(item => {
                const interval = item.interval || item;
                const start = Number(interval.startTime ?? interval.start_time);
                const end = Number(interval.endTime ?? interval.end_time);
                const type = String(item.skipType ?? item.skip_type ?? '').toLowerCase();
                return { start, end, type };
            }).filter(item => Number.isFinite(item.start) && Number.isFinite(item.end)
                && item.end > item.start && ['op', 'ed', 'recap', 'opening', 'ending'].includes(item.type));
            segments.forEach(segment => console.debug('[AniSkip] OP:', segment.type, 'start', segment.start, 'end', segment.end));
            try { localStorage.setItem(storageKey, JSON.stringify(segments)); } catch (_) { /* ignore */ }
            return segments;
        } catch (error) {
            console.debug('[AniSkip] Response:', error?.name === 'AbortError' ? 'timeout' : error);
            return [];
        } finally { clearTimeout(timer); }
    })();
    aniSkipCache.set(cacheKey, request);
    return request;
}

export function cleanupAniSkip() {
    if (currentAniSkipCleanup) {
        currentAniSkipCleanup();
        currentAniSkipCleanup = null;
    }
}

export async function attachAniSkip(video, episode, {
    anime = null,
    segmentsPromise = null,
    playbackRequest = null,
    getCurrentPlaybackRequest = () => playbackRequest,
    isPlayerOpen = () => true,
    playerInstance = null
} = {}) {
    if (!video) return;
    cleanupAniSkip();
    const rawSegments = await (segmentsPromise || getAniSkipSegments(anime, episode));
    if (getCurrentPlaybackRequest() !== playbackRequest || !isPlayerOpen()) return;
    const currentVideo = playerInstance?.videoRef?.isConnected ? playerInstance.videoRef : video;
    const playerWrap = currentVideo?.closest('.lampa-player-container') || playerInstance?.containerRef;
    const segments = (Array.isArray(rawSegments) ? rawSegments : [])
        .map(segment => ({
            ...segment,
            start: Number(segment.start), end: Number(segment.end),
            type: String(segment.type || '').toLowerCase()
        }))
        .filter(segment => ['op', 'opening'].includes(segment.type)
            && segment.start >= 0 && segment.end > segment.start);
    const button = playerWrap?.querySelector('.lp-opening-skip');
    const media = currentVideo || playerInstance?.videoRef;
    if (!button || !media || !segments.length) {
        console.debug('[AniSkip] Skip button: hidden');
        return;
    }
    let activeSegment = null;
    let lastSkipAt = 0;
    let lastVisible = false;
    const setButtonVisible = visible => {
        button.classList.toggle('is-visible', visible);
        button.setAttribute('aria-hidden', visible ? 'false' : 'true');
        if (visible !== lastVisible) {
            console.debug('[AniSkip] Skip button:', visible ? 'shown' : 'hidden');
            lastVisible = visible;
        }
    };
    const hideButton = () => { activeSegment = null; setButtonVisible(false); };
    const onTimeCheck = () => {
        const now = Number(media.currentTime);
        console.debug('[AniSkip] Current time:', now);
        if (!Number.isFinite(now)) return;
        activeSegment = segments.find(segment => now >= segment.start && now < segment.end) || null;
        setButtonVisible(Boolean(activeSegment));
    };
    const onSkip = event => {
        event.preventDefault(); event.stopPropagation();
        if (Date.now() - lastSkipAt < 500 || !activeSegment) return;
        lastSkipAt = Date.now();
        const target = Number(activeSegment.end);
        if (!Number.isFinite(target)) return;
        try {
            media.currentTime = target;
            console.debug('[AniSkip] Skip executed:', target);
            activeSegment = null;
            setButtonVisible(false);
            if (!media.paused) media.play().catch(() => {});
            playerInstance?._showControls?.();
            showToast('Opening пропущено');
        } catch (error) { console.debug('[AniSkip] Skip executed: failed', error); }
    };
    const onPointerUp = event => { if (event.pointerType && event.pointerType !== 'mouse') onSkip(event); };
    button.addEventListener('click', onSkip);
    button.addEventListener('pointerup', onPointerUp);
    const syncEvents = ['loadedmetadata', 'durationchange', 'canplay', 'playing', 'timeupdate', 'seeked'];
    syncEvents.forEach(name => media.addEventListener(name, onTimeCheck));
    const cleanup = () => {
        syncEvents.forEach(name => media.removeEventListener(name, onTimeCheck));
        button.removeEventListener('click', onSkip);
        button.removeEventListener('pointerup', onPointerUp);
        hideButton();
        if (currentAniSkipCleanup === cleanup) currentAniSkipCleanup = null;
    };
    currentAniSkipCleanup = cleanup;
    onTimeCheck();
    return cleanup;
}
