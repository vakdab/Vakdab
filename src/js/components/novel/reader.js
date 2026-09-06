import { fetchRanobeChapter, translateNovelParagraphs, saveNovelReadingProgress } from '../../services/api/novel.js?v=20260824-settings-redesign-v1';

const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const READING_THEMES = ['default', 'sepia', 'dark', 'black'];

export async function renderNovelReader(container, chapterUrl, onNavigate = () => {}, novelTitle = '', poster = '') {
    if (!container) return;
    container.innerHTML = `<section class="novel-reader novel-reader--loading"><div class="novel-reader__loader"><i class="fas fa-spinner fa-pulse"></i><p>Зачекайте…</p><small>Відкриваємо розділ…</small></div></section>`;
    
    // Scroll window to top when entering reader
    window.scrollTo({ top: 0, behavior: 'instant' });

    try {
        const chapter = await fetchRanobeChapter(chapterUrl);
        const isAlreadyUkrainian = chapter.sourceLanguage === 'uk';
        
        // Save reading progress
        if (novelTitle || chapterUrl) {
            saveNovelReadingProgress(novelTitle || chapterUrl, chapterUrl);
        }

        let translatedParagraphs = isAlreadyUkrainian ? chapter.paragraphs : null;
        let activeLanguage = 'uk';
        
        // Render shell immediately
        renderNovelShell(container, {
            chapter,
            originalParagraphs: chapter.paragraphs,
            translatedParagraphs,
            isAlreadyUkrainian,
            activeLanguage,
            onNavigate,
            novelTitle,
            poster
        });

        // If translation is needed and not ready yet, translate in the background
        if (!isAlreadyUkrainian) {
            translateNovelParagraphs(chapter.paragraphs).then(translated => {
                if (translated && translated.length) {
                    translatedParagraphs = translated;
                    updateReaderTranslation(container, chapter, translatedParagraphs, activeLanguage);
                }
            }).catch(err => {
                console.warn('Novel translation error:', err);
                const statusEl = container.querySelector('#novelReaderTrStatus');
                if (statusEl) {
                    statusEl.innerHTML = `<i class="fas fa-info-circle"></i> <span>Показано оригінальний текст (переклад недоступний)</span>`;
                }
            });
        }
    } catch (error) {
        container.innerHTML = `<section class="novel-reader novel-reader--error"><div class="novel-reader__error"><i class="fas fa-triangle-exclamation"></i><h1>Не вдалося завантажити ранобе</h1><p>${escapeHtml(error?.message || 'Перевірте з’єднання та спробуйте ще раз.')}</p><button type="button" id="novelReaderRetry">Спробувати ще раз</button></div></section>`;
        container.querySelector('#novelReaderRetry')?.addEventListener('click', () => renderNovelReader(container, chapterUrl, onNavigate, novelTitle, poster));
    }
}

function updateReaderTranslation(container, chapter, translatedParagraphs, activeLanguage) {
    const statusEl = container.querySelector('#novelReaderTrStatus');
    if (statusEl) {
        statusEl.className = 'novel-reader__tr-status novel-reader__tr-status--done';
        statusEl.innerHTML = `<i class="fas fa-check-circle"></i> <span>Перекладено українською</span>`;
        setTimeout(() => {
            if (statusEl.parentNode) statusEl.style.display = 'none';
        }, 4000);
    }
    const content = container.querySelector('#novelReaderContent');
    if (content && activeLanguage === 'uk') {
        const paragraphs = translatedParagraphs && translatedParagraphs.length ? translatedParagraphs : chapter.paragraphs;
        const pNodes = content.querySelectorAll('p');
        if (pNodes.length === paragraphs.length) {
            pNodes.forEach((p, i) => { p.textContent = paragraphs[i]; });
        } else {
            const imageMarkup = (chapter.imageUrls || []).map((url, index) => `<figure class="novel-reader__image"><img src="${escapeHtml(url)}" alt="Ілюстрація ${index + 1}" loading="lazy" referrerpolicy="no-referrer"><figcaption>Ілюстрація ${index + 1}</figcaption></figure>`).join('');
            content.innerHTML = `<h2>${escapeHtml(chapter.title || 'Розділ')}</h2>${imageMarkup}${paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}`;
        }
    }
}

