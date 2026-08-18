import { fetchRanobeChapter, translateNovelParagraphs } from '../../services/api/novel.js?v=20260818-ranobe-v1';

const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

export async function renderNovelReader(container, chapterUrl, onNavigate = () => {}, novelTitle = '', poster = '') {
    if (!container) return;
    container.innerHTML = `<section class="novel-reader novel-reader--loading"><div class="novel-reader__loader"><i class="fas fa-spinner fa-pulse"></i><p>Завантаження розділу…</p><small>Отримуємо текст RanobeLib і перекладаємо його українською</small></div></section>`;
    try {
        const chapter = await fetchRanobeChapter(chapterUrl);
        const translated = await translateNovelParagraphs(chapter.paragraphs);
        renderNovelShell(container, chapter, translated.length ? translated : chapter.paragraphs, onNavigate, novelTitle, poster);
    } catch (error) {
        container.innerHTML = `<section class="novel-reader novel-reader--error"><div class="novel-reader__error"><i class="fas fa-triangle-exclamation"></i><h1>Не вдалося завантажити ранобе</h1><p>${escapeHtml(error?.message || 'Перевірте з’єднання та спробуйте ще раз.')}</p><button type="button" id="novelReaderRetry">Спробувати ще раз</button></div></section>`;
        container.querySelector('#novelReaderRetry')?.addEventListener('click', () => renderNovelReader(container, chapterUrl, onNavigate, novelTitle, poster));
    }
}

function renderNovelShell(container, chapter, paragraphs, onNavigate, novelTitle, poster) {
    const title = String(novelTitle || 'Ранобе').trim() || 'Ранобе';
    const list = chapter.chapterList || [];
    const current = list.findIndex(item => item.url === chapter.chapterUrl);
    const selectedTitle = chapter.title || 'Розділ';
    const chapterOptions = list.length
        ? list.map((item, index) => `<option value="${escapeHtml(item.url)}"${item.url === chapter.chapterUrl ? ' selected' : ''}>${escapeHtml(item.title || `Розділ ${index + 1}`)}</option>`).join('')
        : `<option>${escapeHtml(selectedTitle)}</option>`;
    const posterMarkup = poster ? `<img class="novel-reader__poster" src="${escapeHtml(poster)}" alt="" loading="lazy">` : '';
    container.innerHTML = `<section class="novel-reader" aria-label="Рідер ранобе">
        <header class="novel-reader__header"><button class="novel-reader__back" type="button"><i class="fas fa-arrow-left"></i><span>Назад</span></button><div class="novel-reader__heading">${posterMarkup}<div><span>VAKDAB · РАНОБЕ · ПЕРЕКЛАД RU → UK</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(selectedTitle)}</p></div></div></header>
        <div class="novel-reader__toolbar" role="toolbar" aria-label="Керування рідером"><button type="button" data-novel-action="smaller" aria-label="Зменшити текст"><i class="fas fa-minus"></i></button><span id="novelReaderFont">100%</span><button type="button" data-novel-action="larger" aria-label="Збільшити текст"><i class="fas fa-plus"></i></button><button type="button" data-novel-action="fullscreen" aria-label="Повний екран"><i class="fas fa-expand"></i></button></div>
        <div class="novel-reader__chapter-select"><label for="novelReaderChapterSelect">Розділ</label><select id="novelReaderChapterSelect">${chapterOptions}</select></div>
        <article class="novel-reader__content" id="novelReaderContent"><h2>${escapeHtml(selectedTitle)}</h2>${paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</article>
        <nav class="novel-reader__pager" aria-label="Навігація розділами"><button type="button" data-chapter-url="${escapeHtml(current > 0 ? list[current - 1].url : chapter.prevUrl || '')}"${current > 0 || chapter.prevUrl ? '' : ' disabled'}>← Попередній розділ</button><button type="button" data-chapter-url="${escapeHtml(current >= 0 && current < list.length - 1 ? list[current + 1].url : chapter.nextUrl || '')}"${(current >= 0 && current < list.length - 1) || chapter.nextUrl ? '' : ' disabled'}>Наступний розділ →</button></nav>
    </section>`;
    const content = container.querySelector('#novelReaderContent'); let fontScale = 1;
    const setScale = value => { fontScale = Math.max(.85, Math.min(1.35, Number(value) || 1)); content?.style.setProperty('--novel-reader-scale', fontScale); const label = container.querySelector('#novelReaderFont'); if (label) label.textContent = `${Math.round(fontScale * 100)}%`; };
    container.querySelectorAll('[data-novel-action]').forEach(button => button.addEventListener('click', async () => {
        const action = button.dataset.novelAction;
        if (action === 'larger') setScale(fontScale + .1);
        if (action === 'smaller') setScale(fontScale - .1);
        if (action === 'fullscreen') { try { await content?.requestFullscreen?.(); } catch { /* browser denied */ } }
    }));
    container.querySelector('.novel-reader__back')?.addEventListener('click', () => onNavigate(null));
    container.querySelector('#novelReaderChapterSelect')?.addEventListener('change', event => onNavigate(event.target.value));
    container.querySelectorAll('[data-chapter-url]').forEach(button => button.addEventListener('click', () => { if (button.dataset.chapterUrl) onNavigate(button.dataset.chapterUrl); }));
    setScale(1);
    document.title = `${title} — VakDab`;
}
