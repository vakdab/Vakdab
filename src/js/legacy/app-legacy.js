import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile, signInAnonymously, sendPasswordResetEmail, deleteUser, doc, getDoc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, addDoc, collection, query, where, orderBy, limit, onSnapshot } from '../config/firebase.js';
import { auth, db, initialized as firebaseInitialized } from '../services/firebase/client.js';
import { PROXY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, HIKKA_API, HIKKA_PROXY_URL, MIKAI_BASE, GENRE_MAP } from '../config/constants.js?v=20260820-hikka-proxy-fix4';
import { safeQuery, safeQueryAll } from '../utils/dom.js';
import { getProxyUrl, isEmbedUrl } from '../utils/image.js';
import { loadFeature } from '../core/feature-loader.js?v=20260820-menu-pages-fix1';
import '../utils/string.js';

export const loadMangaReader = () => loadFeature('manga');
export const PROFILE_STICKER_SLOTS = 8;

        // ====================================================================
        //  ІНІЦІАЛІЗАЦІЯ FIREBASE
        // ====================================================================
        // Firebase client is initialized by services/firebase/client.js.
        // Auth/Firestore operations remain in this compatibility layer until their
        // domain services are migrated and browser smoke-tested.

        // ====================================================================
        //  СИСТЕМА АВТОРИЗАЦІЇ
        // ====================================================================
import { Auth } from '../core/compat/auth.js?v=20260821-telegram-auth-v40';
import { Storage } from '../core/compat/storage.js?v=20260821-telegram-auth-v40';
import { Router } from '../core/compat/router.js?v=20260821-telegram-auth-v40';
import { LampaPlayer } from '../components/player/lampaPlayer.js?v=20260820-player-modern-v1';
import { initCommunity } from '../components/community/legacyCommunity.js?v=20260821-telegram-auth-v40';
import { initBottomNav } from '../components/navigation/bottomNav.js';
import { renderSchedulePage } from '../components/pages/schedule.js';
import { renderFilterPage, applyFilters } from '../components/pages/filterPage.js';
import { buildHeroBanner } from '../components/home/heroBanner.js';
import { renderFriendsPage, renderFollowingPage, renderProfilePage, renderPublicProfilePage } from '../components/pages/profileLegacy.js?v=20260821-telegram-auth-v40';
import { calcTotalXP, getLevel, DailyStats, ACHIEVEMENTS, getUserRankInfo, initRatingPage, calculateBaseXP, getXPForLevel, getXPProgress, loadRatingPage, loadRatingList } from '../components/rating/ratingSystem.js?v=20260821-telegram-auth-v40';
import {
    playerPageAnime, playerPageAnimeuaSeasons, externalSourceCache, playerPageCurrentSeason, playerPageCurrentDub, playerPageCurrentSource, playerPageIsOpen,
    setPlayerPageAnimeuaSeasons, setPlayerPageAnime, setPlayerPageCurrentSeason, setPlayerPageCurrentDub, setPlayerPageCurrentSource,
    openPlayerPage, closePlayerPage, buildSeasonRow, updateFilterChip, updateSourceChip, buildEpisodeViews,
    buildBottomSheetData, openBottomSheet, closeBottomSheet, closeMenuPopover, toggleLike, toggleDislike, showViewMode,
    fetchTmdbCardInfo
} from '../components/player/animePlayerPage.js?v=20260821-telegram-auth-v40';

