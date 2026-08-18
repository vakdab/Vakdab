const RANOBELIB_ORIGIN = 'https://ranobelib.me';
const RANOBELIB_PROXY = 'https://corsproxy.io/?url=';
const RANOBELIB_API = 'https://api.cdnlibs.org/api/manga';
const RANOBELIB_SITE_ID = 3;
const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const translationCache = new Map();
const htmlCache = new Map();

export const RANOBELIB_HOME = `${RANOBELIB_ORIGIN}/ru?section=home-updates`;

const absoluteUrl = value => {
    try { return new URL(String(value || ''), RANOBELIB_ORIGIN).href; } catch { return ''; }
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
            const response = await fetch(endpoint, { mode: 'cors', credentials: 'omit', cache: 'no-cache', headers: { Accept: 'text/plain,text/html' } });
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

function parseRanobeMarkdown(text, chapterUrl = '') {
    const lines = String(text || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
    const contentStart = Math.max(0, lines.findIndex(line => /^Markdown Content:/i.test(line)) + 1);
    const content = lines.slice(contentStart);
    const headingIndex = content.findIndex(line => /^#{1,3}\s/.test(line));
    const heading = (headingIndex >= 0 ? content[headingIndex] : lines[0] || 'Розділ').replace(/^#{1,3}\s+/, '');
    const body = headingIndex >= 0 ? content.slice(headingIndex + 1) : content;
    const paragraphs = body.map(line => line.replace(/^[-*]\s+/, '').replace(/^\[([^\]]+)\]$/, '$1').trim())
        .filter(line => line && !/^\[.*\]\(https?:\/\/.*\)$/.test(line) && !/^(реклама|отключить рекламу|оглавление|назад|вперёд|вперед)$/i.test(line) && !/^Title:|^URL Source:|^Published Time:|^Markdown Content:/i.test(line) && line !== heading);
    const links = parseMarkdownLinks(text).filter(item => isChapterLink(item.url));
    return { title: normalizeNovelText(heading), paragraphs, chapterUrl: absoluteUrl(chapterUrl), prevUrl: links[0]?.url || '', nextUrl: links[1]?.url || '' };
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

export function parseRanobeChapterHtml(html, chapterUrl = '') {
    if (isMarkdownPage(html)) return parseRanobeMarkdown(html, chapterUrl);
    const document = parseDocument(html);
    const candidates = [...document.querySelectorAll('main,article,[class*="chapter"],[class*="reader"],[class*="text"]')];
    const root = candidates.sort((a, b) => cleanElementText(b).length - cleanElementText(a).length)[0] || document.body;
    const heading = root.querySelector('h1,h2,h3')?.textContent || document.title || 'Розділ';
    const paragraphs = [...root.querySelectorAll('p,blockquote,li')]
        .map(node => normalizeNovelText(node.textContent))
        .filter(text => text.length >= 2 && !/^(реклама|отключить рекламу|назад|вперёд|вперед)$/i.test(text));
    const uniqueParagraphs = [];
    const seen = new Set();
    for (const paragraph of paragraphs) {
        if (!seen.has(paragraph)) { seen.add(paragraph); uniqueParagraphs.push(paragraph); }
    }
    if (!uniqueParagraphs.length) {
        const fallback = cleanElementText(root).split(/\n+/).map(normalizeNovelText).filter(Boolean);
        uniqueParagraphs.push(...fallback.slice(0, 500));
    }
    const links = [...document.querySelectorAll('a[href]')].map(anchor => ({
        url: absoluteUrl(anchor.href), label: normalizeNovelText(anchor.textContent)
    })).filter(item => isChapterLink(item.url));
    const prev = links.find(item => /назад|предыдущ/i.test(item.label))?.url || links[0]?.url || '';
    const next = links.find(item => /вперёд|вперед|следующ/i.test(item.label))?.url || links[1]?.url || '';
    return { title: normalizeNovelText(heading), paragraphs: uniqueParagraphs, chapterUrl: absoluteUrl(chapterUrl), prevUrl: prev, nextUrl: next };
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

export async function fetchRanobeChapter(chapterUrl, options = {}) {
    const chapterHtml = await fetchRanobeHtml(chapterUrl, options);
    const chapter = parseRanobeChapterHtml(chapterHtml, chapterUrl);
    let chapterList = [];
    const chapterAbsolute = absoluteUrl(chapterUrl);
    const bookUrl = chapterAbsolute.replace(/\/ru\/([^/]+)\/read\/v\d+\/c\d+(?:[/?#].*)?$/i, '/ru/book/$1');
    try { chapterList = parseRanobeChapterList(await fetchRanobeHtml(`${bookUrl}?section=chapters`), chapterUrl); } catch { chapterList = parseRanobeChapterList(chapterHtml, chapterUrl); }
    const currentIndex = chapterList.findIndex(item => item.url === absoluteUrl(chapterUrl));
    return {
        ...chapter,
        chapterList,
        prevUrl: currentIndex > 0 ? chapterList[currentIndex - 1].url : chapter.prevUrl,
        nextUrl: currentIndex >= 0 && currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1].url : chapter.nextUrl
    };
}

async function translateChunk(text) {
    const value = normalizeNovelText(text);
    if (!value) return '';
    if (translationCache.has(value)) return translationCache.get(value);
    const query = new URLSearchParams({ client: 'gtx', sl: 'ru', tl: 'uk', dt: 't', q: value });
    const response = await fetch(`${TRANSLATE_ENDPOINT}?${query}`, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error(`Перекладач: HTTP ${response.status}`);
    const data = await response.json();
    const translated = Array.isArray(data?.[0]) ? data[0].map(row => row?.[0] || '').join('') : '';
    if (!translated) throw new Error('Перекладач повернув порожню відповідь');
    translationCache.set(value, translated);
    return translated;
}

function splitTranslationBatches(paragraphs, maxChars = 3500) {
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
    const maxChars = options.maxChars || 1200;
    for (const batch of splitTranslationBatches(source, maxChars)) {
        try {
            const translated = await translateChunk(batch.join('\n\n'));
            const pieces = translated.split(/\n{2,}/).map(normalizeNovelText).filter(Boolean);
            if (pieces.length === batch.length) { result.push(...pieces); continue; }
        } catch { /* fallback to smaller requests below */ }
        const pending = [...batch]; const translatedBatch = new Array(batch.length); let cursor = 0;
        const worker = async () => { while (cursor < pending.length) { const index = cursor++; try { translatedBatch[index] = await translateChunk(pending[index]); } catch { translatedBatch[index] = pending[index]; } } };
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
        typeLabel: 'Ранобе',
        synopsis: '',
        genres: [],
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
    homeCatalogCatalogMeta(items, page, result.hasNextPage, result.total);
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
    const url = `${RANOBELIB_ORIGIN}/ru?section=search&phrase=${encodeURIComponent(phrase)}`;
    const html = await fetchRanobeHtml(url, options);
    const document = parseDocument(html);
    const matches = []; const seen = new Set();
    for (const anchor of document.querySelectorAll('a[href*="/book/"]')) {
        const href = absoluteUrl(anchor.href); const title = normalizeNovelText(anchor.textContent);
        if (!href || seen.has(href) || !title) continue;
        seen.add(href); matches.push({ url: href, title, score: scoreNovelTitleMatch(phrase, title) });
    }
    return matches.sort((a, b) => b.score - a.score);
}

async function resolveChapterFromBookPage(bookUrl) {
    if (!bookUrl) return '';
    try {
        const html = await fetchRanobeHtml(bookUrl);
        const links = parseRanobeChapterList(html, '');
        return links[0]?.url || '';
    } catch { return ''; }
}

export async function resolveRanobeReader(item = {}) {
    if (isChapterLink(item.readerUrl)) return { ...item, readerAvailable: true };
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

export function clearNovelCaches() { htmlCache.clear(); translationCache.clear(); }
