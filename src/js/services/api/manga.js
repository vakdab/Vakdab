import { debugLog, isVakdabDebugEnabled } from '../../utils/debug.js';
import { getProxyUrl } from '../../utils/image.js';

export const MANGA_WEB = 'https://manga.in.ua';
export const MANGA_PROXY = 'https://monoanime.animegran8.workers.dev/';
export const DEFAULT_CHAPTER_URL = `${MANGA_WEB}/chapters/64318-hlopjacha-bezodnja-tom-1-rozdil-1.html`;
const htmlCache = new Map();
const chapterFramesCache = new Map();

export function safeUrl(value, fallback = '') { try { const url = new URL(String(value || ''), MANGA_WEB); return /^https?:$/i.test(url.protocol) ? url.href : fallback; } catch { return fallback; } }
export function isMangaInUaChapterUrl(value) { return /^https?:\/\/manga\.in\.ua\/chapters\/\d+-[^?#]+\.html(?:[?#].*)?$/i.test(String(value || '')); }
export function getProxiedChapterUrl(value) { const url = safeUrl(value, ''); return isMangaInUaChapterUrl(url) ? url : url; }
export function parseChapterUrl(value) { const url = safeUrl(value, ''); const match = url.match(/\/chapters\/(\d+)-([^?#]+)\.html/i); if (!match) throw new Error('Неправильне посилання на розділ manga.in.ua'); return { source: 'manga.in.ua', chapterId: match[1], slug: match[2], titleId: '', url }; }
export function pageImageUrl(value) { const url = safeUrl(value, ''); return url.startsWith(MANGA_WEB) ? getProxyUrl(url, 'desktop') : url; }
export function pageImageFallbackUrl(value) { return pageImageUrl(value); }

async function fetchWithRetry(url, options = {}, { timeoutMs = 15000, maxAttempts = 3 } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timer);
            if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) return response;
            if (attempt === maxAttempts) return response;
            await new Promise(resolve => setTimeout(resolve, Math.min(4000, 350 * (2 ** (attempt - 1)))));
        } catch (error) {
            clearTimeout(timer);
            lastError = error;
            if (attempt === maxAttempts) throw error;
            await new Promise(resolve => setTimeout(resolve, Math.min(4000, 350 * (2 ** (attempt - 1)))));
        }
    }
    throw lastError || new Error('Запит manga.in.ua не виконано');
}

async function fetchMangaHtml(url) {
    const target = getProxyUrl(url, 'desktop');
    if (htmlCache.has(target)) return htmlCache.get(target);
    const request = fetchWithRetry(target, { credentials: 'omit', cache: 'no-store' }, { timeoutMs: 15000 })
        .then(response => response.text())
        .catch(error => { htmlCache.delete(target); throw error; });
    htmlCache.set(target, request);
    return request;
}

function parseHtml(html) { return new DOMParser().parseFromString(html, 'text/html'); }
function absoluteMangaUrl(value) { const url = safeUrl(value, ''); return url.startsWith(MANGA_WEB) ? url : `${MANGA_WEB}${String(value || '').startsWith('/') ? value : `/${value}`}`; }
function extractChapterLinks(doc) { return [...doc.querySelectorAll('select#linkstocomics option, a[href*="/chapters/"]')].map(node => ({ id: node.value || node.href, url: absoluteMangaUrl(node.value || node.href), title: (node.textContent || '').trim() })).filter(item => isMangaInUaChapterUrl(item.url)); }

function firstSrcsetUrl(value = '') { return String(value).split(',').map(part => part.trim().split(/\s+/)[0]).filter(Boolean).pop() || ''; }
function extractPages(doc) {
    const nodes = [...doc.querySelectorAll('#comics img, #comics source, #comics noscript img, img[data-src], source[srcset], source[data-srcset]')];
    return nodes.map(node => {
        const raw = node.getAttribute('data-src') || node.getAttribute('data-original') || node.getAttribute('data-lazy-src') || node.getAttribute('data-image') || node.getAttribute('src') || firstSrcsetUrl(node.getAttribute('data-srcset') || node.getAttribute('srcset') || '');
        return absoluteMangaUrl(raw);
    }).filter(Boolean).map(content => ({ content }));
}
function extractMangaUserHash(html) { return html.match(/(?:site_login_hash|user_hash)\s*[=:]\s*["']([^"']+)/i)?.[1] || ''; }
async function fetchMangaAjaxPages(html, doc) {
    const newsId = doc.querySelector('#comics')?.getAttribute('data-news_id');
    const userHash = extractMangaUserHash(html);
    if (!newsId || !userHash) return [];
    const endpoint = `${MANGA_WEB}/engine/ajax/controller.php?mod=load_chapters_image&news_id=${encodeURIComponent(newsId)}&action=show&user_hash=${encodeURIComponent(userHash)}`;
    const response = await fetchWithRetry(getProxyUrl(endpoint, 'desktop'), { credentials: 'omit', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } }, { timeoutMs: 20000 });
    if (!response.ok) return [];
    return extractPages(parseHtml(await response.text()));
}

export async function getChapterFrames(chapterUrl) {
    const url = safeUrl(chapterUrl, '');
    if (!isMangaInUaChapterUrl(url)) throw new Error('Неправильне посилання на розділ manga.in.ua');
    if (chapterFramesCache.has(url)) return chapterFramesCache.get(url);
    const request = (async () => {
        const debugQuery = isVakdabDebugEnabled() ? '&debug=1' : '';
        const endpoint = `${MANGA_PROXY}?url=${encodeURIComponent(url)}&manga_pages=1${debugQuery}`;
        const response = await fetchWithRetry(endpoint, { credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } }, { timeoutMs: 30000 });
        if (!response.ok) throw new Error(`Сторінки manga.in.ua: HTTP ${response.status}`);
        let payload;
        try { payload = await response.json(); } catch { throw new Error('Сторінки manga.in.ua: неправильний JSON'); }
        const pages = Array.isArray(payload?.images) ? payload.images.filter(content => typeof content === 'string' && /^https?:\/\//i.test(content)).map(content => ({ content })) : [];
        debugLog('manga', 'frame-manifest', {
            sourcePages: payload?.debug?.sourcePagesCount ?? null,
            workerExtractedImages: payload?.debug?.extractedImages ?? null,
            apiPayloadImages: Array.isArray(payload?.images) ? payload.images.length : 0,
            frontendPages: pages.length
        });
        if (!pages.length) throw new Error(payload?.error || 'Сторінки manga.in.ua не завантажилися');
        return pages;
    })().catch(error => { chapterFramesCache.delete(url); throw error; });
    chapterFramesCache.set(url, request);
    return request;
}

export async function getMangaChapters(mangaUrl) {
    const url = safeUrl(mangaUrl, '');
    if (!/^https?:\/\/manga\.in\.ua\/mangas\//i.test(url)) return { title: '', chapters: [] };
    const endpoint = `${MANGA_PROXY}?url=${encodeURIComponent(url)}&manga_chapters=1`;
    try {
        const response = await fetchWithRetry(endpoint, { credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } }, { timeoutMs: 30000 });
        if (!response.ok) return { title: '', chapters: [] };
        const payload = await response.json();
        return {
            title: String(payload?.title || '').trim(),
            chapters: Array.isArray(payload?.chapters) ? payload.chapters.filter(item => isMangaInUaChapterUrl(item?.url)) : [],
        };
    } catch { return { title: '', chapters: [] }; }
}

export function getReaderBackgroundData(titleId, chapterUrl) { return fetchMangaHtml(chapterUrl).then(html => { const doc = parseHtml(html); const links = extractChapterLinks(doc); return { title: { title: doc.querySelector('h1')?.textContent?.trim() || 'Манґа', description: doc.querySelector('.full-text, .description')?.textContent?.trim() || '' }, chapter: chapterUrl, chapterList: links.map((item, index) => ({ id: item.url, url: item.url, title: item.title || `Розділ ${index + 1}` })) }; }).catch(() => ({ title: {}, chapter: chapterUrl, chapterList: [] })); }
export function clearMangaCache() { htmlCache.clear(); chapterFramesCache.clear(); }
