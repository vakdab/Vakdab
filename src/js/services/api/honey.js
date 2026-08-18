import { getProxyUrl } from '../../utils/image.js';

export const HONEY_API = 'https://data.api.honey-manga.com.ua';
export const MANGA_WEB = 'https://manga.in.ua';
// Backward-compatible export name used by older reader code.
export const HONEY_WEB = MANGA_WEB;
export const HONEY_IMAGE = 'https://hmvolumestorage.b-cdn.net/public-resources';
export const DEFAULT_CHAPTER_URL = 'https://manga.in.ua/chapters/64318-hlopjacha-bezodnja-tom-1-rozdil-1.html';

const jsonCache = new Map();

export function safeUrl(value, fallback = '') {
    try {
        const url = new URL(String(value || ''), window.location.href);
        return /^https?:$/i.test(url.protocol) ? url.href : fallback;
    } catch { return fallback; }
}

export function parseChapterUrl(value) {
    const url = safeUrl(value, '');
    const mangaMatch = url.match(/https?:\/\/manga\.in\.ua\/chapters\/(\d+)-[^?#]+\.html(?:[?#].*)?$/i);
    if (mangaMatch) return { source: 'manga.in.ua', chapterId: mangaMatch[1], titleId: '', url };
    const honeyMatch = url.match(/\/read\/([0-9a-f-]{36})\/([0-9a-f-]{36})/i);
    if (honeyMatch) return { source: 'honey-manga.com.ua', chapterId: honeyMatch[1], titleId: honeyMatch[2], url };
    throw new Error('Неправильне посилання на розділ manga.in.ua');
}

export function isMangaInUaChapterUrl(value) {
    return /^https?:\/\/manga\.in\.ua\/chapters\/\d+-[^?#]+\.html(?:[?#].*)?$/i.test(String(value || ''));
}

export function getProxiedChapterUrl(value) {
    const url = safeUrl(value, '');
    return isMangaInUaChapterUrl(url) ? getProxyUrl(url, 'desktop') : url;
}

export function pageImageUrl(content) {
    const value = String(content || '').trim();
    if (!value) return '';
    const direct = /^https?:\/\//i.test(value) ? value : `${HONEY_IMAGE}/${value}`;
    if (!direct.startsWith(HONEY_IMAGE)) return getProxyUrl(direct, 'desktop');
    const url = new URL(direct);
    url.searchParams.set('optimizer', 'image');
    url.searchParams.set('quality', '85');
    url.searchParams.set('width', '1080');
    return url.href;
}

export function pageImageFallbackUrl(content) {
    const value = String(content || '').trim();
    if (!value) return '';
    const direct = /^https?:\/\//i.test(value) ? value : `${HONEY_IMAGE}/${value}`;
    // The image worker can return 403 for GitHub Pages image requests. Weserv
    // provides a CORS-enabled image fallback and also constrains huge source
    // pages to a reader-friendly width while preserving their aspect ratio.
    return `https://images.weserv.nl/?url=${encodeURIComponent(direct)}&w=1080`;
}

function fetchJson(sourceUrl, options = {}) {
    const method = options.method || 'GET';
    const cacheKey = `${method}:${sourceUrl}:${options.body || ''}`;
    if (jsonCache.has(cacheKey)) return jsonCache.get(cacheKey);
    // Honey API supports CORS itself. The image proxy is not an API proxy and can
    // return 404 for valid chapter routes, so never route API JSON through it.
    const request = fetch(sourceUrl, {
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
    // The canonical public reader endpoint is the v2 frames route. The old
    // /v2/chapter/:id route returns 404 and must not be probed first.
    const endpoints = [
        `${HONEY_API}/v2/chapter/frames/${chapterId}/${titleId}`,
        `${HONEY_API}/chapter/${chapterId}`
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