import { getProfile, renderSettingsPage } from '../components/pages/settingsLegacy.js?v=20260821-telegram-auth-v40';
import {
    currentTab, currentPage, currentSearchQuery, currentCategory, setCurrentTab, setCurrentPage, setCurrentSearchQuery, setCurrentCategory, fetchContent, showSkeleton, loadContent, popularRenderGen, renderPopularCards, loadPopularCardDetails, ANIME_CARD_PLACEHOLDER, animeCardDataMap, registerAnimeCardData, TMDB_ENRICH_CONCURRENCY, tmdbEnrichActive, tmdbEnrichQueue, queueTmdbEnrich, pumpTmdbEnrichQueue, runTmdbEnrichJob, animeCardObserver, getAnimeCardObserver, observeAnimeCardsForTmdb, renderCards, renderPagination, showTop100, openRandomAnime, genreList, homeSectionsRequestId, homeCatalogRequestId, preloadHomepageTmdbGroups, homeCatalogPage, homeCatalogItems, homeCatalogLoading, homeCatalogTotal, homeCatalogMode, homeCatalogQuery, homeCatalogSort, homeCatalogView, homeCatalogPreset, homeCatalogGenre, HOME_MANGA_AGE_OPTIONS, honeyCatalogPageCache, HOME_CATALOG_MODES, HOME_CATALOG_PRESETS, homeCatalogRequestBody, HONEY_API, HONEY_SEARCH_API, HONEY_WEB, HONEY_IMAGE, honeySearchCache, honeyReaderCache, honeyAvailabilityMap, honeyAvailabilityMapPromise, loadHoneyAvailabilityMap, normalizeHoneyMatch, fetchHoneyJson, honeyNamesMatch, searchHoneyTitles, resolveHoneyReader, attachHoneyReaders, getHoneyGenreOptions, honeyAgeCategory, homeCatalogGenreHtml, syncHomeCatalogGenreControl, honeyCatalogItem, isHoneyPromoItemRaw, isHoneyPromoItem, fetchHoneyCatalogPage, fetchHomeCatalogPage, getHomeCatalogVisibleItems, formatHomeCatalogNumber, homeCatalogCountText, homeCatalogCardHtml, bindHomeCatalogCards, buildHomeCatalogSectionHtml, renderHomeCatalogGrid, bindHomeCatalogMenu, updateHomeCatalogModeLabels, reloadHomeCatalog, loadHomeCatalogMore, loadAndDisplayGenreSections, statusLabelUa, buildAnimeCarouselSectionHtml, buildPopularVerticalSectionHtml, buildHistoryCarouselSectionHtml, openScheduleItemInPlayer, searchPageState, renderSearchPage, performSearchPage, uploadToCloudinary, isGifUrl, applyGifClass, uploadRawToCloudinary, uploadVideoToCloudinary, isVideoFile, isVideoUrl, profileMediaTransformStyle, profileMediaMarkup, uploadBlobToCloudinary, _imgeditClamp, openImageEditor, editExistingProfileImage, editExistingProfileVideo, compressImage, renderAuthPage, renderHistoryPanel, renderBookmarksPanel, renderAchievementsPanel, profileEditNick, profileEditBio, removeFlatStickerBackground, stickerBackgroundRemoverPromise, removeStickerBackground, genrePageState, renderGenrePage
} from '../components/pages/homeLegacy.js?v=20260821-telegram-auth-v40';
import {
    CATALOG_POSTER_FALLBACK, normalizeAnimeUrl, normalizePosterUrl, normalizeGenreList, normalizeSynopsisText, hikkaType, animeTypeLabel, extractExternalAnimeIds, hikkaItem, hikkaRequest, hikkaCatalog, fetchHikkaMain, searchHikka, fetchHikkaByCategory, fetchHikkaTop100, fetchHikkaByGenre, fetchAnimeLite, getExternalWatchUrl, getMikaiUrl, getAnimeOnUrl, getAnimeOnId, fetchAnimeOnJson, loadAnimeOnSeasons, resolveMikaiNuxtPayload, addNoAdsQuery, fetchMikaiHtml, getMikaiTeamLogoUrl, parseMikaiSeasonsFromHtml, ashdiPlaybackCache, resolveAshdiPlaybackUrl, inferAnimeSeasonNumber, loadMikaiSeasons, pickPreferredDub, loadHikkaDetail, unifyAnimeDataWithExternalDubs, sourceCache, getCachedSource, setCachedSource, switchProviderSource, refreshAfterSourceSwitch, extractPlayerIframeUrls, extractSourcesFromText
} from '../services/catalog.js?v=20260821-telegram-auth-v40';

