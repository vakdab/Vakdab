// Компактне меню категорій під хіро-банером на головній сторінці.
// Вибираєш Аніме/Манґа, жанри/тип/рік/сортування → натискаєш опцію →
// фільтр перерисовує основний блок карток на головній сторінці.
import { GENRE_MAP } from '../../config/constants.js?v=20260902-home-quick-filter-v2';
import {
    loadHomeRecommendations,
    setHomeRecommendationFilter,
    setHomeRecommendationSearchQuery,
    setHomeRecommendationMode,
    setCurrentTab,
    setCurrentPage,
    setCurrentSearchQuery,
    setCurrentCategory,
    setQuickFilterParams
} from './homeLegacy.js?v=20260923-manga-singletons-v1';

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

const MANGA_GENRES = [
    'Романтика', 'Фентезі', 'Комедія', 'Драма', 'Пригоди',
    'Буденність', 'Містика', 'Психологія', 'Сьонен', 'Сьодзьо',
    'Жахи', 'Детектив', 'Фантастика', 'Бойовик', 'Ісекай', 'Школа'
];

const MANGA_AVAILABILITY_OPTIONS = [
    { key: 'all', label: 'Усі тайтли' },
    { key: 'available', label: 'Є що читати' }
];

const MANGA_AGE_OPTIONS = [
    { key: 'all', label: 'Усі вікові категорії' },
    { key: 'children', label: 'Для всіх' },
    { key: 'teen', label: 'Підлітки (16+)' },
    { key: 'adult', label: 'Дорослі (18+)' }
];

const MANGA_SORT_OPTIONS = [
    { key: 'rating', label: 'За популярністю' },
    { key: 'alpha', label: 'За назвою' }
];

const YEAR_RANGES = {
    '2026': [2026, 2026], '2025': [2025, 2025], '2024': [2024, 2024],
    '2015-2023': [2015, 2023], '2008-2014': [2008, 2014], '2000-2007': [2000, 2007],
    before2000: [1970, 1999]
};

let quickFilterState = {
    mode: 'anime', // 'anime' | 'manga'
    genres: new Set(),
    type: '',
    year: '',
    sort: 'rating',
    mangaAvailability: 'all',
    mangaAge: 'all',
    open: false
};
let hqfSearchQuery = '';
let hqfSearchDebounceTimer = null;

function genreEntries() {
    return Object.entries(GENRE_MAP).map(([name, slug]) => ({ name, slug }));
}

function buildHomeQuickFilterHtml() {
    const isManga = quickFilterState.mode === 'manga';
    const searchPlaceholder = isManga ? 'Пошук манґи...' : 'Пошук аніме...';

    return `
      <!-- Перемикач Аніме / Манґа на головній сторінці -->
      <div class="hqf-mode-tabs" role="tablist" aria-label="Вибір розділу">
        <button type="button" class="hqf-mode-tab${!isManga ? ' active' : ''}" data-hqf-mode="anime" role="tab" aria-selected="${!isManga}">
          <i class="fas fa-photo-film" aria-hidden="true"></i>
          <span>Аніме</span>
        </button>
        <button type="button" class="hqf-mode-tab${isManga ? ' active' : ''}" data-hqf-mode="manga" role="tab" aria-selected="${isManga}">
          <i class="fas fa-book-open" aria-hidden="true"></i>
          <span>Манґа</span>
        </button>
      </div>

      <div class="hqf-toolbar hqf-toolbar--merged">
        <div class="hqf-merged-bar" id="hqfMergedBar">
          <i class="fas fa-search hqf-search-glass" aria-hidden="true"></i>
          <input type="text" inputmode="search" id="hqfSearchInput" class="hqf-search-input" placeholder="${searchPlaceholder}" value="${hqfSearchQuery}" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search" aria-label="${searchPlaceholder}">
          <button type="button" class="hqf-search-clear" id="hqfSearchClear" aria-label="Очистити пошук"${hqfSearchQuery ? '' : ' hidden'}>
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
          <span class="hqf-merged-divider" aria-hidden="true"></span>
          <button class="hqf-categories-toggle${quickFilterState.open ? ' open' : ''}" id="hqfCategoriesToggle" type="button" aria-label="Обрати категорії" aria-expanded="${quickFilterState.open ? 'true' : 'false'}">
            <i class="fas fa-sliders" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div class="hqf-panel${quickFilterState.open ? ' open' : ''}" id="hqfPanel">
        <div class="hqf-panel-inner">
          ${!isManga ? `
          <!-- Фільтри АНІМЕ -->
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
          ` : `
          <!-- Фільтри МАНҐИ -->
          <div class="hqf-col">
            <div class="hqf-col-title">Жанр манґи</div>
            <div class="hqf-option-list" id="hqfGenreList">
              ${MANGA_GENRES.map(name => `
                <label class="hqf-option">
                  <input type="checkbox" data-manga-genre="${name}" ${quickFilterState.genres.has(name) ? 'checked' : ''}>
                  <span class="hqf-option-bullet"></span>
                  <span>${name}</span>
                </label>`).join('')}
            </div>
          </div>
          <div class="hqf-col">
            <div class="hqf-col-title">Доступність</div>
            <div class="hqf-option-list">
              ${MANGA_AVAILABILITY_OPTIONS.map(o => `
                <label class="hqf-option">
                  <input type="radio" name="hqfMangaAvail" data-manga-avail="${o.key}" ${quickFilterState.mangaAvailability === o.key ? 'checked' : ''}>
                  <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                  <span>${o.label}</span>
                </label>`).join('')}
            </div>
            <div class="hqf-col-title hqf-col-title--spaced">Вікова категорія</div>
            <div class="hqf-option-list">
              ${MANGA_AGE_OPTIONS.map(o => `
                <label class="hqf-option">
                  <input type="radio" name="hqfMangaAge" data-manga-age="${o.key}" ${quickFilterState.mangaAge === o.key ? 'checked' : ''}>
                  <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                  <span>${o.label}</span>
                </label>`).join('')}
            </div>
            <div class="hqf-col-title hqf-col-title--spaced">Сортування</div>
            <div class="hqf-option-list">
              ${MANGA_SORT_OPTIONS.map(o => `
                <label class="hqf-option">
                  <input type="radio" name="hqfSort" data-sort="${o.key}" ${quickFilterState.sort === o.key ? 'checked' : ''}>
                  <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                  <span>${o.label}</span>
                </label>`).join('')}
            </div>
          </div>
          `}
        </div>
      </div>
    `;
}

