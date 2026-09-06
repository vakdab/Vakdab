const RANOBELIB_ORIGIN = 'https://ranobelib.me';
const RANOBELIB_PROXY = 'https://corsproxy.io/?url=';
const RANOBELIB_API = 'https://api.cdnlibs.org/api/manga';
const RANOBELIB_SITE_ID = 3;
const BAKA_ORIGIN = 'https://baka.in.ua';
const JINA_READER_ORIGIN = 'https://r.jina.ai/';
// Current full RanobeLib catalog size: 393 full pages × 60 + 18 records on the last page.
// The API does not expose `meta.total`; this value is refreshed when the catalog boundary changes.
export const RANOBELIB_TOTAL_COUNT = 23598;
const TRANSLATE_ENDPOINT = 'https://clients5.google.com/translate_a/t';
const TRANSLATE_FALLBACK_AT = 'https://translate.google.com/translate_a/single';
const TRANSLATE_FALLBACK_MYMEMORY = 'https://api.mymemory.translated.net/get';
const TRANSLATE_FALLBACK_GTX = 'https://translate.googleapis.com/translate_a/single';

const translationCache = new Map();
const htmlCache = new Map();
const ranobeTotalCache = new Map();
const ranobeChaptersCache = new Map();
// Keep the in-flight resolver alive after a UI timeout so a background prefetch
// can finish and make the next card activation immediate.
const ranobeReaderPendingCache = new Map();
const bakaReaderPendingCache = new Map();
export const RANOBE_FETCH_TIMEOUT_MS = 10000;
export const RANOBE_RESOLVE_TIMEOUT_MS = 15000;

// Load persisted translation cache from localStorage if available
try {
    if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('vakdab_novel_tr_cache');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
                for (const [k, v] of Object.entries(parsed)) {
                    if (k && v && typeof v === 'string') translationCache.set(k, v);
                }
            }
        }
    }
} catch { /* ignore storage errors */ }

function persistTranslationCache() {
    try {
        if (typeof localStorage !== 'undefined' && translationCache.size > 0) {
            const entries = [...translationCache.entries()].slice(-300);
            localStorage.setItem('vakdab_novel_tr_cache', JSON.stringify(Object.fromEntries(entries)));
        }
    } catch { /* ignore quota errors */ }
}

