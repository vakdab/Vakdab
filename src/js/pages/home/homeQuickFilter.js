// Компактне меню категорій під хіро-банером на головній сторінці.
// Один рядок: "Обрати категорії" + пошук. Розкривна панель: жанри (чекбокси),
// рік виходу і сортування (радіо), кнопка "OK" одразу показує картки під меню
// (без переходу на окрему сторінку фільтра — вона видалена, все відбувається тут).
import { GENRE_MAP } from '../../config/constants.js?v=20260902-home-quick-filter-v1';
import { Router } from '../../core/compat/router.js?v=20260901-home-recs-v3';
import { searchPageState } from './homeLegacy.js?v=20260901-home-recs-v8';
import { fetchHikkaByGenre, fetchHikkaMain } from '../../services/catalog/catalog.js?v=20260902-home-quick-filter-v1';
import { openPlayerPage } from '../player/animePlayerPage.js?v=20260901-startup-fix-2';

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

const YEAR_RANGES = {
    '2026': [2026, 2026], '2025': [2025, 2025], '2024': [2024, 2024],
    '2015-2023': [2015, 2023], '2008-2014': [2008, 2014], '2000-2007': [2000, 2007],
    before2000: [1970, 1999]
};

const SORT_FNS = {
    rating: (a, b) => (Number(b.score) || 0) - (Number(a.score) || 0),
    alpha: (a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'uk'),
    episodes: (a, b) => (Number(b.episodes_total || b.episodes_released || b.episodes || 0)) - (Number(a.episodes_total || a.episodes_released || a.episodes || 0)),
    year: (a, b) => (Number(b.year) || 0) - (Number(a.year) || 0),
    added: (a, b) => (Number(b.updated_at ? new Date(b.updated_at).getTime() : 0)) - (Number(a.updated_at ? new Date(a.updated_at).getTime() : 0))
};

let quickFilterState = { genres: new Set(), year: '', sort: 'rating', open: false };
let resultsState = { items: [], page: 0, genrePages: {}, genreHasMore: {}, hasMore: true, loading: false };

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

      <div class="hqf-results" id="hqfResults" style="display:none;">
        <div class="hqf-results-meta" id="hqfResultsMeta"></div>
        <div class="hqf-results-grid" id="hqfResultsGrid"></div>
        <div class="hqf-results-more" id="hqfResultsMore"></div>
      </div>
    `;
}

function cardHtml(a, idx) {
    const poster = a.images?.jpg?.large_image_url || '';
    const title = a.title || 'Без назви';
    return `
      <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${(idx % 24) * 0.03}s">
        <div class="anime-poster">
          <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')">
        </div>
        <div class="anime-title-under">${title}</div>
      </div>
    `;
}

function matchesQuickFilter(a) {
    if (quickFilterState.year === 'ongoing' && a.status !== 'ongoing') return false;
    const range = YEAR_RANGES[quickFilterState.year];
    if (range) {
        const y = Number(a.year) || 0;
        if (y && (y < range[0] || y > range[1])) return false;
    }
    return true;
}

async function loadQuickFilterResults(reset) {
    const grid = document.getElementById('hqfResultsGrid');
    const more = document.getElementById('hqfResultsMore');
    const meta = document.getElementById('hqfResultsMeta');
    const resultsBox = document.getElementById('hqfResults');
    if (!grid || resultsState.loading) return;

    resultsBox.style.display = 'block';
    if (reset) {
        resultsState = { items: [], page: 0, genrePages: {}, genreHasMore: {}, hasMore: true, loading: false };
        grid.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>';
        if (more) more.innerHTML = '';
        if (meta) meta.textContent = '';
    }
    resultsState.loading = true;

    try {
        const seen = new Set(resultsState.items.map(i => i.url));
        const appendMatches = pageItems => pageItems.filter(matchesQuickFilter).forEach(item => {
            if (!seen.has(item.url)) { resultsState.items.push(item); seen.add(item.url); }
        });
        const hasNext = pageItems => pageItems.hasNextPage !== undefined ? Boolean(pageItems.hasNextPage) : pageItems.length >= 24;

        if (!quickFilterState.genres.size) {
            const nextPage = resultsState.page + 1;
            const pageItems = await fetchHikkaMain(nextPage);
            resultsState.page = nextPage;
            appendMatches(pageItems);
            resultsState.hasMore = hasNext(pageItems);
        } else {
            for (const slug of quickFilterState.genres) {
                if (resultsState.genreHasMore[slug] === false) continue;
                const nextPage = (resultsState.genrePages[slug] || 0) + 1;
                const pageItems = await fetchHikkaByGenre(slug, nextPage);
                resultsState.genrePages[slug] = nextPage;
                resultsState.genreHasMore[slug] = hasNext(pageItems);
                appendMatches(pageItems);
            }
            resultsState.hasMore = Object.values(resultsState.genreHasMore).some(Boolean);
        }

        resultsState.items.sort(SORT_FNS[quickFilterState.sort] || SORT_FNS.rating);

        if (!resultsState.items.length) {
            grid.innerHTML = '<div class="loader">Нічого не знайдено за цими критеріями</div>';
            if (more) more.innerHTML = '';
            return;
        }

        if (meta) meta.textContent = `Знайдено: ${resultsState.items.length}`;
        grid.innerHTML = resultsState.items.map((a, idx) => cardHtml(a, idx)).join('');
        grid.querySelectorAll('.anime-card').forEach(card => {
            card.addEventListener('click', () => openPlayerPage(card.dataset.url));
            card.addEventListener('keydown', e => { if (e.key === 'Enter') openPlayerPage(card.dataset.url); });
        });
        if (more) {
            more.innerHTML = resultsState.hasMore ?
                '<button class="btn-outline" id="hqfLoadMoreBtn">Показати ще <i class="fas fa-chevron-down"></i></button>' : '';
            document.getElementById('hqfLoadMoreBtn')?.addEventListener('click', () => loadQuickFilterResults(false));
        }
        resultsBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
        grid.innerHTML = `<div class="loader"><i class="fas fa-exclamation-triangle"></i> Помилка: ${err.message}</div>`;
    } finally {
        resultsState.loading = false;
    }
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
        quickFilterState.genres.clear();
        quickFilterState.year = '';
        quickFilterState.sort = 'rating';
        renderHomeQuickFilterBar();
        loadQuickFilterResults(true);
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
        loadQuickFilterResults(true);
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
