import { getProxyUrl } from '../utils/image.js';

const ZENKO_API = 'https://api.zenko.online';
const ZENKO_IMAGE = 'https://image.zenko.online';
const DEFAULT_CHAPTER_URL = 'https://zenko.online/titles/4162/80090';

function safeUrl(value, fallback = '') {
    try {
        const url = new URL(String(value || ''), window.location.href);
        return /^https?:$/i.test(url.protocol) ? url.href : fallback;
    } catch {
        return fallback;
    }
}

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

function normalizeChapterName(value = '') {
    const raw = String(value || '').trim().replace(/&amp;/g, '&');
    const parts = raw.split(/@#%&;№%#&\*\*#!@/).filter(Boolean);
    if (parts.length >= 2) {
        const volume = parts[0];
        const chapter = parts[1];
        const title = parts.slice(2).join(' ').trim();
        return `Том ${volume} · Розділ ${chapter}${title ? `: ${title}` : ''}`;
    }
    return raw || 'Розділ без назви';
}

function chapterNumber(value = '') {
    const match = String(value).match(/@#%&;№%#&\*\*#!@(\d+)/);
    return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

async function fetchJson(sourceUrl) {
    const response = await fetch(getProxyUrl(sourceUrl, 'desktop'), {
        mode: 'cors', credentials: 'omit', cache: 'no-cache'
    });
    if (!response.ok) throw new Error(`Zenko API: HTTP ${response.status}`);
    return response.json();
}

function parseChapterUrl(value) {
    const url = safeUrl(value, DEFAULT_CHAPTER_URL);
    const match = url.match(/\/titles\/(\d+)\/(\d+)/i);
    if (!match) throw new Error('Неправильне посилання на розділ Zenko');
    return { titleId: match[1], chapterId: match[2], url };
}

function pageImageUrl(content) {
    const value = String(content || '').trim();
    if (!value) return '';
    return getProxyUrl(/^https?:\/\//i.test(value) ? value : `${ZENKO_IMAGE}/${value}`, 'desktop');
}

async function loadMangaData(chapterUrl) {
    const { titleId, chapterId, url } = parseChapterUrl(chapterUrl);
    const [title, chapter, chapters] = await Promise.all([
        fetchJson(`${ZENKO_API}/titles/${titleId}`),
        fetchJson(`${ZENKO_API}/chapters/${chapterId}`),
        fetchJson(`${ZENKO_API}/titles/${titleId}/chapters`)
    ]);
    const pages = (Array.isArray(chapter.pages) ? chapter.pages : [])
        .filter(page => page?.content)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    const chapterList = (Array.isArray(chapters) ? chapters : [])
        .filter(item => item?.isPublished !== false)
        .sort((a, b) => chapterNumber(a.name) - chapterNumber(b.name));
    const currentIndex = chapterList.findIndex(item => String(item.id) === String(chapterId));
    return { title, chapter, pages, chapterList, currentIndex, titleId, chapterId, url };
}

function pageLabel(index, total) {
    return `${index + 1} / ${total}`;
}

export async function renderMangaReader(container, chapterUrl = DEFAULT_CHAPTER_URL, onNavigate = () => {}) {
    if (!container) return;
    container.innerHTML = `<section class="manga-reader manga-reader--loading"><div class="manga-reader__loader"><i class="fas fa-spinner fa-pulse"></i><p>Завантаження манґи…</p><small>Підключення до Zenko через проксі</small></div></section>`;
    try {
        const data = await loadMangaData(chapterUrl);
        if (!data.pages.length) throw new Error('У розділі немає сторінок');
        const { title, chapter, pages, chapterList, currentIndex } = data;
        const safeTitle = escapeHtml(title.name || 'Манґа');
        const safeDescription = escapeHtml(title.description || '');
        const chapterOptions = chapterList.map(item => `<option value="${escapeHtml(String(item.id))}"${String(item.id) === String(data.chapterId) ? ' selected' : ''}>${escapeHtml(normalizeChapterName(item.name))}</option>`).join('');
        const previous = currentIndex > 0 ? chapterList[currentIndex - 1] : null;
        const next = currentIndex >= 0 && currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null;
        const pageMarkup = pages.map((page, index) => `<figure class="manga-reader__page" data-page-index="${index}"><img src="${escapeHtml(pageImageUrl(page.content))}" alt="${safeTitle}, сторінка ${index + 1}" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async"><figcaption>${pageLabel(index, pages.length)}</figcaption></figure>`).join('');
        container.innerHTML = `<section class="manga-reader" aria-label="Рідер манґи">
            <header class="manga-reader__header">
                <button class="manga-reader__back" type="button" aria-label="Назад"><i class="fas fa-arrow-left"></i><span>Назад</span></button>
                <div class="manga-reader__heading"><span>VAKDAB · МАНҐА</span><h1>${safeTitle}</h1><p>${escapeHtml(normalizeChapterName(chapter.name))}</p></div>
                <button class="manga-reader__source" type="button" title="Відкрити джерело Zenko"><i class="fas fa-arrow-up-right-from-square"></i></button>
            </header>
            <div class="manga-reader__intro"><div><strong>Читання через проксі</strong><span>Зображення завантажуються безпечно та оптимізовано для телефону.</span></div><span class="manga-reader__counter" id="mangaReaderCounter">1 / ${pages.length}</span></div>
            <div class="manga-reader__toolbar" role="toolbar" aria-label="Керування рідером">
                <button type="button" data-reader-action="prev" aria-label="Попередня сторінка"><i class="fas fa-chevron-left"></i></button>
                <button type="button" data-reader-action="zoom-out" aria-label="Зменшити"><i class="fas fa-minus"></i></button>
                <span class="manga-reader__zoom" id="mangaReaderZoom">100%</span>
                <button type="button" data-reader-action="zoom-in" aria-label="Збільшити"><i class="fas fa-plus"></i></button>
                <button type="button" data-reader-action="next" aria-label="Наступна сторінка"><i class="fas fa-chevron-right"></i></button>
                <button type="button" data-reader-action="fullscreen" aria-label="Повний екран"><i class="fas fa-expand"></i></button>
            </div>
            <div class="manga-reader__chapter-select"><label for="mangaReaderChapter">Розділ</label><select id="mangaReaderChapter"${chapterOptions ? '' : ' disabled'}>${chapterOptions || '<option>Розділи недоступні</option>'}</select></div>
            <div class="manga-reader__pages" id="mangaReaderPages">${pageMarkup}</div>
            <nav class="manga-reader__pager" aria-label="Навігація розділами"><button type="button" data-chapter-url="${previous ? escapeHtml(`https://zenko.online/titles/${data.titleId}/${previous.id}`) : ''}"${previous ? '' : ' disabled'}>← Попередній розділ</button><button type="button" data-chapter-url="${next ? escapeHtml(`https://zenko.online/titles/${data.titleId}/${next.id}`) : ''}"${next ? '' : ' disabled'}>Наступний розділ →</button></nav>
            <details class="manga-reader__about"><summary>Про манґу</summary><p>${safeDescription || 'Опис відсутній.'}</p><a href="${escapeHtml(data.url)}" target="_blank" rel="noopener">Відкрити сторінку на Zenko</a></details>
        </section>`;

        const pagesRoot = container.querySelector('#mangaReaderPages');
        const figures = [...container.querySelectorAll('.manga-reader__page')];
        let activePage = 0;
        let zoom = 1;
        const setActivePage = index => {
            activePage = Math.max(0, Math.min(figures.length - 1, index));
            figures[activePage]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const counter = container.querySelector('#mangaReaderCounter');
            if (counter) counter.textContent = pageLabel(activePage, figures.length);
        };
        const setZoom = value => {
            zoom = Math.max(0.75, Math.min(1.75, value));
            pagesRoot.style.setProperty('--manga-reader-zoom', String(zoom));
            const label = container.querySelector('#mangaReaderZoom');
            if (label) label.textContent = `${Math.round(zoom * 100)}%`;
        };
        const updateFromScroll = () => {
            const rootTop = pagesRoot.getBoundingClientRect().top;
            let closest = 0;
            let distance = Infinity;
            figures.forEach((figure, index) => {
                const distanceToTop = Math.abs(figure.getBoundingClientRect().top - rootTop);
                if (distanceToTop < distance) { distance = distanceToTop; closest = index; }
            });
            activePage = closest;
            const counter = container.querySelector('#mangaReaderCounter');
            if (counter) counter.textContent = pageLabel(activePage, figures.length);
        };
        pagesRoot.addEventListener('scroll', updateFromScroll, { passive: true });
        container.querySelectorAll('[data-reader-action]').forEach(button => button.addEventListener('click', () => {
            const action = button.dataset.readerAction;
            if (action === 'prev') setActivePage(activePage - 1);
            if (action === 'next') setActivePage(activePage + 1);
            if (action === 'zoom-in') setZoom(zoom + 0.1);
            if (action === 'zoom-out') setZoom(zoom - 0.1);
            if (action === 'fullscreen') pagesRoot.requestFullscreen?.();
        }));
        container.querySelector('#mangaReaderChapter')?.addEventListener('change', event => {
            const selected = chapterList.find(item => String(item.id) === event.target.value);
            if (selected) onNavigate(`https://zenko.online/titles/${data.titleId}/${selected.id}`);
        });
        container.querySelectorAll('[data-chapter-url]').forEach(button => button.addEventListener('click', () => {
            if (button.dataset.chapterUrl) onNavigate(button.dataset.chapterUrl);
        }));
        container.querySelector('.manga-reader__back')?.addEventListener('click', () => onNavigate(null));
        container.querySelector('.manga-reader__source')?.addEventListener('click', () => window.open(data.url, '_blank', 'noopener'));
        document.title = `${title.name || 'Манґа'} — VakDab`;
    } catch (error) {
        container.innerHTML = `<section class="manga-reader manga-reader--error"><div class="manga-reader__error"><i class="fas fa-triangle-exclamation"></i><h1>Не вдалося завантажити манґу</h1><p>${escapeHtml(error?.message || 'Перевірте з’єднання та спробуйте ще раз.')}</p><button type="button" id="mangaReaderRetry">Спробувати ще раз</button></div></section>`;
        container.querySelector('#mangaReaderRetry')?.addEventListener('click', () => renderMangaReader(container, chapterUrl, onNavigate));
    }
}

export { DEFAULT_CHAPTER_URL };
