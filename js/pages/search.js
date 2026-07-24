// ===== СТОРІНКА ПОШУКУ =====
// Оригінальні рядки: L9311-L9475

import { searchAnimeua } from '../api/animeua.js';
import { searchTmdbAnime } from '../api/tmdb.js';
import { safeQuery } from '../utils/dom.js';
import { escapeHtml } from '../utils/helpers.js';
import { openPlayerPage } from '../player/player-page.js';
import { syncLeftdockActive } from '../ui/leftdock.js';

        // ====================================================================
        //  СТОРІНКА ПОШУКУ
        // ====================================================================
        let searchPageState = { query: '', page: 1, list: [], loading: false };

export function renderSearchPage() {
            const container = document.getElementById('searchPageContainer');
            if (!container) return;
            const initialQuery = searchPageState.query || '';
            container.innerHTML = `
            <div class="search-page-header">
              <h2>Пошук аніме</h2>
            </div>
            <div class="search-page-input-wrap">
              <i class="fas fa-search"></i>
              <input type="text" id="searchPageInput" placeholder="Назва аніме..." autocomplete="off" value="${initialQuery}" />
              <button class="search-page-clear" id="searchPageClearBtn" aria-label="Очистити"><i class="fas fa-times-circle"></i></button>
            </div>
            <div id="searchResultsContainer" class="search-results-grid">
              ${initialQuery ? '<div class="loader"><i class="fas fa-spinner fa-pulse"></i> Пошук...</div>' : `
                <div class="search-empty">
                  <i class="fas fa-search"></i>
                  <p>Введіть назву аніме для пошуку</p>
                  <p class="sub">Наприклад: "Атака титанів", "Наруто", "Сяючі"</p>
                </div>
              `}
            </div>
            <div class="pagination-row" id="searchPagePagination"></div>
          `;
            const input = document.getElementById('searchPageInput');
            const clearBtn = document.getElementById('searchPageClearBtn');
            if (input) {
                input.addEventListener('input', () => {
                    const q = input.value.trim();
                    if (clearBtn) {
                        if (q.length > 0) clearBtn.classList.add('visible');
                        else clearBtn.classList.remove('visible');
                    }
                    if (q.length >= 2) {
                        searchPageState.query = q;
                        searchPageState.page = 1;
                        performSearchPage();
                    } else if (q.length === 0) {
                        searchPageState.query = '';
                        searchPageState.list = [];
                        const results = document.getElementById('searchResultsContainer');
                        if (results) {
                            results.innerHTML = `
                        <div class="search-empty">
                          <i class="fas fa-search"></i>
                          <p>Введіть назву аніме для пошуку</p>
                          <p class="sub">Наприклад: "Атака титанів", "Наруто", "Сяючі"</p>
                        </div>
                      `;
                        }
                        document.getElementById('searchPagePagination').innerHTML = '';
                    }
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const q = input.value.trim();
                        if (q.length >= 2) {
                            searchPageState.query = q;
                            searchPageState.page = 1;
                            performSearchPage();
                        }
                    }
                });
                if (initialQuery.length >= 2) {
                    performSearchPage();
                }
            }
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    const inp = document.getElementById('searchPageInput');
                    if (inp) {
                        inp.value = '';
                        inp.focus();
                        searchPageState.query = '';
                        searchPageState.list = [];
                        const results = document.getElementById('searchResultsContainer');
                        if (results) {
                            results.innerHTML = `
                        <div class="search-empty">
                          <i class="fas fa-search"></i>
                          <p>Введіть назву аніме для пошуку</p>
                          <p class="sub">Наприклад: "Атака титанів", "Наруто", "Сяючі"</p>
                        </div>
                      `;
                        }
                        document.getElementById('searchPagePagination').innerHTML = '';
                        clearBtn.classList.remove('visible');
                    }
                });
            }
            syncLeftdockActive();
        }

export async function performSearchPage() {
            const results = document.getElementById('searchResultsContainer');
            const pagination = document.getElementById('searchPagePagination');
            if (!results) return;
            const query = searchPageState.query.trim();
            if (!query || query.length < 2) return;
            if (window.DailyStats) DailyStats.increment('searchesToday', 1);
            searchPageState.loading = true;
            results.innerHTML = '<div class="loader" style="grid-column:1/-1;"><i class="fas fa-spinner fa-pulse"></i> Пошук...</div>';
            pagination.innerHTML = '';
            try {
                // TMDB пошук першим — кращі результати для аніме
                let list = [];
                try {
                    list = await searchTmdbAnime(query, searchPageState.page);
                } catch (tmdbErr) {
                    console.warn('TMDB search failed, falling back to animeua:', tmdbErr.message);
                }
                // Якщо TMDB нічого не знайшов — fallback на animeua
                if (!list.length) {
                    list = await searchAnimeua(query, searchPageState.page);
                }
                searchPageState.list = list;
                searchPageState.loading = false;
                if (!list.length) {
                    results.innerHTML = `
                <div class="search-empty" style="grid-column:1/-1;">
                  <i class="fas fa-search" style="font-size:2rem;"></i>
                  <p>Нічого не знайдено за запитом "${query}"</p>
                  <p class="sub">Спробуйте змінити пошуковий запит</p>
                </div>
              `;
                    pagination.innerHTML = '';
                    return;
                }
                results.innerHTML = list.map((a, idx) => {
                    const poster = a.images?.jpg?.large_image_url || '';
                    const title = a.title || 'Без назви';
                    const scoreBadge = a.score ? `<div class="anime-score-badge">★ ${parseFloat(a.score).toFixed(1)}</div>` : '';
                    const yearBadge = a.year ? `<div class="anime-year-badge">${a.year}</div>` : '';
                    return `
                <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${idx*0.03}s">
                  <div class="anime-poster">
                    <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='data:image/svg+xml,...'">
                    ${scoreBadge}
                    ${yearBadge}
                  </div>
                  <div class="anime-title-under">${title}</div>
                </div>
              `;
                }).join('');
                results.querySelectorAll('.anime-card').forEach(card => {
                    card.addEventListener('click', () => openPlayerPage(card.dataset.url));
                    card.addEventListener('keydown', e => { if (e.key === 'Enter') openPlayerPage(card.dataset
                            .url); });
                });
                const prevDisabled = searchPageState.page <= 1 ? 'disabled' : '';
                pagination.innerHTML = `
              <button class="btn-outline" onclick="changeSearchPage(${searchPageState.page-1})" ${prevDisabled}><i class="fas fa-chevron-left"></i> Назад</button>
              <span class="page-indicator">Сторінка ${searchPageState.page}</span>
              <button class="btn-outline" onclick="changeSearchPage(${searchPageState.page+1})">Вперед <i class="fas fa-chevron-right"></i></button>
            `;
            } catch (err) {
                searchPageState.loading = false;
                results.innerHTML = `
              <div class="loader" style="grid-column:1/-1;">
                <i class="fas fa-exclamation-triangle"></i> Помилка: ${err.message}
                <br><button class="btn-outline" style="margin-top:1rem;" onclick="performSearchPage()">Спробувати знову</button>
              </div>
            `;
                pagination.innerHTML = '';
            }
        }

        window.changeSearchPage = (p) => {
            if (p < 1) return;
            searchPageState.page = p;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            performSearchPage();
        };