export { Auth, Router, Storage, renderFriendsPage, renderFollowingPage, renderProfilePage, renderPublicProfilePage, renderSettingsPage };
export { renderFilterPage, applyFilters };
export { buildHeroBanner };
export { calcTotalXP, getLevel, DailyStats, ACHIEVEMENTS, getUserRankInfo, initRatingPage, loadRatingPage, loadRatingList };
export {
    playerPageAnime, playerPageAnimeuaSeasons, externalSourceCache, playerPageCurrentSeason, playerPageCurrentDub, playerPageCurrentSource, playerPageIsOpen,
    setPlayerPageAnimeuaSeasons, setPlayerPageAnime, setPlayerPageCurrentSeason, setPlayerPageCurrentDub, setPlayerPageCurrentSource,
    openPlayerPage, closePlayerPage, buildSeasonRow, updateFilterChip, updateSourceChip, buildEpisodeViews,
    buildBottomSheetData, openBottomSheet, closeBottomSheet, closeMenuPopover, toggleLike, toggleDislike, showViewMode,
    fetchTmdbCardInfo
};
export { renderSchedulePage };
export { currentTab, currentPage, currentSearchQuery, currentCategory, setCurrentTab, setCurrentPage, setCurrentSearchQuery, setCurrentCategory, fetchContent, showSkeleton, loadContent, popularRenderGen, renderPopularCards, loadPopularCardDetails, ANIME_CARD_PLACEHOLDER, animeCardDataMap, registerAnimeCardData, TMDB_ENRICH_CONCURRENCY, tmdbEnrichActive, tmdbEnrichQueue, queueTmdbEnrich, pumpTmdbEnrichQueue, runTmdbEnrichJob, animeCardObserver, getAnimeCardObserver, observeAnimeCardsForTmdb, renderCards, renderPagination, showTop100, openRandomAnime, genreList, homeSectionsRequestId, homeCatalogRequestId, preloadHomepageTmdbGroups, homeCatalogPage, homeCatalogItems, homeCatalogLoading, homeCatalogTotal, homeCatalogMode, homeCatalogQuery, homeCatalogSort, homeCatalogView, homeCatalogPreset, homeCatalogGenre, HOME_MANGA_AGE_OPTIONS, honeyCatalogPageCache, HOME_CATALOG_MODES, HOME_CATALOG_PRESETS, homeCatalogRequestBody, HONEY_API, HONEY_SEARCH_API, HONEY_WEB, HONEY_IMAGE, honeySearchCache, honeyReaderCache, honeyAvailabilityMap, honeyAvailabilityMapPromise, loadHoneyAvailabilityMap, normalizeHoneyMatch, fetchHoneyJson, honeyNamesMatch, searchHoneyTitles, resolveHoneyReader, attachHoneyReaders, getHoneyGenreOptions, honeyAgeCategory, homeCatalogGenreHtml, syncHomeCatalogGenreControl, honeyCatalogItem, isHoneyPromoItemRaw, isHoneyPromoItem, fetchHoneyCatalogPage, fetchHomeCatalogPage, getHomeCatalogVisibleItems, formatHomeCatalogNumber, homeCatalogCountText, homeCatalogCardHtml, bindHomeCatalogCards, buildHomeCatalogSectionHtml, renderHomeCatalogGrid, bindHomeCatalogMenu, updateHomeCatalogModeLabels, reloadHomeCatalog, loadHomeCatalogMore, loadAndDisplayGenreSections, statusLabelUa, buildAnimeCarouselSectionHtml, buildPopularVerticalSectionHtml, buildHistoryCarouselSectionHtml, openScheduleItemInPlayer, searchPageState, renderSearchPage, performSearchPage, uploadToCloudinary, isGifUrl, applyGifClass, uploadRawToCloudinary, uploadVideoToCloudinary, isVideoFile, isVideoUrl, profileMediaTransformStyle, profileMediaMarkup, uploadBlobToCloudinary, _imgeditClamp, openImageEditor, editExistingProfileImage, editExistingProfileVideo, compressImage, renderAuthPage, renderHistoryPanel, renderBookmarksPanel, renderAchievementsPanel, profileEditNick, profileEditBio, removeFlatStickerBackground, stickerBackgroundRemoverPromise, removeStickerBackground, genrePageState, renderGenrePage } from '../components/pages/homeLegacy.js?v=20260821-telegram-auth-v40';

        // ====================================================================
        //  СХОВИЩЕ
        // ====================================================================
        export function getDefaultStickers() {
            return { singles: [], sets: [], medals: [], colors: {} };
        }

        // ====================================================================
        //  ДОПОМІЖНІ ФУНКЦІЇ
        // ====================================================================
        function applyTheme(theme) {
            if (theme === 'dark') {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            const settingsBtn = document.getElementById('settingsThemeBtn');
            if (settingsBtn) {
                const icon = theme === 'dark' ? 'fa-moon' : 'fa-sun';
                const label = theme === 'dark' ? 'Темна тема' : 'Світла тема';
                settingsBtn.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
            }
        }

        export function toggleTheme() {
            const next = Storage.getTheme() === 'dark' ? 'light' : 'dark';
            Storage.setTheme(next);
            applyTheme(next);
            showToast(next === 'dark' ? 'Темний режим' : 'Світлий режим');
            if (Router.currentRoute === 'settings') {
                renderSettingsPage();
            }
        }

        // Генерує накладні частинки для "Ефектів профілю" (дощ / сніг / іскри)
        export function buildEffectOverlayHtml(type) {
            const rand = (min, max) => Math.random() * (max - min) + min;
            let n = 18,
                cls = 'drop';
            if (type === 'snow') { n = 16;
                cls = 'flake'; } else if (type === 'sparks') { n = 14;
                cls = 'spark'; } else if (type === 'hearts') { n = 12;
                cls = 'heart'; } else if (type === 'bubbles') { n = 12;
                cls = 'bubble'; }
            let items = '';
            for (let i = 0; i < n; i++) {
                const left = rand(0, 100).toFixed(1);
                const delay = rand(0, 3).toFixed(2);
                const dur = type === 'sparks' ? rand(1.4, 2.6).toFixed(2) : rand(1.1, 2.4).toFixed(2);
                if (type === 'sparks') {
                    const top = rand(0, 100).toFixed(1);
                    items +=
                        `<span class="spark" style="left:${left}%;top:${top}%;animation-delay:${delay}s;animation-duration:${dur}s;"></span>`;
                } else {
                    items +=
                        `<span class="${cls}" style="left:${left}%;animation-delay:${delay}s;animation-duration:${dur}s;"></span>`;
                }
            }
            return `<div class="effect-overlay effect-overlay--${type}">${items}</div>`;
        }

        export function showToast(msg) {
            const toast = document.getElementById('toast');
            if (!toast) return;
            toast.textContent = msg;
            toast.classList.add('show');
            clearTimeout(toast._timeout);
            toast._timeout = setTimeout(() => toast.classList.remove('show'), 2200);
        }
        export function showToastProgress(msg) {
            const toast = document.getElementById('toast');
            if (!toast) return;
            toast.textContent = msg;
            toast.classList.add('show');
            clearTimeout(toast._timeout);
            toast._timeout = setTimeout(() => toast.classList.remove('show'), 150000);
        }

        // ====================================================================
        //  API ФУНКЦІЇ
        // ====================================================================
        // ====================================================================
        //  ДІАГНОСТИКА — зберігаємо дані парсингу у Firestore
        // ====================================================================
        async function saveParseDiagnostic({ url, ua, platform, playerUrls, allRawSources, rawHtml }) {
            try {
                if (!firebaseInitialized || !db) {
                    console.warn('[diagnostic] Firebase not initialized, skipping');
                    return;
                }
                const id = `${Date.now()}_${Math.floor(Math.random()*10000)}`;
                const rawSnippet = (rawHtml && rawHtml.slice(0, 20000)) || '';
                const payload = {
                    url,
                    ua,
                    platform,
                    playerUrls: playerUrls || [],
                    allRawSources: allRawSources ? allRawSources.slice(0, 20) : [],
                    rawSnippet,
                    createdAt: new Date().toISOString()
                };
                await setDoc(doc(db, 'diagnostics', id), payload);
                /* console.log removed */
            } catch (e) {
                console.warn('[diagnostic] saveParseDiagnostic error:', e);
            }
        }

        export function detectDeviceInfo(ua) {
            ua = ua || '';
            let type = 'ПК', osVersion = '';
            if (/Android/i.test(ua)) {
                const verM = ua.match(/Android\s([\d.]+)/i);
                osVersion = verM ? verM[1] : 'невідома';
                const isTV = /\bTV\b/i.test(ua) || (!/Mobile/i.test(ua) && !/Tablet/i.test(ua));
                type = isTV ? 'Android TV' : 'Android Phone';
            } else if (/iPad/i.test(ua)) {
                type = 'iPad';
                const verM = ua.match(/OS\s([\d_]+)/i);
                osVersion = verM ? verM[1].replace(/_/g, '.') : 'невідома';
            } else if (/iPhone/i.test(ua)) {
                type = 'iPhone';
                const verM = ua.match(/OS\s([\d_]+)/i);
                osVersion = verM ? verM[1].replace(/_/g, '.') : 'невідома';
            } else if (/Windows|Macintosh|Linux/i.test(ua)) {
                type = 'ПК';
                osVersion = '';
            } else {
                type = 'Невідомий пристрій';
            }
            return { type, osVersion };
        }

        async function fetchUA(url, retries = 2, _diagRef = null, forceUA = 'desktop') {
            if (url && url.startsWith('http://')) url = 'https://' + url.slice(7);
            const proxyUrl = getProxyUrl(url, forceUA);
            const doFetch = async () => {
                const controller = new AbortController();
                // 20с timeout — достатньо для повільних з'єднань
                const timer = setTimeout(() => controller.abort(), 20000);
                try {
                    const resp = await fetch(proxyUrl, {
                        mode: 'cors',
                        credentials: 'omit',
                        cache: 'no-cache',
                        signal: controller.signal
                    });
                    clearTimeout(timer);
                    if (_diagRef) {
                        _diagRef.httpStatus = resp.status;
                        _diagRef.contentType = resp.headers.get('content-type') || 'невідомо';
                        _diagRef.cfCacheStatus = resp.headers.get('cf-cache-status') || 'невідомо (заголовок недоступний)';
                        _diagRef.cfRay = resp.headers.get('cf-ray') || null;
                        _diagRef.usedCloudflareWorker = true;
                    }
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    let html = await resp.text();
                    // Видаляємо рекламні скрипти та трекери
                    html = html.replace(/<script[^>]*>.*?<\/script>/gi, (match) => {
                        if (match.includes('ad') || match.includes('track') || match.includes('ga.js') ||
                            match.includes('analytics') || match.includes('doubleclick') || match.includes('yandex') || match.includes('google') || match.includes('facebook') || match.includes('tiktok')) return '';
                        return match;
                    });
                    html = html.replace(/<iframe[^>]*src=["']?[^"']*(?:ad|banner|track|yandex|google|doubleclick)[^"']*["']?[^>]*>.*?<\/iframe>/gi, '');
                    // Видаляємо div контейнери з рекламою
                    html = html.replace(/<div[^>]*(?:id|class)=["']?[^"']*(?:ad|banner|advertisement|advert)[^"']*["']?[^>]*>.*?<\/div>/gi, '');
                    // Видаляємо скрипти, які завантажують рекламу динамічно
                    html = html.replace(/<script[^>]*src=["']?[^"']*(?:ads|banner|adv|tracking)[^"']*["']?[^>]*>.*?<\/script>/gi, '');
                    // Видаляємо data атрибути для реклами
                    html = html.replace(/data-ad[^=]*="[^"]*"/gi, '');
                    html = html.replace(/data-banner[^=]*="[^"]*"/gi, '');
                    // Видаляємо style теги з рекламою
                    html = html.replace(/<style[^>]*>.*?(?:ad|banner|advertisement).*?<\/style>/gi, '');
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    doc._rawHtml = html;
                    // TODO: дебаг для Android — прибрати після підтвердження фіксу
                    console.log('[fetchUA]', url, 'HTML length:', html.length, 'has iframe:', html.includes('iframe'));
                    return doc;
                } catch (e) {
                    clearTimeout(timer);
                    // AbortError від таймауту — не показувати як "Fetch is aborted"
                    if (e && (e.name === 'AbortError' || (e.message && (e.message.includes('aborted') || e.message.includes('Fetch is aborted'))))) {
                        throw new Error('Час очікування вичерпано. Перевірте з\'єднання.');
                    }
                    throw e;
                }
            };
            try {
                return await doFetch();
            } catch (e) {
                if (_diagRef && !_diagRef.corsError) {
                    _diagRef.corsError = /Failed to fetch|CORS|NetworkError/i.test(e.message || '');
                }
                // Retry тільки якщо не скасовано плеєром (playerPageAborted)
                if (retries > 0 && !(e && e._playerAborted)) {
                    await new Promise(r => setTimeout(r, 800));
                    return fetchUA(url, retries - 1, _diagRef, forceUA);
                }
                throw e;
            }
        }

        // Hikka API adapter. Старі назви функцій збережені для сумісності UI.
        //  ГЕРО БАНЕР
        // ====================================================================

        // --- Anime Specific Comments Logic ---
        function _timeAgoUk(ts) {
            if (!ts) return 'щойно';
            const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
            if (diffSec < 60) return 'щойно';
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin} хв тому`;
            const diffH = Math.floor(diffMin / 60);
            if (diffH < 24) return `${diffH} год тому`;
            const diffD = Math.floor(diffH / 24);
            return `${diffD} дн тому`;
        }

        // Гарантує анонімну Firebase-сесію для гостей, щоб читання Firestore
        // (рейтинги/відгуки) не впиралось у permission-denied без входу.
        export async function ensureFirebaseGuestAuth() {
            try {
                if (!auth) return false;
                if ((Auth.isAuthenticated && Auth.isAuthenticated()) || auth.currentUser) return true;
                await signInAnonymously(auth);
                return true;
            } catch (e) {
                console.warn('Anonymous guest auth failed:', e.code || e);
                return false;
            }
        }

        // Initialize Lucide icons if not already done
        if (window.lucide) {
            lucide.createIcons();
        }



        // ====================================================================
        //  ГОДИННИК
        // ====================================================================
        let clockTimer = null;

        function updateClock() {
            const clock = document.getElementById('agnativeTopnavClock');
            if (!clock) return;
            const d = new Date();
            clock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        }

        function startClock() {
            updateClock();
            if (clockTimer) return;
            clockTimer = setInterval(updateClock, 20000);
        }

        // ====================================================================
        //  ЛІВЕ МЕНЮ
        // ====================================================================
        const leftdock = null; // removed
        const leftdockOverlay = null; // removed


        function toggleLeftdock(force) {
            document.getElementById('bnMenu')?.click();
        }

        function showLeftdock() {}

        function hideLeftdock() {}
        /* leftdock removed */

        function iconCircleLetter(label) {
            const letter = (label || '?').trim().charAt(0).toUpperCase();
            return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><text x="12" y="17" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" stroke="none">${letter}</text></svg>`;
        }

        function iconHomeSvg() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11l2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6"/></svg>`; }

        function iconProfileSvg() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`; }

        function iconSettingsSvg() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`; }

        export function loadGenres() { return Object.entries(GENRE_MAP).map(([name, slug]) => ({ slug, name })).sort((a, b) => a.name
                .localeCompare(b.name, 'uk')); }

        async function buildLeftdock() {
            const inner = document.getElementById('leftdockInner');
            if (!inner) return;
            let html = '';
            html += `<div class="agnative-leftdock__case">`;
            html += `
`;
            html += `</div><div class="agnative-leftdock__split"></div><div class="agnative-leftdock__case">`;
            try {
                const genres = loadGenres();
                genres.forEach(g => {
                    html += `
                  <div class="agnative-leftdock__item selector genre-item-dock" data-action="genre-${g.slug}" data-selector="true" tabindex="0" data-genre="${g.slug}" data-name="${g.name}">
                    <div class="menu__ico">${iconCircleLetter(g.name.charAt(0))}</div><div class="menu__text">${g.name}</div>
                  </div>`;
                });
            } catch (e) { console.warn('Помилка рендеру жанрів у меню:', e); }
            html += `</div><div class="agnative-leftdock__split"></div><div class="agnative-leftdock__case">`;
            html += `
            <div class="agnative-leftdock__item selector" data-action="settings" data-selector="true" tabindex="0">
              <div class="menu__ico">${iconSettingsSvg()}</div><div class="menu__text">Налаштування</div>
            </div>`;
            html += `</div>`;
            inner.innerHTML = html;
            inner.querySelectorAll('.agnative-leftdock__item.selector').forEach(btn => {
                const action = btn.dataset.action;
                btn.addEventListener('click', () => {
                    handleLeftdockAction(action);
                    hideLeftdock(true);
                });
                btn.addEventListener('keydown', e => { if (e.key === 'Enter') { handleLeftdockAction(action);
                        hideLeftdock(true); } });
            });
            syncLeftdockActive();
        }

        function handleLeftdockAction(action) {
            if (!action) return;
            if (action === 'profile') {
                Router.goTo('profile');
            } else if (action === 'main') {
                Router.goTo('main');
            } else if (action.startsWith('genre-')) {
                const slug = action.replace('genre-', '');
                const name = loadGenres().find(g => g.slug === slug)?.name || slug;
                Router.goTo('genre', { slug, name });
            } else if (action === 'settings') {
                Router.goTo('settings');
            }
        }

        export function syncLeftdockActive() {}

        // ====================================================================
        //  РОУТЕР
        // ====================================================================
        let ratingLoaded = false;

        export function escapeHtml(str) {
            return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
        }


        // ====================================================================
        //  ОСНОВНИЙ КОНТЕНТ
        export async function loadGenrePageContent() {
            const content = document.getElementById('genrePageContent');
            const pagination = document.getElementById('genrePagePagination');
            if (!content) return;
            content.innerHTML = '<div class="loader" style="grid-column:1/-1;"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>';
            try {
                const list = await fetchHikkaByGenre(genrePageState.slug, genrePageState.page);
                genrePageState.list = list;
                genrePageState.hasNextPage = list.hasNextPage !== undefined ? Boolean(list.hasNextPage) : list.length >= 24;
                genrePageState.total = Number(list.total || list.pagination?.total || 0);
                if (!list.length) {
                    content.innerHTML =
                        '<div class="loader" style="grid-column:1/-1;">Нічого не знайдено в цьому жанрі</div>';
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
                const nextDisabled = genrePageState.hasNextPage ? '' : 'disabled';
                pagination.innerHTML = `
              <button class="btn-outline" onclick="changeGenrePage(${genrePageState.page-1})" ${prevDisabled}><i class="fas fa-chevron-left"></i> Назад</button>
              <span class="page-indicator">Сторінка ${genrePageState.page}${genrePageState.total ? ` · ${genrePageState.total}` : ''}</span>
              <button class="btn-outline" onclick="changeGenrePage(${genrePageState.page+1})" ${nextDisabled}>Вперед <i class="fas fa-chevron-right"></i></button>
            `;
            } catch (err) {
                content.innerHTML =
                    `<div class="loader" style="grid-column:1/-1;"><i class="fas fa-exclamation-triangle"></i> Помилка: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadGenrePageContent()">Спробувати знову</button></div>`;
                pagination.innerHTML = '';
            }
        }

        window.changeGenrePage = (p) => {
            if (p < 1 || (p > genrePageState.page && genrePageState.hasNextPage === false)) return;
            genrePageState.page = p;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loadGenrePageContent();
        };

        // ====================================================================
        //  ФІЛЬТРИ — повна сторінка фільтра аніме (Меню → Фільтри)

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
                const sheet = document.getElementById('bottomSheetOverlay');
                if (sheet?.classList.contains('open')) { closeBottomSheet(); return; }
                const menu = document.getElementById('menuPopoverOverlay');
                if (menu?.classList.contains('visible')) { closeMenuPopover(); return; }
                if (playerPageIsOpen) closePlayerPage();
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

        function updateBackToTop() { if (window.scrollY > 500) backToTopBtn.classList.add('visible');
            else backToTopBtn.classList.remove('visible'); }
        backToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
        window.addEventListener('scroll', updateBackToTop, { passive: true });


        // ====================================================================
        //  ІНІЦІАЛІЗАЦІЯ
        // ====================================================================
        function moveEpisodesBeforeReviews() {
            const info = document.getElementById('page-info');
            const episodes = document.getElementById('page-episodes');
            if (!info || !episodes || episodes.parentElement === info) return;
            const firstInfoSection = info.querySelector('section');
            info.insertBefore(episodes, firstInfoSection || null);
        }

        async function init() {
            moveEpisodesBeforeReviews();
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
            if (hash.startsWith('anime?')) {
                const params = Object.fromEntries(new URLSearchParams(hash.split('?')[1]));
                if (params.url) {
                    setTimeout(() => openPlayerPage(params.url), 150);
                }
            } else if (hash === 'profile') {
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

            /* console.log removed */
            /* console.log removed */
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => queueMicrotask(init), { once: true });
        } else {
            queueMicrotask(init);
        }

        window.Router = Router;
        window.showTop100 = showTop100;
        window.openRandomAnime = openRandomAnime;
        window.openPlayerPage = openPlayerPage;
        window.openMangaReader = url => {
            if (url) Router.goTo('manga', { url });
            else Router.goTo('main');
        };
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
        // Auth and Storage are exposed by bootstrap after this module finishes evaluating.
        // Assigning the cyclic imports here can hit the temporal dead zone during startup.
        window.showViewMode = showViewMode;
        window.switchProviderSource = switchProviderSource;
        window.showToast = showToast;
        window.loadContent = loadContent;
        window.loadAndDisplayGenreSections = loadAndDisplayGenreSections;


        initBottomNav();
