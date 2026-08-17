import { getProxyUrl } from '../../utils/image.js';

export const HONEY_API = 'https://data.api.honey-manga.com.ua';
export const HONEY_WEB = 'https://honey-manga.com.ua';
export const HONEY_IMAGE = 'https://hmvolumestorage.b-cdn.net/public-resources';
export const DEFAULT_CHAPTER_URL = '';

const jsonCache = new Map();

export function safeUrl(value, fallback = '') {
    try {
        const url = new URL(String(value || ''), window.location.href);
        return /^https?:$/i.test(url.protocol) ? url.href : fallback;
    } catch { return fallback; }
}

export function parseChapterUrl(value) {
    const url = safeUrl(value, '');
    const match = url.match(/\/read\/([0-9a-f-]{36})\/([0-9a-f-]{36})/i);
    if (!match) throw new Error('Неправильне посилання на розділ Honey Manga');
    return { chapterId: match[1], titleId: match[2], url };
}

export function pageImageUrl(content) {
    const value = String(content || '').trim();
    if (!value) return '';
    const direct = /^https?:\/\//i.test(value) ? value : `${HONEY_IMAGE}/${value}`;
    return direct.startsWith(HONEY_IMAGE) ? direct : getProxyUrl(direct, 'desktop');
}

function fetchJson(sourceUrl, options = {}) {
    const method = options.method || 'GET';
    const cacheKey = `${method}:${sourceUrl}:${options.body || ''}`;
    if (jsonCache.has(cacheKey)) return jsonCache.get(cacheKey);
    const requestUrl = method === 'GET' ? getProxyUrl(sourceUrl, 'desktop') : sourceUrl;
    const request = fetch(requestUrl, {
        mode: 'cors', credentials: 'omit', cache: method === 'GET' ? 'force-cache' : 'no-store', ...options
    }).then(response => {
        if (!response.ok) throw new Error(`Honey Manga API: HTTP ${response.status}`);
        return response.json();
    }).catch(error => { jsonCache.delete(cacheKey); throw error; });
    jsonCache.set(cacheKey, request);
    return request;
}

function extractPages(payload) {
    const resources = payload?.resourceIds || payload?.data?.resourceIds || payload?.resources || {};
    if (Array.isArray(resources)) return resources.map(item => typeof item === 'string' ? item : (item?.url || item?.resourceId || item?.id || '')).filter(Boolean).map(content => ({ content }));
    return Object.entries(resources).sort(([a], [b]) => Number(a) - Number(b)).map(([, content]) => ({ content: typeof content === 'string' ? content : (content?.url || content?.resourceId || content?.id || '') })).filter(page => page.content);
}

export async function getChapterFrames(chapterId, titleId) {
    // Honey's public reader currently exposes resourceIds on the chapter
    // payload; keep the legacy frames routes as fallbacks for older chapters.
    const endpoints = [
        `${HONEY_API}/v2/chapter/${chapterId}`,
        `${HONEY_API}/chapter/${chapterId}`,
        `${HONEY_API}/v2/chapter/frames/${chapterId}/${titleId}`,
        `${HONEY_API}/chapter/frames/${chapterId}/${titleId}`
    ];
    for (const endpoint of endpoints) {
        try {
            const pages = extractPages(await fetchJson(endpoint));
            if (pages.length) return pages;
        } catch (error) {
            if (endpoint === endpoints.at(-1)) throw error;
        }
    }
    return [];
}

export function getReaderBackgroundData(titleId, chapterId) {
    return Promise.allSettled([
        fetchJson(`${HONEY_API}/manga/${titleId}`),
        fetchJson(`${HONEY_API}/chapter/${chapterId}`),
        fetchJson(`${HONEY_API}/v2/chapter/cursor-list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mangaId: titleId, page: 1, pageSize: 100, sort: { sortBy: 'chapterNum', sortOrder: 'ASC' } })
        })
    ]).then(([titleResult, chapterResult, listResult]) => {
        const chapterList = (Array.isArray(listResult.value?.data) ? listResult.value.data : [])
            .filter(item => item?.id)
            .sort((a, b) => Number(a.volume || 0) - Number(b.volume || 0) || Number(a.chapterNum || 0) - Number(b.chapterNum || 0));
        return {
            title: titleResult.status === 'fulfilled' ? titleResult.value : {},
            chapter: chapterResult.status === 'fulfilled' ? chapterResult.value : {},
            chapterList
        };
    });
}

export function clearHoneyCache() {
    jsonCache.clear();
}
