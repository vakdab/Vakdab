import { getProxyUrl } from '../utils/image.js';

const HONEY_API = 'https://data.api.honey-manga.com.ua';
const HONEY_WEB = 'https://honey-manga.com.ua';
const HONEY_IMAGE = 'https://hmvolumestorage.b-cdn.net/public-resources';
const DEFAULT_CHAPTER_URL = '';
const jsonCache = new Map();

function safeUrl(value, fallback = '') {
    try {
        const url = new URL(String(value || ''), window.location.href);
        return /^https?:$/i.test(url.protocol) ? url.href : fallback;
    } catch { return fallback; }
}
function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function normalizeChapterName(value = '') {
    if (value && typeof value === 'object') {
        const volume = value.volume ?? '';
        const chapter = value.chapterNum ?? '';
        const sub = value.subChapterNum ? `.${value.subChapterNum}` : '';
        const title = String(value.title || '').trim();
        return `Том ${volume} · Розділ ${chapter}${sub}${title ? `: ${title}` : ''}`;
    }
    const raw = String(value || '').trim().replace(/&amp;/g, '&');
    const parts = raw.split(/@#%&;№%#&\*\*#!@/).filter(Boolean);
    if (parts.length >= 2) return `Том ${parts[0]} · Розділ ${parts[1]}${parts.slice(2).join(' ').trim() ? `: ${parts.slice(2).join(' ').trim()}` : ''}`;
    return raw || 'Розділ без назви';
}
function pageImageUrl(content) {
    const value = String(content || '').trim();
    if (!value) return '';
    const direct = /^https?:\/\//i.test(value) ? value : `${HONEY_IMAGE}/${value}`;
    return direct.startsWith(HONEY_IMAGE) ? direct : getProxyUrl(direct, 'desktop');
}
function parseChapterUrl(value) {
    const url = safeUrl(value, '');
    const match = url.match(/\/read\/([0-9a-f-]{36})\/([0-9a-f-]{36})/i);
    if (!match) throw new Error('Неправильне посилання на розділ Honey Manga');
    return { chapterId: match[1], titleId: match[2], url };
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
async function loadFrames(chapterId, titleId) {
    const primary = `${HONEY_API}/v2/chapter/frames/${chapterId}/${titleId}`;
    let payload = await fetchJson(primary);
    let pages = extractPages(payload);
    if (!pages.length) {
        payload = await fetchJson(`${HONEY_API}/chapter/frames/${chapterId}/${titleId}`);
        pages = extractPages(payload);
    }
    return pages;
}
function loadBackgroundData(titleId, chapterId) {
    return Promise.allSettled([
        fetchJson(`${HONEY_API}/manga/${titleId}`),
        fetchJson(`${HONEY_API}/chapter/${chapterId}`),
        fetchJson(`${HONEY_API}/v2/chapter/cursor-list`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mangaId: titleId, page: 1, pageSize: 100, sort: { sortBy: 'chapterNum', sortOrder: 'ASC' } }) })
    ]).then(results => {
        const [titleResult, chapterResult, listResult] = results;
        const chapterList = (Array.isArray(listResult.value?.data) ? listResult.value.data : []).filter(item => item?.id).sort((a, b) => Number(a.volume || 0) - Number(b.volume || 0) || Number(a.chapterNum || 0) - Number(b.chapterNum || 0));
        return { title: titleResult.status === 'fulfilled' ? titleResult.value : {}, chapter: chapterResult.status === 'fulfilled' ? chapterResult.value : {}, chapterList };
    });
}
function pageLabel(index, total) { return `${index + 1} / ${total}`; }
function connectionLimit() {
    const type = navigator.connection?.effectiveType || '';
    if (/2g|slow-2g/i.test(type)) return 1;
    if (/3g/i.test(type)) return 2;
    return 3;
}

