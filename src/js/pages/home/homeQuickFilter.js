// Компактне меню категорій під хіро-банером на головній сторінці.
// Вибираєш жанри/тип/рік/сортування → натискаєш OK → картки з'являються
// в #animeContainer у тому ж стилі що й головна сторінка.
import { GENRE_MAP } from '../../config/constants.js?v=20260902-genre-rail-v2';
import { Router } from '../../core/compat/router.js?v=20260901-home-recs-v3';
import { searchPageState, loadContent, setCurrentTab, setCurrentPage, setCurrentSearchQuery, setCurrentCategory, setQuickFilterParams, setHomeRecommendationFilter, loadHomeRecommendations } from './homeLegacy.js?v=20260902-genre-rail-v2';

const YEAR_OPTIONS = [
    { key: '', label: 'Будь-який' },
    { key: 'ongoing', label: 'Онгоінг' },
    { key: '2026', label: '2026' },
    { key: '2025', label: '2025' },
    { key: '2024', label: '2024' },
    { key: '2015-2023', label: '2015-2023' },
    { key: '2008-2014', label: '2008-2014' },
    { key: '2000-2007', label: '2000-2007' },
    { key: 'before2000', label: 'до 2000' }
];

const TYPE_OPTIONS = [
    { key: '', label: 'Будь-який' },
    { key: 'tv', label: 'Серіал' },
    { key: 'movie', label: 'Фільм' },
    { key: 'ova', label: 'OVA' },
    { key: 'ona', label: 'ONA' },
    { key: 'special', label: 'Спешл' }
];

const SORT_OPTIONS = [
    { key: 'rating', label: 'За рейтингом' },
    { key: 'alpha', label: 'За алфавітом' },
    { key: 'episodes', label: 'За кіл-тю серій' },
    { key: 'year', label: 'За роком виходу' },
    { key: 'added', label: 'За датою додавання' }
];

const YEAR_RANGES = {
    '2026': [2026, 2026], '2025': [2025, 2025], '2024': [2024, 2024],
    '2015-2023': [2015, 2023], '2008-2014': [2008, 2014], '2000-2007': [2000, 2007],
    before2000: [1970, 1999]
};

let quickFilterState = { genres: new Set(), type: '', year: '', sort: 'rating', open: false };

// ── Жанрове меню (horizontal rail, як на jut.su) ──────────────────────
let activeGenreRail = null; // slug активного жанру або null = "Усі"

function genreEntries() {
    return Object.entries(GENRE_MAP).map(([name, slug]) => ({ name, slug }));
}

function buildGenreRailHtml() {
    const genres = genreEntries();
    const allActive = activeGenreRail === null;
    return `
      <div class="genre-rail" id="genreRail">
        <button class="genre-rail__pill${allActive ? ' active' : ''}" data-genre-rail="" type="button">
          <span class="genre-rail__icon"><i class="fas fa-fire"></i></span>
          <span>Усі</span>
        </button>
        ${genres.map(g => `
        <button class="genre-rail__pill${activeGenreRail === g.slug ? ' active' : ''}" data-genre-rail="${g.slug}" type="button">
          <span>${g.name}</span>
        </button>`).join('')}
      </div>
    `;
}

function applyGenreRailFilter(slug) {
    activeGenreRail = slug || null;

    if (!slug) {
        // "Усі" — показуємо рекомендації без фільтру
        setHomeRecommendationFilter(null);
        setQuickFilterParams(null);
        setCurrentTab('main');
        setCurrentPage(1);
        setCurrentSearchQuery('');
        setCurrentCategory('');
        document.getElementById('genreSectionsContainer').style.display = 'none';
        const recs = document.getElementById('homeRecommendationsContainer');
        if (recs) {
            recs.style.display = 'block';
            loadHomeRecommendations({ reload: true });
        }
        document.getElementById('animeContainer').style.display = 'none';
    } else {
        // Жанр — фільтруємо рекомендації
        const params = { genres: [slug], sort: 'rating' };
        setHomeRecommendationFilter(params);
        setQuickFilterParams(null);
        setCurrentTab('main');
        setCurrentPage(1);
        setCurrentSearchQuery('');
        setCurrentCategory('');
        document.getElementById('genreSectionsContainer').style.display = 'none';
        const recs = document.getElementById('homeRecommendationsContainer');
        if (recs) {
            recs.style.display = 'block';
            loadHomeRecommendations({ reload: true });
        }
        document.getElementById('animeContainer').style.display = 'none';
    }

    // Оновлюємо UI жанрового меню
    renderGenreRail();
}

