import { GENRE_MAP } from '../../config/constants.js?v=20260824-settings-redesign-v1';
import { Router } from '../../core/compat/router.js?v=20260901-home-recs-v3';
import { fetchHikkaByGenre, fetchHikkaMain } from '../../services/catalog/catalog.js?v=20260829-catalog-28-v1';
import { loadGenres, loadGenrePageContent, openPlayerPage, escapeHtml, ANIME_CARD_PLACEHOLDER } from '../../legacy/app-legacy.js?v=20260901-home-recs-v3';

        const FILTER_STATUS_OPTIONS = [
            { key: 'anons', label: 'Анонс' },
            { key: 'released', label: 'Завершено' },
            { key: 'ongoing', label: 'Онгоінг' }
        ];
        const FILTER_TYPE_OPTIONS = [
            { key: 'tv', label: 'ТБ-серіал', functional: true },
            { key: 'movie', label: 'Фільм', functional: true },
            { key: 'ova', label: 'OVA', functional: true },
            { key: 'ona', label: 'ONA', functional: true },
            { key: 'special', label: 'Спешл', functional: true }
        ];
        const FILTER_SEASON_OPTIONS = [
            { key: 'winter', label: 'Зима' },
            { key: 'spring', label: 'Весна' },
            { key: 'summer', label: 'Літо' },
            { key: 'fall', label: 'Осінь' }
        ];
        const FILTER_AGE_OPTIONS = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
        const FILTER_SORT_OPTIONS = [
            { key: 'rating', label: 'За рейтингом' },
            { key: 'alpha', label: 'За алфавітом' },
            { key: 'episodes', label: 'За кіл-тю серій' },
            { key: 'year', label: 'За роком виходу' },
            { key: 'added', label: 'За датою додавання' }
        ];

        // Реальний список команд озвучення/перекладу з hikka.io / mikai.me (для відображення;
        // застосування цього фільтра до результатів поки в розробці — джерело не віддає
        // переклад на рівні каталогу, лише всередині картки конкретного аніме)
        const FILTER_TRANSLATION_OPTIONS = [
            'FanVoxUA', 'InariDuB', 'Багатоголосий закадровий', 'Amanogawa', 'Клан Кайзоку', 'AniUA',
            'Glass moon', 'Робота Голосом', 'Субтитри', 'Flame Studio', 'AniTube', 'UAnime', 'VRdub',
            'DZUSKI', 'HATOSHI', 'SkiDub'
        ];

        let filterState = null;
        let filterResultsState = { items: [], loadingMore: false, page: 0, genrePages: {}, exhausted: false };

        function resetFilterState() {
            filterState = {
                genres: new Set(), status: 'all', types: new Set(), season: 'all', yearMin: 1970, yearMax: 2026, ratingMin: 0, ratingMax: 10, translation: '', age: new Set(), genrePanelOpen: false, sort: 'rating'
            };
        }

        const QUICK_FILTER_YEAR_RANGES = {
            '2026': [2026, 2026], '2025': [2025, 2025], '2024': [2024, 2024],
            '2015-2023': [2015, 2023], '2008-2014': [2008, 2014], '2000-2007': [2000, 2007],
            before2000: [1970, 1999]
        };

        // Пресети, що приходять з компактного меню під хіро-банером на головній (#filter?genres=...&year=...&sort=...).
        function applyQuickFilterParams(params) {
            if (!params) return;
            const genresParam = String(params.genres || '').trim();
            if (genresParam) genresParam.split(',').map(s => s.trim()).filter(Boolean).forEach(slug => filterState.genres.add(slug));
            const yearParam = String(params.year || '').trim();
            if (yearParam === 'ongoing') filterState.status = 'ongoing';
            else if (QUICK_FILTER_YEAR_RANGES[yearParam]) {
                [filterState.yearMin, filterState.yearMax] = QUICK_FILTER_YEAR_RANGES[yearParam];
            }
            const sortParam = String(params.sort || '').trim();
            if (sortParam) filterState.sort = sortParam;
            filterState.genrePanelOpen = filterState.genres.size > 0;
        }

        function buildDualRangeHtml(id, min, max, valMin, valMax, step) {
            return `
              <div class="filter-page__number-row">
                <input type="number" class="filter-page__number-box" id="${id}MinBox" value="${valMin}">
                <span class="filter-page__number-sep">—</span>
                <input type="number" class="filter-page__number-box" id="${id}MaxBox" value="${valMax}">
              </div>
              <div class="filter-page__dual-range">
                <div class="filter-page__dual-range-track"></div>
                <div class="filter-page__dual-range-fill" id="${id}Fill"></div>
                <input type="range" class="filter-page__dual-range-input" id="${id}MinSlider" min="${min}" max="${max}" step="${step}" value="${valMin}">
                <input type="range" class="filter-page__dual-range-input" id="${id}MaxSlider" min="${min}" max="${max}" step="${step}" value="${valMax}">
              </div>
            `;
        }

        function initDualRangeVisual(id, min, max) {
            const minSlider = document.getElementById(id + 'MinSlider');
            const maxSlider = document.getElementById(id + 'MaxSlider');
            const fill = document.getElementById(id + 'Fill');
            if (!minSlider || !maxSlider || !fill) return;
            const a = parseFloat(minSlider.value), b = parseFloat(maxSlider.value);
            const pctA = ((a - min) / (max - min)) * 100;
            const pctB = ((b - min) / (max - min)) * 100;
            fill.style.left = pctA + '%';
            fill.style.width = (pctB - pctA) + '%';
        }

        function updateGenreToggleLabel() {
            const el = document.getElementById('filterGenreValue');
            if (!el) return;
            const n = filterState.genres.size;
            el.innerHTML = (n === 0 ? 'Всі' : n + ' обрано') + ' <i class="fas fa-chevron-right"></i>';
        }

        function buildFilterPageHtml() {
            const genreEntries = loadGenres();
            return `
            <div class="filter-page">
              <div class="filter-page__header">
                <button class="filter-page__back" id="filterBackBtn" aria-label="Назад"><i class="fas fa-arrow-left"></i></button>
                <div>
                  <div class="filter-page__eyebrow">Каталог</div>
                  <h2 class="filter-page__title">Фільтр аніме</h2>
                </div>
              </div>

              <div class="filter-page__section">
                <button class="filter-page__genre-toggle${filterState.genrePanelOpen ? ' open' : ''}" id="filterGenreToggle">
                  <span class="filter-page__section-title">Жанри</span>
                  <span class="filter-page__genre-toggle-value" id="filterGenreValue">${filterState.genres.size === 0 ? 'Всі' : filterState.genres.size + ' обрано'} <i class="fas fa-chevron-right"></i></span>
                </button>
                <div class="filter-page__genre-panel${filterState.genrePanelOpen ? ' open' : ''}" id="filterGenrePanel">
                  <div class="filter-page__checkbox-grid">
                    ${genreEntries.map(g => `
                      <label class="filter-page__checkbox">
                        <input type="checkbox" data-genre="${g.slug}" ${filterState.genres.has(g.slug) ? 'checked' : ''}>
                        <span>${g.name}</span>
                      </label>`).join('')}
                  </div>
                </div>
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Статус</div>
                <div class="filter-page__section-sub">Стан виходу аніме</div>
                <div class="filter-chip-row" id="filterStatusRow" style="margin-top:0.8rem;">
                  <button class="filter-chip${filterState.status === 'all' ? ' active' : ''}" data-status="all">Всі</button>
                  ${FILTER_STATUS_OPTIONS.map(s => `<button class="filter-chip${filterState.status === s.key ? ' active' : ''}" data-status="${s.key}">${s.label}</button>`).join('')}
                </div>
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Сезон</div>
                <div class="filter-page__section-sub">Пошук за сезоном виходу</div>
                <div class="filter-chip-row" style="margin-top:0.8rem;">
                  ${FILTER_SEASON_OPTIONS.map(s => `<button class="filter-chip" data-season="${s.key}">${s.label}</button>`).join('')}
                </div>
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Рік виходу</div>
                <div class="filter-page__section-sub">1970-2026</div>
                ${buildDualRangeHtml('filterYear', 1970, 2026, filterState.yearMin, filterState.yearMax, 1)}
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Сортування</div>
                <div class="filter-page__section-sub">Порядок карток у результатах</div>
                <div class="filter-page__checkbox-grid" style="margin-top:0.8rem;">
                  ${FILTER_SORT_OPTIONS.map(o => `
                    <label class="filter-page__checkbox">
                      <input type="radio" name="filterSort" data-sort="${o.key}" ${filterState.sort === o.key ? 'checked' : ''}>
                      <span>${o.label}</span>
                    </label>`).join('')}
                </div>
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Тип</div>
                <div class="filter-page__section-sub">Формат аніме</div>
                <div class="filter-page__checkbox-grid" style="margin-top:0.8rem;">
                  ${FILTER_TYPE_OPTIONS.map(t => `
                    <label class="filter-page__checkbox${t.functional ? '' : ' filter-page__checkbox--soon'}">
                      <input type="checkbox" data-type="${t.key}" ${t.functional ? '' : 'disabled'}>
                      <span>${t.label}${t.functional ? '' : ' <em>(скоро)</em>'}</span>
                    </label>`).join('')}
                </div>
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Вікове обмеження</div>
                <div class="filter-page__section-sub">Рейтинг контенту</div>
                <div class="filter-page__checkbox-grid" style="margin-top:0.8rem;">
                  ${FILTER_AGE_OPTIONS.map(a => `
                    <label class="filter-page__checkbox filter-page__checkbox--soon">
                      <input type="checkbox" data-age="${a}">
                      <span>${a}</span>
                    </label>`).join('')}
                </div>
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Оцінка</div>
                <div class="filter-page__section-sub">Рейтинг MonoAnime</div>
                <label class="filter-page__checkbox" style="margin-top:0.6rem;">
                  <input type="checkbox" id="filterUseMal">
                  <span>Брати оцінку з MyAnimeList</span>
                </label>
                ${buildDualRangeHtml('filterRating', 0, 10, 0, 10, 0.1)}
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Переклад</div>
                <div class="filter-page__section-sub">Команда озвучення або субтитрів</div>
                <select class="filter-page__select" id="filterTranslation" style="margin-top:0.8rem;">
                  <option>Виберіть переклад</option>
                  ${FILTER_TRANSLATION_OPTIONS.map(t => `<option>${t}</option>`).join('')}
                </select>
                <label class="filter-page__checkbox filter-page__checkbox--soon" style="margin-top:0.8rem;">
                  <input type="checkbox" id="filterAllDubbed">
                  <span>Усі епізоди озвучені</span>
                </label>
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Студія</div>
                <div class="filter-page__section-sub">Виробник тайтлу</div>
                <select class="filter-page__select" id="filterTranslation" style="margin-top:0.8rem;">
                  <option>Виберіть студію</option>
                </select>
              </div>

              <button class="btn-outline filter-page__reset-btn" id="filterResetBtn">
                <i class="fas fa-times"></i> Скинути фільтри
              </button>

              <div id="filterResultsMeta" class="filter-page__results-meta"></div>
              <div id="filterPageContent" class="grid-3cols">
                <div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>
              </div>
              <div class="pagination-row" id="filterPagePagination"></div>
            </div>
          `;
        }

        function wireFilterPageEvents(container) {
            document.getElementById('filterBackBtn')?.addEventListener('click', () => {
                if (history.length > 1) history.back(); else Router.goTo('main');
            });

            const genreToggle = document.getElementById('filterGenreToggle');
            const genrePanel = document.getElementById('filterGenrePanel');
            genreToggle?.addEventListener('click', () => {
                filterState.genrePanelOpen = !filterState.genrePanelOpen;
                genrePanel.classList.toggle('open', filterState.genrePanelOpen);
                genreToggle.classList.toggle('open', filterState.genrePanelOpen);
            });
            container.querySelectorAll('[data-genre]').forEach(cb => {
                cb.addEventListener('change', () => {
                    if (cb.checked) filterState.genres.add(cb.dataset.genre); else filterState.genres.delete(cb.dataset.genre);
                    updateGenreToggleLabel();
                    applyFilters(true);
                });
            });

            container.querySelectorAll('#filterStatusRow .filter-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    container.querySelectorAll('#filterStatusRow .filter-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    filterState.status = chip.dataset.status;
                    applyFilters(true);
                });
            });

            container.querySelectorAll('[data-type]').forEach(cb => {
                cb.addEventListener('change', () => {
                    if (cb.checked) filterState.types.add(cb.dataset.type); else filterState.types.delete(cb.dataset.type);
                    applyFilters(true);
                });
            });

            container.querySelectorAll('[data-season]').forEach(chip => chip.addEventListener('click', () => {
                container.querySelectorAll('[data-season]').forEach(c => c.classList.remove('active'));
                chip.classList.toggle('active'); filterState.season = chip.classList.contains('active') ? chip.dataset.season : 'all'; applyFilters(true);
            }));
            container.querySelectorAll('[data-age]').forEach(cb => cb.addEventListener('change', () => { if (cb.checked) filterState.age.add(cb.dataset.age); else filterState.age.delete(cb.dataset.age); applyFilters(true); }));
            container.querySelectorAll('[data-sort]').forEach(radio => radio.addEventListener('change', () => {
                if (!radio.checked) return;
                filterState.sort = radio.dataset.sort;
                applyFilters(true);
            }));
            const translation = document.getElementById('filterTranslation');
            translation?.addEventListener('change', () => { filterState.translation = translation.value; applyFilters(true); });
            ['filterYear','filterRating'].forEach(id => ['Min','Max'].forEach(side => document.getElementById(id + side + 'Slider')?.addEventListener('input', e => {
                const box = document.getElementById(id + side + 'Box'); if (box) box.value = e.target.value;
                filterState[id === 'filterYear' ? (side === 'Min' ? 'yearMin' : 'yearMax') : (side === 'Min' ? 'ratingMin' : 'ratingMax')] = Number(e.target.value);
                initDualRangeVisual(id, id === 'filterYear' ? 1970 : 0, id === 'filterYear' ? 2026 : 10); applyFilters(true);
            })));
            initDualRangeVisual('filterYear', 1970, 2026);
            initDualRangeVisual('filterRating', 0, 10);

            document.getElementById('filterResetBtn')?.addEventListener('click', () => {
                renderFilterPage();
            });
        }

        export function renderFilterPage() {
            const container = document.getElementById('genrePageContainer');
            if (!container) return;
            resetFilterState();
            applyQuickFilterParams(Router.params);
            filterResultsState = { items: [], loadingMore: false, page: 0, genrePages: {}, exhausted: false };
            container.innerHTML = buildFilterPageHtml();
            wireFilterPageEvents(container);
            applyFilters(true);
        }

        export async function applyFilters(reset) {
            const content = document.getElementById('filterPageContent');
            const pagination = document.getElementById('filterPagePagination');
            const meta = document.getElementById('filterResultsMeta');
            if (!content || filterResultsState.loadingMore) return;
            if (reset) {
                filterResultsState = { items: [], loadingMore: false, page: 0, genrePages: {}, genreHasMore: {}, exhausted: false, hasMore: true };
                content.innerHTML = '<div class="loader" style="grid-column:1/-1;"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>';
                if (meta) meta.textContent = '';
            }
            filterResultsState.loadingMore = true;
            try {
                const effectiveGenres = new Set(filterState.genres);
                if (filterState.types.has('movie')) effectiveGenres.add('film');
                const seen = new Set(filterResultsState.items.map(i => i.url));
                const matches = (a) => {
                    if (filterState.status !== 'all' && a.status !== filterState.status) return false;
                    if (filterState.types.size && !filterState.types.has(a.type || 'tv')) return false;
                    if (filterState.genres.size && ![...(a.genres || [])].some(g => filterState.genres.has(GENRE_MAP[g] || g))) return false;
                    if (filterState.yearMin > 1970 || filterState.yearMax < 2026) {
                        const y = Number(a.year) || 0;
                        if (y && (y < filterState.yearMin || y > filterState.yearMax)) return false;
                    }
                    return true;
                };
                const appendMatches = pageItems => pageItems.filter(matches).forEach(item => {
                    if (!seen.has(item.url)) { filterResultsState.items.push(item); seen.add(item.url); }
                });
                const hasNext = pageItems => pageItems.hasNextPage !== undefined ? Boolean(pageItems.hasNextPage) : pageItems.length >= 24;

                if (effectiveGenres.size === 0) {
                    const nextPage = filterResultsState.page + 1;
                    const pageItems = await fetchHikkaMain(nextPage);
                    filterResultsState.page = nextPage;
                    appendMatches(pageItems);
                    filterResultsState.hasMore = hasNext(pageItems);
                } else {
                    for (const slug of effectiveGenres) {
                        if (filterResultsState.genreHasMore[slug] === false) continue;
                        const nextPage = (filterResultsState.genrePages[slug] || 0) + 1;
                        const pageItems = await fetchHikkaByGenre(slug, nextPage);
                        filterResultsState.genrePages[slug] = nextPage;
                        filterResultsState.genreHasMore[slug] = hasNext(pageItems);
                        appendMatches(pageItems);
                    }
                    filterResultsState.hasMore = Object.values(filterResultsState.genreHasMore).some(Boolean);
                }
                filterResultsState.exhausted = !filterResultsState.hasMore;

                const FILTER_SORT_FNS = {
                    rating: (a, b) => (Number(b.score) || 0) - (Number(a.score) || 0),
                    alpha: (a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'uk'),
                    episodes: (a, b) => (Number(b.episodes_total || b.episodes_released || b.episodes || 0)) - (Number(a.episodes_total || a.episodes_released || a.episodes || 0)),
                    year: (a, b) => (Number(b.year) || 0) - (Number(a.year) || 0),
                    added: (a, b) => (Number(b.updated_at ? new Date(b.updated_at).getTime() : 0)) - (Number(a.updated_at ? new Date(a.updated_at).getTime() : 0))
                };
                filterResultsState.items.sort(FILTER_SORT_FNS[filterState.sort] || FILTER_SORT_FNS.rating);

                if (!filterResultsState.items.length) {
                    content.innerHTML = '<div class="loader" style="grid-column:1/-1;">Нічого не знайдено за цими фільтрами</div>';
                    pagination.innerHTML = '';
                    if (meta) meta.textContent = '';
                    return;
                }

                if (meta) meta.textContent = `Знайдено: ${filterResultsState.items.length}`;

                content.innerHTML = filterResultsState.items.map((a, idx) => {
                    const poster = a.images?.jpg?.large_image_url || '';
                    const title = a.title || 'Без назви';
                    return `
                <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${(idx % 24)*0.03}s">
                  <div class="anime-poster">
                    <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='data:image/svg+xml,...'">
                  </div>
                  <div class="anime-title-under">${title}</div>
                </div>
              `;
                }).join('');
                content.querySelectorAll('.anime-card').forEach(card => {
                    card.addEventListener('click', () => openPlayerPage(card.dataset.url));
                    card.addEventListener('keydown', e => { if (e.key === 'Enter') openPlayerPage(card.dataset
                            .url); });
                });
                pagination.innerHTML = !filterResultsState.exhausted ?
                    `<button class="btn-outline" onclick="applyFilters(false)">Продовжити <i class="fas fa-chevron-down"></i></button>` :
                    '';
            } catch (err) {
                content.innerHTML =
                    `<div class="loader" style="grid-column:1/-1;"><i class="fas fa-exclamation-triangle"></i> Помилка: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="applyFilters(true)">Спробувати знову</button></div>`;
                pagination.innerHTML = '';
            } finally {
                filterResultsState.loadingMore = false;
            }
        }
        window.applyFilters = applyFilters;
        window.renderFilterPage = renderFilterPage;
