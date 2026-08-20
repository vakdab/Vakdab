import { HIKKA_API } from '../../config/constants.js';
import { loadFeature } from '../feature-loader.js?v=20260818-ranobe-v6';
import {
    Auth, setCurrentCategory, setCurrentPage, setCurrentSearchQuery, setCurrentTab,
    initRatingPage, loadAndDisplayGenreSections, loadMangaReader,
    openPlayerPage, renderAuthPage, renderFilterPage, renderGenrePage,
    renderGenresPage, renderProfilePage, renderSchedulePage, renderSearchPage,
    renderSettingsPage, showToast, syncLeftdockActive
} from '../../legacy/app-legacy.js?v=20260820-hikka-proxy-fix1';

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
                const playerModal = document.getElementById('playerPageModal');
                if (playerModal && route !== 'anime') {
                    playerModal.classList.remove('active', 'show', 'open');
                    playerModal.style.display = 'none';
                    playerModal.setAttribute('aria-hidden', 'true');
                }
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
                document.getElementById('schedulePageContainer').classList.remove('active');
                document.getElementById('schedulePageContainer').style.display = 'none';
                document.getElementById('stickersPageContainer').classList.remove('active');
                document.getElementById('stickersPageContainer').style.display = 'none';
                document.getElementById('mangaPageContainer').classList.remove('active');
                document.getElementById('mangaPageContainer').style.display = 'none';
                document.getElementById('novelPageContainer')?.classList.remove('active');
                if (document.getElementById('novelPageContainer')) document.getElementById('novelPageContainer').style.display = 'none';

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
                    this.showSettings(params.tab);
                } else if (route === 'genres') {
                    this.showGenres();
                } else if (route === 'rating') {
                    this.showRating();
                } else if (route === 'schedule') {
                    this.showSchedule();
                } else if (route === 'stickers') {
                    this.showStickers();
                } else if (route === 'manga') {
                    if (params.url) this.showManga(params.url, params.title || '');
                    else this.showMain();
                } else if (route === 'novel') {
                    if (params.url) this.showNovel(params.url, params.title || '', params.poster || '');
                    else this.showMain();
                } else if (route.startsWith('anime/')) {
                    // Deep-link для Telegram: #anime/<Hikka ID>.
                    // Використовуємо той самий openPlayerPage(), що й звичайні картки.
                    this.showMain();
                    const animeIdMatch = route.match(/^anime\/([A-Za-z0-9][A-Za-z0-9-]{1,180})$/);
                    if (animeIdMatch) {
                        const animeUrl = `${HIKKA_API}/anime/${animeIdMatch[1]}`;
                        setTimeout(() => openPlayerPage(animeUrl, { fromDeepLink: true }), 150);
                    } else {
                        setTimeout(() => {
                            this.goTo('main');
                            showToast('Аніме не знайдено');
                        }, 0);
                    }
                } else if (route === 'filter') {
                    this.showFilter();
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
                setCurrentTab('main');
                setCurrentSearchQuery('');
                setCurrentCategory('');
                setCurrentPage(1);
                document.querySelectorAll('.action-pill').forEach(p => p.classList.remove('active-pill'));
                const si = document.getElementById('searchPageInput');
                if (si) si.value = '';
                const cb = document.getElementById('searchPageClearBtn');
                if (cb) cb.classList.remove('visible');
                document.getElementById('animeContainer').style.display = 'none';
                document.getElementById('paginationRow').innerHTML = '';
                syncLeftdockActive();
            },

            showProfile() {
                loadFeature('profile').catch(error => console.warn('[VakDab] profile feature preload:', error));
                const container = document.getElementById('profilePageContainer');
                container.style.display = 'block';
                container.classList.add('active');
                if (!Auth._authResolved) {
                    // Firebase ще не перевірив сесію — показуємо заглушку
                    container.innerHTML = '<div class="loader" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:50vh;gap:1rem;"><i class="fas fa-spinner fa-pulse" style="font-size:2rem;"></i><p>Перевірка сесії...</p></div>';
                    // Fallback: якщо Firebase не відповів за 3 секунди — показуємо сторінку
                    setTimeout(() => {
                        if (!Auth._authResolved && Router.currentRoute === 'profile') {
                            Auth._authResolved = true;
                            if (Auth.isAuthenticated() || Auth.isGuest()) {
                                renderProfilePage();
                            } else {
                                renderAuthPage();
                            }
                        }
                    }, 1500);
                } else if (Auth.isAuthenticated() || Auth.isGuest()) {
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

            showSchedule() {
                const container = document.getElementById('schedulePageContainer');
                container.style.display = 'block';
                container.classList.add('active');
                renderSchedulePage();
            },
            showStickers() {
                loadFeature('stickers').catch(error => console.warn('[VakDab] stickers feature preload:', error));
                const container = document.getElementById('stickersPageContainer');
                if (container) {
                    container.style.display = 'block';
                    container.classList.add('active');
                }
                window.renderStickersPage?.();
                syncLeftdockActive();
            },

            showManga(chapterUrl, mangaTitle = '') {
                const container = document.getElementById('mangaPageContainer');
                if (!container) return;
                container.style.display = 'block';
                container.classList.add('active');
                loadMangaReader().then(({ renderMangaReader }) => renderMangaReader(container, chapterUrl, nextUrl => {
                    if (nextUrl) this.goTo('manga', { url: nextUrl, title: mangaTitle });
                    else this.goTo('main');
                }, mangaTitle)).catch(error => {
                    console.error('[VakDab] manga feature failed to load:', error);
                    container.innerHTML = '<div class="loader">Не вдалося завантажити модуль манґи. Спробуйте ще раз.</div>';
                });
            },

            showNovel(chapterUrl, novelTitle = '', poster = '') {
                const container = document.getElementById('novelPageContainer');
                if (!container) return;
                container.style.display = 'block';
                container.classList.add('active');
                loadFeature('novel').then(({ renderNovelReader }) => renderNovelReader(container, chapterUrl, nextUrl => {
                    if (nextUrl) this.goTo('novel', { url: nextUrl, title: novelTitle, poster });
                    else this.goTo('main');
                }, novelTitle, poster)).catch(error => {
                    console.error('[VakDab] novel feature failed to load:', error);
                    container.innerHTML = '<div class="loader">Не вдалося завантажити модуль ранобе. Спробуйте ще раз.</div>';
                });
            },

            showFilter() {
                const container = document.getElementById('genrePageContainer');
                container.style.display = 'block';
                container.classList.add('active');
                renderFilterPage();
            },

            showSearch() {
                const container = document.getElementById('searchPageContainer');
                if (container) {
                    container.style.display = 'block';
                    container.classList.add('active');
                }
                renderSearchPage();
            },

            showSettings(tab) {
                const container = document.getElementById('settingsPageContainer');
                if (container) {
                    container.style.display = 'block';
                    container.classList.add('active');
                }
                renderSettingsPage(tab);
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

        // === Rating list ===
