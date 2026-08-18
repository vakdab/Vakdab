import { getProxyUrl } from '../../utils/image.js';

export const MANGA_WEB = 'https://manga.in.ua';
export const MANGA_PROXY = 'https://monoanime.animegran8.workers.dev/';
export const DEFAULT_CHAPTER_URL = `${MANGA_WEB}/chapters/64318-hlopjacha-bezodnja-tom-1-rozdil-1.html`;
const htmlCache = new Map();

export function safeUrl(value, fallback = '') { try { const url = new URL(String(value || ''), MANGA_WEB); return /^https?:$/i.test(url.protocol) ? url.href : fallback; } catch { return fallback; } }
export function isMangaInUaChapterUrl(value) { return /^https?:\/\/manga\.in\.ua\/chapters\/\d+-[^?#]+\.html(?:[?#].*)?$/i.test(String(value || '')); }
export function getProxiedChapterUrl(value) { const url = safeUrl(value, ''); return isMangaInUaChapterUrl(url) ? url : url; }
export function parseChapterUrl(value) { const url = safeUrl(value, ''); const match = url.match(/\/chapters\/(\d+)-([^?#]+)\.html/i); if (!match) throw new Error('Неправильне посилання на розділ manga.in.ua'); return { source: 'manga.in.ua', chapterId: match[1], slug: match[2], titleId: '', url }; }
export function pageImageUrl(value) { const url = safeUrl(value, ''); return url.startsWith(MANGA_WEB) ? getProxyUrl(url, 'desktop') : url; }
export function pageImageFallbackUrl(value) { return pageImageUrl(value); }

async function fetchMangaHtml(url) { const target = getProxyUrl(url, 'desktop'); if (htmlCache.has(target)) return htmlCache.get(target); const request = fetch(target, { credentials: 'omit', cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(`manga.in.ua: HTTP ${r.status}`); return r.text(); }).catch(e => { htmlCache.delete(target); throw e; }); htmlCache.set(target, request); return request; }
function parseHtml(html) { return new DOMParser().parseFromString(html, 'text/html'); }
function absoluteMangaUrl(value) { const url = safeUrl(value, ''); return url.startsWith(MANGA_WEB) ? url : `${MANGA_WEB}${value.startsWith('/') ? value : `/${value}`}`; }
function extractChapterLinks(doc) { return [...doc.querySelectorAll('select#linkstocomics option, a[href*="/chapters/"]')].map(node => ({ id: node.value || node.href, url: absoluteMangaUrl(node.value || node.href), title: (node.textContent || '').trim() })).filter(item => isMangaInUaChapterUrl(item.url)); }
function extractPages(doc) { return [...doc.querySelectorAll('#comics img, img[data-src*="/uploads/"]')].map(img => img.dataset.src || img.getAttribute('data-src') || img.currentSrc || img.src).map(absoluteMangaUrl).filter(Boolean).map(content => ({ content })); }
function extractMangaUserHash(html) { return html.match(/(?:site_login_hash|user_hash)\s*[=:]\s*["']([^"']+)/i)?.[1] || ''; }
async function fetchMangaAjaxPages(html, doc) { const newsId = doc.querySelector('#comics')?.getAttribute('data-news_id'); const userHash = extractMangaUserHash(html); if (!newsId || !userHash) return []; const endpoint = `${MANGA_WEB}/engine/ajax/controller.php?mod=load_chapters_image&news_id=${encodeURIComponent(newsId)}&action=show&user_hash=${encodeURIComponent(userHash)}`; const response = await fetch(getProxyUrl(endpoint, 'desktop'), { credentials: 'omit', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } }); if (!response.ok) return []; return extractPages(parseHtml(await response.text())); }
export async function getChapterFrames(chapterUrl) { const url = safeUrl(chapterUrl, ''); if (!isMangaInUaChapterUrl(url)) throw new Error('Неправильне посилання на розділ manga.in.ua'); const endpoint = `${MANGA_PROXY}?url=${encodeURIComponent(url)}&manga_pages=1`; const response = await fetch(endpoint, { credentials: 'omit', cache: 'no-store' }); if (!response.ok) throw new Error(`Сторінки manga.in.ua: HTTP ${response.status}`); const payload = await response.json(); const pages = Array.isArray(payload.images) ? payload.images.map(content => ({ content })).filter(item => item.content) : []; if (!pages.length) throw new Error(payload.error || 'Сторінки manga.in.ua не завантажилися'); return pages; }
export function getReaderBackgroundData(titleId, chapterUrl) { return fetchMangaHtml(chapterUrl).then(html => { const doc = parseHtml(html); const links = extractChapterLinks(doc); return { title: { title: doc.querySelector('h1')?.textContent?.trim() || 'Манґа', description: doc.querySelector('.full-text, .description')?.textContent?.trim() || '' }, chapter: chapterUrl, chapterList: links.map((item, index) => ({ id: item.url, url: item.url, title: item.title || `Розділ ${index + 1}` })) }; }).catch(() => ({ title: {}, chapter: chapterUrl, chapterList: [] })); }
export function clearMangaCache() { htmlCache.clear(); }
