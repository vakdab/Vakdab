import { DEFAULT_CHAPTER_URL, getChapterFrames, getReaderBackgroundData, pageImageFallbackUrl, pageImageUrl, parseChapterUrl } from '../../services/api/manga.js?v=20260818-honey-frames-v3';
import { buildPageMarkup, escapeHtml, normalizeChapterName, pageLabel } from './pages.js?v=20260818-manga-pages-v5';
import { debugLog } from '../../utils/debug.js';
import { createPagePreloader } from './preload.js';

export async function renderMangaReader(container, chapterUrl = DEFAULT_CHAPTER_URL, onNavigate = () => {}, mangaTitle = '') {
    if (!container) return;
    container.innerHTML = `<section class="manga-reader manga-reader--loading"><div class="manga-reader__loader"><i class="fas fa-spinner fa-pulse"></i><p>Завантаження сторінки 1…</p><small>Підготовка першої сторінки</small></div></section>`;
    let ids;
    try { ids = parseChapterUrl(chapterUrl); } catch (error) { showReaderError(container, error, chapterUrl, onNavigate, mangaTitle); return; }
    try {
        const pages = await getChapterFrames(chapterUrl);
        if (!pages.length) throw new Error('У розділі немає сторінок');
        const background = getReaderBackgroundData(ids.titleId, chapterUrl);
        renderShell(container, ids, pages, background, chapterUrl, onNavigate, mangaTitle);
    } catch (error) { showReaderError(container, error, chapterUrl, onNavigate, mangaTitle); }
}

function showReaderError(container, error, chapterUrl, onNavigate, mangaTitle = '') {
    container.innerHTML = `<section class="manga-reader manga-reader--error"><div class="manga-reader__error"><i class="fas fa-triangle-exclamation"></i><h1>Не вдалося завантажити манґу</h1><p>${escapeHtml(error?.message || 'Перевірте з’єднання та спробуйте ще раз.')}</p><button type="button" id="mangaReaderRetry">Спробувати ще раз</button></div></section>`;
    container.querySelector('#mangaReaderRetry')?.addEventListener('click', () => renderMangaReader(container, chapterUrl, onNavigate, mangaTitle));
}