export async function renderMangaReader(container, chapterUrl = DEFAULT_CHAPTER_URL, onNavigate = () => {}) {
    if (!container) return;
    container.innerHTML = `<section class="manga-reader manga-reader--loading"><div class="manga-reader__loader"><i class="fas fa-spinner fa-pulse"></i><p>Завантаження сторінки 1…</p><small>Підготовка першої сторінки</small></div></section>`;
    let ids;
    try { ids = parseChapterUrl(chapterUrl); } catch (error) { showReaderError(container, error, chapterUrl, onNavigate); return; }
    try {
        const pages = await loadFrames(ids.chapterId, ids.titleId);
        if (!pages.length) throw new Error('У розділі немає сторінок');
        const background = loadBackgroundData(ids.titleId, ids.chapterId);
        renderShell(container, ids, pages, background, chapterUrl, onNavigate);
    } catch (error) { showReaderError(container, error, chapterUrl, onNavigate); }
}
function showReaderError(container, error, chapterUrl, onNavigate) {
    container.innerHTML = `<section class="manga-reader manga-reader--error"><div class="manga-reader__error"><i class="fas fa-triangle-exclamation"></i><h1>Не вдалося завантажити манґу</h1><p>${escapeHtml(error?.message || 'Перевірте з’єднання та спробуйте ще раз.')}</p><button type="button" id="mangaReaderRetry">Спробувати ще раз</button></div></section>`;
    container.querySelector('#mangaReaderRetry')?.addEventListener('click', () => renderMangaReader(container, chapterUrl, onNavigate));
}
function renderShell(container, ids, pages, background, chapterUrl, onNavigate) {
    const titleFallback = 'Манґа';
    const pageMarkup = pages.map((page, index) => {
        const url = escapeHtml(pageImageUrl(page.content));
        const immediate = index < 3;
        const source = immediate ? `src="${url}" fetchpriority="${index === 0 ? 'high' : 'auto'}"` : `data-src="${url}"`;
        return `<figure class="manga-reader__page" data-page-index="${index}" data-image-state="${index === 0 ? 'loading' : 'idle'}"><img ${source} alt="Сторінка ${index + 1}" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async"><figcaption>${pageLabel(index, pages.length)}</figcaption></figure>`;
    }).join('');
    container.innerHTML = `<section class="manga-reader" aria-label="Рідер манґи">
        <header class="manga-reader__header"><button class="manga-reader__back" type="button" aria-label="Назад"><i class="fas fa-arrow-left"></i><span>Назад</span></button><div class="manga-reader__heading"><span>VAKDAB · МАНҐА</span><h1 id="mangaReaderTitle">${titleFallback}</h1><p id="mangaReaderChapter">${escapeHtml(normalizeChapterName(chapterUrl))}</p></div></header>
        <div class="manga-reader__intro"><div><strong>Швидке читання</strong><span>Перша сторінка вже завантажується, інші — поступово у фоні.</span></div><span class="manga-reader__counter" id="mangaReaderCounter">1 / ${pages.length}</span></div>
        <div class="manga-reader__toolbar" role="toolbar" aria-label="Керування рідером"><button type="button" data-reader-action="prev" aria-label="Попередня сторінка"><i class="fas fa-chevron-left"></i></button><button type="button" data-reader-action="zoom-out" aria-label="Зменшити"><i class="fas fa-minus"></i></button><span class="manga-reader__zoom" id="mangaReaderZoom">100%</span><button type="button" data-reader-action="zoom-in" aria-label="Збільшити"><i class="fas fa-plus"></i></button><button type="button" data-reader-action="next" aria-label="Наступна сторінка"><i class="fas fa-chevron-right"></i></button><button type="button" data-reader-action="fullscreen" aria-label="Повний екран"><i class="fas fa-expand"></i></button></div>
        <div class="manga-reader__chapter-select"><label for="mangaReaderChapterSelect">Розділ</label><select id="mangaReaderChapterSelect" disabled><option>Завантаження розділів…</option></select></div>
        <div class="manga-reader__pages" id="mangaReaderPages">${pageMarkup}</div>
        <nav class="manga-reader__pager" aria-label="Навігація розділами"><button type="button" data-chapter-url="" disabled>← Попередній розділ</button><button type="button" data-chapter-url="" disabled>Наступний розділ →</button></nav>
        <details class="manga-reader__about"><summary>Про манґу</summary><p id="mangaReaderDescription">Завантаження опису…</p></details>
    </section>`;
    const root = container.querySelector('.manga-reader');
    const pagesRoot = container.querySelector('#mangaReaderPages');
    const figures = [...container.querySelectorAll('.manga-reader__page')];
    const queue = []; const queued = new Set(); let active = 0; let zoom = 1; let running = 0; const limit = connectionLimit();
    const updateState = (figure, state) => { figure.dataset.imageState = state; };
    const runQueue = () => {
        while (running < limit && queue.length) {
            const figure = queue.shift(); queued.delete(figure); const image = figure.querySelector('img[data-src]');
            if (!image || figure.dataset.imageState === 'loading' || figure.dataset.imageState === 'loaded') continue;
            updateState(figure, 'loading'); running += 1;
            image.addEventListener('load', () => { updateState(figure, 'loaded'); running -= 1; runQueue(); }, { once: true });
            image.addEventListener('error', () => { updateState(figure, 'error'); running -= 1; runQueue(); }, { once: true });
            image.src = image.dataset.src; image.removeAttribute('data-src');
        }
    };
    const enqueue = (figure, priority = false) => { if (!figure || queued.has(figure) || ['loading', 'loaded'].includes(figure.dataset.imageState)) return; if (priority) queue.unshift(figure); else queue.push(figure); queued.add(figure); runQueue(); };
    figures.slice(0, 3).forEach((figure, index) => { if (index > 0) enqueue(figure, true); });
    const preloadAround = index => { for (let i = index + 1; i <= index + 3; i += 1) enqueue(figures[i]); };
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { enqueue(entry.target); preloadAround(Number(entry.target.dataset.pageIndex)); } }), { rootMargin: '800px 0px' }) : null;
    figures.forEach(figure => observer?.observe(figure));
    const setActive = index => { active = Math.max(0, Math.min(figures.length - 1, index)); enqueue(figures[active], true); preloadAround(active); figures[active]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); container.querySelector('#mangaReaderCounter').textContent = pageLabel(active, figures.length); };
    const updateScroll = () => { const top = pagesRoot.getBoundingClientRect().top; let closest = 0; let distance = Infinity; figures.forEach((figure, index) => { const d = Math.abs(figure.getBoundingClientRect().top - top); if (d < distance) { distance = d; closest = index; } }); active = closest; container.querySelector('#mangaReaderCounter').textContent = pageLabel(active, figures.length); preloadAround(active); };
    pagesRoot.addEventListener('scroll', updateScroll, { passive: true });
    container.querySelectorAll('[data-reader-action]').forEach(button => button.addEventListener('click', () => { const action = button.dataset.readerAction; if (action === 'prev') setActive(active - 1); if (action === 'next') setActive(active + 1); if (action === 'zoom-in') { zoom = Math.min(1.75, zoom + .1); pagesRoot.style.setProperty('--manga-reader-zoom', zoom); container.querySelector('#mangaReaderZoom').textContent = `${Math.round(zoom * 100)}%`; } if (action === 'zoom-out') { zoom = Math.max(.75, zoom - .1); pagesRoot.style.setProperty('--manga-reader-zoom', zoom); container.querySelector('#mangaReaderZoom').textContent = `${Math.round(zoom * 100)}%`; } if (action === 'fullscreen') pagesRoot.requestFullscreen?.(); }));
    container.querySelector('.manga-reader__back')?.addEventListener('click', () => onNavigate(null));
    background.then(data => {
        const title = data.title || {}; const chapterList = data.chapterList || []; const currentIndex = chapterList.findIndex(item => String(item.id) === String(ids.chapterId));
        container.querySelector('#mangaReaderTitle').textContent = title.title || titleFallback; container.querySelector('#mangaReaderChapter').textContent = normalizeChapterName(data.chapter || chapterUrl); container.querySelector('#mangaReaderDescription').textContent = title.description || 'Опис відсутній.'; document.title = `${title.title || titleFallback} — VakDab`;
        const select = container.querySelector('#mangaReaderChapterSelect'); select.innerHTML = chapterList.length ? chapterList.map(item => `<option value="${escapeHtml(String(item.id))}"${String(item.id) === String(ids.chapterId) ? ' selected' : ''}>${escapeHtml(normalizeChapterName(item))}</option>`).join('') : '<option>Розділи недоступні</option>'; select.disabled = !chapterList.length;
        const setChapterButton = (button, item, label) => { if (!item) { button.disabled = true; return; } button.disabled = false; button.dataset.chapterUrl = `${HONEY_WEB}/read/${item.id}/${ids.titleId}`; button.textContent = label; };
        setChapterButton(container.querySelector('[data-chapter-url]:first-child'), currentIndex > 0 ? chapterList[currentIndex - 1] : null, '← Попередній розділ'); setChapterButton(container.querySelector('[data-chapter-url]:last-child'), currentIndex >= 0 && currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null, 'Наступний розділ →');
        select.addEventListener('change', event => { const item = chapterList.find(chapter => String(chapter.id) === event.target.value); if (item) onNavigate(`${HONEY_WEB}/read/${item.id}/${ids.titleId}`); });
        container.querySelectorAll('[data-chapter-url]').forEach(button => button.addEventListener('click', () => { if (button.dataset.chapterUrl) onNavigate(button.dataset.chapterUrl); }));
    }).catch(() => {});
    preloadAround(0);
}

export { DEFAULT_CHAPTER_URL };
