// Компактне меню категорій під хіро-банером на головній сторінці.
// Вибираєш жанри/тип/рік/сортування → натискаєш OK → фільтр перерисовує
// основний блок круглих карток на головній сторінці.
import { GENRE_MAP } from '../../config/constants.js?v=20260902-home-quick-filter-v2';
import { loadHomeRecommendations, setHomeRecommendationFilter, setHomeRecommendationSearchQuery, setCurrentTab, setCurrentPage, setCurrentSearchQuery, setCurrentCategory, setQuickFilterParams } from './homeLegacy.js?v=20260908-inline-search-v1';

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
let hqfSearchQuery = '';
let hqfSearchDebounceTimer = null;

function genreEntries() {
    return Object.entries(GENRE_MAP).map(([name, slug]) => ({ name, slug }));
}

function buildHomeQuickFilterHtml() {
    return `
      <div class="hqf-toolbar hqf-toolbar--merged">
        <div class="hqf-merged-bar" id="hqfMergedBar">
          <i class="fas fa-search hqf-search-glass" aria-hidden="true"></i>
          <input type="search" id="hqfSearchInput" class="hqf-search-input" placeholder="Пошук аніме..." value="${hqfSearchQuery}" autocomplete="off" enterkeyhint="search" aria-label="Пошук аніме">
          <button type="button" class="hqf-search-clear" id="hqfSearchClear" aria-label="Очистити пошук"${hqfSearchQuery ? '' : ' hidden'}>
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
          <span class="hqf-merged-divider" aria-hidden="true"></span>
          <button class="hqf-categories-toggle${quickFilterState.open ? ' open' : ''}" id="hqfCategoriesToggle" type="button" aria-label="Обрати категорії" aria-expanded="${quickFilterState.open ? 'true' : 'false'}">
            <i class="fas fa-sliders" aria-hidden="true"></i> <span class="hqf-label">Обрати категорії</span> <i class="fas fa-chevron-down hqf-chevron" aria-hidden="true"></i>
          </button>
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
      </div>
    `;
}

function applyQuickFilter({ keepOpen = false } = {}) {
    const params = { sort: quickFilterState.sort };
    if (quickFilterState.genres.size) params.genres = [...quickFilterState.genres];
    if (quickFilterState.type) params.type = quickFilterState.type;
    if (quickFilterState.year === 'ongoing') params.status = 'ongoing';
    else if (YEAR_RANGES[quickFilterState.year]) {
        [params.yearMin, params.yearMax] = YEAR_RANGES[quickFilterState.year];
    }

    // На головній фільтр змінює саме блок круглих карток, як у jut.su/anime/.
    setCurrentTab('main');
    setCurrentPage(1);
    setCurrentSearchQuery('');
    setCurrentCategory('');
    setQuickFilterParams(params);
    setHomeRecommendationFilter(params);
    setHomeRecommendationSearchQuery(hqfSearchQuery);

    document.getElementById('genreSectionsContainer').style.display = 'none';
    document.getElementById('animeContainer').style.display = 'none';
    const recommendations = document.getElementById('homeRecommendationsContainer');
    if (recommendations) recommendations.style.display = 'block';

    quickFilterState.open = keepOpen;
    renderHomeQuickFilterBar();
    loadHomeRecommendations({ reload: true });
    recommendations?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showRecommendations() {
        // Скинути фільтри і показати топ за рейтингом у круглому блоці.
        quickFilterState = { genres: new Set(), type: '', year: '', sort: 'rating', open: false };
        setQuickFilterParams(null);
        setHomeRecommendationFilter(null);
    setCurrentTab('main');
    setCurrentPage(1);
    setCurrentSearchQuery('');
    setCurrentCategory('');
    hqfSearchQuery = '';
    setHomeRecommendationSearchQuery('');
    document.getElementById('genreSectionsContainer').style.display = 'none';
    const recs = document.getElementById('homeRecommendationsContainer');
    if (recs) {
        recs.style.display = 'block';
        if (!recs.hasChildNodes() || recs.querySelector('.loader')) {
            loadHomeRecommendations({ reload: true });
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
        container.classList.toggle('is-open', quickFilterState.open);
    });

    document.getElementById('hqfHeadlineBtn')?.addEventListener('click', () => {
        showRecommendations();
    });

    container.querySelectorAll('[data-genre]').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) quickFilterState.genres.add(cb.dataset.genre);
            else quickFilterState.genres.delete(cb.dataset.genre);
            applyQuickFilter({ keepOpen: true });
        });
    });

    container.querySelectorAll('[data-type]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) quickFilterState.type = radio.dataset.type;
            applyQuickFilter({ keepOpen: true });
        });
    });

    container.querySelectorAll('[data-year]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) quickFilterState.year = radio.dataset.year;
            applyQuickFilter({ keepOpen: true });
        });
    });

    container.querySelectorAll('[data-sort]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) quickFilterState.sort = radio.dataset.sort;
            applyQuickFilter({ keepOpen: true });
        });
    });

    const searchInput = document.getElementById('hqfSearchInput');
    const searchClear = document.getElementById('hqfSearchClear');

    const runInlineSearch = () => {
        setHomeRecommendationSearchQuery(hqfSearchQuery);
        setCurrentTab('main');
        setCurrentPage(1);
        setCurrentSearchQuery('');
        setCurrentCategory('');
        // Пошук і фільтри не комбінуємо: активний запит скасовує фільтри
        setQuickFilterParams(null);
        setHomeRecommendationFilter(null);
        document.getElementById('genreSectionsContainer').style.display = 'none';
        document.getElementById('animeContainer').style.display = 'none';
        const recommendations = document.getElementById('homeRecommendationsContainer');
        if (recommendations) {
            recommendations.style.display = 'block';
            loadHomeRecommendations({ reload: true });
        }
        if (hqfSearchQuery) recommendations?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    searchInput?.addEventListener('input', () => {
        hqfSearchQuery = searchInput.value.trim();
        searchClear && (searchClear.hidden = !hqfSearchQuery);
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
        searchClear.hidden = true;
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
