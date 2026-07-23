// ===== СТОРІНКА ЖАНРІВ =====
// Оригінальні рядки: L9225-L9310, L10233-L10331

import { GENRE_MAP } from '../config/constants.js';
import { fetchAnimeuaByGenre } from '../api/animeua.js';
import { safeQuery } from '../utils/dom.js';
import { escapeHtml } from '../utils/helpers.js';

        // ====================================================================
        //  ЖАНРОВІ СЕКЦІЇ (ПАРАЛЕЛЬНЕ ЗАВАНТАЖЕННЯ)
        // ====================================================================
        const genreList = Object.entries(GENRE_MAP).map(([name, slug]) => ({ name, slug }));

export async function loadAndDisplayGenreSections() {
            const container = document.getElementById('genreSectionsContainer');
            if (!container) return;
            container.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження секцій...</div>';
            container.style.display = 'flex';

            try {
                const genrePromises = genreList.map(async (genre) => {
                    try {
                        const items = await fetchAnimeuaByCategory(genre.slug, 1);
                        const slice = items.slice(0, 80);
                        return { genre, items: slice };
                    } catch (e) {
                        console.warn(`Помилка завантаження жанру ${genre.name}:`, e);
                        return { genre, items: [] };
                    }
                });

                const results = await Promise.all(genrePromises);
                let html = '';

                for (const { genre, items } of results) {
                    if (items.length === 0) continue;
                    const sectionId = 'genre-' + genre.slug;
                    html += `
                    <div class="genre-section" id="${sectionId}">
                      <div class="genre-title">
                        <span class="genre-name">${genre.name}</span>
                      </div>
                      <div class="genre-carousel-wrapper">
                        <button class="carousel-btn carousel-btn-left" data-target="${sectionId}" aria-label="Вліво"><i class="fas fa-chevron-left"></i></button>
                        <div class="genre-carousel" id="${sectionId}-carousel">
                          ${items.map(a => `
                            <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${a.title}">
                              <div class="anime-poster">
                                <img src="${a.images.jpg.large_image_url}" alt="${a.title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='data:image/svg+xml,...'">
                              </div>
                              <div class="anime-title-under">${a.title}</div>
                            </div>
                          `).join('')}
                        </div>
                        <button class="carousel-btn carousel-btn-right" data-target="${sectionId}" aria-label="Вправо"><i class="fas fa-chevron-right"></i></button>
                      </div>
                    </div>
                  `;
                }

                if (!html) {
                    container.innerHTML = '<div class="loader">Не вдалося завантажити жанри</div>';
                    return;
                }

                container.innerHTML = html;

                container.querySelectorAll('.anime-card').forEach(card => {
                    card.addEventListener('click', () => openPlayerPage(card.dataset.url));
                    card.addEventListener('keydown', e => { if (e.key === 'Enter') openPlayerPage(card.dataset
                            .url); });
                });

                container.querySelectorAll('.carousel-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const targetId = this.dataset.target;
                        const carousel = document.getElementById(targetId + '-carousel');
                        if (!carousel) return;
                        const scrollAmount = carousel.clientWidth * 0.8;
                        if (this.classList.contains('carousel-btn-left')) {
                            carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                        } else {
                            carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                        }
                    });
                });

            } catch (err) {
                console.error('Помилка завантаження жанрових секцій:', err);
                container.innerHTML =
                    `<div class="loader"><i class="fas fa-exclamation-triangle"></i> Помилка: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadAndDisplayGenreSections()">Спробувати знову</button></div>`;
            }
        }


        // ====================================================================
        //  СТОРІНКА ЖАНРУ
        // ====================================================================
        let genrePageState = { slug: '', name: '', page: 1, list: [] };

export async function renderGenresPage() {
            const container = document.getElementById('genresPageContainer');
            if (!container) return;
            const genres = loadGenres();
            let html = '<div class="genre-page-header"><h2>Жанри</h2></div>';
            html += '<div class="genres-grid">';
            genres.forEach(g => {
                const letter = g.name.charAt(0).toUpperCase();
                html += `<div class="genre-card" data-slug="${g.slug}" data-name="${g.name}">
                    <div class="genre-card__icon">${letter}</div>
                    <div class="genre-card__name">${g.name}</div>
                </div>`;
            });
            html += '</div>';
            container.innerHTML = html;
            container.querySelectorAll('.genre-card').forEach(card => {
                card.addEventListener('click', () => {
                    const slug = card.dataset.slug;
                    const name = card.dataset.name;
                    window.Router?.goTo('genre', { slug, name });
                });
            });
        }


export async function renderGenrePage(slug, name) {
            const container = document.getElementById('genrePageContainer');
            if (!container) return;
            genrePageState.slug = slug;
            genrePageState.name = name || slug;
            genrePageState.page = 1;
            container.innerHTML = `
            <div class="genre-page-header">
              <h2>${genrePageState.name}</h2>
            </div>
            <div id="genrePageContent" class="grid-3cols">
              <div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>
            </div>
            <div class="pagination-row" id="genrePagePagination"></div>
          `;
            await loadGenrePageContent();
        }

export async function loadGenrePageContent() {
            const content = document.getElementById('genrePageContent');
            const pagination = document.getElementById('genrePagePagination');
            if (!content) return;
            content.innerHTML = '<div class="loader" style="grid-column:1/-1;"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>';
            try {
                const list = await fetchAnimeuaByGenre(genrePageState.slug, genrePageState.page);
                genrePageState.list = list;
                if (!list.length) {
                    content.innerHTML =
                        '<div class="loader" style="grid-column:1/-1;">Нічого не знайдено в цьому жанрі</div>';
import { fetchAnimeuaByCategory } from '../api/animeua.js';
import { openPlayerPage } from '../player/player-page.js';
import { loadGenres } from '../ui/leftdock.js';
                    pagination.innerHTML = '';
                    return;
                }
                content.innerHTML = list.map((a, idx) => {
                    const poster = a.images?.jpg?.large_image_url || '';
                    const title = a.title || 'Без назви';
                    return `
                <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${idx*0.03}s">
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
                const prevDisabled = genrePageState.page <= 1 ? 'disabled' : '';
                pagination.innerHTML = `
              <button class="btn-outline" onclick="changeGenrePage(${genrePageState.page-1})" ${prevDisabled}><i class="fas fa-chevron-left"></i> Назад</button>
              <span class="page-indicator">Сторінка ${genrePageState.page}</span>
              <button class="btn-outline" onclick="changeGenrePage(${genrePageState.page+1})">Вперед <i class="fas fa-chevron-right"></i></button>
            `;
            } catch (err) {
                content.innerHTML =
                    `<div class="loader" style="grid-column:1/-1;"><i class="fas fa-exclamation-triangle"></i> Помилка: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadGenrePageContent()">Спробувати знову</button></div>`;
                pagination.innerHTML = '';
            }
        }

        export function changeGenrePage(p) {
            if (p < 1) return;
            genrePageState.page = p;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loadGenrePageContent();
        }

        window.changeGenrePage = changeGenrePage;

