import { debugLog } from '../../utils/debug.js';

export const HONEY_WEB = 'https://honey-manga.com.ua';
export const HONEY_API = 'https://data.api.honey-manga.com.ua';
export const HONEY_CDN = 'https://honeymangastorage-nocache.b-cdn.net/public-resources';
export const HONEY_CDN_FALLBACK = 'https://hmvolumestorage.b-cdn.net/public-resources';
export const MANGA_WEB = HONEY_WEB;
export const MANGA_PROXY = '';
export const DEFAULT_CHAPTER_URL = `${HONEY_WEB}/read/db4ed14e-f564-4103-be20-688948370f3d/8c336683-10ca-4912-9666-e18a1689da6e`;

const jsonCache = new Map();
const chapterFramesCache = new Map();
const chapterListCache = new Map();

export function safeUrl(value, fallback = '') {
    try {
        const url = new URL(String(value || ''), HONEY_WEB);
        return /^https?:$/i.test(url.protocol) ? url.href : fallback;
    } catch {
        return fallback;
    }
}

export function isHoneyChapterUrl(value) {
    try {
        const url = new URL(String(value || ''), HONEY_WEB);
        return url.origin === HONEY_WEB && /^\/read\/[^/]+\/[^/]+\/?$/i.test(url.pathname);
    } catch {
        return false;
    }
}

export function getProxiedChapterUrl(value) { return safeUrl(value, ''); }

export function parseChapterUrl(value) {
    const url = safeUrl(value, '');
    const match = url.match(/\/read\/([^/?#]+)\/([^/?#]+)\/?$/i);
    if (!match || !isHoneyChapterUrl(url)) throw new Error('Неправильне посилання на розділ Honey Manga');
    return { source: 'honey-manga.com.ua', chapterId: decodeURIComponent(match[1]), titleId: decodeURIComponent(match[2]), url };
}

/** Select the newest public chapter, falling back to the newest monetized one. */
export function selectHoneyReaderChapter(chapters = []) {
    const list = Array.isArray(chapters) ? chapters.filter(Boolean) : [];
    return list.find(chapter => chapter.isMonetized !== true) || list[0] || null;
}

function resourceUrl(resourceId, base = HONEY_CDN) {
    return `${base}/${encodeURIComponent(String(resourceId))}?optimizer=image&quality=85&width=992`;
}

export function pageImageUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return resourceUrl(raw);
}

export function pageImageFallbackUrl(value) {
    const raw = String(value || '').trim();
    const id = raw.match(/\/public-resources\/([^?/#]+)/i)?.[1] || raw;
    return resourceUrl(decodeURIComponent(id), HONEY_CDN_FALLBACK);
}

function normalizeResourceValue(value) {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (!value || typeof value !== 'object') return '';
    return String(value.resourceId || value.resourceID || value.id || value.uuid || value.url || value.src || value.content || '').trim();
}

/** Normalize current and legacy Honey frames response shapes into indexed resource IDs. */
export function extractHoneyResourceIds(payload) {
    const candidates = [
        payload?.resourceIds,
        payload?.data?.resourceIds,
        payload?.pages,
        payload?.data?.pages,
        payload?.resources,
        payload?.data?.resources
    ];
    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            const entries = candidate.map((value, index) => [String(index), normalizeResourceValue(value)]).filter(([, value]) => value);
            if (entries.length) return Object.fromEntries(entries);
        }
        if (candidate && typeof candidate === 'object') {
            const entries = Object.entries(candidate).map(([index, value]) => [index, normalizeResourceValue(value)]).filter(([, value]) => value);
            if (entries.length) return Object.fromEntries(entries);
        }
    }
    return {};
}

export function hasHoneyPageResources(payload) {
    return Object.keys(extractHoneyResourceIds(payload)).length > 0;
}

async function fetchWithRetry(url, options = {}, { timeoutMs = 20000, maxAttempts = 3 } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timer);
            if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) return response;
            if (attempt === maxAttempts) return response;
            const retryAfter = Number(response.headers.get('Retry-After'));
            const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(8000, retryAfter * 1000) : Math.min(4000, 350 * (2 ** (attempt - 1)));
            await new Promise(resolve => setTimeout(resolve, delay));
        } catch (error) {
            clearTimeout(timer);
            lastError = error;
            if (attempt === maxAttempts) throw error;
            await new Promise(resolve => setTimeout(resolve, Math.min(4000, 350 * (2 ** (attempt - 1)))));
        }
    }
    throw lastError || new Error('Запит Honey Manga не виконано');
}

