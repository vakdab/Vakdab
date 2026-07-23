// ===== ГОЛОВНА ТОЧКА ВХОДУ — INIT + ОБРОБНИКИ ПОДІЙ =====
// Оригінальні рядки: L10941-L11272

// --- ІМПОРТИ ---
import { auth, db } from './config/firebase.js';
import { onAuthStateChanged } from "firebase/auth";

// Config
import { PROXY_URL, ANIMEUA_BASE } from './config/api.js';
import { GENRE_MAP } from './config/constants.js';

// Auth
import { Auth } from './auth/auth.js';

// Storage
import { Storage } from './storage/storage.js';

// Utils
import { safeQuery, safeQueryAll } from './utils/dom.js';
import { applyTheme, toggleTheme, escapeHtml } from './utils/helpers.js';
import './utils/hashing.js'; // String.prototype.hashCode

// API
import { fetchUA, getProxyUrl, isEmbedUrl } from './api/fetch.js';
import { parseAnimeuaCards, fetchAnimeuaMain, searchAnimeua, fetchAnimeuaByCategory, fetchAnimeuaTop100, fetchAnimeuaByGenre, loadAnimeuaDetail } from './api/animeua.js';
import { extractPlayerIframeUrls, extractSourcesFromText } from './api/sources.js';
import { saveParseDiagnostic } from './api/diagnostics.js';

// Player
import { LampaPlayer, lpFmtTime } from './player/player.js';
import { buildSeasonRow, getCurrentEpisodes, getEpisodeProgress, buildEpisodeViews, playEpisode, updateSourceChip, updateFilterChip } from './player/episodes.js';
import { openPlayerPage, closePlayerPage } from './player/player-page.js';
import { buildBottomSheetData, openBottomSheet, closeBottomSheet } from './player/bottom-sheet.js';

// Hero
import { buildHeroBanner, startHeroRotation, stopHeroRotation, resetHeroTimer, goToSlide, nextSlide, prevSlide } from './hero/hero.js';

// UI
import { startClock, updateClock } from './ui/clock.js';
import { buildLeftdock, handleLeftdockAction, toggleLeftdock, syncLeftdockActive } from './ui/leftdock.js';
import { updateBottomNav, handleNavVisibility } from './ui/navigation.js';
import { updateBackToTop } from './ui/back-to-top.js';
import { showToast } from './ui/toast.js';

// Features
import { calcTotalXP, getLevel, getXPForLevel, getXPProgress } from './features/xp-system.js';
import { _renderDailyTasks, _incTotalCounter } from './features/daily-tasks.js';
import { initRatingPage, loadMyStats, loadLeaderboard, renderLeaderboard, loadRatingPage, loadRatingList } from './features/rating.js';
import { initCommunity, _subscribeToChat } from './features/community.js';
import { toggleBookmark, updateBookmarkButton } from './features/bookmarks.js';
import { toggleLike, toggleDislike, updateLikeButton, updateDislikeButton } from './features/likes.js';
import { getAchievements, getMyEarnedAchievements } from './features/achievements.js';

// Pages
import { fetchContent, showSkeleton, loadContent, renderCards, renderPagination, openRandomAnime } from './pages/home.js';
import { renderSearchPage, performSearchPage } from './pages/search.js';
import { renderSettingsPage } from './pages/settings.js';
import { getDefaultProfile, getProfile, saveProfile, getProfileStats, renderProfilePage, renderHistoryPanel, renderBookmarksPanel, renderAchievementsPanel, profileEditNick, profileEditBio, uploadToCloudinary, compressImage } from './pages/profile.js';
import { renderAuthPage, setAuthMode } from './pages/auth-page.js';
import { loadAndDisplayGenreSections, renderGenresPage, renderGenrePage, loadGenrePageContent } from './pages/genres.js';
import { showTop100 } from './pages/top100.js';

// Router
import { Router, showViewMode } from './router/router.js';
import { handleNavVisibility } from './ui/navigation.js';

