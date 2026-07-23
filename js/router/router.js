// ===== РОУТЕР =====
// Оригінальні рядки: L7525-L7710

import { renderSearchPage } from '../pages/search.js';
import { renderSettingsPage } from '../pages/settings.js';
import { renderProfilePage } from '../pages/profile.js';
import { renderGenresPage } from '../pages/genres.js';
import { initRatingPage } from '../features/rating.js';
import { initCommunity } from '../features/community.js';
import { closePlayerPage } from '../player/player-page.js';
import { showToast } from '../ui/toast.js';

        // ====================================================================
        //  РОУТЕР
        // ====================================================================
export const Router = {
            currentRoute: 'main',
            params: {},

            init() {
                window.addEventListener('hashchange', () => this.handleRoute());
                this.handleRoute();
            },

            handleRoute() {
                const hash = window.location.hash.slice(1) || 'main';
                const parts = hash.split('?');
                const route = parts[0];
                const query = parts[1] || '';
                const params = Object.fromEntries(new URLSearchParams(query));
                this.currentRoute = route;
                this.params = params;
                this.navigate(route, params);
            },

            navigate(route, params) {
                document.getElementById('genreSectionsContainer').style.display = 'none';
                document.getElementById('animeContainer').style.display = 'none';
                document.getElementById('paginationRow').innerHTML = '';
                document.getElementById('profilePageContainer').classList.remove('active');
                document.getElementById('profilePageContainer').style.display = 'none';
                document.getElementById('genrePageContainer').classList.remove('active');
                document.getElementById('genrePageContainer').style.display = 'none';
                document.getElementById('searchPageContainer').classList.remove('active');
                document.getElementById('searchPageContainer').style.display = 'none';
                document.getElementById('settingsPageContainer').classList.remove('active');
                document.getElementById('settingsPageContainer').style.display = 'none';
                document.getElementById('ratingPageContainer').classList.remove('active');
                document.getElementById('ratingPageContainer').style.display = 'none';
                document.getElementById('genresPageContainer').classList.remove('active');
                document.getElementById('genresPageContainer').style.display = 'none';

                const hero = document.getElementById('heroWrapper');
                const actions = document.getElementById('actionsRow');
                const logo = document.querySelector('.logo');
                const searchBtn = document.querySelector('.search-circle-btn');

                if (route === 'main') {
                    hero.style.display = 'block';
                    actions.style.display = 'flex';
                    if (logo) logo.style.display = 'flex';
                    if (searchBtn) searchBtn.style.display = 'flex';
                } else {
                    hero.style.display = 'none';
                    actions.style.display = 'none';
                    if (logo) logo.style.display = 'none';
                    if (searchBtn) searchBtn.style.display = 'none';
                }

                document.querySelectorAll('.agnative-leftdock__item.selector').forEach(el => el.classList.remove(
                'is-active'));

                if (route === 'main') {
                    document.querySelector('.agnative-leftdock__item.selector[data-action="main"]')?.classList.add(
                        'is-active');
                    this.showMain();
                } else if (route === 'profile') {
                    document.querySelector('.agnative-leftdock__item.selector[data-action="profile"]')?.classList.add(
                        'is-active');
                    this.showProfile();
                } else if (route === 'genre') {
                    const slug = params.slug || '';
                    const name = params.name || slug;
                    document.querySelector(`.agnative-leftdock__item.selector[data-action="genre-${slug}"]`)?.classList
                        .add('is-active');
                    this.showGenre(slug, name);
                } else if (route === 'search') {
                    document.querySelector('.agnative-leftdock__item.selector[data-action="main"]')?.classList.add(
                        'is-active');
                    this.showSearch();
                } else if (route === 'settings') {
                    document.querySelector('.agnative-leftdock__item.selector[data-action="settings"]')?.classList.add(
                        'is-active');
                    this.showSettings();
                } else if (route === 'genres') {
                    this.showGenres();
                } else if (route === 'rating') {
                    this.showRating();
                } else {
                    window.location.hash = 'main';
                }
            },

            showMain() {
                document.getElementById('genreSectionsContainer').style.display = 'flex';
                document.getElementById('animeContainer').style.display = 'none';
                document.getElementById('paginationRow').innerHTML = '';
                if (!document.getElementById('genreSectionsContainer').hasChildNodes() ||
                    document.getElementById('genreSectionsContainer').querySelector('.loader')) {
                    loadAndDisplayGenreSections();
                }
                currentTab = 'main';
                currentSearchQuery = '';
                currentCategory = '';
                currentPage = 1;
                document.querySelectorAll('.action-pill').forEach(p => p.classList.remove('active-pill'));
                const si = document.getElementById('searchInput');
                if (si) si.value = '';
                const cb = document.getElementById('searchClearBtn');
                if (cb) cb.classList.remove('visible');
                document.getElementById('animeContainer').style.display = 'none';
                document.getElementById('paginationRow').innerHTML = '';
                syncLeftdockActive();
            },

            showProfile() {
                const container = document.getElementById('profilePageContainer');
                container.style.display = 'block';
                container.classList.add('active');
                if (!window.Auth?._authResolved) {
                    // Firebase ще не перевірив сесію — показуємо заглушку
                    container.innerHTML = '<div class="loader" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:50vh;gap:1rem;"><i class="fas fa-spinner fa-pulse" style="font-size:2rem;"></i><p>Перевірка сесії...</p></div>';
                    // Fallback: якщо Firebase не відповів за 3 секунди — показуємо сторінку
                    setTimeout(() => {
                        if (!window.Auth?._authResolved && Router.currentRoute === 'profile') {
                            window.Auth?._authResolved = true;
                            if (window.Auth?.isAuthenticated() || window.Auth?.isGuest()) {
                                renderProfilePage();
                            } else {
                                renderAuthPage();
                            }
                        }
                    }, 1500);
                } else if (window.Auth?.isAuthenticated() || window.Auth?.isGuest()) {
                    renderProfilePage();
                } else {
                    renderAuthPage();
                }
                syncLeftdockActive();
            },

            showGenre(slug, name) {
                const container = document.getElementById('genrePageContainer');
                container.style.display = 'block';
                container.classList.add('active');
                renderGenrePage(slug, name);
            },

            showGenres() {
                const container = document.getElementById('genresPageContainer');
                container.style.display = 'block';
                container.classList.add('active');
                renderGenresPage();
            },

            showSearch() {
                const container = document.getElementById('searchPageContainer');
                if (container) {
                    container.style.display = 'block';
                    container.classList.add('active');
                }
                renderSearchPage();
            },

            showSettings() {
                const container = document.getElementById('settingsPageContainer');
                if (container) {
                    container.style.display = 'block';
                    container.classList.add('active');
                }
                renderSettingsPage();
            },

            showRating() {
                const container = document.getElementById('ratingPageContainer');
                if (container) {
                    container.style.display = 'block';
                    container.classList.add('active');
                }
                initRatingPage();
            },

            goTo(route, params = {}) {
                const query = new URLSearchParams(params).toString();
                window.location.hash = query ? route + '?' + query : route;
            }
        };

// Make Router globally accessible
window.Router = Router;

export function showViewMode(mode) {
            const grid = document.getElementById('episodeViewGrid');
            const compact = document.getElementById('episodeViewCompact');
            const classic = document.getElementById('episodeViewClassic');
            grid.classList.toggle('hidden', mode !== 'grid');
            compact.classList.toggle('hidden', mode !== 'compact');
            classic.classList.toggle('hidden', mode !== 'classic');
            document.querySelectorAll('.episode-view-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.view === mode);
            });
            playerPageCurrentView = mode;
        }
        window.showViewMode = showViewMode;