function renderNovelShell(container, state) {
    const { chapter, originalParagraphs, onNavigate, novelTitle, poster, isAlreadyUkrainian } = state;
    let { translatedParagraphs, activeLanguage } = state;

    const title = String(novelTitle || 'Ранобе').trim() || 'Ранобе';
    const list = chapter.chapterList || [];
    const current = list.findIndex(item => item.url === chapter.chapterUrl);
    const selectedTitle = chapter.title || 'Розділ';
    const chapterOptions = list.length
        ? list.map((item, index) => `<option value="${escapeHtml(item.url)}"${item.url === chapter.chapterUrl ? ' selected' : ''}>${escapeHtml(item.title || `Розділ ${index + 1}`)}</option>`).join('')
        : `<option>${escapeHtml(selectedTitle)}</option>`;
    
    const posterMarkup = poster ? `<img class="novel-reader__poster" src="${escapeHtml(poster)}" alt="" loading="lazy">` : '';
    const imageMarkup = (chapter.imageUrls || []).map((url, index) => `<figure class="novel-reader__image"><img src="${escapeHtml(url)}" alt="Ілюстрація ${index + 1}" loading="lazy" referrerpolicy="no-referrer"><figcaption>Ілюстрація ${index + 1}</figcaption></figure>`).join('');

    const displayParagraphs = (activeLanguage === 'uk' && translatedParagraphs && translatedParagraphs.length)
        ? translatedParagraphs
        : originalParagraphs;

    const statusBadge = isAlreadyUkrainian
        ? ''
        : `<div class="novel-reader__tr-status" id="novelReaderTrStatus"><i class="fas fa-spinner fa-pulse"></i> <span>🇺🇦 Перекладаємо українською…</span></div>`;

    container.innerHTML = `<section class="novel-reader" id="novelReaderRoot" aria-label="Рідер ранобе">
        <header class="novel-reader__header"><button class="novel-reader__back" type="button"><i class="fas fa-arrow-left"></i><span>Назад</span></button><div class="novel-reader__heading">${posterMarkup}<div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(selectedTitle)}</p></div></div></header>
        <div class="novel-reader__toolbar" role="toolbar" aria-label="Керування рідером">
            <button type="button" class="novel-reader__btn-lang" id="novelReaderLangBtn" title="Мова відображення: Українська / Оригінал"><span>${activeLanguage === 'uk' ? '🇺🇦 UA' : '🌐 ОРИГ'}</span></button>
            <button type="button" data-novel-action="theme" class="novel-reader__btn-theme" title="Змінити тему читання"><i class="fas fa-palette"></i></button>
            <button type="button" data-novel-action="smaller" aria-label="Зменшити текст"><i class="fas fa-minus"></i></button>
            <span id="novelReaderFont">100%</span>
            <button type="button" data-novel-action="larger" aria-label="Збільшити текст"><i class="fas fa-plus"></i></button>
            <button type="button" data-novel-action="fullscreen" aria-label="Повний екран"><i class="fas fa-expand"></i></button>
        </div>
        ${statusBadge}
        <div class="novel-reader__chapter-select"><label for="novelReaderChapterSelect">Розділ</label><select id="novelReaderChapterSelect">${chapterOptions}</select></div>
        <article class="novel-reader__content" id="novelReaderContent"><h2>${escapeHtml(selectedTitle)}</h2>${imageMarkup}${displayParagraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</article>
        <nav class="novel-reader__pager" aria-label="Навігація розділами"><button type="button" data-chapter-url="${escapeHtml(current > 0 ? list[current - 1].url : chapter.prevUrl || '')}"${current > 0 || chapter.prevUrl ? '' : ' disabled'}>← Попередній розділ</button><button type="button" data-chapter-url="${escapeHtml(current >= 0 && current < list.length - 1 ? list[current + 1].url : chapter.nextUrl || '')}"${(current >= 0 && current < list.length - 1) || chapter.nextUrl ? '' : ' disabled'}>Наступний розділ →</button></nav>
    </section>`;

    const rootEl = container.querySelector('#novelReaderRoot');
    const content = container.querySelector('#novelReaderContent');
    let fontScale = 1;
    let themeIndex = 0;

    // Load saved reader preferences
    try {
        const savedScale = localStorage.getItem('vakdab_novel_font_scale');
        if (savedScale) fontScale = Math.max(.8, Math.min(1.4, Number(savedScale) || 1));
        const savedTheme = localStorage.getItem('vakdab_novel_theme');
        if (savedTheme && READING_THEMES.includes(savedTheme)) {
            themeIndex = READING_THEMES.indexOf(savedTheme);
            if (savedTheme !== 'default') rootEl?.classList.add(`novel-reader--theme-${savedTheme}`);
        }
    } catch { /* ignore */ }

    const setScale = value => {
        fontScale = Math.max(.8, Math.min(1.4, Number(value) || 1));
        content?.style.setProperty('--novel-reader-scale', fontScale);
        const label = container.querySelector('#novelReaderFont');
        if (label) label.textContent = `${Math.round(fontScale * 100)}%`;
        try { localStorage.setItem('vakdab_novel_font_scale', String(fontScale)); } catch { /* ignore */ }
    };

    const toggleTheme = () => {
        READING_THEMES.forEach(t => { if (t !== 'default') rootEl?.classList.remove(`novel-reader--theme-${t}`); });
        themeIndex = (themeIndex + 1) % READING_THEMES.length;
        const nextTheme = READING_THEMES[themeIndex];
        if (nextTheme !== 'default') rootEl?.classList.add(`novel-reader--theme-${nextTheme}`);
        try { localStorage.setItem('vakdab_novel_theme', nextTheme); } catch { /* ignore */ }
    };

    const toggleLanguage = () => {
        activeLanguage = activeLanguage === 'uk' ? 'orig' : 'uk';
        const langBtn = container.querySelector('#novelReaderLangBtn span');
        if (langBtn) langBtn.textContent = activeLanguage === 'uk' ? '🇺🇦 UA' : '🌐 ОРИГ';
        const currentParagraphs = (activeLanguage === 'uk' && translatedParagraphs && translatedParagraphs.length)
            ? translatedParagraphs
            : originalParagraphs;
        if (content) {
            const pNodes = content.querySelectorAll('p');
            if (pNodes.length === currentParagraphs.length) {
                pNodes.forEach((p, i) => { p.textContent = currentParagraphs[i]; });
            } else {
                content.innerHTML = `<h2>${escapeHtml(selectedTitle)}</h2>${imageMarkup}${currentParagraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}`;
            }
        }
    };

    container.querySelector('#novelReaderLangBtn')?.addEventListener('click', toggleLanguage);

    container.querySelectorAll('[data-novel-action]').forEach(button => button.addEventListener('click', async () => {
        const action = button.dataset.novelAction;
        if (action === 'larger') setScale(fontScale + .1);
        if (action === 'smaller') setScale(fontScale - .1);
        if (action === 'theme') toggleTheme();
        if (action === 'fullscreen') {
            try {
                if (document.fullscreenElement) await document.exitFullscreen();
                else await content?.requestFullscreen?.();
            } catch { /* browser denied */ }
        }
    }));

    container.querySelector('.novel-reader__back')?.addEventListener('click', () => onNavigate(null));
    container.querySelector('#novelReaderChapterSelect')?.addEventListener('change', event => {
        if (event.target.value) onNavigate(event.target.value);
    });
    container.querySelectorAll('[data-chapter-url]').forEach(button => button.addEventListener('click', () => {
        if (button.dataset.chapterUrl) onNavigate(button.dataset.chapterUrl);
    }));

    // Keyboard navigation
    const handleKeyDown = event => {
        if (event.target.matches('input, textarea, select')) return;
        const prevBtn = container.querySelector('.novel-reader__pager button:first-child');
        const nextBtn = container.querySelector('.novel-reader__pager button:last-child');
        if (event.key === 'ArrowLeft' && prevBtn && !prevBtn.disabled && prevBtn.dataset.chapterUrl) {
            onNavigate(prevBtn.dataset.chapterUrl);
        } else if (event.key === 'ArrowRight' && nextBtn && !nextBtn.disabled && nextBtn.dataset.chapterUrl) {
            onNavigate(nextBtn.dataset.chapterUrl);
        }
    };
    window.addEventListener('keydown', handleKeyDown, { once: true });

    setScale(fontScale);
    document.title = `${title} — VakDab`;
}