async function fetchRanobeText(endpoint, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RANOBE_FETCH_TIMEOUT_MS);
    try {
        return await fetch(endpoint, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

export const RANOBELIB_HOME = `${RANOBELIB_ORIGIN}/ru?section=home-updates`;

const absoluteUrl = value => {
    try { return new URL(String(value || ''), RANOBELIB_ORIGIN).href; } catch { return ''; }
};

const absoluteBakaUrl = value => {
    try {
        const url = new URL(String(value || ''), BAKA_ORIGIN);
        return url.origin === BAKA_ORIGIN ? url.href : '';
    } catch { return ''; }
};

export function proxiedRanobeUrl(url) {
    return `${RANOBELIB_PROXY}${encodeURIComponent(absoluteUrl(url))}`;
}

export function normalizeNovelText(value = '') {
    return String(value || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n[ \t]+/g, '\n')
        .trim();
}

const CYRILLIC_TITLE_MAP = Object.freeze({
    а:'a', б:'b', в:'v', г:'g', ґ:'g', д:'d', е:'e', ё:'e', є:'e', ж:'zh', з:'z', и:'i', і:'i', ї:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'h', ц:'ts', ч:'ch', ш:'sh', щ:'sh', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya'
});

function canonicalizeTitle(value) {
    return [...String(value || '')].map(char => CYRILLIC_TITLE_MAP[char] || char).join('');
}

export function normalizeNovelTitle(value = '') {
    return canonicalizeTitle(normalizeNovelText(value)
        .toLocaleLowerCase('uk-UA')
        .replace(/[«»“”"'`.,:;!?()[\]{}]/g, ' ')
        .replace(/(?:novel|новелла|ранобэ|web novel|light novel)/gi, ' '))
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function titleTokens(value) {
    return new Set(normalizeNovelTitle(value).split(' ').filter(token => token.length > 2));
}

export function scoreNovelTitleMatch(query, candidate) {
    const a = normalizeNovelTitle(query);
    const b = normalizeNovelTitle(candidate);
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.92;
    const left = titleTokens(a); const right = titleTokens(b);
    if (!left.size || !right.size) return 0;
    const overlap = [...left].filter(token => right.has(token)).length;
    return overlap / Math.max(left.size, right.size);
}

async function fetchRanobeHtml(url, options = {}) {
    const key = absoluteUrl(url);
    if (!key) throw new Error('RanobeLib URL відсутній');
    if (!options.force && htmlCache.has(key)) return htmlCache.get(key);
    const candidates = [
        `https://r.jina.ai/${key}`,
        proxiedRanobeUrl(key)
    ];
    let lastError;
    for (const endpoint of candidates) {
        try {
            const response = await fetchRanobeText(endpoint, { mode: 'cors', credentials: 'omit', cache: 'no-cache', headers: { Accept: 'text/plain,text/html' } });
            if (!response.ok) throw new Error(`RanobeLib: HTTP ${response.status}`);
            const text = await response.text();
            if (!text || text.length < 200 || /код ошибки 1|\[cloudflare\]|access denied/i.test(text)) throw new Error('RanobeLib повернув сторінку захисту');
            htmlCache.set(key, text);
            return text;
        } catch (error) { lastError = error; }
    }
    throw lastError || new Error('RanobeLib: не вдалося отримати сторінку');
}

function isMarkdownPage(text) {
    return /^Title:\s/m.test(String(text || '')) || /\nMarkdown Content:\s*/.test(String(text || ''));
}

function parseMarkdownLinks(text) {
    return [...String(text || '').matchAll(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g)].map(match => ({ label: normalizeNovelText(match[1]), url: absoluteUrl(match[2]) }));
}

function isRanobeChapterImageUrl(url) {
    return /\/uploads\/ranobe\/[^?#]+\/chapters\/[^?#]+/i.test(String(url || ''));
}

function parseRanobeMarkdown(text, chapterUrl = '') {
    const source = String(text || '').replace(/\\([\\()[\]_])/g, '$1');
    const imagePattern = /!\[[^\]]*\]\s*\((https?:\/\/[^)\s]+)\)/g;
    const imageUrls = [...source.matchAll(imagePattern)].map(match => absoluteUrl(match[1])).filter(isRanobeChapterImageUrl);
    const lines = source.split(/\n+/).map(line => line.trim()).filter(Boolean);
    const contentStart = Math.max(0, lines.findIndex(line => /^Markdown Content:/i.test(line)) + 1);
    const content = lines.slice(contentStart);
    const headingIndex = content.findIndex(line => /^#{1,3}\s/.test(line));
    const heading = (headingIndex >= 0 ? content[headingIndex] : lines[0] || 'Розділ').replace(/^#{1,3}\s+/, '');
    const body = headingIndex >= 0 ? content.slice(headingIndex + 1) : content;
    const paragraphs = sanitizeChapterLines(body.map(line => line.replace(imagePattern, '').replace(/^[-*]\s+/, '').replace(/^\[([^\]]+)\]$/, '$1').trim()), heading);
    const links = parseMarkdownLinks(text).filter(item => isChapterLink(item.url));
    return { title: normalizeNovelText(heading), paragraphs, imageUrls: [...new Set(imageUrls)], chapterUrl: absoluteUrl(chapterUrl), prevUrl: links[0]?.url || '', nextUrl: links[1]?.url || '' };
}

function parseDocument(html) {
    if (typeof DOMParser === 'undefined') throw new Error('DOMParser недоступний');
    return new DOMParser().parseFromString(html, 'text/html');
}

function cleanElementText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,button,form,nav,aside,. 광고,.ads,.ad').forEach(node => node.remove());
    return normalizeNovelText(clone.textContent);
}

function isChapterLink(url) {
    return /\/read\/v\d+\/c\d+(?:[/?#]|$)/i.test(url);
}

export function isBakaChapterLink(url) {
    try {
        const parsed = new URL(String(url || ''), BAKA_ORIGIN);
        return parsed.origin === BAKA_ORIGIN && /^\/chapters\/[^/?#]+\/?$/i.test(parsed.pathname);
    } catch { return false; }
}

function isBakaFictionLink(url) {
    try {
        const parsed = new URL(String(url || ''), BAKA_ORIGIN);
        return parsed.origin === BAKA_ORIGIN && /^\/fictions\/[^/?#]+\/?$/i.test(parsed.pathname);
    } catch { return false; }
}

function bakaSourceUrl(item = {}) {
    const candidates = [item.readerUrl, item.url, item.externalReadUrl, ...(Array.isArray(item.externalUrls) ? item.externalUrls : [])];
    return candidates.map(absoluteBakaUrl).find(url => isBakaFictionLink(url) || isBakaChapterLink(url)) || '';
}

const chapterCommentStartPattern = /^(?:комментарии.*|коментарі.*|новые.*|нові.*|настройки.*|налаштування.*|правила.*|написать комментар.*|написати коментар.*|сказать спасибо.*|сказати дякую.*|оценить перевод.*|оцінити переклад.*|поддержать.*|підтримати.*)$/i;

function isChapterNoiseLine(value, heading = '') {
    const line = normalizeNovelText(value);
    if (!line || line === normalizeNovelText(heading)) return true;
    if (line.includes('http://') || line.includes('https://') || line.toLowerCase().includes('www.')) return true;
    if (line.startsWith('![')) return true;
    if (/^(?:title|url source|published time|markdown content):/i.test(line)) return true;
    if (/^(?:реклама|отключить рекламу|оглавление|назад|вперёд|вперед|попередній|наступний)/i.test(line)) return true;
    return false;
}

function sanitizeChapterLines(lines, heading = '') {
    const normalized = (Array.isArray(lines) ? lines : []).map(normalizeNovelText).filter(Boolean);
    const commentStart = normalized.findIndex(line => chapterCommentStartPattern.test(line));
    const content = commentStart >= 0 ? normalized.slice(0, commentStart) : normalized;
    return content.filter(line => !isChapterNoiseLine(line, heading));
}

function cloneChapterRoot(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,button,form,nav,aside,footer,[class*="comment"],[class*="comments"],[class*="discussion"],[class*="rating"],[id*="comment"],[id*="comments"],[data-testid*="comment"]').forEach(node => node.remove());
    return clone;
}

export function parseRanobeChapterHtml(html, chapterUrl = '') {
    if (isMarkdownPage(html)) return parseRanobeMarkdown(html, chapterUrl);
    const document = parseDocument(html);
    const candidates = [...document.querySelectorAll('main,article,[class*="chapter"],[class*="reader"],[class*="text"]')];
    const root = candidates.sort((a, b) => cleanElementText(b).length - cleanElementText(a).length)[0] || document.body;
    const cleanRoot = cloneChapterRoot(root);
    const heading = cleanRoot.querySelector('h1,h2,h3')?.textContent || document.title || 'Розділ';
    const paragraphs = sanitizeChapterLines([...cleanRoot.querySelectorAll('p,blockquote,li')]
        .map(node => normalizeNovelText(node.textContent))
        .filter(text => text.length >= 2), heading);
    const uniqueParagraphs = [];
    const seen = new Set();
    for (const paragraph of paragraphs) {
        if (!seen.has(paragraph)) { seen.add(paragraph); uniqueParagraphs.push(paragraph); }
    }
    if (!uniqueParagraphs.length) {
        const fallback = sanitizeChapterLines(cleanElementText(cleanRoot).split(/\n+/), heading);
        uniqueParagraphs.push(...fallback.slice(0, 500));
    }
    const links = [...document.querySelectorAll('a[href]')].map(anchor => ({
        url: absoluteUrl(anchor.href), label: normalizeNovelText(anchor.textContent)
    })).filter(item => isChapterLink(item.url));
    const prev = links.find(item => /назад|предыдущ/i.test(item.label))?.url || links[0]?.url || '';
    const next = links.find(item => /вперёд|вперед|следующ/i.test(item.label))?.url || links[1]?.url || '';
    const imageUrls = [...new Set([...cleanRoot.querySelectorAll('img[src]')].map(node => absoluteUrl(node.getAttribute('src') || node.src)).filter(isRanobeChapterImageUrl))];
    return { title: normalizeNovelText(heading), paragraphs: uniqueParagraphs, imageUrls, chapterUrl: absoluteUrl(chapterUrl), prevUrl: prev, nextUrl: next };
}

export function parseRanobeChapterList(html, currentUrl = '') {
    if (isMarkdownPage(html)) {
        const items = parseMarkdownLinks(html).filter(item => isChapterLink(item.url)).map(item => ({ url: item.url, title: item.label || item.url }));
        const unique = [...new Map(items.map(item => [item.url, item])).values()];
        if (currentUrl && !unique.some(item => item.url === absoluteUrl(currentUrl)) && isChapterLink(currentUrl)) unique.push({ url: absoluteUrl(currentUrl), title: 'Поточний розділ' });
        return unique;
    }
    const document = parseDocument(html);
    const items = [];
    const seen = new Set();
    for (const anchor of document.querySelectorAll('a[href]')) {
        const url = absoluteUrl(anchor.href);
        if (!isChapterLink(url) || seen.has(url)) continue;
        seen.add(url);
        items.push({ url, title: normalizeNovelText(anchor.textContent) || url });
    }
    if (currentUrl && !seen.has(absoluteUrl(currentUrl)) && isChapterLink(currentUrl)) items.push({ url: absoluteUrl(currentUrl), title: 'Поточний розділ' });
    return items;
}

export function parseBakaChapterList(markdown, currentUrl = '') {
    const unique = new Map();
    for (const match of String(markdown || '').matchAll(/\[([^\]]*)\]\((https:\/\/baka\.in\.ua\/chapters\/[^)]+)\)/gi)) {
        const url = absoluteBakaUrl(match[2]);
        if (!isBakaChapterLink(url) || unique.has(url)) continue;
        unique.set(url, { url, title: normalizeNovelText(match[1]) || 'Розділ' });
    }
    const chapters = [...unique.values()];
    if (currentUrl && isBakaChapterLink(currentUrl) && !unique.has(absoluteBakaUrl(currentUrl))) {
        chapters.push({ url: absoluteBakaUrl(currentUrl), title: 'Поточний розділ' });
    }
    return chapters;
}

export function selectBakaStartChapter(chapters = []) {
    const list = Array.isArray(chapters) ? chapters.filter(Boolean) : [];
    return list.find(chapter => !/\/chapters\/[^/?#]*-rozdil-0(?:[/?#]|$)/i.test(chapter.url || '')) || list[0] || null;
}

export function parseBakaChapterMarkdown(markdown, chapterUrl = '') {
    const source = String(markdown || '');
    const content = source.split(/Markdown Content:\s*/i)[1] || source;
    const headingMatch = content.match(/^#\s+(.+)$/m);
    const trailing = content.slice(headingMatch?.index ?? 0);
    const footerMatch = trailing.match(/\n##\s+\[[^\]]+\]\(https:\/\/baka\.in\.ua\/fictions\//i);
    const chapterBody = footerMatch ? trailing.slice(0, footerMatch.index) : trailing;
    const heading = normalizeNovelText(headingMatch?.[1] || 'Розділ');
    const links = parseBakaChapterList(chapterBody, chapterUrl);
    const navigation = [...chapterBody.matchAll(/\[([^\]]+)\]\((https:\/\/baka\.in\.ua\/chapters\/[^)]+)\)/gi)]
        .map(match => ({ label: normalizeNovelText(match[1]), url: absoluteBakaUrl(match[2]) }))
        .filter(item => isBakaChapterLink(item.url));
    const imagePattern = /!\[[^\]]*\]\s*\((https?:\/\/[^)\s]+)\)/g;
    const imageUrls = [...chapterBody.matchAll(imagePattern)]
        .map(match => absoluteBakaUrl(match[1]))
        .filter(url => url && !/\/fictions\//i.test(url));
    const paragraphs = chapterBody.split(/\n+/)
        .map(line => normalizeNovelText(line
            .replace(imagePattern, '')
            .replace(/^#{1,6}\s+/, '')
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')))
        .filter(line => line && line !== heading && !/^(?:автор:|·|наступний розділ|попередній розділ|налаштування читання|підлаштуйте вигляд|шрифт|розмір шрифту|темна тема|коментарі|дізнатися більше|ресурси|історія|класична музика|книги|законодавство|автозакриття|файли cookie)/i.test(line))
        .filter(line => !(/^(?:[-+]|\d+px|увімкнено|вимкнено)$/i.test(line)));
    const chapterAbsolute = absoluteBakaUrl(chapterUrl);
    return {
        title: heading,
        paragraphs,
        imageUrls: [...new Set(imageUrls)],
        sourceLanguage: 'uk',
        chapterUrl: chapterAbsolute,
        prevUrl: navigation.find(item => /попередній/i.test(item.label))?.url || '',
        nextUrl: navigation.find(item => /наступний/i.test(item.label))?.url || '',
        chapterList: links
    };
}

async function fetchBakaMarkdown(url, options = {}) {
    const source = absoluteBakaUrl(url);
    if (!source) throw new Error('Baka URL відсутній');
    const response = await fetchRanobeText(`${JINA_READER_ORIGIN}${source}`, { mode: 'cors', credentials: 'omit', cache: 'no-cache', headers: { Accept: 'text/plain,text/markdown' }, ...options });
    if (!response.ok) throw new Error(`Baka: HTTP ${response.status}`);
    const text = await response.text();
    if (!text || text.length < 100) throw new Error('Baka повернула порожню сторінку');
    return text;
}

function isBakaIntroChapterUrl(url) {
    return /\/chapters\/[^/?#]*-rozdil-0(?:[/?#]|$)/i.test(String(url || ''));
}

async function resolveBakaReaderUrl(sourceUrl) {
    const source = absoluteBakaUrl(sourceUrl);
    if (isBakaChapterLink(source)) return source;
    if (!isBakaFictionLink(source)) return '';
    if (bakaReaderPendingCache.has(source)) return bakaReaderPendingCache.get(source);
    const pending = fetchBakaMarkdown(source)
        .then(async markdown => {
            const first = selectBakaStartChapter(parseBakaChapterList(markdown))?.url || '';
            if (!isBakaIntroChapterUrl(first)) return first;
            const intro = parseBakaChapterMarkdown(await fetchBakaMarkdown(first), first);
            return intro.nextUrl || first;
        })
        .catch(() => '')
        .finally(() => bakaReaderPendingCache.delete(source));
    bakaReaderPendingCache.set(source, pending);
    return pending;
}

export async function fetchRanobeChaptersDirect(slug) {
    const cleanSlug = String(slug || '').trim().replace(/^https?:\/\/ranobelib\.me\/ru\/(?:book\/)?/i, '').replace(/\/.*$/, '');
    if (!cleanSlug) return [];
    if (ranobeChaptersCache.has(cleanSlug)) return ranobeChaptersCache.get(cleanSlug);
    try {
        const response = await fetchRanobeText(`https://api.cdnlibs.org/api/manga/${encodeURIComponent(cleanSlug)}/chapters`, {
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`Ranobe chapters API: HTTP ${response.status}`);
        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];
        const chapters = data.map((item, index) => {
            const vol = item?.volume ?? 1;
            const num = item?.number ?? index;
            const name = item?.name ? normalizeNovelText(item.name) : `Том ${vol} Глава ${num}`;
            const url = `https://ranobelib.me/ru/${cleanSlug}/read/v${vol}/c${num}`;
            return { id: item?.id, volume: String(vol), number: String(num), name, title: name, url };
        });
        if (chapters.length) ranobeChaptersCache.set(cleanSlug, chapters);
        return chapters;
    } catch {
        return [];
    }
}

export async function fetchRanobeChapter(chapterUrl, options = {}) {
    if (isBakaChapterLink(chapterUrl)) {
        const markdown = await fetchBakaMarkdown(chapterUrl, options);
        const chapter = parseBakaChapterMarkdown(markdown, chapterUrl);
        const fictionUrl = [...String(markdown).matchAll(/https:\/\/baka\.in\.ua\/fictions\/[^)\s]+/gi)]
            .map(match => absoluteBakaUrl(match[0]))
            .find(isBakaFictionLink) || '';
        let chapterList = chapter.chapterList || [];
        if (fictionUrl) {
            try { chapterList = parseBakaChapterList(await fetchBakaMarkdown(fictionUrl), chapterUrl); } catch { /* Current chapter remains readable without the full list. */ }
        }
        const currentIndex = chapterList.findIndex(item => item.url === chapter.chapterUrl);
        return {
            ...chapter,
            chapterList,
            prevUrl: currentIndex > 0 ? chapterList[currentIndex - 1].url : chapter.prevUrl,
            nextUrl: currentIndex >= 0 && currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1].url : chapter.nextUrl
        };
    }

    const chapterAbsolute = absoluteUrl(chapterUrl);
    const apiMatch = chapterAbsolute.match(/\/ru\/([^/]+)\/read\/v(\d+)\/c([^/?#]+)/i);

    if (apiMatch) {
        const [, slug, volume, number] = apiMatch;
        try {
            const [chapterRes, chaptersList] = await Promise.all([
                fetchRanobeText(`https://api.cdnlibs.org/api/manga/${encodeURIComponent(slug)}/chapter?number=${encodeURIComponent(number)}&volume=${encodeURIComponent(volume)}`, {
                    headers: { Accept: 'application/json' }
                }),
                fetchRanobeChaptersDirect(slug).catch(() => [])
            ]);

            if (chapterRes.ok) {
                const chapterJson = await chapterRes.json();
                const chapterData = chapterJson?.data || {};
                const rawContent = String(chapterData?.content || '');

                if (rawContent && rawContent.length > 50) {
                    const heading = normalizeNovelText(chapterData?.name || `Том ${volume} Глава ${number}`);
                    let paragraphs = [];

                    if (typeof DOMParser !== 'undefined') {
                        const doc = new DOMParser().parseFromString(`<div>${rawContent}</div>`, 'text/html');
                        const pNodes = [...doc.querySelectorAll('p,blockquote,li')];
                        if (pNodes.length) {
                            paragraphs = pNodes.map(p => normalizeNovelText(p.textContent)).filter(t => t.length >= 2);
                        }
                    }

                    if (!paragraphs.length) {
                        paragraphs = rawContent
                            .replace(/<\/p>/gi, '\n')
                            .replace(/<br\s*\/?>/gi, '\n')
                            .replace(/<[^>]+>/g, '')
                            .split(/\n+/)
                            .map(normalizeNovelText)
                            .filter(t => t.length >= 2);
                    }

                    paragraphs = sanitizeChapterLines(paragraphs, heading);

                    const imageUrls = [];
                    const attachments = Array.isArray(chapterData?.attachments) ? chapterData.attachments : [];
                    for (const att of attachments) {
                        const imgUrl = att?.url || att?.file || att?.image;
                        if (imgUrl) imageUrls.push(absoluteUrl(imgUrl));
                    }

                    const currentIndex = chaptersList.findIndex(item => item.url === chapterAbsolute || (item.volume === String(volume) && item.number === String(number)));
                    const prevUrl = currentIndex > 0 ? chaptersList[currentIndex - 1].url : '';
                    const nextUrl = currentIndex >= 0 && currentIndex < chaptersList.length - 1 ? chaptersList[currentIndex + 1].url : '';

                    return {
                        title: heading,
                        paragraphs: paragraphs.length ? paragraphs : ['Розділ завантажено.'],
                        imageUrls,
                        chapterUrl: chapterAbsolute,
                        prevUrl,
                        nextUrl,
                        chapterList: chaptersList
                    };
                }
            }
        } catch (apiError) {
            console.warn('Ranobe direct chapter API fallback to scraper:', apiError);
        }
    }

    const chapterHtml = await fetchRanobeHtml(chapterUrl, options);
    const chapter = parseRanobeChapterHtml(chapterHtml, chapterUrl);
    let chapterList = parseRanobeChapterList(chapterHtml, chapterUrl);
    const bookUrl = chapterAbsolute.replace(/\/ru\/([^/]+)\/read\/v\d+\/c\d+(?:[/?#].*)?$/i, '/ru/book/$1');
    if (chapterList.length <= 1 && bookUrl) {
        try { chapterList = parseRanobeChapterList(await fetchRanobeHtml(`${bookUrl}?section=chapters`), chapterUrl); } catch { /* chapter content remains usable without book-page proxy */ }
    }
    const currentIndex = chapterList.findIndex(item => item.url === absoluteUrl(chapterUrl));
    return {
        ...chapter,
        chapterList,
        prevUrl: currentIndex > 0 ? chapterList[currentIndex - 1].url : chapter.prevUrl,
        nextUrl: currentIndex >= 0 && currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1].url : chapter.nextUrl
    };
}

function cleanUkrainianText(text) {
    return String(text || '')
        .replace(/([\u0400-\u04FF])'([\u0400-\u04FF])/g, '$1’$2')
        .replace(/(?:^|\n)- /g, '$1— ')
        .replace(/(?:^|\n)– /g, '$1— ')
        .trim();
}

async function translateChunk(text) {
    const value = normalizeNovelText(text);
    if (!value) return '';
    if (translationCache.has(value)) return translationCache.get(value);

    // Primary: Google dict-chrome-ex (Fastest, clean, CORS-friendly)
    try {
        const query = new URLSearchParams({ client: 'dict-chrome-ex', sl: 'auto', tl: 'uk', q: value });
        const response = await fetch(`${TRANSLATE_ENDPOINT}?${query}`, { mode: 'cors', credentials: 'omit' });
        if (response.ok) {
            const data = await response.json();
            const translated = Array.isArray(data?.[0]) ? data[0][0] : (typeof data?.[0] === 'string' ? data[0] : '');
            if (translated && typeof translated === 'string') {
                const cleaned = cleanUkrainianText(translated);
                translationCache.set(value, cleaned);
                persistTranslationCache();
                return cleaned;
            }
        }
    } catch { /* try fallback 1 */ }

    // Fallback 1: Google translate single client=at
    try {
        const query = new URLSearchParams({ client: 'at', sl: 'auto', tl: 'uk', dt: 't', q: value });
        const response = await fetch(`${TRANSLATE_FALLBACK_AT}?${query}`, { mode: 'cors', credentials: 'omit' });
        if (response.ok) {
            const data = await response.json();
            const pieces = Array.isArray(data?.[0]) ? data[0].map(row => row?.[0] || '').join('') : '';
            if (pieces) {
                const cleaned = cleanUkrainianText(pieces);
                translationCache.set(value, cleaned);
                persistTranslationCache();
                return cleaned;
            }
        }
    } catch { /* try fallback 2 */ }

    // Fallback 2: MyMemory API
    try {
        const query = new URLSearchParams({ q: value.slice(0, 500), langpair: 'ru|uk' });
        const response = await fetch(`${TRANSLATE_FALLBACK_MYMEMORY}?${query}`, { mode: 'cors', credentials: 'omit' });
        if (response.ok) {
            const data = await response.json();
            const translated = data?.responseData?.translatedText;
            if (translated && typeof translated === 'string') {
                const cleaned = cleanUkrainianText(translated);
                translationCache.set(value, cleaned);
                persistTranslationCache();
                return cleaned;
            }
        }
    } catch { /* try fallback 3 */ }

    // Fallback 3: Google GTX with sl=auto
    try {
        const query = new URLSearchParams({ client: 'gtx', sl: 'auto', tl: 'uk', dt: 't', q: value });
        const response = await fetch(`${TRANSLATE_FALLBACK_GTX}?${query}`, { mode: 'cors', credentials: 'omit' });
        if (response.ok) {
            const data = await response.json();
            const translated = Array.isArray(data?.[0]) ? data[0].map(row => row?.[0] || '').join('') : '';
            if (translated) {
                const cleaned = cleanUkrainianText(translated);
                translationCache.set(value, cleaned);
                persistTranslationCache();
                return cleaned;
            }
        }
    } catch { /* return original */ }

    return value;
}

function splitTranslationBatches(paragraphs, maxChars = 2000) {
    const batches = []; let current = []; let length = 0;
    for (const paragraph of paragraphs) {
        const nextLength = length + paragraph.length + 2;
        if (current.length && nextLength > maxChars) { batches.push(current); current = []; length = 0; }
        current.push(paragraph); length += paragraph.length + 2;
    }
    if (current.length) batches.push(current);
    return batches;
}

export async function translateNovelParagraphs(paragraphs, options = {}) {
    const source = (Array.isArray(paragraphs) ? paragraphs : []).map(normalizeNovelText).filter(Boolean);
    if (!source.length) return [];
    const result = [];
    const maxChars = options.maxChars || 1500;
    for (const batch of splitTranslationBatches(source, maxChars)) {
        try {
            const translated = await translateChunk(batch.join('\n\n'));
            const pieces = translated.split(/\n{2,}/).map(normalizeNovelText).filter(Boolean);
            if (pieces.length === batch.length) { result.push(...pieces); continue; }
        } catch { /* fallback to smaller requests below */ }
        const pending = [...batch]; const translatedBatch = new Array(batch.length); let cursor = 0;
        const worker = async () => {
            while (cursor < pending.length) {
                const index = cursor++;
                try { translatedBatch[index] = await translateChunk(pending[index]); }
                catch { translatedBatch[index] = pending[index]; }
            }
        };
        await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker));
        result.push(...translatedBatch);
    }
    return result;
}

function ranobeApiBookUrl(item) {
    const slug = item?.slug_url || (item?.id ? `${item.id}--${item.slug || ''}` : '');
    return slug ? `${RANOBELIB_ORIGIN}/ru/book/${slug}` : '';
}

function ranobeApiPoster(item) {
    return item?.cover?.default || item?.cover?.md || item?.cover?.thumbnail || '';
}

function ranobeStatusUa(value) {
    const key = normalizeNovelText(value).toLowerCase();
    if (/ongoing|онго|выходит|актив/.test(key)) return 'Онґоїнг';
    if (/finished|completed|заверш/.test(key)) return 'Завершено';
    if (/paused|приостанов/.test(key)) return 'Призупинено';
    if (/cancel|прекращ/.test(key)) return 'Скасовано';
    return value ? normalizeNovelText(value) : '';
}

function ranobeApiItem(item) {
    const originalTitle = cleanRanobeCatalogTitle(item?.rus_name || item?.name || item?.eng_name || 'Без назви');
    const bookUrl = ranobeApiBookUrl(item);
    const poster = ranobeApiPoster(item);
    const rawGenres = item?.genres || item?.genre || item?.tags || item?.categories || [];
    const genres = (Array.isArray(rawGenres) ? rawGenres : [rawGenres]).map(genre => {
        if (typeof genre === 'string') return normalizeNovelText(genre);
        return normalizeNovelText(genre?.name_ua || genre?.name || genre?.label || '');
    }).filter(Boolean);
    return {
        title: originalTitle,
        originalTitle,
        poster,
        url: bookUrl,
        readerUrl: '',
        readerAvailable: false,
        ranobeId: item?.id || '',
        ranobeSlug: item?.slug_url || item?.slug || '',
        score: Number(item?.rating?.average || 0),
        year: String(item?.releaseDateString || '').slice(0, 4),
        status: ranobeStatusUa(item?.status?.label || item?.status || ''),
        ageRating: item?.ageRestriction?.label || item?.ageRestriction?.name || '',
        originLabel: item?.type?.label || item?.type?.name || '',
        typeLabel: 'Ранобе',
        synopsis: '',
        genres: [...new Set(genres)],
        source: 'ranobelib'
    };
}

function attachRanobeCatalogShape(item) {
    return {
        ...item,
        type: 'novel', typeLabel: item.typeLabel || 'Ранобе', from: 'ranobelib',
        images: { jpg: { large_image_url: item.poster, image_url: item.poster } }
    };
}

async function fetchRanobeApiPage(page = 1, query = '') {
    const params = new URLSearchParams({ page: String(Math.max(1, Number(page) || 1)), 'site_id[]': String(RANOBELIB_SITE_ID), per_page: '60' });
    params.append('fields[]', 'rate'); params.append('fields[]', 'rate_avg'); params.append('fields[]', 'userBookmark');
    if (query) params.set('search', query);
    const response = await fetch(`${RANOBELIB_API}?${params}`, { mode: 'cors', credentials: 'omit', cache: 'no-cache', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`RanobeLib API: HTTP ${response.status}`);
    const payload = await response.json();
    const data = Array.isArray(payload?.data) ? payload.data : [];
    const parsed = data.map(ranobeApiItem).filter(item => item.url && item.poster);
    const meta = payload?.meta || {};
    return { items: parsed, total: Number(meta.total || payload?.total || 0), hasNextPage: Boolean(meta.has_next_page || payload?.links?.next || (meta.current_page && meta.last_page && meta.current_page < meta.last_page)), page: Number(meta.current_page || page), lastPage: Number(meta.last_page || 0) };
}

function cleanRanobeCatalogTitle(value) {
    return normalizeNovelText(value).replace(/\s+(?:Корея|Китай|Япония|Английский|Авторский|Фанфик)$/i, '').trim();
}

function parseRanobeCatalogMarkdown(text) {
    const source = String(text || ''); const items = [];
    const blocks = source.split(/(?=\[?!\[[^\]]*\]\(https?:\/\/cover\.cdnlibs\.org)/i);
    for (const block of blocks) {
        const poster = block.match(/!?\[[^\]]*\]\((https?:\/\/cover\.cdnlibs\.org[^)]+)\)/i)?.[1] || '';
        const chapterMatch = block.match(/\[([^\]]*)\]\((https?:\/\/ranobelib\.me\/ru\/[^)]+\/read\/v\d+\/c[^)]+)\)/i);
        const bookMatch = block.match(/\[([^\]]+)\]\((https?:\/\/ranobelib\.me\/ru\/book\/[^)]+)\)/is);
        if (!poster || !bookMatch) continue;
        const title = cleanRanobeCatalogTitle(bookMatch[1].split(/\n+/)[0]);
        const bookUrl = absoluteUrl(bookMatch[2]); const chapterUrl = chapterMatch ? absoluteUrl(chapterMatch[2]) : '';
        if (!title || !bookUrl) continue;
        items.push({ title, originalTitle: title, poster, url: bookUrl, readerUrl: chapterUrl, readerAvailable: Boolean(chapterUrl), source: 'ranobelib' });
    }
    return [...new Map(items.map(item => [item.url, item])).values()];
}

function parseRanobeCatalogHtml(html) {
    const document = parseDocument(html); const items = []; const seen = new Set();
    for (const image of document.querySelectorAll('img[src*="cover.cdnlibs.org"],img[data-src*="cover.cdnlibs.org"]')) {
        const poster = image.getAttribute('src') || image.getAttribute('data-src') || ''; const card = image.closest('article,li,div');
        const bookAnchor = card?.querySelector('a[href*="/book/"]') || [...document.querySelectorAll('a[href*="/book/"]')].find(anchor => normalizeNovelText(anchor.textContent));
        if (!bookAnchor) continue;
        const bookUrl = absoluteUrl(bookAnchor.href); const title = cleanRanobeCatalogTitle(bookAnchor.textContent); if (!bookUrl || !title || seen.has(bookUrl)) continue;
        seen.add(bookUrl); const chapterAnchor = card?.querySelector('a[href*="/read/v"]');
        items.push({ title, originalTitle: title, poster, url: bookUrl, readerUrl: chapterAnchor ? absoluteUrl(chapterAnchor.href) : '', readerAvailable: Boolean(chapterAnchor), source: 'ranobelib' });
    }
    return items;
}

export async function fetchRanobeCatalogTotal(query = '', options = {}) {
    const cacheKey = String(query || '').trim().toLowerCase() || '__all__';
    if (!query && !options.forceScan) return RANOBELIB_TOTAL_COUNT;
    const cached = ranobeTotalCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < (options.cacheTtl || 15 * 60 * 1000)) return cached.total;
    const maxPages = Number(options.maxPages || 2000);
    const first = await fetchRanobeApiPage(1, query);
    if (!first.items.length) return 0;
    const pageSize = Math.max(first.items.length, 60);
    let low = 1;
    let high = 1;
    let highResult = first;
    // Find an empty/terminal page exponentially, avoiding hundreds of sequential requests.
    while (high < maxPages && highResult.items.length && highResult.hasNextPage) {
        low = high;
        high = Math.min(high * 2, maxPages);
        highResult = await fetchRanobeApiPage(high, query);
    }
    let lastPage;
    let lastResult;
    if (highResult.items.length && !highResult.hasNextPage) {
        lastPage = high;
        lastResult = highResult;
    } else {
        // Binary-search the last non-empty page in [low, high].
        let left = low;
        let right = high;
        while (left + 1 < right) {
            const middle = Math.floor((left + right) / 2);
            const result = await fetchRanobeApiPage(middle, query);
            if (result.items.length) left = middle;
            else right = middle;
        }
        lastPage = left;
        lastResult = await fetchRanobeApiPage(lastPage, query);
    }
    const total = Math.max(0, (lastPage - 1) * pageSize + lastResult.items.length);
    ranobeTotalCache.set(cacheKey, { total, timestamp: Date.now() });
    return total;
}

export async function fetchRanobeCatalogPage(page = 1, query = '') {
    let result;
    try {
        result = await fetchRanobeApiPage(page, normalizeNovelText(query));
    } catch (error) {
        console.warn('RanobeLib API catalog failed, using HTML fallback:', error);
        const catalogUrl = query
            ? `${RANOBELIB_ORIGIN}/ru/catalog?search=${encodeURIComponent(query)}`
            : `${RANOBELIB_ORIGIN}/ru/catalog${Number(page) > 1 ? `?page=${Number(page)}` : ''}`;
        const source = await fetchRanobeHtml(catalogUrl, { force: true });
        const parsed = isMarkdownPage(source) ? parseRanobeCatalogMarkdown(source) : parseRanobeCatalogHtml(source);
        result = { items: parsed, total: parsed.length, hasNextPage: false, page };
    }
    const translated = await translateNovelParagraphs(result.items.map(item => item.originalTitle), { maxChars: 900 });
    const items = result.items.map((item, index) => attachRanobeCatalogShape({ ...item, title: translated[index] || item.originalTitle }));
    // The unfiltered catalog boundary is verified and intentionally independent
    // from the API's missing/inconsistent meta.total field.
    const catalogTotal = normalizeNovelText(query) ? result.total : RANOBELIB_TOTAL_COUNT;
    homeCatalogCatalogMeta(items, page, result.hasNextPage, catalogTotal);
    return items;
}

function homeCatalogCatalogMeta(items, page, hasNextPage, total = items.length) {
    Object.defineProperties(items, {
        total: { value: Number(total) || items.length, enumerable: false },
        hasNextPage: { value: Boolean(hasNextPage), enumerable: false },
        pagination: { value: { total: Number(total) || items.length, page: Number(page) || 1, hasNextPage: Boolean(hasNextPage) }, enumerable: false }
    });
    return items;
}

export async function searchRanobe(query, options = {}) {
    const phrase = normalizeNovelText(query);
    if (!phrase) return [];

    // Primary: fast direct JSON API search
    try {
        const res = await fetchRanobeText(`https://api.cdnlibs.org/api/manga?q=${encodeURIComponent(phrase)}&site_id[]=3&per_page=20`, {
            headers: { Accept: 'application/json' },
            ...options
        });
        if (res.ok) {
            const payload = await res.json();
            const data = Array.isArray(payload?.data) ? payload.data : [];
            const matches = [];
            for (const item of data) {
                const title = cleanRanobeCatalogTitle(item?.rus_name || item?.name || item?.eng_name || '');
                const slug = item?.slug_url || (item?.id ? `${item.id}--${item.slug || ''}` : '');
                if (!title || !slug) continue;
                const url = `${RANOBELIB_ORIGIN}/ru/book/${slug}`;
                matches.push({ url, title, slug, score: scoreNovelTitleMatch(phrase, title) });
            }
            if (matches.length) return matches.sort((a, b) => b.score - a.score);
        }
    } catch { /* fallback to HTML scraper */ }

    const url = `${RANOBELIB_ORIGIN}/ru?section=search&phrase=${encodeURIComponent(phrase)}`;
    try {
        const html = await fetchRanobeHtml(url, options);
        const document = parseDocument(html);
        const matches = []; const seen = new Set();
        for (const anchor of document.querySelectorAll('a[href*="/book/"]')) {
            const href = absoluteUrl(anchor.href); const title = normalizeNovelText(anchor.textContent);
            if (!href || seen.has(href) || !title) continue;
            seen.add(href); matches.push({ url: href, title, score: scoreNovelTitleMatch(phrase, title) });
        }
        return matches.sort((a, b) => b.score - a.score);
    } catch {
        return [];
    }
}

async function resolveChapterFromBookPage(bookUrl) {
    if (!bookUrl) return '';
    const slugMatch = String(bookUrl).match(/\/ru\/(?:book\/)?([^/?#]+)/i);
    if (slugMatch) {
        const chapters = await fetchRanobeChaptersDirect(slugMatch[1]);
        if (chapters.length) return chapters[0].url;
    }
    try {
        const html = await fetchRanobeHtml(bookUrl);
        const links = parseRanobeChapterList(html, '');
        return links[0]?.url || '';
    } catch { return ''; }
}

async function resolveRanobeReaderInternal(item = {}) {
    if (isChapterLink(item.readerUrl)) return { ...item, readerAvailable: true };

    const targetSlug = item.ranobeSlug || (item.url ? String(item.url).match(/\/ru\/(?:book\/)?([^/?#]+)/i)?.[1] : '');
    if (targetSlug) {
        const directChapters = await fetchRanobeChaptersDirect(targetSlug);
        if (directChapters.length) {
            const firstChapter = directChapters[0].url;
            return {
                ...item,
                readerAvailable: true,
                readerUrl: firstChapter,
                ranobeUrl: item.url || `${RANOBELIB_ORIGIN}/ru/book/${targetSlug}`,
                chaptersCount: directChapters.length
            };
        }
    }

    if (item.url && /\/ru\/book\//i.test(item.url)) {
        const directChapter = await resolveChapterFromBookPage(item.url);
        if (directChapter) return { ...item, readerAvailable: true, readerUrl: directChapter, ranobeUrl: item.url };
    }

    const queries = [item.title, item.title_original, item.title_en, item.originalTitle].filter(Boolean);
    let matches = [];
    for (const query of queries) {
        try { matches = await searchRanobe(query); } catch { matches = []; }
        if (matches.length) break;
    }
    const best = matches[0];
    if (!best || best.score < 0.35) return { ...item, readerAvailable: false, readerUrl: '' };
    const directChapter = await resolveChapterFromBookPage(best.url);
    return { ...item, readerAvailable: Boolean(directChapter), readerUrl: directChapter, ranobeUrl: best.url, ranobeTitle: best.title, ranobeMatchScore: best.score };
}

const ranobeResolvedCache = new Map();

// LocalStorage cache helpers for ranobe
const NOVEL_STORAGE_PREFIX = 'vakdab_novel_';
function loadNovelStoredCache(key) {
    try {
        if (typeof localStorage === 'undefined') return null;
        const item = localStorage.getItem(NOVEL_STORAGE_PREFIX + key);
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (parsed.exp && parsed.exp < Date.now()) {
            localStorage.removeItem(NOVEL_STORAGE_PREFIX + key);
            return null;
        }
        return parsed.data;
    } catch { return null; }
}

function saveNovelStoredCache(key, data, ttlMs = 7 * 24 * 3600 * 1000) {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(NOVEL_STORAGE_PREFIX + key, JSON.stringify({ data, exp: Date.now() + ttlMs }));
    } catch { /* storage full */ }
}

export function saveNovelReadingProgress(slugOrUrl, chapterUrl) {
    if (!slugOrUrl) return;
    try {
        if (typeof localStorage === 'undefined') return;
        const key = `prog_${encodeURIComponent(slugOrUrl)}`;
        saveNovelStoredCache(key, { chapterUrl, updatedAt: Date.now() }, 30 * 24 * 3600 * 1000);
    } catch { /* ignore */ }
}

export function getNovelReadingProgress(slugOrUrl) {
    if (!slugOrUrl) return null;
    return loadNovelStoredCache(`prog_${encodeURIComponent(slugOrUrl)}`);
}

export async function resolveRanobeReader(item = {}) {
    const bakaUrl = bakaSourceUrl(item);
    if (bakaUrl) {
        const readerUrl = await resolveBakaReaderUrl(bakaUrl);
        return { ...item, readerAvailable: Boolean(readerUrl), readerUrl };
    }
    if (isChapterLink(item.readerUrl)) return { ...item, readerAvailable: true };
    const cacheKey = [item.url, item.title, item.title_original, item.title_en, item.originalTitle].filter(Boolean).join('|');
    
    // Check in-memory & stored cache
    const cachedResolved = ranobeResolvedCache.get(cacheKey) || loadNovelStoredCache(`resolved_${cacheKey}`);
    if (cachedResolved && cachedResolved.readerUrl) return { ...item, ...cachedResolved };

    const fallback = { ...item, readerAvailable: false, readerUrl: '' };
    let pending = ranobeReaderPendingCache.get(cacheKey);
    if (!pending) {
        pending = resolveRanobeReaderInternal(item).then(res => {
            if (res && res.readerUrl) {
                ranobeResolvedCache.set(cacheKey, res);
                saveNovelStoredCache(`resolved_${cacheKey}`, res);
            }
            return res;
        }).catch(() => fallback);
        ranobeReaderPendingCache.set(cacheKey, pending);
        pending.finally(() => {
            if (ranobeReaderPendingCache.get(cacheKey) === pending) ranobeReaderPendingCache.delete(cacheKey);
        });
    }
    return Promise.race([
        pending,
        new Promise(resolve => setTimeout(() => resolve(fallback), RANOBE_RESOLVE_TIMEOUT_MS))
    ]);
}

export function clearNovelCaches() { htmlCache.clear(); translationCache.clear(); bakaReaderPendingCache.clear(); ranobeResolvedCache.clear(); }