// --- ОБРОБНИКИ ПОДІЙ + ХОТКЕЇ + INIT ---
        // ====================================================================
        //  ОБРОБНИКИ ПОДІЙ
        // ====================================================================
        document.getElementById('bnMenu')?.addEventListener('click', (e) => { e.stopPropagation();
            Router.goTo('genres'); });

        document.getElementById('searchCircleBtn').addEventListener('click', () => {
            Router.goTo('search');
            setTimeout(() => {
                const inp = document.getElementById('searchPageInput');
                if (inp) inp.focus();
            }, 200);
        });

        document.getElementById('top100Btn').addEventListener('click', showTop100);
        document.getElementById('randomBtn').addEventListener('click', openRandomAnime);
        document.getElementById('logoHome').addEventListener('click', () => Router.goTo('main'));

        const cpBtn = document.getElementById('closePlayerPageBtn');
        if (cpBtn) cpBtn.addEventListener('click', closePlayerPage);
        // Fullscreen button — global handler
        const playerFsBtn = document.getElementById('playerFullscreenBtn');
        if (playerFsBtn) {
            playerFsBtn.addEventListener('click', () => {
                // Використовуємо toggleFullscreen з LampaPlayer якщо доступний
                // Always use playerVideoContainer directly for fullscreen
                const container = document.getElementById('playerVideoContainer');
                if (!container) return;
                if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                    if (container.requestFullscreen) {
                        const p = container.requestFullscreen();
                        if (p && p.catch) p.catch(()=>{});
                    }
                    else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
                    else if (container.msRequestFullscreen) container.msRequestFullscreen();
                } else {
                    if (document.exitFullscreen) document.exitFullscreen();
                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                    else if (document.msExitFullscreen) document.msExitFullscreen();
                }
            });
        }

        document.getElementById('playerSourceChip').addEventListener('click', () => {
            openBottomSheet('source');
        });

        document.getElementById('playerFilterBtn').addEventListener('click', () => {
            openBottomSheet('full');
        });

        document.getElementById('bsApplyBtn').addEventListener('click', () => {
            closeBottomSheet();
            if (bottomSheetMode === 'source') {
                showToast(`Джерело: ${playerPageCurrentSource}`);
            } else {
                showToast('Фільтри застосовано');
            }
        });

        document.getElementById('bottomSheetOverlay').addEventListener('click', function(e) {
            if (e.target === this) closeBottomSheet();
        });

        document.querySelectorAll('.episode-view-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.dataset.view;
                showViewMode(mode);
            });
        });

        document.getElementById('likeBtn').addEventListener('click', toggleLike);
        document.getElementById('dislikeBtn').addEventListener('click', toggleDislike);
        document.getElementById('playerBookmarkBtn').addEventListener('click', toggleBookmark);

        window.openSearchPage = function() {
            Router.goTo('search');
            setTimeout(() => {
                const inp = document.getElementById('searchPageInput');
                if (inp) inp.focus();
            }, 200);
        };

        // ====================================================================
        //  КЛАВІАТУРА
        // ====================================================================
        document.addEventListener('keydown', (e) => {
            const tag = document.activeElement?.tagName?.toLowerCase();
            const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement
                ?.isContentEditable;
            if (e.key === 'Escape') {
                closePlayerPage();
                                if (document.getElementById('bottomSheetOverlay').classList.contains('open')) closeBottomSheet();
                return;
            }
            if (isInput) return;
            if (e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
                e.preventDefault();
                if (Router.currentRoute === 'search') {
                    document.getElementById('searchPageInput')?.focus();
                } else {
                    Router.goTo('search');
                    setTimeout(() => { document.getElementById('searchPageInput')?.focus(); }, 200);
                }
                return;
            }
            if (e.key === 'm' || e.key === 'M') { e.preventDefault();
                toggleLeftdock(); return; }
            if (e.key === 't' || e.key === 'T') { e.preventDefault();
                toggleTheme(); return; }
            if (e.key === 'r' || e.key === 'R') { e.preventDefault();
                openRandomAnime(); return; }
        });

        // ====================================================================
        //  КНОПКА "ВГОРУ"
        // ====================================================================
        const backToTopBtn = document.getElementById('backToTopBtn');

        backToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
        window.addEventListener('scroll', updateBackToTop, { passive: true });

        // ====================================================================
        //  ПОКАЗ ВИГЛЯДУ ЕПІЗОДІВ
        // ====================================================================

        // ====================================================================
        //  ІНІЦІАЛІЗАЦІЯ
        // ====================================================================