async function fetchJson(path, options = {}) {
    const url = `${HONEY_API}${path}`;
    const cacheKey = `${url}:${options.method || 'GET'}:${options.body || ''}`;
    if (jsonCache.has(cacheKey)) return jsonCache.get(cacheKey);
    const request = fetchWithRetry(url, { credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json', ...(options.headers || {}) }, ...options })
        .then(async response => {
            let payload = null;
            try { payload = await response.json(); } catch { payload = null; }
            if (!response.ok) {
                const error = new Error(payload?.message || `Honey Manga API: HTTP ${response.status}`);
                error.status = response.status;
                error.payload = payload;
                throw error;
            }
            return payload;
        })
        .catch(error => { jsonCache.delete(cacheKey); throw error; });
    jsonCache.set(cacheKey, request);
    return request;
}

export async function getChapterFrames(chapterUrl) {
    const ids = parseChapterUrl(chapterUrl);
    const cacheKey = ids.url;
    if (chapterFramesCache.has(cacheKey)) return chapterFramesCache.get(cacheKey);
    const request = (async () => {
        let payload;
        try {
            payload = await fetchJson(`/v2/chapter/frames/${encodeURIComponent(ids.chapterId)}/${encodeURIComponent(ids.titleId)}`);
        } catch (error) {
            if (error?.status === 403) throw new Error('Цей розділ Honey Manga доступний лише після отримання доступу.');
            throw error;
        }
        const resourceIds = extractHoneyResourceIds(payload);
        const pages = Object.entries(resourceIds)
            .sort(([left], [right]) => Number(left) - Number(right))
            .map(([index, resourceId]) => ({ content: pageImageUrl(resourceId), resourceId: String(resourceId), index: Number(index) }));
        debugLog('manga', 'honey-frame-manifest', { chapterId: ids.chapterId, titleId: ids.titleId, apiResourceCount: Object.keys(resourceIds).length, frontendPages: pages.length });
        if (!pages.length) throw new Error('У цьому розділі Honey Manga немає сторінок.');
        return pages;
    })().catch(error => { chapterFramesCache.delete(cacheKey); throw error; });
    chapterFramesCache.set(cacheKey, request);
    return request;
}

async function fetchChapterList(mangaId) {
    const key = String(mangaId || '');
    if (!key) return [];
    if (chapterListCache.has(key)) return chapterListCache.get(key);
    const request = (async () => {
        const pageSize = 100;
        const chapters = [];
        let page = 1;
        while (page <= 100) {
            const payload = await fetchJson('/v2/chapter/cursor-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ page, pageSize, mangaId: key, sortOrder: 'DESC' })
            });
            chapters.push(...(Array.isArray(payload?.data) ? payload.data : []));
            if (!payload?.cursorNext?.page || page >= Number(payload.cursorNext.page)) break;
            page = Number(payload.cursorNext.page);
        }
        return chapters;
    })().catch(error => { chapterListCache.delete(key); throw error; });
    chapterListCache.set(key, request);
    return request;
}

export async function getMangaChapters(mangaUrl) {
    const url = safeUrl(mangaUrl, '');
    const mangaId = url.match(/\/book\/([^/?#]+)/i)?.[1] || url.match(/\/read\/[^/]+\/([^/?#]+)/i)?.[1] || '';
    if (!mangaId) return { title: '', description: '', chapters: [] };
    try {
        const [book, chapters] = await Promise.all([
            fetchJson(`/manga/${encodeURIComponent(mangaId)}`).catch(() => null),
            fetchChapterList(mangaId)
        ]);
        return {
            title: String(book?.title || book?.lowTitle || '').trim(),
            description: String(book?.description || '').trim(),
            chapters: chapters.map(chapter => ({
                ...chapter,
                id: String(chapter.id),
                url: `${HONEY_WEB}/read/${encodeURIComponent(chapter.id)}/${encodeURIComponent(mangaId)}`
            }))
        };
    } catch {
        return { title: '', description: '', chapters: [] };
    }
}

export function getReaderBackgroundData(titleId, chapterUrl) {
    const ids = parseChapterUrl(chapterUrl);
    return getMangaChapters(`${HONEY_WEB}/book/${encodeURIComponent(titleId)}`).then(payload => ({
        title: { title: payload.title || 'Манґа', description: payload.description || '' },
        chapter: chapterUrl,
        chapterList: payload.chapters || []
    })).catch(() => ({ title: {}, chapter: chapterUrl, chapterList: [] }));
}

export function clearMangaCache() {
    jsonCache.clear();
    chapterFramesCache.clear();
    chapterListCache.clear();
}
