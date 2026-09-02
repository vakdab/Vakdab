// Компактне меню категорій під хіро-банером на головній сторінці.
// Один рядок: "Обрати категорії" + пошук. Розкривна панель: жанри (чекбокси),
// рік виходу і сортування (радіо), кнопка "OK" застосовує все на сторінці фільтра.
import { GENRE_MAP } from '../../config/constants.js?v=20260902-home-quick-filter-v1';
import { Router } from '../../core/compat/router.js?v=20260901-home-recs-v3';
import { searchPageState } from './homeLegacy.js?v=20260901-home-recs-v8';

const YEAR_OPTIONS = [
    { key: 'ongoing', label: 'Онгоінг' },
    { key: '2026', label: '2026' },
    { key: '2025', label: '2025' },
    { key: '2024', label: '2024' },
    { key: '2015-2023', label: '2015-2023' },
    { key: '2008-2014', label: '2008-2014' },
    { key: '2000-2007', label: '2000-2007' },
    { key: 'before2000', label: 'до 2000' }
];

const SORT_OPTIONS = [
    { key: 'rating', label: 'За рейтингом' },
    { key: 'alpha', label: 'За алфавітом' },
    { key: 'episodes', label: 'За кіл-тю серій' },
    { key: 'year', label: 'За роком виходу' },
    { key: 'added', label: 'За датою додавання' }
];

let quickFilterState = { genres: new Set(), year: '', sort: 'rating', open: false };

function genreEntries() {
    return Object.entries(GENRE_MAP).map(([name, slug]) => ({ name, slug }));
}

function buildHomeQuickFilterHtml() {
    return `
      <button class="hqf-headline" id="hqfHeadlineBtn" type="button">
        <span>Дивитись найкраще аніме</span>
        <i class="fas fa-arrow-right"></i>
      </button>

      <div class="hqf-controls">
        <button class="hqf-categories-toggle${quickFilterState.open ? ' open' : ''}" id="hqfCategoriesToggle" type="button" aria-expanded="${quickFilterState.open ? 'true' : 'false'}">
          <i class="fas fa-sliders"></i> Обрати категорії <i class="fas fa-chevron-down hqf-chevron"></i>
        </button>
        <div class="hqf-search-box">
          <i class="fas fa-magnifying-glass"></i>
          <input type="text" id="hqfSearchInput" placeholder="Пошук..." autocomplete="off">
        </div>
      </div>

      <div class="hqf-panel${quickFilterState.open ? ' open' : ''}" id="hqfPanel">
        <div class="hqf-panel-inner">
          <div class="hqf-col">
            <div class="hqf-col-title">Жанр</div>
            <div class="hqf-option-list" id="hqfGenreList">
              ${genreEntries().map(g => `
                <label class="hqf-option">
                  <input type="checkbox" data-genre="${g.slug}" ${quickFilterState.genres.has(g.slug) ? 'checked' : ''}>
                  <span class="hqf-option-bullet"></span>
                  <span>${g.name}</span>
                </label>`).join('')}
            </div>
          </div>
          <div class="hqf-col">
            <div class="hqf-col-title">Рік виходу</div>
            <div class="hqf-option-list">
              ${YEAR_OPTIONS.map(o => `
                <label class="hqf-option">
                  <input type="radio" name="hqfYear" data-year="${o.key}" ${quickFilterState.year === o.key ? 'checked' : ''}>
                  <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                  <span>${o.label}</span>
                </label>`).join('')}
            </div>
            <div class="hqf-col-title hqf-col-title--spaced">Сортування</div>
            <div class="hqf-option-list">
              ${SORT_OPTIONS.map(o => `
                <label class="hqf-option">
                  <input type="radio" name="hqfSort" data-sort="${o.key}" ${quickFilterState.sort === o.key ? 'checked' : ''}>
                  <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                  <span>${o.label}</span>
                </label>`).join('')}
            </div>
          </div>
        </div>
        <div class="hqf-panel-footer">
          <button class="hqf-clear-btn" id="hqfClearBtn" type="button">Скинути</button>
          <button class="hqf-ok-btn" id="hqfOkBtn" type="button">OK</button>
        </div>
      </div>
    `;
}

function applyQuickFilter() {
    const params = { sort: quickFilterState.sort };
    if (quickFilterState.genres.size) params.genres = [...quickFilterState.genres].join(',');
    if (quickFilterState.year) params.year = quickFilterState.year;
    Router.goTo('filter', params);
}

function wireHomeQuickFilterEvents(container) {
    const toggle = document.getElementById('hqfCategoriesToggle');
    const panel = document.getElementById('hqfPanel');
    toggle?.addEventListener('click', () => {
        quickFilterState.open = !quickFilterState.open;
        toggle.classList.toggle('open', quickFilterState.open);
        toggle.setAttribute('aria-expanded', quickFilterState.open ? 'true' : 'false');
        panel?.classList.toggle('open', quickFilterState.open);
    });

    document.getElementById('hqfHeadlineBtn')?.addEventListener('click', () => {
        Router.goTo('filter', { sort: 'rating' });
    });

    container.querySelectorAll('[data-genre]').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) quickFilterState.genres.add(cb.dataset.genre);
            else quickFilterState.genres.delete(cb.dataset.genre);
        });
    });

    container.querySelectorAll('[data-year]').forEach(radio => {
        radio.addEventListener('change', () => { if (radio.checked) quickFilterState.year = radio.dataset.year; });
    });

    container.querySelectorAll('[data-sort]').forEach(radio => {
        radio.addEventListener('change', () => { if (radio.checked) quickFilterState.sort = radio.dataset.sort; });
    });

    document.getElementById('hqfClearBtn')?.addEventListener('click', () => {
        quickFilterState = { genres: new Set(), year: '', sort: 'rating', open: true };
        renderHomeQuickFilterBar();
    });

    document.getElementById('hqfOkBtn')?.addEventListener('click', () => {
        applyQuickFilter();
    });

    const searchInput = document.getElementById('hqfSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            const query = searchInput.value.trim();
            if (!query) return;
            searchPageState.query = query;
            searchPageState.page = 1;
            Router.goTo('search');
        });
    }
}

export function renderHomeQuickFilterBar() {
    const container = document.getElementById('homeQuickFilterBar');
    if (!container) return;
    container.innerHTML = buildHomeQuickFilterHtml();
    wireHomeQuickFilterEvents(container);
}