export async function init() {
            applyTheme(Storage.getTheme());
            /* leftdock removed */
            startClock();
            updateBackToTop();

            setTimeout(() => {
                if (Router.currentRoute === 'main') {
                    loadAndDisplayGenreSections();
                }
            }, 50);

            setTimeout(() => {
                buildHeroBanner();
            }, 100);

            // Auth.init() синхронно ДО Router — щоб Firebase перевірив сесію перш ніж показувати форму входу
            Auth.init();
            Router.init();

            const hash = window.location.hash.slice(1);
            if (hash === 'profile') {
                Router.goTo('profile');
            } else if (hash.startsWith('genre')) {
                const parts = hash.split('?');
                if (parts.length > 1) {
                    const params = Object.fromEntries(new URLSearchParams(parts[1]));
                    if (params.slug) {
                        const name = params.name || params.slug;
                        Router.goTo('genre', { slug: params.slug, name });
                    }
                }
            } else if (hash === 'search') {
                Router.goTo('search');
            } else if (hash === 'settings') {
                Router.goTo('settings');
            }

            // Зберегти дані при закритті вкладки
            window.addEventListener('beforeunload', () => {
                Storage._flushSync();
            });

            // Синхронізувати дані при приховуванні вкладки (більш надійно ніж beforeunload)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden' && Auth.isAuthenticated()) {
                    Storage._flushSync();
                }
            });

            console.log('VAKDAB v6.6 — Firebase: vakdab project');
            console.log('Клавіші: / пошук • M меню • T тема • R випадкове • Esc закрити');
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

        window.Router = Router;
        window.showTop100 = showTop100;
        window.openRandomAnime = openRandomAnime;
        window.openPlayerPage = openPlayerPage;
        window.closePlayerPage = closePlayerPage;
        window.toggleTheme = toggleTheme;
        window.toggleLeftdock = toggleLeftdock;
        window.profileEditNick = profileEditNick;
        window.profileEditBio = profileEditBio;
        window.changeGenrePage = changeGenrePage;
        window.loadGenrePageContent = loadGenrePageContent;
        window.renderProfilePage = renderProfilePage;
        window.performSearchPage = performSearchPage;
        window.changeSearchPage = changeSearchPage;
        window.renderSettingsPage = renderSettingsPage;
        window.openSearchPage = openSearchPage;
        window.openBottomSheet = openBottomSheet;
        window.closeBottomSheet = closeBottomSheet;
        window.toggleLike = toggleLike;
        window.toggleDislike = toggleDislike;
        window.buildHeroBanner = buildHeroBanner;
        window.Auth = Auth;
        window.Storage = Storage;
    
        // ====================================================================
        //  BOTTOM NAV — логіка
        // ====================================================================
        (function initBottomNav() {
            const nav = document.getElementById('bottomNav');
            if (!nav) return;

            // Кнопка назад
            document.getElementById('bnBack').addEventListener('click', () => {
                if (history.length > 1) {
                    history.back();
                } else {
                    Router.goTo('main');
                }
            });

            // Навігаційні кнопки
            document.getElementById('bnHome').addEventListener('click', () => {
                Router.goTo('main');
            });
            document.getElementById('bnTop').addEventListener('click', () => {
                Router.goTo('rating');
            });
            document.getElementById('bnProfile').addEventListener('click', () => {
                Router.goTo('profile');
            });

            // Оновлення активного стану при зміні роуту

            // Router.goTo використовує hashchange → updateBottomNav спрацює автоматично

            // Ховати nav коли відкритий плеєр
            const playerModal = document.getElementById('playerPageModal');
            const _origOpenPlayer = window.openPlayerPage;
            window.openPlayerPage = function(url) {
                if (nav) nav.classList.add('hidden-nav');
                return _origOpenPlayer(url);
            };
            const _origClosePlayer = window.closePlayerPage;
            window.closePlayerPage = function() {
                if (nav) nav.classList.remove('hidden-nav');
                return _origClosePlayer();
            };

            // Ховати nav при заході в Суспільне, показувати на Рейтингу

            // Слухаємо кліки по вкладках рейтингу (Рейтинг ↔ Суспільне)
            document.addEventListener('click', e => {
                const tab = e.target.closest('.rg-main-tab');
                if (!tab) return;
                const hash = window.location.hash.slice(1) || 'main';
                const route = hash.split('?')[0];
                if (route !== 'rating') return;
                setTimeout(() => {
                    if (tab.dataset.panel === 'community') {
                        nav.classList.add('hidden-nav');
                    } else {
                        nav.classList.remove('hidden-nav');
                    }
                }, 50);
            });

            // Також ховати/показувати при hashchange
            window.addEventListener('hashchange', () => {
                const hash = window.location.hash.slice(1) || 'main';
                const route = hash.split('?')[0];
                // Якщо йдемо не на rating — завжди показуємо nav і знімаємо community-active
                if (route !== 'rating') {
                    document.body.classList.remove('community-active');
                }
                handleNavVisibility(route);
            });

            // Початковий стан
            handleNavVisibility(Router.currentRoute || 'main');
        })();

init();