function applyQuickFilter({ keepOpen = false } = {}) {
    setHomeRecommendationMode(quickFilterState.mode);

    const params = {
        mode: quickFilterState.mode,
        sort: quickFilterState.sort
    };

    if (quickFilterState.mode === 'anime') {
        if (quickFilterState.genres.size) params.genres = [...quickFilterState.genres];
        if (quickFilterState.type) params.type = quickFilterState.type;
        if (quickFilterState.year === 'ongoing') params.status = 'ongoing';
        else if (YEAR_RANGES[quickFilterState.year]) {
            [params.yearMin, params.yearMax] = YEAR_RANGES[quickFilterState.year];
        }
    } else {
        if (quickFilterState.genres.size) params.genres = [...quickFilterState.genres];
        if (quickFilterState.mangaAvailability) params.availability = quickFilterState.mangaAvailability;
        if (quickFilterState.mangaAge) params.age = quickFilterState.mangaAge;
    }

    // На головній фільтр змінює саме блок карток під банером
    setCurrentTab('main');
    setCurrentPage(1);
    setCurrentSearchQuery('');
    setCurrentCategory('');
    // Switching to manga with default options is not a filter. Fetch the
    // first Honey page, not the entire multi-page manga index.
    const mangaHasFilters = quickFilterState.genres.size > 0
        || (quickFilterState.mangaAge && quickFilterState.mangaAge !== 'all')
        || (quickFilterState.mangaAvailability && quickFilterState.mangaAvailability !== 'all')
        || quickFilterState.sort === 'alpha';
    const recommendationFilter = quickFilterState.mode === 'manga' && !mangaHasFilters ? null : params;
    setQuickFilterParams(recommendationFilter);
    setHomeRecommendationFilter(recommendationFilter);
    setHomeRecommendationSearchQuery(hqfSearchQuery);

    const genreSections = document.getElementById('genreSectionsContainer');
    if (genreSections) genreSections.style.display = 'none';
    const animeContainer = document.getElementById('animeContainer');
    if (animeContainer) animeContainer.style.display = 'none';
    const recommendations = document.getElementById('homeRecommendationsContainer');
    if (recommendations) recommendations.style.display = 'block';

    quickFilterState.open = keepOpen;
    renderHomeQuickFilterBar();
    loadHomeRecommendations({ reload: true });
    recommendations?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showRecommendations() {
    quickFilterState = {
        mode: quickFilterState.mode,
        genres: new Set(),
        type: '',
        year: '',
        sort: 'rating',
        mangaAvailability: 'all',
        mangaAge: 'all',
        open: false
    };
    setHomeRecommendationMode(quickFilterState.mode);
    setQuickFilterParams(null);
    setHomeRecommendationFilter(null);
    setCurrentTab('main');
    setCurrentPage(1);
    setCurrentSearchQuery('');
    setCurrentCategory('');
    hqfSearchQuery = '';
    setHomeRecommendationSearchQuery('');
    const genreSections = document.getElementById('genreSectionsContainer');
    if (genreSections) genreSections.style.display = 'none';
    const recs = document.getElementById('homeRecommendationsContainer');
    if (recs) {
        recs.style.display = 'block';
        loadHomeRecommendations({ reload: true });
    }
    const animeContainer = document.getElementById('animeContainer');
    if (animeContainer) animeContainer.style.display = 'none';
    renderHomeQuickFilterBar();
}

function wireHomeQuickFilterEvents(container) {
    // Перемикач режиму: Аніме / Манґа
    container.querySelectorAll('[data-hqf-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.hqfMode;
            if (mode && mode !== quickFilterState.mode) {
                quickFilterState.mode = mode;
                quickFilterState.genres.clear();
                quickFilterState.sort = 'rating';
                setHomeRecommendationMode(mode);
                applyQuickFilter({ keepOpen: quickFilterState.open });
            }
        });
    });

    const toggle = document.getElementById('hqfCategoriesToggle');
    const panel = document.getElementById('hqfPanel');
    toggle?.addEventListener('click', () => {
        quickFilterState.open = !quickFilterState.open;
        toggle.classList.toggle('open', quickFilterState.open);
        toggle.setAttribute('aria-expanded', quickFilterState.open ? 'true' : 'false');
        panel?.classList.toggle('open', quickFilterState.open);
        container.classList.toggle('is-open', quickFilterState.open);
    });

    document.getElementById('hqfHeadlineBtn')?.addEventListener('click', () => {
        showRecommendations();
    });

    // Аніме жанри
    container.querySelectorAll('[data-genre]').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) quickFilterState.genres.add(cb.dataset.genre);
            else quickFilterState.genres.delete(cb.dataset.genre);
            applyQuickFilter({ keepOpen: true });
        });
    });

    // Манґа жанри
    container.querySelectorAll('[data-manga-genre]').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) quickFilterState.genres.add(cb.dataset.mangaGenre);
            else quickFilterState.genres.delete(cb.dataset.mangaGenre);
            applyQuickFilter({ keepOpen: true });
        });
    });

    // Манґа доступність
    container.querySelectorAll('[data-manga-avail]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) quickFilterState.mangaAvailability = radio.dataset.mangaAvail;
            applyQuickFilter({ keepOpen: true });
        });
    });

    // Манґа вікова категорія
    container.querySelectorAll('[data-manga-age]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) quickFilterState.mangaAge = radio.dataset.mangaAge;
            applyQuickFilter({ keepOpen: true });
        });
    });

    // Тип аніме
    container.querySelectorAll('[data-type]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) quickFilterState.type = radio.dataset.type;
            applyQuickFilter({ keepOpen: true });
        });
    });

    // Рік аніме
    container.querySelectorAll('[data-year]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) quickFilterState.year = radio.dataset.year;
            applyQuickFilter({ keepOpen: true });
        });
    });

    // Сортування
    container.querySelectorAll('[data-sort]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) quickFilterState.sort = radio.dataset.sort;
            applyQuickFilter({ keepOpen: true });
        });
    });

    const searchInput = document.getElementById('hqfSearchInput');
    const searchClear = document.getElementById('hqfSearchClear');
    const mergedBar = document.getElementById('hqfMergedBar');

    const updateSearchMode = () => {
        const hasQuery = Boolean(searchInput?.value.trim());
        mergedBar?.classList.toggle('has-query', hasQuery);
        if (searchClear) searchClear.hidden = !hasQuery;
    };

    updateSearchMode();

    const runInlineSearch = () => {
        setHomeRecommendationMode(quickFilterState.mode);
        setHomeRecommendationSearchQuery(hqfSearchQuery);
        setCurrentTab('main');
        setCurrentPage(1);
        setCurrentSearchQuery('');
        setCurrentCategory('');
        setQuickFilterParams(null);
        setHomeRecommendationFilter(null);
        const genreSections = document.getElementById('genreSectionsContainer');
        if (genreSections) genreSections.style.display = 'none';
        const animeContainer = document.getElementById('animeContainer');
        if (animeContainer) animeContainer.style.display = 'none';
        const recommendations = document.getElementById('homeRecommendationsContainer');
        if (recommendations) {
            recommendations.style.display = 'block';
            loadHomeRecommendations({ reload: true });
        }
        if (hqfSearchQuery) recommendations?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    searchInput?.addEventListener('input', () => {
        hqfSearchQuery = searchInput.value.trim();
        updateSearchMode();
        clearTimeout(hqfSearchDebounceTimer);
        hqfSearchDebounceTimer = setTimeout(runInlineSearch, 400);
    });

    searchInput?.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            clearTimeout(hqfSearchDebounceTimer);
            runInlineSearch();
            searchInput.blur();
        }
    });

    searchClear?.addEventListener('click', () => {
        searchInput.value = '';
        hqfSearchQuery = '';
        updateSearchMode();
        clearTimeout(hqfSearchDebounceTimer);
        runInlineSearch();
    });
}

export function renderHomeQuickFilterBar() {
    const container = document.getElementById('homeQuickFilterBar');
    if (!container) return;
    container.innerHTML = buildHomeQuickFilterHtml();
    container.classList.toggle('is-open', quickFilterState.open);
    wireHomeQuickFilterEvents(container);
}
