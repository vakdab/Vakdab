import { getProxyUrl } from '../../utils/image.js';

export const MANGA_WEB = 'https://manga.in.ua';
export const MANGA_PROXY = 'https://monoanime.animegran8.workers.dev/';
export const HONEY_WEB = MANGA_WEB;
export const HONEY_API = MANGA_WEB;
export const HONEY_SEARCH_API = MANGA_WEB;
export const HONEY_IMAGE = MANGA_WEB;
export const DEFAULT_CHAPTER_URL = `${MANGA_WEB}/chapters/64318-hlopjacha-bezodnja-tom-1-rozdil-1.html`;
const htmlCache = new Map();

export function safeUrl(value, fallback = '') { try { const url = new URL(String(value || ''), MANGA_WEB); return /^https?:$/i.test(url.protocol) ? url.href : fallback; } catch { return fallback; } }
export function isMangaInUaChapterUrl(value) { return /^https?:\/\/manga\.in\.ua\/chapters\/\d+-[^?#]+\.html(?:[?#].*)?$/i.test(String(value || '')); }
export function getProxiedChapterUrl(value) { const url = safeUrl(value, ''); return isMangaInUaChapterUrl(url) ? getProxyUrl(url, 'desktop') : url; }
export function parseChapterUrl(value) { const url = safeUrl(value, ''); const match = url.match(/\/chapters\/(\d+)-([^?#]+)\.html/i); if (!match) throw new Error('Неправильне посилання на розділ manga.in.ua'); return { source: 'manga.in.ua', chapterId: match[1], slug: match[2], titleId: '', url }; }
export function pageImageUrl(value) { const url = safeUrl(value, ''); return url.startsWith(MANGA_WEB) ? getProxyUrl(url, 'desktop') : url; }
export function pageImageFallbackUrl(value) { return pageImageUrl(value); }

async function fetchMangaHtml(url) { const target = getProxyUrl(url, 'desktop'); if (htmlCache.has(target)) return htmlCache.get(target); const request = fetch(target, { credentials: 'omit', cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(`manga.in.ua: HTTP ${r.status}`); return r.text(); }).catch(e => { htmlCache.delete(target); throw e; }); htmlCache.set(target, request); return request; }
function parseHtml(html) { return new DOMParser().parseFromString(html, 'text/html'); }
function absoluteMangaUrl(value) { const url = safeUrl(value, ''); return url.startsWith(MANGA_WEB) ? url : `${MANGA_WEB}${value.startsWith('/') ? value : `/${value}`}`; }
function extractChapterLinks(doc) { return [...doc.querySelectorAll('select#linkstocomics option, a[href*="/chapters/"]')].map(node => ({ id: node.value || node.href, url: absoluteMangaUrl(node.value || node.href), title: (node.textContent || '').trim() })).filter(item => isMangaInUaChapterUrl(item.url)); }
function extractPages(doc) { return [...doc.querySelectorAll('#comics img, img[data-src*="/uploads/"]')].map(img => img.dataset.src || img.getAttribute('data-src') || img.currentSrc || img.src).map(absoluteMangaUrl).filter(Boolean).map(content => ({ content })); }
export async function getChapterFrames(chapterUrl) { const doc = parseHtml(await fetchMangaHtml(chapterUrl)); const pages = extractPages(doc); if (pages.length) return pages; throw new Error('Сторінки manga.in.ua ще не завантажені'); }
export function getReaderBackgroundData(titleId, chapterUrl) { return fetchMangaHtml(chapterUrl).then(html => { const doc = parseHtml(html); const links = extractChapterLinks(doc); return { title: { title: doc.querySelector('h1')?.textContent?.trim() || 'Манґа', description: doc.querySelector('.full-text, .description')?.textContent?.trim() || '' }, chapter: chapterUrl, chapterList: links.map((item, index) => ({ id: item.url, url: item.url, title: item.title || `Розділ ${index + 1}` })) }; }).catch(() => ({ title: {}, chapter: chapterUrl, chapterList: [] })); }
export function clearHoneyCache() { htmlCache.clear(); }