function wireGenreRailEvents() {
    document.querySelectorAll('[data-genre-rail]').forEach(btn => {
        btn.addEventListener('click', () => {
            const slug = btn.dataset.genreRail;
            applyGenreRailFilter(slug);
            // Прокручуємо до рекомендацій
            const recs = document.getElementById('homeRecommendationsContainer');
            if (recs) recs.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function renderGenreRail() {
    const host = document.getElementById('genreRailHost');
    if (!host) return;
    host.innerHTML = buildGenreRailHtml();
    wireGenreRailEvents();
}

// ── Кінець жанрового меню ─────────────────────────────────────────────

function buildHomeQuickFilterHtml() {
    return `
      <div class="genre-rail-host" id="genreRailHost">
        ${buildGenreRailHtml()}
      </div>

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
            <div class="hqf-col-title">Тип</div>
            <div class="hqf-option-list">
              ${TYPE_OPTIONS.map(o => `
                <label class="hqf-option">
                  <input type="radio" name="hqfType" data-type="${o.key}" ${quickFilterState.type === o.key ? 'checked' : ''}>
                  <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                  <span>${o.label}</span>
                </label>`).join('')}
            </div>
            <div class="hqf-col-title hqf-col-title--spaced">Рік виходу</div>
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
    if (quickFilterState.genres.size) params.genres = [...quickFilterState.genres];
    if (quickFilterState.type) params.type = quickFilterState.type;
    if (quickFilterState.year === 'ongoing') params.status = 'ongoing';
    else if (YEAR_RANGES[quickFilterState.year]) {
        [params.yearMin, params.yearMax] = YEAR_RANGES[quickFilterState.year];
    }

    // Скидаємо жанрове меню
    activeGenreRail = null;

    // Скидаємо всі інші джерела контенту, ставимо наш фільтр
    setCurrentTab('main');
    setCurrentPage(1);
    setCurrentSearchQuery('');
    setCurrentCategory('');
    setQuickFilterParams(params);

    // Ховаємо секції жанрів та рекомендації, показуємо grid
    document.getElementById('genreSectionsContainer').style.display = 'none';
    const recs = document.getElementById('homeRecommendationsContainer');
    if (recs) recs.style.display = 'none';
    document.getElementById('animeContainer').style.display = 'grid';

    loadContent();

    // Прокручуємо до контенту
    document.getElementById('animeContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showRecommendations() {
    // Скинути фільтри і показати топ за рейтингом (рекомендації)
    quickFilterState = { genres: new Set(), type: '', year: '', sort: 'rating', open: false };
    activeGenreRail = null;
    setQuickFilterParams(null);
    setHomeRecommendationFilter(null);
    setCurrentTab('main');
    setCurrentPage(1);
    setCurrentSearchQuery('');
    setCurrentCategory('');
    document.getElementById('genreSectionsContainer').style.display = 'none';
    const recs = document.getElementById('homeRecommendationsContainer');
    if (recs) {
        recs.style.display = 'block';
        if (!recs.hasChildNodes() || recs.querySelector('.loader')) {
            loadHomeRecommendations();
        }
    }
    document.getElementById('animeContainer').style.display = 'none';
    renderHomeQuickFilterBar();
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
        showRecommendations();
    });

    container.querySelectorAll('[data-genre]').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) quickFilterState.genres.add(cb.dataset.genre);
            else quickFilterState.genres.delete(cb.dataset.genre);
        });
    });

    container.querySelectorAll('[data-type]').forEach(radio => {
        radio.addEventListener('change', () => { if (radio.checked) quickFilterState.type = radio.dataset.type; });
    });

    container.querySelectorAll('[data-year]').forEach(radio => {
        radio.addEventListener('change', () => { if (radio.checked) quickFilterState.year = radio.dataset.year; });
    });

    container.querySelectorAll('[data-sort]').forEach(radio => {
        radio.addEventListener('change', () => { if (radio.checked) quickFilterState.sort = radio.dataset.sort; });
    });

    document.getElementById('hqfClearBtn')?.addEventListener('click', () => {
        quickFilterState = { genres: new Set(), type: '', year: '', sort: 'rating', open: true };
        activeGenreRail = null;
        setQuickFilterParams(null);
        setHomeRecommendationFilter(null);
        setCurrentTab('main');
        setCurrentPage(1);
        setCurrentSearchQuery('');
        setCurrentCategory('');
        document.getElementById('genreSectionsContainer').style.display = 'none';
        const recs = document.getElementById('homeRecommendationsContainer');
        if (recs) {
            recs.style.display = 'block';
            if (!recs.hasChildNodes() || recs.querySelector('.loader')) {
                loadHomeRecommendations();
            }
        }
        document.getElementById('animeContainer').style.display = 'none';
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