function renderShell(container, ids, pages, background, chapterUrl, onNavigate, mangaTitle = '') {
    const cleanTitle = value => { const text = String(value || '').replace(/\s+/g, ' ').trim(); return text && text !== 'Без назви' && !/^https?:\/\//i.test(text) && !/\/chapters\//i.test(text) && !/^\d+-[a-z0-9-]+(?:\.html)?$/i.test(text) ? text : ''; };
    const titleFallback = cleanTitle(mangaTitle) || 'Манґа';
    const pageMarkup = buildPageMarkup(pages, pageImageUrl, pageImageFallbackUrl);
    container.innerHTML = `<section class="manga-reader" aria-label="Рідер манґи">
        <header class="manga-reader__header"><button class="manga-reader__back" type="button" aria-label="Назад"><i class="fas fa-arrow-left"></i><span>Назад</span></button><div class="manga-reader__heading"><span>VAKDAB · МАНҐА</span><h1 id="mangaReaderTitle">${titleFallback}</h1><p id="mangaReaderChapter">${escapeHtml(normalizeChapterName(chapterUrl))}</p></div></header>
        <div class="manga-reader__intro"><div><strong>Швидке читання</strong><span>Перша сторінка вже завантажується, інші — поступово у фоні.</span></div><span class="manga-reader__counter" id="mangaReaderCounter">1 / ${pages.length}</span></div>
        <div class="manga-reader__toolbar" role="toolbar" aria-label="Керування рідером"><button type="button" data-reader-action="prev" aria-label="Попередня сторінка"><i class="fas fa-chevron-left"></i></button><button type="button" data-reader-action="zoom-out" aria-label="Зменшити"><i class="fas fa-minus"></i></button><span class="manga-reader__zoom" id="mangaReaderZoom">100%</span><button type="button" data-reader-action="zoom-in" aria-label="Збільшити"><i class="fas fa-plus"></i></button><button type="button" data-reader-action="next" aria-label="Наступна сторінка"><i class="fas fa-chevron-right"></i></button><button type="button" data-reader-action="fullscreen" aria-label="Повний екран"><i class="fas fa-expand"></i></button></div>
        <div class="manga-reader__chapter-select"><label for="mangaReaderChapterSelect">Розділ</label><select id="mangaReaderChapterSelect" disabled><option>Завантаження розділів…</option></select></div>
        <div class="manga-reader__pages" id="mangaReaderPages">${pageMarkup}</div>
        <nav class="manga-reader__pager" aria-label="Навігація розділами"><button type="button" data-chapter-url="" disabled>← Попередній розділ</button><button type="button" data-chapter-url="" disabled>Наступний розділ →</button></nav>
        <details class="manga-reader__about"><summary>Про манґу</summary><p id="mangaReaderDescription">Завантаження опису…</p></details>
    </section>`;
    const pagesRoot = container.querySelector('#mangaReaderPages');
    pagesRoot?.style.setProperty('--manga-reader-zoom', '1');
    const figures = [...container.querySelectorAll('.manga-reader__page')];
    const preloader = createPagePreloader(figures, { root: pagesRoot, debug: (event, details) => debugLog('manga', event, details) });
    let active = 0; let zoom = 1;
    figures.slice(0, 3).forEach((figure, index) => preloader.enqueue(figure, index === 0));
    const setActive = index => { active = Math.max(0, Math.min(figures.length - 1, index)); preloader.enqueue(figures[active], true); preloader.preloadAround(active); figures[active]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); container.querySelector('#mangaReaderCounter').textContent = pageLabel(active, figures.length); };
    const updateScroll = () => { const top = pagesRoot.getBoundingClientRect().top; let closest = 0; let distance = Infinity; figures.forEach((figure, index) => { const d = Math.abs(figure.getBoundingClientRect().top - top); if (d < distance) { distance = d; closest = index; } }); active = closest; container.querySelector('#mangaReaderCounter').textContent = pageLabel(active, figures.length); preloader.preloadAround(active); };
    pagesRoot.addEventListener('scroll', updateScroll, { passive: true });
    const setZoom = value => { zoom = Math.max(.75, Math.min(1.75, Number(value) || 1)); pagesRoot.style.setProperty('--manga-reader-zoom', zoom); const label = container.querySelector('#mangaReaderZoom'); if (label) label.textContent = `${Math.round(zoom * 100)}%`; };
    const toggleFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen?.(); else if (pagesRoot.requestFullscreen) await pagesRoot.requestFullscreen(); else { pagesRoot.classList.toggle('manga-reader__pages--fullscreen'); showToastFallback('Повний екран доступний через меню браузера'); } } catch { showToastFallback('Браузер не дозволив повний екран'); } };
    const showToastFallback = message => { const toast = document.createElement('div'); toast.className = 'manga-reader__notice'; toast.textContent = message; container.appendChild(toast); setTimeout(() => toast.remove(), 2200); };
    container.querySelectorAll('[data-reader-action]').forEach(button => button.addEventListener('click', () => { const action = button.dataset.readerAction; if (action === 'prev') setActive(active - 1); if (action === 'next') setActive(active + 1); if (action === 'zoom-in') setZoom(zoom + .1); if (action === 'zoom-out') setZoom(zoom - .1); if (action === 'fullscreen') toggleFullscreen(); }));
    container.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') setActive(active - 1); if (event.key === 'ArrowRight' || event.key === ' ') { event.preventDefault(); setActive(active + 1); } if (event.key === '+' || event.key === '=') setZoom(zoom + .1); if (event.key === '-') setZoom(zoom - .1); if (event.key.toLowerCase() === 'f') toggleFullscreen(); });
    container.tabIndex = 0;
    container.querySelector('.manga-reader__back')?.addEventListener('click', () => onNavigate(null));
    background.then(data => {
        const title = data.title || {}; const chapterList = data.chapterList || [];
        const sourceTitle = cleanTitle(title.title);
        const safeTitle = cleanTitle(mangaTitle) || sourceTitle || titleFallback; const currentIndex = chapterList.findIndex(item => String(item.id) === String(ids.chapterId));
        container.querySelector('#mangaReaderTitle').textContent = safeTitle; container.querySelector('#mangaReaderChapter').textContent = normalizeChapterName(data.chapter || chapterUrl); container.querySelector('#mangaReaderDescription').textContent = title.description || 'Опис відсутній.'; document.title = `${safeTitle} — VakDab`;
        const select = container.querySelector('#mangaReaderChapterSelect'); select.innerHTML = chapterList.length ? chapterList.map(item => `<option value="${escapeHtml(String(item.id))}"${String(item.id) === String(ids.chapterId) ? ' selected' : ''}>${escapeHtml(normalizeChapterName(item))}</option>`).join('') : '<option>Розділи недоступні</option>'; select.disabled = !chapterList.length;
        const setChapterButton = (button, item, label) => { if (!item) { button.disabled = true; return; } button.disabled = false; button.dataset.chapterUrl = item.url || item.id || ''; button.textContent = label; };
        setChapterButton(container.querySelector('[data-chapter-url]:first-child'), currentIndex > 0 ? chapterList[currentIndex - 1] : null, '← Попередній розділ'); setChapterButton(container.querySelector('[data-chapter-url]:last-child'), currentIndex >= 0 && currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null, 'Наступний розділ →');
        select.addEventListener('change', event => { const item = chapterList.find(chapter => String(chapter.id) === event.target.value); if (item) onNavigate(item.url || item.id || ''); });
        container.querySelectorAll('[data-chapter-url]').forEach(button => button.addEventListener('click', () => { if (button.dataset.chapterUrl) onNavigate(button.dataset.chapterUrl); }));
    }).catch(() => {});
    preloader.preloadAround(0);
}

export { DEFAULT_CHAPTER_URL };
