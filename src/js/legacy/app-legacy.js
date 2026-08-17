import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile, signInAnonymously, sendPasswordResetEmail, deleteUser, doc, getDoc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, addDoc, collection, query, where, orderBy, limit, onSnapshot } from '../config/firebase.js';
import { auth, db, initialized as firebaseInitialized } from '../services/firebase/client.js';
import { PROXY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, HIKKA_API, HIKKA_CORS_PROXY, MIKAI_BASE, GENRE_MAP } from '../config/constants.js';
import { safeQuery, safeQueryAll } from '../utils/dom.js';
import { getProxyUrl, isEmbedUrl } from '../utils/image.js';
import { loadFeature } from '../core/feature-loader.js';
import '../utils/string.js';

export let playerPageAnimeuaSeasons = null;
export const loadMangaReader = () => loadFeature('manga');
export let externalSourceCache = {};
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
import { Auth } from './auth.js';
import { Storage } from './storage.js';
import { Router } from './router.js';
import { LampaPlayer } from './player.js';
import { initCommunity } from './community.js';
import { renderProfilePage } from './profile.js';
import { getProfile, renderSettingsPage } from './settings.js';
import {
    currentTab, currentPage, currentSearchQuery, currentCategory, setCurrentTab, setCurrentPage, setCurrentSearchQuery, setCurrentCategory, fetchContent, showSkeleton, loadContent, popularRenderGen, renderPopularCards, loadPopularCardDetails, ANIME_CARD_PLACEHOLDER, animeCardDataMap, registerAnimeCardData, TMDB_ENRICH_CONCURRENCY, tmdbEnrichActive, tmdbEnrichQueue, queueTmdbEnrich, pumpTmdbEnrichQueue, runTmdbEnrichJob, animeCardObserver, getAnimeCardObserver, observeAnimeCardsForTmdb, renderCards, renderPagination, showTop100, openRandomAnime, genreList, homeSectionsRequestId, homeCatalogRequestId, preloadHomepageTmdbGroups, homeCatalogPage, homeCatalogItems, homeCatalogLoading, homeCatalogTotal, homeCatalogMode, homeCatalogQuery, homeCatalogSort, homeCatalogView, homeCatalogPreset, homeCatalogGenre, HOME_MANGA_AGE_OPTIONS, honeyCatalogPageCache, HOME_CATALOG_MODES, HOME_CATALOG_PRESETS, homeCatalogRequestBody, HONEY_API, HONEY_SEARCH_API, HONEY_WEB, HONEY_IMAGE, honeySearchCache, honeyReaderCache, honeyAvailabilityMap, honeyAvailabilityMapPromise, loadHoneyAvailabilityMap, normalizeHoneyMatch, fetchHoneyJson, honeyNamesMatch, searchHoneyTitles, resolveHoneyReader, attachHoneyReaders, getHoneyGenreOptions, honeyAgeCategory, homeCatalogGenreHtml, syncHomeCatalogGenreControl, honeyCatalogItem, fetchHoneyCatalogPage, fetchHomeCatalogPage, getHomeCatalogVisibleItems, formatHomeCatalogNumber, homeCatalogCountText, homeCatalogCardHtml, bindHomeCatalogCards, buildHomeCatalogSectionHtml, renderHomeCatalogGrid, bindHomeCatalogMenu, updateHomeCatalogModeLabels, reloadHomeCatalog, loadHomeCatalogMore, loadAndDisplayGenreSections, statusLabelUa, buildAnimeCarouselSectionHtml, buildPopularVerticalSectionHtml, buildHistoryCarouselSectionHtml, openScheduleItemInPlayer, searchPageState, renderSearchPage, performSearchPage, uploadToCloudinary, isGifUrl, applyGifClass, uploadRawToCloudinary, uploadVideoToCloudinary, isVideoFile, isVideoUrl, profileMediaTransformStyle, profileMediaMarkup, uploadBlobToCloudinary, _imgeditClamp, openImageEditor, editExistingProfileImage, editExistingProfileVideo, compressImage, renderAuthPage, renderHistoryPanel, renderBookmarksPanel, renderAchievementsPanel, profileEditNick, profileEditBio, removeFlatStickerBackground, stickerBackgroundRemoverPromise, removeStickerBackground, genrePageState, renderGenresPage, renderGenrePage
} from './home.js?v=20260817-manga-availability-v2';
import {
    CATALOG_POSTER_FALLBACK, normalizeAnimeUrl, normalizePosterUrl, normalizeGenreList, normalizeSynopsisText, hikkaType, animeTypeLabel, extractExternalAnimeIds, hikkaItem, hikkaRequest, hikkaCatalog, fetchHikkaMain, searchHikka, fetchHikkaByCategory, fetchHikkaTop100, fetchHikkaByGenre, fetchAnimeLite, getExternalWatchUrl, getMikaiUrl, getAnimeOnUrl, getAnimeOnId, fetchAnimeOnJson, loadAnimeOnSeasons, resolveMikaiNuxtPayload, addNoAdsQuery, fetchMikaiHtml, getMikaiTeamLogoUrl, parseMikaiSeasonsFromHtml, ashdiPlaybackCache, resolveAshdiPlaybackUrl, inferAnimeSeasonNumber, loadMikaiSeasons, pickPreferredDub, loadHikkaDetail, unifyAnimeDataWithExternalDubs, sourceCache, getCachedSource, setCachedSource, switchProviderSource, refreshAfterSourceSwitch, extractPlayerIframeUrls, extractSourcesFromText
} from './catalog.js';

export { Auth, Router, Storage, renderProfilePage, renderSettingsPage };
export { currentTab, currentPage, currentSearchQuery, currentCategory, setCurrentTab, setCurrentPage, setCurrentSearchQuery, setCurrentCategory, fetchContent, showSkeleton, loadContent, popularRenderGen, renderPopularCards, loadPopularCardDetails, ANIME_CARD_PLACEHOLDER, animeCardDataMap, registerAnimeCardData, TMDB_ENRICH_CONCURRENCY, tmdbEnrichActive, tmdbEnrichQueue, queueTmdbEnrich, pumpTmdbEnrichQueue, runTmdbEnrichJob, animeCardObserver, getAnimeCardObserver, observeAnimeCardsForTmdb, renderCards, renderPagination, showTop100, openRandomAnime, genreList, homeSectionsRequestId, homeCatalogRequestId, preloadHomepageTmdbGroups, homeCatalogPage, homeCatalogItems, homeCatalogLoading, homeCatalogTotal, homeCatalogMode, homeCatalogQuery, homeCatalogSort, homeCatalogView, homeCatalogPreset, homeCatalogGenre, HOME_MANGA_AGE_OPTIONS, honeyCatalogPageCache, HOME_CATALOG_MODES, HOME_CATALOG_PRESETS, homeCatalogRequestBody, HONEY_API, HONEY_SEARCH_API, HONEY_WEB, HONEY_IMAGE, honeySearchCache, honeyReaderCache, honeyAvailabilityMap, honeyAvailabilityMapPromise, loadHoneyAvailabilityMap, normalizeHoneyMatch, fetchHoneyJson, honeyNamesMatch, searchHoneyTitles, resolveHoneyReader, attachHoneyReaders, getHoneyGenreOptions, honeyAgeCategory, homeCatalogGenreHtml, syncHomeCatalogGenreControl, honeyCatalogItem, fetchHoneyCatalogPage, fetchHomeCatalogPage, getHomeCatalogVisibleItems, formatHomeCatalogNumber, homeCatalogCountText, homeCatalogCardHtml, bindHomeCatalogCards, buildHomeCatalogSectionHtml, renderHomeCatalogGrid, bindHomeCatalogMenu, updateHomeCatalogModeLabels, reloadHomeCatalog, loadHomeCatalogMore, loadAndDisplayGenreSections, statusLabelUa, buildAnimeCarouselSectionHtml, buildPopularVerticalSectionHtml, buildHistoryCarouselSectionHtml, openScheduleItemInPlayer, searchPageState, renderSearchPage, performSearchPage, uploadToCloudinary, isGifUrl, applyGifClass, uploadRawToCloudinary, uploadVideoToCloudinary, isVideoFile, isVideoUrl, profileMediaTransformStyle, profileMediaMarkup, uploadBlobToCloudinary, _imgeditClamp, openImageEditor, editExistingProfileImage, editExistingProfileVideo, compressImage, renderAuthPage, renderHistoryPanel, renderBookmarksPanel, renderAchievementsPanel, profileEditNick, profileEditBio, removeFlatStickerBackground, stickerBackgroundRemoverPromise, removeStickerBackground, genrePageState, renderGenresPage, renderGenrePage } from './home.js?v=20260817-manga-availability-v2';

        // ====================================================================
        //  СХОВИЩЕ
        // ====================================================================
        export function getDefaultStickers() {
            return { singles: [], sets: [], nickBadge: null, medals: [], colors: {} };
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

        // Колір теми (Налаштування → Зовнішній вигляд) — монохромні варіанти акценту
        export function applyThemeVariant(profile) {
            document.body.classList.remove('theme-variant-graphite', 'theme-variant-white', 'theme-variant-lavender', 'theme-variant-ocean');
            const v = profile?.themeVariant;
            if (v === 'graphite') document.body.classList.add('theme-variant-graphite');
            else if (v === 'white') document.body.classList.add('theme-variant-white');
            else if (v === 'lavender') document.body.classList.add('theme-variant-lavender');
            else if (v === 'ocean') document.body.classList.add('theme-variant-ocean');
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
        let heroItems = [],
            heroPool = [],
            heroSeenUrls = new Set(),
            heroCurrentIndex = 0,
            heroRotationTimer = null,
            heroJustSwiped = false;

        async function buildHeroBanner() {
            const wrapper = document.getElementById('heroWrapper');
            if (!wrapper) return;

            // Паралельно завантажуємо обидва джерела — не чекаємо одне на одне
            const [topResult, mainResult] = await Promise.allSettled([
                fetchHikkaTop100(),
                fetchHikkaMain(1)
            ]);

            const topAnime = topResult.status === 'fulfilled' ? (topResult.value || []) : [];
            const ordinaryAnime = mainResult.status === 'fulfilled' ? (mainResult.value || []) : [];

            heroPool = [...topAnime, ...ordinaryAnime]
                .filter(item => item?.url && item.images?.jpg?.large_image_url)
                .filter((item, index, list) => list.findIndex(other => other.url === item.url) === index);
            heroSeenUrls = new Set();
            heroItems = takeHeroBatch();

            if (heroItems.length === 0) {
                console.warn('Hero: no items loaded');
                wrapper.style.display = 'none';
                return;
            }
            if (Router.currentRoute !== 'main') {
                wrapper.style.display = 'none';
                return;
            }

            wrapper.style.display = 'block';
            heroCurrentIndex = 0;
            initHeroSwipe();

            // Показуємо перший слайд ОДРАЗУ з тим що є, не чекаємо деталей
            renderHeroSlide(heroItems[0]);
            buildHeroIndicators();
            startHeroRotation();

            // Деталі завантажуємо у фоні — оновимо слайд коли прийдуть
            loadHeroItemDetails(0).then(() => {
                if (heroCurrentIndex === 0) renderHeroSlide(heroItems[0]);
            }).catch(() => {});

            // Preload деталі наступного слайду у фоні
            if (heroItems.length > 1) {
                loadHeroItemDetails(1).catch(() => {});
            }
        }

        function takeHeroBatch() {
            const available = heroPool.filter(item => item?.url && !heroSeenUrls.has(item.url));
            const batch = [...available].sort(() => Math.random() - 0.5).slice(0, 8);
            batch.forEach(item => heroSeenUrls.add(item.url));
            return batch;
        }

        async function loadNextHeroBatch() {
            stopHeroRotation();
            let nextBatch = takeHeroBatch();
            if (nextBatch.length < 8 && heroSeenUrls.size >= heroPool.length) {
                heroSeenUrls = new Set();
                nextBatch = takeHeroBatch();
            }
            if (!nextBatch.length) return;
            heroItems = nextBatch;
            heroCurrentIndex = 0;
            renderHeroSlide(heroItems[0]);
            buildHeroIndicators();
            startHeroRotation();
            loadHeroItemDetails(0).then(() => {
                if (heroCurrentIndex === 0) renderHeroSlide(heroItems[0]);
            }).catch(() => {});
            if (heroItems.length > 1) loadHeroItemDetails(1).catch(() => {});
        }

        async function loadHeroItemDetails(idx) {
            if (idx < 0 || idx >= heroItems.length) return;
            const item = heroItems[idx];
            if (item.detailsLoaded) return;
            // Timeout 6с щоб не зависати якщо сайт відповідає повільно
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000));
            try {
                const detail = await Promise.race([loadHikkaDetail(item.url), timeoutPromise]);
                item.genres = detail.genres || [];
                item.totalEpisodes = detail.totalEpisodes || 0;
                item.synopsis = detail.synopsis || '';
                item.year = detail.year || item.year || '';
                item.detailsLoaded = true;
                item.rating = (7 + Math.random() * 2.5).toFixed(1);
            } catch (e) {
                console.warn('Hero details fallback:', item.title, e.message);
                item.genres = item.genres || ['Аніме'];
                item.totalEpisodes = item.totalEpisodes || 0;
                item.synopsis = item.synopsis || 'Натисніть «Дивитися», щоб перейти до перегляду.';
                item.rating = item.rating || (7 + Math.random() * 2.5).toFixed(1);
                item.detailsLoaded = true;
            }
        }

        function renderHeroSlide(item) {
            const container = document.getElementById('heroSlidesContainer');
            if (!container || !item) return;
            const poster = item.images?.jpg?.large_image_url || '';
            const rawTitle = item.title || 'Без назви';
            const title = rawTitle.length > 38 ? rawTitle.substring(0, 38) + '…' : rawTitle;
            const genres = item.genres || ['Аніме'];
            const rating = item.rating || (7 + Math.random() * 2.5).toFixed(1);
            const year = item.year || '';
            const episodes = item.totalEpisodes || 0;
            const synopsis = item.synopsis || '';

            const metaParts = [];
            if (year) metaParts.push(year);
            if (episodes > 0) metaParts.push(episodes + ' еп.');
            const metaHtml = metaParts.length > 0
                ? `<span class="hero-info-separator">·</span><span class="hero-meta">${metaParts.join(' <span class="hero-meta-dot"></span> ')}</span>`
                : '';

            const heroSynopsis = synopsis.trim().replace(/\s+/g, ' ');
            const synopsisHtml = heroSynopsis
                ? `<div class="hero-slide-desc">${heroSynopsis.substring(0, 170)}${heroSynopsis.length > 170 ? '…' : ''}</div>`
                : '';

            const slide = document.createElement('div');
            slide.className = 'hero-slide active';
            slide.dataset.url = item.url;

            // Fallback poster — якщо зображення не завантажилось
            const safePoster = poster || '';
            const bgStyle = safePoster
                ? `background-image: url('${safePoster}');`
                : 'background: linear-gradient(135deg, #1a1a1a, #2d2d2d);';

            slide.innerHTML = `
                <div class="hero-slide-bg" id="heroBg_${Date.now()}" style="${bgStyle}"></div>
                <div class="hero-slide-overlay"></div>
                <div class="hero-slide-content">
                    <div class="hero-slide-title">${title}</div>
                    ${synopsisHtml}
                    <div class="hero-slide-tags">
                        ${genres.slice(0, 3).map(g => `<span class="hero-tag genre-tag">${g}</span>`).join('')}
                    </div>
                    <div class="hero-info-pill hero-rating-row hero-rating-row--bottom">
                        <span class="hero-rating-badge"><span class="star">★</span> ${rating}</span>
                        ${metaHtml}
                    </div>
                </div>
            `;

            // Preload poster image — якщо не завантажиться, фон лишається градієнтом
            if (safePoster) {
                const img = new Image();
                img.onload = () => {
                    const bg = slide.querySelector('.hero-slide-bg');
                    if (bg) bg.style.backgroundImage = `url('${safePoster}')`;
                };
                img.onerror = () => {
                    const bg = slide.querySelector('.hero-slide-bg');
                    if (bg) bg.style.background = 'linear-gradient(135deg, #1a1a1a, #2d2d2d)';
                };
                img.src = safePoster;
            }

            container.innerHTML = '';
            container.appendChild(slide);

            // Весь слайд клікабельний — відкриває аніме. Свайп (не тап) перемикає слайди, не відкриваючи сторінку.
            slide.addEventListener('click', () => {
                if (heroJustSwiped) { heroJustSwiped = false; return; }
                if (item.url) openPlayerPage(item.url);
            });
        }

        function buildHeroIndicators() {
            const dotsContainer = document.getElementById('heroDots');
            if (!dotsContainer) return;
            dotsContainer.innerHTML = '';
            heroItems.forEach((_, idx) => {
                const dot = document.createElement('div');
                dot.className = 'hero-dot' + (idx === heroCurrentIndex ? ' active' : '');
                dot.addEventListener('click', () => goToSlide(idx));
                dotsContainer.appendChild(dot);
            });
        }

        function updateHeroIndicators() {
            const dots = document.querySelectorAll('.hero-dot');
            dots.forEach((dot, idx) => {
                dot.classList.toggle('active', idx === heroCurrentIndex);
            });
        }

        async function goToSlide(idx) {
            if (idx < 0 || idx >= heroItems.length) return;
            if (idx === heroCurrentIndex) return;
            heroCurrentIndex = idx;
            // Показуємо слайд одразу — не чекаємо деталей
            renderHeroSlide(heroItems[idx]);
            updateHeroIndicators();
            resetHeroTimer();
            // Деталі завантажуємо у фоні — оновимо слайд коли прийдуть
            if (!heroItems[idx].detailsLoaded) {
                loadHeroItemDetails(idx).then(() => {
                    if (heroCurrentIndex === idx) renderHeroSlide(heroItems[idx]);
                }).catch(() => {});
            }
            // Preload наступного слайду
            const nextIdx = (idx + 1) % heroItems.length;
            if (!heroItems[nextIdx].detailsLoaded) {
                loadHeroItemDetails(nextIdx).catch(() => {});
            }
        }

        function nextSlide() {
            if (heroCurrentIndex >= heroItems.length - 1) {
                loadNextHeroBatch().catch(() => {});
                return;
            }
            goToSlide(heroCurrentIndex + 1);
        }

        function prevSlide() {
            goToSlide((heroCurrentIndex - 1 + heroItems.length) % heroItems.length);
        }

        // Гортання пальцем замість стрілок — свайп вліво/вправо перемикає слайди
        function initHeroSwipe() {
            const wrapper = document.getElementById('heroWrapper');
            if (!wrapper || wrapper.dataset.swipeInit) return;
            wrapper.dataset.swipeInit = '1';
            let startX = 0, startY = 0, tracking = false;
            wrapper.addEventListener('touchstart', (e) => {
                if (!e.touches.length) return;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                tracking = true;
            }, { passive: true });
            wrapper.addEventListener('touchend', (e) => {
                if (!tracking || !e.changedTouches.length) return;
                tracking = false;
                const dx = e.changedTouches[0].clientX - startX;
                const dy = e.changedTouches[0].clientY - startY;
                if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
                    heroJustSwiped = true;
                    if (dx < 0) nextSlide(); else prevSlide();
                }
            }, { passive: true });
        }

        let heroProgressInterval = null;
        const HERO_SLIDE_DURATION = 6000;

        function startHeroRotation() {
            stopHeroRotation();
            if (heroItems.length < 2) return;
            const fill = document.getElementById('heroProgressFill');
            let elapsed = 0;
            if (fill) fill.style.width = '0%';
            heroProgressInterval = setInterval(() => {
                elapsed += 50;
                if (fill) fill.style.width = (elapsed / HERO_SLIDE_DURATION * 100) + '%';
            }, 50);
            heroRotationTimer = setTimeout(nextSlide, HERO_SLIDE_DURATION);
        }

        function stopHeroRotation() {
            if (heroRotationTimer) { clearTimeout(heroRotationTimer); heroRotationTimer = null; }
            if (heroProgressInterval) { clearInterval(heroProgressInterval); heroProgressInterval = null; }
            const fill = document.getElementById('heroProgressFill');
            if (fill) fill.style.width = '0%';
        }

        function resetHeroTimer() {
            stopHeroRotation();
            startHeroRotation();
        }


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
        async function ensureFirebaseGuestAuth() {
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
            Router.goTo('genres');
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

        // ====================================================================
        //  XP / LEVEL SYSTEM
        // ====================================================================
        function _getDailyXPBonus() {
            try { return parseInt(localStorage.getItem('vakdab_daily_xp_total') || '0', 10) || 0; }
            catch { return 0; }
        }
        function _addDailyXPBonus(amount) {
            const cur = _getDailyXPBonus();
            const next = cur + amount;
            try { localStorage.setItem('vakdab_daily_xp_total', String(next)); } catch {}
            return next;
        }
        const XP_RULES = Object.freeze({ episode: 25, minute: 1, bookmark: 15, achievement: 75 });
        function calculateBaseXP({ episodes = 0, watchSeconds = 0, bookmarks = 0, posts = 0, ratings = 0 } = {}) {
            const safeEpisodes = Math.max(0, Math.floor(Number(episodes) || 0));
            const watchMinutes = Math.max(0, Math.floor((Number(watchSeconds) || 0) / 60));
            const safeBookmarks = Math.max(0, Math.floor(Number(bookmarks) || 0));
            const safePosts = Math.max(0, Math.floor(Number(posts) || 0));
            const safeRatings = Math.max(0, Math.floor(Number(ratings) || 0));
            const baseXP = safeEpisodes * XP_RULES.episode + watchMinutes * XP_RULES.minute + safeBookmarks * XP_RULES.bookmark;
            let totalXP = baseXP;
            for (let pass = 0; pass < ACHIEVEMENTS.length + 2; pass++) {
                const achStats = { episodes: safeEpisodes, watchMinutes, bookmarks: safeBookmarks, xp: totalXP, level: getLevel(totalXP), posts: safePosts, ratings: safeRatings };
                const earnedCount = ACHIEVEMENTS.filter(a => achStats[a.field] >= a.need).length;
                const nextXP = baseXP + earnedCount * XP_RULES.achievement;
                if (nextXP === totalXP) break;
                totalXP = nextXP;
            }
            return totalXP;
        }
        export function calcTotalXP() {
            const history = Storage.getHistory() || [];
            const bookmarks = Storage.getBookmarks() || [];
            return calculateBaseXP({ episodes: history.length, watchSeconds: Storage.getWatchTime() || 0, bookmarks: bookmarks.length, posts: DailyStats.getTotalPosts(), ratings: DailyStats.getTotalRatings() }) + _getDailyXPBonus();
        }
        export function getLevel(xp) {
            return Math.floor(Math.sqrt(xp / 50)) + 1;
        }
        function getXPForLevel(level) {
            return Math.pow(level - 1, 2) * 50;
        }
        function getXPProgress(xp) {
            const level = getLevel(xp);
            const currentLevelXP = getXPForLevel(level);
            const nextLevelXP = getXPForLevel(level + 1);
            const into = xp - currentLevelXP;
            const needed = nextLevelXP - currentLevelXP;
            return { level, pct: needed > 0 ? Math.min(100, Math.round(into / needed * 100)) : 100, into, needed };
        }

        const DAILY_TASK_POOL = [
            { id: 'dt1', field: 'episodesToday', target: 1, xp: 35, desc: 'Перегляньте 1 серію сьогодні' },
            { id: 'dt2', field: 'episodesToday', target: 2, xp: 50, desc: 'Подивіться 2 серії за день' },
            { id: 'dt3', field: 'episodesToday', target: 3, xp: 65, desc: 'Перегляньте 3 серії аніме' },
            { id: 'dt4', field: 'episodesToday', target: 4, xp: 80, desc: 'Марафон: 4 серії' },
            { id: 'dt5', field: 'episodesToday', target: 5, xp: 95, desc: 'Погляньте 5 серій' },
            { id: 'dt6', field: 'episodesToday', target: 6, xp: 110, desc: 'Продовжте перегляд: 6 серії' },
            { id: 'dt7', field: 'episodesToday', target: 7, xp: 125, desc: 'Наздожени тиждень: 7 серій' },
            { id: 'dt8', field: 'episodesToday', target: 8, xp: 140, desc: 'Занурся в аніме: 8 серій' },
            { id: 'dt9', field: 'episodesToday', target: 10, xp: 170, desc: 'Подвійна серія: 10 серії' },
            { id: 'dt10', field: 'episodesToday', target: 12, xp: 200, desc: 'Марафонець: 12 серій' },
            { id: 'dt11', field: 'episodesToday', target: 15, xp: 245, desc: 'Легенда дня: 15 серій' },
            { id: 'dt12', field: 'minutesToday', target: 10, xp: 23, desc: 'Дивіться аніме 10 хвилин' },
            { id: 'dt13', field: 'minutesToday', target: 15, xp: 27, desc: 'Проведіть за переглядом 15 хв' },
            { id: 'dt14', field: 'minutesToday', target: 20, xp: 31, desc: 'Насолоджуйтесь переглядом 20 хвилин' },
            { id: 'dt15', field: 'minutesToday', target: 30, xp: 39, desc: 'Півгодини аніме: 30 хв' },
            { id: 'dt16', field: 'minutesToday', target: 45, xp: 51, desc: 'Занурся на 45 хвилин' },
            { id: 'dt17', field: 'minutesToday', target: 60, xp: 63, desc: 'Годинка аніме: 60 хвилин' },
            { id: 'dt18', field: 'minutesToday', target: 75, xp: 75, desc: 'Довгий перегляд: 75 хвилин' },
            { id: 'dt19', field: 'minutesToday', target: 90, xp: 87, desc: 'Вечір аніме: 90 хвилин' },
            { id: 'dt20', field: 'minutesToday', target: 120, xp: 111, desc: 'Марафон часу: 120 хвилин' },
            { id: 'dt21', field: 'minutesToday', target: 150, xp: 135, desc: 'Справжній фанат: 150 хвилин' },
            { id: 'dt22', field: 'minutesToday', target: 180, xp: 159, desc: 'Аніме-день: 180 хвилин' },
            { id: 'dt23', field: 'bookmarksToday', target: 1, xp: 25, desc: 'Додайте 1 аніме в закладки' },
            { id: 'dt24', field: 'bookmarksToday', target: 2, xp: 35, desc: 'Збережіть 2 тайтли на потім' },
            { id: 'dt25', field: 'bookmarksToday', target: 3, xp: 45, desc: 'Поповніть закладки: 3 аніме' },
            { id: 'dt26', field: 'bookmarksToday', target: 4, xp: 55, desc: 'Знайдіть і збережіть 4 аніме' },
            { id: 'dt27', field: 'bookmarksToday', target: 5, xp: 65, desc: 'Складіть список: 5 закладок' },
            { id: 'dt28', field: 'bookmarksToday', target: 6, xp: 75, desc: 'Розширте бібліотеку: 6 закладок' },
            { id: 'dt29', field: 'bookmarksToday', target: 8, xp: 95, desc: 'Плануй перегляд: 8 закладок' },
            { id: 'dt30', field: 'bookmarksToday', target: 10, xp: 115, desc: 'Колекціонер: 10 закладок' },
            { id: 'dt31', field: 'postsToday', target: 1, xp: 32, desc: 'Напишіть 1 повідомлення в спільноті' },
            { id: 'dt32', field: 'postsToday', target: 2, xp: 44, desc: 'Поділіться думкою 2 раз(и)' },
            { id: 'dt33', field: 'postsToday', target: 3, xp: 56, desc: 'Будьте активні: 3 пост(и)' },
            { id: 'dt34', field: 'postsToday', target: 4, xp: 68, desc: 'Спілкуйтесь: 4 повідомлення' },
            { id: 'dt35', field: 'postsToday', target: 5, xp: 80, desc: 'Розкажіть про аніме: 5 пост(и)' },
            { id: 'dt36', field: 'postsToday', target: 6, xp: 92, desc: 'Станьте частиною спільноти: 6 пост(и)' },
            { id: 'dt37', field: 'postsToday', target: 8, xp: 116, desc: 'Голос спільноти: 8 повідомлення' },
            { id: 'dt38', field: 'postsToday', target: 10, xp: 140, desc: 'Активіст дня: 10 пост(и)' },
            { id: 'dt39', field: 'likesToday', target: 1, xp: 20, desc: 'Оцініть 1 аніме' },
            { id: 'dt40', field: 'likesToday', target: 2, xp: 28, desc: 'Постав лайк 2 тайтлам' },
            { id: 'dt41', field: 'likesToday', target: 3, xp: 36, desc: 'Поділись враженням: 3 оцінки' },
            { id: 'dt42', field: 'likesToday', target: 4, xp: 44, desc: 'Оціни перегляди: 4 аніме' },
            { id: 'dt43', field: 'likesToday', target: 5, xp: 52, desc: 'Критик дня: 5 оцінки' },
            { id: 'dt44', field: 'likesToday', target: 6, xp: 60, desc: 'Твоя думка важлива: 6 оцінки' },
            { id: 'dt45', field: 'likesToday', target: 8, xp: 76, desc: 'Рейтинг спільноти: 8 оцінки' },
            { id: 'dt46', field: 'likesToday', target: 10, xp: 92, desc: 'Знавець аніме: 10 оцінок' },
            { id: 'dt47', field: 'searchesToday', target: 1, xp: 17, desc: 'Знайдіть 1 аніме через пошук' },
            { id: 'dt48', field: 'searchesToday', target: 2, xp: 24, desc: 'Скористайтесь пошуком 2 раз(и)' },
            { id: 'dt49', field: 'searchesToday', target: 3, xp: 31, desc: 'Досліджуй каталог: 3 пошуки' },
            { id: 'dt50', field: 'searchesToday', target: 4, xp: 38, desc: 'Шукай нове: 4 запити' },
            { id: 'dt51', field: 'searchesToday', target: 5, xp: 45, desc: 'Знайди перлину: 5 пошуки' },
            { id: 'dt52', field: 'searchesToday', target: 6, xp: 52, desc: 'Розширюй горизонти: 6 пошуків' },
            { id: 'dt53', field: 'searchesToday', target: 8, xp: 66, desc: 'Дослідник дня: 8 пошуків' },
            { id: 'dt54', field: 'searchesToday', target: 10, xp: 80, desc: 'Мисливець за аніме: 10 пошуків' },
            { id: 'dt55', field: 'uniqueAnimeToday', target: 1, xp: 32, desc: 'Відкрийте 1 різних аніме' },
            { id: 'dt56', field: 'uniqueAnimeToday', target: 2, xp: 44, desc: 'Погляньте на 2 нових тайтли' },
            { id: 'dt57', field: 'uniqueAnimeToday', target: 3, xp: 56, desc: 'Дослідіть 3 різних аніме' },
            { id: 'dt58', field: 'uniqueAnimeToday', target: 4, xp: 68, desc: 'Спробуйте 4 нові тайтли' },
            { id: 'dt59', field: 'uniqueAnimeToday', target: 5, xp: 80, desc: 'Розширте кругозір: 5 аніме' },
            { id: 'dt60', field: 'uniqueAnimeToday', target: 6, xp: 92, desc: 'Різноманітність: 6 тайтли' },
            { id: 'dt61', field: 'uniqueAnimeToday', target: 8, xp: 116, desc: 'Гурман аніме: 8 тайтлів' },
            { id: 'dt62', field: 'uniqueAnimeToday', target: 10, xp: 140, desc: 'Колекція вражень: 10 тайтлів' },
            { id: 'dt63', field: 'uniqueAnimeToday', target: 15, xp: 200, desc: 'Всеїдний глядач: 15 тайтлів' },
            { id: 'dt64', field: 'loginToday', target: 1, xp: 10, desc: 'Заходь у застосунок сьогодні' },
            { id: 'dt65', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії' },
            { id: 'dt66', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій' },
            { id: 'dt67', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин' },
            { id: 'dt68', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв' },
            { id: 'dt69', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок' },
            { id: 'dt70', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень' },
            { id: 'dt71', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок' },
            { id: 'dt72', field: 'searchesToday', target: 12, xp: 100, desc: 'Головний дослідник: 12 пошуків' },
            { id: 'dt73', field: 'uniqueAnimeToday', target: 20, xp: 280, desc: 'Енциклопедист аніме: 20 тайтлів' },
            { id: 'dt74', field: 'episodesToday', target: 2, xp: 40, desc: 'Розігрів: 2 серії' },
            { id: 'dt75', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії #2' },
            { id: 'dt76', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій #2' },
            { id: 'dt77', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин #2' },
            { id: 'dt78', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв #2' },
            { id: 'dt79', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок #2' },
            { id: 'dt80', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень #2' },
            { id: 'dt81', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок #2' },
            { id: 'dt82', field: 'searchesToday', target: 12, xp: 100, desc: 'Головний дослідник: 12 пошуків #2' },
            { id: 'dt83', field: 'uniqueAnimeToday', target: 20, xp: 280, desc: 'Енциклопедист аніме: 20 тайтлів #2' },
            { id: 'dt84', field: 'episodesToday', target: 2, xp: 40, desc: 'Розігрів: 2 серії #2' },
            { id: 'dt85', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії #3' },
            { id: 'dt86', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій #3' },
            { id: 'dt87', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин #3' },
            { id: 'dt88', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв #3' },
            { id: 'dt89', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок #3' },
            { id: 'dt90', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень #3' },
            { id: 'dt91', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок #3' },
            { id: 'dt92', field: 'searchesToday', target: 12, xp: 100, desc: 'Головний дослідник: 12 пошуків #3' },
            { id: 'dt93', field: 'uniqueAnimeToday', target: 20, xp: 280, desc: 'Енциклопедист аніме: 20 тайтлів #3' },
            { id: 'dt94', field: 'episodesToday', target: 2, xp: 40, desc: 'Розігрів: 2 серії #3' },
            { id: 'dt95', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії #4' },
            { id: 'dt96', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій #4' },
            { id: 'dt97', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин #4' },
            { id: 'dt98', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв #4' },
            { id: 'dt99', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок #4' },
            { id: 'dt100', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень #4' },
            { id: 'dt101', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок #4' },
        ];

        // ====================================================================
        //  DAILY STATS / TASKS TRACKING
        // ====================================================================
        function _todayStr() {
            const d = new Date();
            return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
        }
        function _loadDailyState() {
            let st;
            try { st = JSON.parse(localStorage.getItem('vakdab_daily_state') || 'null'); } catch { st = null; }
            const today = _todayStr();
            if (!st || st.date !== today) {
                // Новий день — новий випадковий набір з 10 завдань, стата обнуляється
                const pool = [...DAILY_TASK_POOL];
                for (let i = pool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [pool[i], pool[j]] = [pool[j], pool[i]];
                }
                st = {
                    date: today,
                    taskIds: pool.slice(0, 10).map(t => t.id),
                    stats: { episodesToday: 0, minutesToday: 0, bookmarksToday: 0, postsToday: 0, likesToday: 0, searchesToday: 0, uniqueAnime: [] },
                    completed: []
                };
                localStorage.setItem('vakdab_daily_state', JSON.stringify(st));
            }
            return st;
        }
        function _saveDailyState(st) {
            localStorage.setItem('vakdab_daily_state', JSON.stringify(st));
        }
        function _getTotalCounter(key) {
            try { return parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch { return 0; }
        }
        function _incTotalCounter(key, by = 1) {
            const v = _getTotalCounter(key) + by;
            try { localStorage.setItem(key, String(v)); } catch {}
            return v;
        }
        export const DailyStats = {
            increment(field, amount = 1) {
                const st = _loadDailyState();
                st.stats[field] = (st.stats[field] || 0) + amount;
                _saveDailyState(st);
                this._checkCompletion(st);
            },
            addUniqueAnime(animeUrl) {
                if (!animeUrl) return;
                const st = _loadDailyState();
                if (!Array.isArray(st.stats.uniqueAnime)) st.stats.uniqueAnime = [];
                if (!st.stats.uniqueAnime.includes(animeUrl)) st.stats.uniqueAnime.push(animeUrl);
                st.stats.uniqueAnimeToday = st.stats.uniqueAnime.length;
                _saveDailyState(st);
                this._checkCompletion(st);
            },
            getTotalPosts() { return _getTotalCounter('vakdab_total_posts'); },
            addTotalPost() { return _incTotalCounter('vakdab_total_posts'); },
            getTotalRatings() { return _getTotalCounter('vakdab_total_ratings'); },
            addTotalRating() { return _incTotalCounter('vakdab_total_ratings'); },
            _checkCompletion(st) {
                let earned = 0, xpGain = 0;
                DAILY_TASK_POOL.forEach(t => {
                    if (!st.taskIds.includes(t.id)) return;
                    if (st.completed.includes(t.id)) return;
                    const val = st.stats[t.field] || 0;
                    if (val >= t.target) {
                        st.completed.push(t.id);
                        xpGain += t.xp;
                        earned++;
                    }
                });
                if (earned > 0) {
                    _saveDailyState(st);
                    _addDailyXPBonus(xpGain);
                    if (Auth.isAuthenticated()) Auth.syncUserData().catch(() => {});
                    showToast(`Завдання виконано! +${xpGain} XP`);
                    if (document.getElementById('rgDailyTasks')) _renderDailyTasks();
                    if (Router.currentRoute === 'rating') loadMyStats();
                }
            }
        };

        function _renderDailyTasks() {
            const el = document.getElementById('rgDailyTasks');
            if (!el) return;
            const st = _loadDailyState();
            const tasks = DAILY_TASK_POOL.filter(t => st.taskIds.includes(t.id));
            const rows = tasks.map(t => {
                const val  = st.stats[t.field] || 0;
                const done = st.completed.includes(t.id);
                const pct  = Math.min(100, Math.round((val / t.target) * 100));
                return `<div class="dt-item ${done ? 'done' : ''}">
                    <div class="dt-check">${done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>
                    <div class="dt-body">
                        <div class="dt-desc">${t.desc}</div>
                        <div class="dt-bar-wrap"><div class="dt-bar" style="width:${pct}%"></div></div>
                        <div class="dt-meta"><span>${Math.min(val, t.target)}/${t.target}</span><span class="dt-xp">+${t.xp} XP</span></div>
                    </div>
                </div>`;
            }).join('');
            const doneCount = tasks.filter(t => st.completed.includes(t.id)).length;
            el.innerHTML = `
                <div class="rg-daily-wrap">
                    <div class="rg-daily-header">
                        <span>Щоденні завдання</span>
                        <span class="rg-daily-count">${doneCount}/${tasks.length}</span>
                    </div>
                    <div class="dt-list">${rows}</div>
                </div>`;
        }

        export const ACHIEVEMENTS = [
            { id: 'ep1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Перший перегляд', req: '1 сер.', need: 1, field: 'episodes' },
            { id: 'ep5', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Розігрів', req: '5 сер.', need: 5, field: 'episodes' },
            { id: 'ep10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: '10 серій', req: '10 сер.', need: 10, field: 'episodes' },
            { id: 'ep25', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Уже втягнувся', req: '25 сер.', need: 25, field: 'episodes' },
            { id: 'ep50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: '50 серій', req: '50 сер.', need: 50, field: 'episodes' },
            { id: 'ep100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: '100 серій', req: '100 сер.', need: 100, field: 'episodes' },
            { id: 'ep250', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Справжній фанат', req: '250 сер.', need: 250, field: 'episodes' },
            { id: 'ep500', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: '500 серій', req: '500 сер.', need: 500, field: 'episodes' },
            { id: 'ep1000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Легенда серій', req: '1000 сер.', need: 1000, field: 'episodes' },
            { id: 'ep2000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Аніме-безсмертний', req: '2000 сер.', need: 2000, field: 'episodes' },
            { id: 'h1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: 'Перша хвилина', req: '1 хв', need: 1, field: 'watchMinutes' },
            { id: 'h5', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '5 хвилин', req: '5 хв', need: 5, field: 'watchMinutes' },
            { id: 'h10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '10 хвилин', req: '10 хв', need: 10, field: 'watchMinutes' },
            { id: 'h24', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '24 хвилини', req: '24 хв', need: 24, field: 'watchMinutes' },
            { id: 'h50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '50 хвилин', req: '50 хв', need: 50, field: 'watchMinutes' },
            { id: 'h100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '100 хвилин', req: '100 хв', need: 100, field: 'watchMinutes' },
            { id: 'h200', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '200 хвилин', req: '200 хв', need: 200, field: 'watchMinutes' },
            { id: 'h500', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '500 хвилин', req: '500 хв', need: 500, field: 'watchMinutes' },
            { id: 'h1000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '1000 хвилин', req: '1000 хв', need: 1000, field: 'watchMinutes' },
            { id: 'h2000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: 'Володар часу', req: '2000 хв', need: 2000, field: 'watchMinutes' },
            { id: 'bm1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: 'Перша закладка', req: '1 зак.', need: 1, field: 'bookmarks' },
            { id: 'bm5', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: '5 закладок', req: '5 зак.', need: 5, field: 'bookmarks' },
            { id: 'bm10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: '10 закладок', req: '10 зак.', need: 10, field: 'bookmarks' },
            { id: 'bm20', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: '20 закладок', req: '20 зак.', need: 20, field: 'bookmarks' },
            { id: 'bm50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: '50 закладок', req: '50 зак.', need: 50, field: 'bookmarks' },
            { id: 'bm100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: 'Колекціонер', req: '100 зак.', need: 100, field: 'bookmarks' },
            { id: 'bm200', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: 'Бібліотекар аніме', req: '200 зак.', need: 200, field: 'bookmarks' },
            { id: 'xp100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Перші кроки', req: '100 XP', need: 100, field: 'xp' },
            { id: 'xp500', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Досвідчений', req: '500 XP', need: 500, field: 'xp' },
            { id: 'xp1000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Про', req: '1000 XP', need: 1000, field: 'xp' },
            { id: 'xp2500', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Майстер XP', req: '2500 XP', need: 2500, field: 'xp' },
            { id: 'xp5000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Елітний гравець', req: '5000 XP', need: 5000, field: 'xp' },
            { id: 'xp10000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Легенда платформи', req: '10000 XP', need: 10000, field: 'xp' },
            { id: 'lvl5', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: '5 рівень', req: 'Lv.5', need: 5, field: 'level' },
            { id: 'lvl10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: '10 рівень', req: 'Lv.10', need: 10, field: 'level' },
            { id: 'lvl20', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: '20 рівень', req: 'Lv.20', need: 20, field: 'level' },
            { id: 'lvl30', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: '30 рівень', req: 'Lv.30', need: 30, field: 'level' },
            { id: 'lvl50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: 'Максимальний рівень', req: 'Lv.50', need: 50, field: 'level' },
            { id: 'post1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Перший пост', req: '1 пост.', need: 1, field: 'posts' },
            { id: 'post10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Активний учасник', req: '10 пост.', need: 10, field: 'posts' },
            { id: 'post25', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Голос спільноти', req: '25 пост.', need: 25, field: 'posts' },
            { id: 'post50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Душа компанії', req: '50 пост.', need: 50, field: 'posts' },
            { id: 'post100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Легенда чату', req: '100 пост.', need: 100, field: 'posts' },
            { id: 'like1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Перша оцінка', req: '1 оцін.', need: 1, field: 'ratings' },
            { id: 'like10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Критик', req: '10 оцін.', need: 10, field: 'ratings' },
            { id: 'like25', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Знавець смаку', req: '25 оцін.', need: 25, field: 'ratings' },
            { id: 'like50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Головний рецензент', req: '50 оцін.', need: 50, field: 'ratings' },
            { id: 'like100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Оракул рейтингів', req: '100 оцін.', need: 100, field: 'ratings' },
        ]

        function getUserRankInfo(episodes, watchMinutes) {
            if (watchMinutes >= 2000) return { label: 'Легенда аніме',  color: 'var(--accent)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>' };
            if (watchMinutes >= 1000) return { label: 'Майстер',        color: 'var(--text)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>' };
            if (watchMinutes >= 500)  return { label: 'Ветеран',        color: 'var(--text-secondary)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>' };
            if (watchMinutes >= 200)  return { label: 'Досвідчений',    color: 'var(--text-secondary)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7L12 3 4 7m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 0v10M4 7v10l8 4"/></svg>' };
            if (watchMinutes >= 60)   return { label: 'Початківець',    color: 'var(--text-muted)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' };
            return                        { label: 'Новачок',        color: 'var(--text-muted)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' };
        }

        export function initRatingPage() {
            const wrap = document.getElementById('ratingPageContainer');
            if (!wrap || wrap.dataset.init) return;
            wrap.dataset.init = '1';

            wrap.innerHTML = `
                <div class="rg-main-tabs" id="rgMainTabs">
                    <button class="rg-main-tab active" data-panel="rating">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        Рейтинг
                    </button>
                    <button class="rg-main-tab" data-panel="community">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Спільнота
                    </button>
                </div>

                <div class="rg-tab-panel active" id="rgPanelRating">
                    <div id="rgMyStats"></div>
                    <div id="rgDailyTasks"></div>
                    <div id="rgAchievements"></div>
                    <div class="rg-lb-title">Глобальний рейтинг</div>
                    <div class="rg-sort-tabs" id="rgSortTabs">
                        <button class="rg-sort-tab active" data-sort="xp">За XP</button>
                        <button class="rg-sort-tab" data-sort="episodes">За серіями</button>
                        <button class="rg-sort-tab" data-sort="minutes">За хвилинами</button>
                        <button class="rg-sort-tab" data-sort="bookmarks">За закладками</button>
                    </div>
                    <div id="rgLeaderboard">
                        <div style="display:flex;justify-content:center;padding:24px;"><svg style="width:22px;height:22px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9"/></svg></div>
                    </div>
                </div>

                <div class="rg-tab-panel" id="rgPanelCommunity"></div>
            `;

            wrap.querySelectorAll('.rg-main-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    wrap.querySelectorAll('.rg-main-tab').forEach(b => b.classList.remove('active'));
                    wrap.querySelectorAll('.rg-tab-panel').forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    const id = 'rgPanel' + btn.dataset.panel.charAt(0).toUpperCase() + btn.dataset.panel.slice(1);
                    const panel = document.getElementById(id);
                    if (panel) panel.classList.add('active');

                    if (btn.dataset.panel === 'community') {
                        document.body.classList.add('community-active');
                        const nav = document.getElementById('bottomNav');
                        if (nav) nav.classList.add('hidden-nav');
                        initCommunity();
                        setTimeout(() => {
                            const msgs = document.getElementById('comMessages');
                            if (msgs) msgs.scrollTop = msgs.scrollHeight;
                        }, 500);
                    }
                    if (btn.dataset.panel === 'rating') {
                        document.body.classList.remove('community-active');
                        const nav = document.getElementById('bottomNav');
                        if (nav) nav.classList.remove('hidden-nav');
                        loadMyStats();
                        _renderDailyTasks();
                        loadLeaderboard();
                    }
                });
            });

            wrap.querySelectorAll('.rg-sort-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.classList.contains('active')) return;
                    wrap.querySelectorAll('.rg-sort-tab').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    _lbSortKey = btn.dataset.sort;
                    const lb = document.getElementById('rgLeaderboard');
                    if (lb && _lbUsersCache.length) renderLeaderboard(lb, _lbUsersCache, _lbSortKey);
                });
            });

            loadMyStats();
            _renderDailyTasks();
            loadLeaderboard();
        }

        function loadMyStats() {
            const statsEl = document.getElementById('rgMyStats');
            const achEl   = document.getElementById('rgAchievements');
            if (!statsEl || !achEl) return;

            const profile    = getProfile();
            const history    = Storage.getHistory()   || [];
            const bookmarks  = Storage.getBookmarks() || [];
            const watchSec   = Storage.getWatchTime() || 0;
            const watchMinutes = Math.floor(watchSec / 60);
            const episodes   = history.length;
            const rankInfo   = getUserRankInfo(episodes, watchMinutes);
            const totalXP    = calcTotalXP();
            const xpLvl      = getLevel(totalXP);
            const achStats   = { episodes, watchMinutes, bookmarks: bookmarks.length, xp: totalXP, level: xpLvl, posts: DailyStats.getTotalPosts(), ratings: DailyStats.getTotalRatings() };
            const earnedIds  = new Set(ACHIEVEMENTS.filter(a => achStats[a.field] >= a.need).map(a => a.id));
            const xpProg     = getXPProgress(totalXP);

            const avatarGifClass = isGifUrl(profile.avatar) ? ' class="is-gif"' : '';
            const avHtml = profile.avatar
                ? `<img src="${profile.avatar}" alt=""${avatarGifClass}>`
                : `<span>${(profile.nickname || '?')[0].toUpperCase()}</span>`;

            statsEl.innerHTML = `
                <div class="rg-my-stats">
                    <div class="rg-stats-top">
                        <div class="rg-stats-avatar">${avHtml}</div>
                        <div>
                            <div class="rg-stats-name">${profile.nickname || 'Гість'}</div>
                            <div class="rg-stats-rank-badge" style="background:var(--accent);color:var(--accent-text);">${rankInfo.icon || ''}${rankInfo.label} · Lv.${xpProg.level}</div>
                        </div>
                    </div>
                    <div class="rg-xp-bar-wrap" style="margin:10px 0 4px;">
                        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px;">
                            <span>${totalXP} XP</span><span>Lv.${xpProg.level + 1} за ${xpProg.needed - xpProg.into} XP</span>
                        </div>
                        <div style="height:6px;border-radius:3px;background:var(--border,rgba(128,128,128,.2));overflow:hidden;">
                            <div style="height:100%;width:${xpProg.pct}%;background:var(--accent);border-radius:3px;transition:width .3s;"></div>
                        </div>
                    </div>
                    <div class="rg-stats-grid">
                        <div class="rg-stat-cell"><div class="rg-stat-val">${episodes}</div><div class="rg-stat-label">Серій</div></div>
                        <div class="rg-stat-cell"><div class="rg-stat-val">${watchMinutes}</div><div class="rg-stat-label">Хвилин</div></div>
                        <div class="rg-stat-cell"><div class="rg-stat-val">${earnedIds.size}</div><div class="rg-stat-label">Досягнень</div></div>
                    </div>
                    <div class="rg-xp-rules">XP: 25 за серію · 1 за хвилину · 15 за закладку · 75 за досягнення</div>
                </div>`;

            achEl.innerHTML = `
                <div class="rg-achievements">
                    <div class="rg-section-label">Досягнення</div>
                    <div class="rg-ach-scroll">
                        ${ACHIEVEMENTS.map(a => `
                            <div class="rg-ach-item ${earnedIds.has(a.id) ? 'earned' : 'locked'}" title="${a.req}">
                                <span class="rg-ach-icon">${a.icon}</span>
                                <span class="rg-ach-name">${a.name}</span>
                                <span class="rg-ach-req">${a.req}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }

        let _lbSortKey = 'xp';
        let _lbUsersCache = [];

        const TOP_BADGES = Object.freeze({ p1: 'src/assets/rating/top-1.png', p2: 'src/assets/rating/top-2.png', p3: 'src/assets/rating/top-3.png' });
        const LB_SORT_CONFIG = {
            xp:        { unit: 'XP',    getVal: u => u.xp },
            episodes:  { unit: 'сер.',  getVal: u => u.episodes },
            minutes:   { unit: 'хв',    getVal: u => u.minutes },
            bookmarks: { unit: 'зак.',  getVal: u => u.bookmarks }
        };

        async function loadLeaderboard() {
            const lb = document.getElementById('rgLeaderboard');
            if (!lb) return;

            const spinner = `<div style="display:flex;justify-content:center;padding:24px;"><svg style="width:22px;height:22px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9"/></svg></div>`;
            lb.className = '';
            lb.innerHTML = spinner;

            const showFallback = (msg) => {
                const profile = getProfile();
                const xp = calcTotalXP();
                const lv = getLevel(xp);
                const gifCls = isGifUrl(profile.avatar) ? ' class="is-gif"' : '';
                const av = profile.avatar ? `<img src="${profile.avatar}" alt=""${gifCls}>` : `<span>${(profile.nickname||'?')[0].toUpperCase()}</span>`;
                lb.innerHTML = `
                    <div class="rg-lb-list">
                        <div class="rg-lb-item is-me">
                            <div class="rg-lb-num" style="color:var(--accent);font-weight:800;">#1</div>
                            <div class="rg-lb-avatar">${av}</div>
                            <div class="rg-lb-info">
                                <div class="rg-lb-name">${profile.nickname||'Ти'} <span style="font-size:9px;color:var(--accent);font-weight:700;">YOU</span></div>
                                <div class="rg-lb-rank">Lv.${lv}</div>
                            </div>
                            <div class="rg-lb-score">${xp} <span class="unit">XP</span></div>
                        </div>
                    </div>
                    <p style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:8px;">${msg}</p>`;
            };

            // Чекаємо ініціалізацію Firebase (до 6 сек), не блокуючи інший код
            let waited = 0;
            while ((!firebaseInitialized || !db) && waited < 6000) {
                await new Promise(res => setTimeout(res, 250));
                waited += 250;
            }

            if (!firebaseInitialized || !db) {
                showFallback('Firebase недоступний. Перевірте з\'єднання.');
                return;
            }
            // КРИТИЧНО: чекаємо поки Firebase РЕАЛЬНО визначить сесію (_authResolved),
            // інакше вже залогінений через Google юзер на мить виглядає як "не автентифікований"
            // (onAuthStateChanged ще не встиг відпрацювати) і потрапляє у гостьову гілку нижче.
            waited = 0;
            while (!Auth._authResolved && waited < 4000) {
                await new Promise(res => setTimeout(res, 150));
                waited += 150;
            }
            // Гостям (справді неавторизованим) намагаємось видати анонімний Firebase-сеанс,
            // щоб рейтинг був доступний без входу
            if (!Auth.isAuthenticated()) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {
                    console.warn('Anonymous sign-in failed:', e.code);
                    showFallback('Глобальний рейтинг тимчасово доступний лише для авторизованих. Увійдіть через Google.');
                    return;
                }
            }

            try {
                const { collection, query, limit, getDocs, onSnapshot } =
                    await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js');
                // Без orderBy — не потребує Firestore composite index. Сортуємо на клієнті.
                const q = query(collection(db, 'users'), limit(500));
                const tp = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000));
                const snap = await Promise.race([getDocs(q), tp]);

                const mapUsers = (snapshot) => {
                    let arr = [];
                    snapshot.forEach(d => {
                        const data = d.data();
                        arr.push({
                            uid: d.id,
                            name: data.profile?.nickname || data.profile?.name || 'Аніматор',
                            avatar: data.profile?.avatar || '',
                            episodes: Array.isArray(data.history) ? data.history.length : 0,
                            minutes: Math.floor((data.watchTime || 0) / 60),
                            bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.length : 0,
                            xp: calculateBaseXP({ episodes: Array.isArray(data.history) ? data.history.length : 0, watchSeconds: data.watchTime || 0, bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.length : 0 }),
                            level: getLevel(calculateBaseXP({ episodes: Array.isArray(data.history) ? data.history.length : 0, watchSeconds: data.watchTime || 0, bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.length : 0 }))
                        });
                    });
                    return arr;
                };

                let users = mapUsers(snap);
                if (!users.length) {
                    showFallback('Рейтинг з\'явиться після реєстрації користувачів.');
                    return;
                }
                _lbUsersCache = users;
                renderLeaderboard(lb, users, _lbSortKey);

                if (window._lbUnsub) { window._lbUnsub(); window._lbUnsub = null; }
                window._lbUnsub = onSnapshot(q, (snap2) => {
                    const u = mapUsers(snap2);
                    if (u.length) {
                        _lbUsersCache = u;
                        renderLeaderboard(lb, u, _lbSortKey);
                    }
                }, (err) => console.warn('LB snapshot error:', err));

            } catch(e) {
                console.warn('loadLeaderboard error:', e.message);
                showFallback('Помилка завантаження: ' + e.message);
            }
        }

        function renderLeaderboard(lb, users, sortKey) {
            sortKey = sortKey || _lbSortKey || 'xp';
            const cfg = LB_SORT_CONFIG[sortKey] || LB_SORT_CONFIG.xp;
            const sorted = [...users].sort((a, b) => cfg.getVal(b) - cfg.getVal(a));

            const myUid = Auth.isAuthenticated() ? Auth._user?.uid : null;
            let html = '';

            if (sorted.length >= 3) {
                const order  = [sorted[1], sorted[0], sorted[2]];
                const cls    = ['p2', 'p1', 'p3'];
                html += '<div class="rg-podium">';
                order.forEach((u, i) => {
                    const gifCls = isGifUrl(u.avatar) ? ' class="is-gif"' : '';
                    const av = u.avatar ? `<img src="${u.avatar}" alt=""${gifCls}>` : `<span>${u.name[0].toUpperCase()}</span>`;
                    html += `<div class="rg-podium-item ${cls[i]}" style="animation-delay:${i*0.08}s">
                        <img class="rg-podium-badge" src="${TOP_BADGES[cls[i]]}" alt="Топ ${cls[i] === 'p1' ? '1' : cls[i] === 'p2' ? '2' : '3'}" loading="lazy">
                        <div class="rg-podium-avatar">${av}</div>
                        <div class="rg-podium-name">${u.name}</div>
                        <div class="rg-podium-score">${cfg.getVal(u)} ${cfg.unit}</div>
                        <div class="rg-podium-bar"></div>
                    </div>`;
                });
                html += '</div>';
            }

            html += '<div class="rg-lb-list">';
            sorted.slice(3).forEach((u, i) => {
                const isMe = u.uid === myUid;
                const gifCls = isGifUrl(u.avatar) ? ' class="is-gif"' : '';
                const av   = u.avatar ? `<img src="${u.avatar}" alt=""${gifCls}>` : `<span>${u.name[0].toUpperCase()}</span>`;
                const ri   = getUserRankInfo(u.episodes, u.minutes);
                html += `<div class="rg-lb-item ${isMe ? 'is-me' : ''}" style="animation-delay:${Math.min(i*0.02, 0.4)}s">
                    <div class="rg-lb-num">${i + 4}</div>
                    <div class="rg-lb-avatar">${av}</div>
                    <div class="rg-lb-info">
                        <div class="rg-lb-name">${u.name}${isMe ? ' <span style="font-size:9px;color:var(--accent);font-weight:700;">YOU</span>' : ''}</div>
                        <div class="rg-lb-rank" style="color:${ri.color}">Lv.${u.level} · ${ri.label}</div>
                    </div>
                    <div class="rg-lb-score">${cfg.getVal(u)} <span class="unit">${cfg.unit}</span></div>
                </div>`;
            });
            html += '</div>';
            lb.className = '';
            lb.innerHTML = html;
        }

        // ─────────────────────────────────────────────────
        //  Community Chat (Telegram-style)
        // ─────────────────────────────────────────────────
        let comUnsub = null;
        let comPostType = 'text';
        let comFilterType = 'text';
        let editingMsgId = null;
        let _comMsgsCache = [];
        let replyingTo = null;
        let _refreshComposeExtra = null;

        async function loadRatingPage() { initRatingPage(); }
        async function loadRatingList() { initRatingPage(); }

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

        window.changeGenrePage = (p) => {
            if (p < 1) return;
            genrePageState.page = p;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loadGenrePageContent();
        };

        // ====================================================================
        //  ФІЛЬТРИ — повна сторінка фільтра аніме (Меню → Фільтри)
        // ====================================================================
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
                genres: new Set(), status: 'all', types: new Set(), season: 'all', yearMin: 1970, yearMax: 2026, ratingMin: 0, ratingMax: 10, translation: '', age: new Set(), genrePanelOpen: false
            };
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
                <button class="filter-page__genre-toggle" id="filterGenreToggle">
                  <span class="filter-page__section-title">Жанри</span>
                  <span class="filter-page__genre-toggle-value" id="filterGenreValue">Всі <i class="fas fa-chevron-right"></i></span>
                </button>
                <div class="filter-page__genre-panel" id="filterGenrePanel">
                  <div class="filter-page__checkbox-grid">
                    ${genreEntries.map(g => `
                      <label class="filter-page__checkbox">
                        <input type="checkbox" data-genre="${g.slug}">
                        <span>${g.name}</span>
                      </label>`).join('')}
                  </div>
                </div>
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Статус</div>
                <div class="filter-page__section-sub">Стан виходу аніме</div>
                <div class="filter-chip-row" id="filterStatusRow" style="margin-top:0.8rem;">
                  <button class="filter-chip active" data-status="all">Всі</button>
                  ${FILTER_STATUS_OPTIONS.map(s => `<button class="filter-chip" data-status="${s.key}">${s.label}</button>`).join('')}
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
                ${buildDualRangeHtml('filterYear', 1970, 2026, 1970, 2026, 1)}
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
            filterResultsState = { items: [], loadingMore: false, page: 0, genrePages: {}, exhausted: false };
            container.innerHTML = buildFilterPageHtml();
            wireFilterPageEvents(container);
            applyFilters(true);
        }

        async function applyFilters(reset) {
            const content = document.getElementById('filterPageContent');
            const pagination = document.getElementById('filterPagePagination');
            const meta = document.getElementById('filterResultsMeta');
            if (!content || filterResultsState.loadingMore) return;
            if (reset) {
                filterResultsState = { items: [], loadingMore: false, page: 0, genrePages: {}, exhausted: false };
                content.innerHTML = '<div class="loader" style="grid-column:1/-1;"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>';
                if (meta) meta.textContent = '';
            }
            filterResultsState.loadingMore = true;
            try {
                const effectiveGenres = new Set(filterState.genres);
                if (filterState.types.has('movie')) effectiveGenres.add('film');
                const maxTotal = 30;
                const seen = new Set(filterResultsState.items.map(i => i.url));
                let found = 0;
                const matches = (a) => {
                    if (filterState.status !== 'all' && a.status !== filterState.status) return false;
                    if (filterState.types.size && !filterState.types.has(a.type || 'tv')) return false;
                    if (filterState.genres.size && ![...(a.genres || [])].some(g => filterState.genres.has(GENRE_MAP[g] || g))) return false;
                    return true;
                };

                if (effectiveGenres.size === 0) {
                    const maxPages = 6;
                    while (filterResultsState.page < maxPages && found < maxTotal) {
                        filterResultsState.page++;
                        const pageItems = await fetchHikkaMain(filterResultsState.page);
                        if (!pageItems.length) break;
                        const matched = pageItems.filter(matches);
                        for (const m of matched) {
                            if (!seen.has(m.url)) { filterResultsState.items.push(m); seen.add(m.url); found++; }
                        }
                    }
                } else {
                    for (const slug of effectiveGenres) {
                        if (found >= maxTotal) break;
                        let fetchedThisRound = 0;
                        while (fetchedThisRound < 2 && found < maxTotal) {
                            filterResultsState.genrePages[slug] = (filterResultsState.genrePages[slug] || 0) + 1;
                            const pageItems = await fetchHikkaByGenre(slug, filterResultsState.genrePages[slug]);
                            fetchedThisRound++;
                            if (!pageItems.length) break;
                            const matched = pageItems.filter(matches);
                            for (const m of matched) {
                                if (!seen.has(m.url)) { filterResultsState.items.push(m); seen.add(m.url); found++; }
                            }
                        }
                    }
                }

                filterResultsState.exhausted = (found === 0);

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

        // ====================================================================
        //  РОЗКЛАД ВИХОДУ (дані з Mikai API)
        // ====================================================================
        const MIKAI_API_BASE = 'https://api.mikai.me/v1';
        const scheduleState = { dayOffset: 0, cache: {}, sourcePromise: null, loadingOffset: null, weekLoading: false, weekTimer: null };
        const WEEKDAY_SHORT_UA = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const MIKAI_SCHEDULE_DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        function scheduleDateForOffset(offset) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + offset);
            return d;
        }

        function formatScheduleApiDate(d) {
            const pad = n => String(n).padStart(2, '0');
            return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
        }

        function formatScheduleDisplayDate(d) {
            const pad = n => String(n).padStart(2, '0');
            return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
        }

        async function fetchScheduleByOffset(offset) {
            if (scheduleState.cache[offset]) return scheduleState.cache[offset];
            if (!scheduleState.sourcePromise) {
                scheduleState.sourcePromise = fetch(`${MIKAI_API_BASE}/schedule`, {
                    mode: 'cors',
                    credentials: 'omit',
                    cache: 'no-cache'
                }).then(async resp => {
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    const payload = await resp.json();
                    if (payload?.ok === false) throw new Error(payload.error?.message || 'Mikai API error');
                    return payload?.result || payload;
                }).catch(error => {
                    scheduleState.sourcePromise = null;
                    throw error;
                });
            }
            const schedule = await scheduleState.sourcePromise;
            const key = MIKAI_SCHEDULE_DAY_KEYS[scheduleDateForOffset(offset).getDay()];
            const data = Array.isArray(schedule?.[key]) ? schedule[key] : [];
            scheduleState.cache[offset] = data;
            return data;
        }

        function scheduleItemDate(item, offset) {
            const raw = item?.airing || item?.nextEpisodeAt || item?.airDate || item?.releaseDate || item?.releasedAt || item?.dateTime || item?.datetime;
            if (raw) {
                const normalized = String(raw).replace(' ', 'T');
                const d = new Date(normalized);
                if (!Number.isNaN(d.getTime())) return d;
            }
            const time = item?.time || item?.airTime || item?.broadcast?.time || item?.anime?.broadcast?.time;
            if (time && /^\d{1,2}:\d{2}/.test(String(time))) {
                const base = scheduleDateForOffset(offset);
                const [h, m] = String(time).split(':').map(Number);
                base.setHours(h, m, 0, 0);
                return base;
            }
            return null;
        }

        function scheduleCard(item, offset) {
            const a = item?.anime || {};
            const names = a.details?.names || {};
            const posterUid = a.media?.posterUid || '';
            const poster = posterUid ? `https://images.mikai.me/poster/small/${posterUid}.webp` : '';
            const title = names.name || names.nameNative || names.nameEnglish || 'Без назви';
            const titleEn = names.nameEnglish || names.nameNative || '';
            const date = scheduleItemDate(item, offset);
            const dateText = date ? new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date) : 'Час невідомий';
            const countdown = date && date.getTime() > Date.now() ? `<span class="schedule-countdown" data-time="${date.toISOString()}">${countdownText(date)}</span>` : '';
            return `<article class="schedule-item schedule-week-item" data-title="${escapeHtml(title)}" data-title-en="${escapeHtml(titleEn)}" data-slug="${escapeHtml(a.slug || '')}">
                <div class="schedule-item__poster"><img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.style.opacity=0"></div>
                <div class="schedule-item__info"><div class="schedule-item__title">${escapeHtml(title)}</div><div class="schedule-item__ep">${item?.episode ? `Епізод ${escapeHtml(item.episode)}` : 'Наступний епізод'} · ${escapeHtml(dateText)}</div>${countdown}</div><i class="fas fa-chevron-right schedule-item__arrow"></i>
            </article>`;
        }

        async function loadScheduleWeek() {
            const content = document.getElementById('scheduleWeekContent');
            if (!content || scheduleState.weekLoading) return;
            scheduleState.weekLoading = true;
            content.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження розкладу…</div>';
            try {
                const results = await Promise.allSettled(Array.from({ length: 7 }, (_, i) => fetchScheduleByOffset(i)));
                const sections = results.map((result, offset) => {
                    const list = result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [];
                    if (!list.length) return '';
                    const d = scheduleDateForOffset(offset);
                    const day = new Intl.DateTimeFormat('uk-UA', { weekday: 'long' }).format(d);
                    return `<section class="schedule-week-day${offset === 0 ? ' is-today' : ''}"><div class="schedule-week-day__title"><strong>${day}</strong><span>${offset === 0 ? 'Сьогодні' : formatScheduleDisplayDate(d)}</span></div><div class="schedule-week-list">${list.map(item => scheduleCard(item, offset)).join('')}</div></section>`;
                }).join('');
                content.innerHTML = sections || '<div class="loader">На найближчі дні розкладу немає</div>';
                content.querySelectorAll('.schedule-week-item').forEach(el => el.addEventListener('click', () => openScheduleItemInPlayer(el.dataset.title, el)));
                if (scheduleState.weekTimer) clearInterval(scheduleState.weekTimer);
                scheduleState.weekTimer = setInterval(() => content.querySelectorAll('.schedule-countdown').forEach(el => { const d = new Date(el.dataset.time); el.textContent = countdownText(d); }), 60000);
            } catch (e) {
                console.error('Помилка завантаження розкладу Mikai:', e);
                const details = e?.message ? ` (${escapeHtml(e.message)})` : '';
                content.innerHTML = `<div class="loader">Не вдалося завантажити розклад${details}. <button class="btn-outline" type="button" onclick="loadScheduleWeek()">Повторити</button></div>`;
            }
            finally { scheduleState.weekLoading = false; }
        }
        window.loadScheduleWeek = loadScheduleWeek;

        export function renderSchedulePage() {
            const container = document.getElementById('schedulePageContainer');
            if (!container) return;
            container.innerHTML = `
                <div class="genre-page-header"><h2>Розклад виходу</h2></div>
                <p class="schedule-page-hint">Актуальний розклад онґоїнг-аніме, згрупований за днями. Час показується лише коли його повертає джерело.</p>
                <div id="scheduleWeekContent" class="schedule-week-content"></div>
            `;
            loadScheduleWeek();
        }

        async function loadScheduleDayContent(offset) {
            const content = document.getElementById('scheduleDayContent');
            if (!content) return;
            scheduleState.loadingOffset = offset;
            content.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>';
            try {
                const list = await fetchScheduleByOffset(offset);
                if (scheduleState.loadingOffset !== offset) return; // користувач вже перемкнув вкладку
                if (!list.length) {
                    content.innerHTML = '<div class="loader">На цей день розкладу немає</div>';
                    return;
                }
                content.innerHTML = list.map(item => {
                    const a = item.anime || {};
                    const poster = a.image?.preview ? `https://animeon.club/api/uploads/images/${a.image.preview}` : '';
                    const title = a.titleUa || a.titleEn || 'Без назви';
                    return `
                    <div class="schedule-item" data-title="${title.replace(/"/g, '&quot;')}" data-title-en="${(a.titleEn || '').replace(/"/g, '&quot;')}" data-slug="${(a.slug || '').replace(/"/g, '&quot;')}">
                        <div class="schedule-item__poster">
                            <img src="${poster}" alt="${title}" loading="lazy" onerror="this.style.opacity=0">
                        </div>
                        <div class="schedule-item__info">
                            <div class="schedule-item__title">${title}</div>
                            <div class="schedule-item__ep">${item.episode ? item.episode + ' серія' : ''}</div>
                        </div>
                        <i class="fas fa-chevron-right schedule-item__arrow"></i>
                    </div>`;
                }).join('');
                content.querySelectorAll('.schedule-item').forEach(el => {
                    el.addEventListener('click', () => {
                        openScheduleItemInPlayer(el.dataset.title, el);
                    });
                });
            } catch (err) {
                content.innerHTML = `<div class="loader"><i class="fas fa-exclamation-triangle"></i> Помилка завантаження: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadScheduleDayContent(${offset})">Спробувати знову</button></div>`;
            }
        }
        window.loadScheduleDayContent = loadScheduleDayContent;

        // ====================================================================
        //  ПЛЕЄР
        // ====================================================================
        export let playerPageAnime = null;
        let playerPageTmdbInfo = null;
        let playerPageTmdbEpisodeMap = {};
        let playerPagePlayer = null;
        let _playerLoadController = null; // AbortController для поточного завантаження плеєра
        export let playerPageCurrentSeason = '1';
        export let playerPageCurrentDub = '';
        let playerPageCurrentQuality = '720p';
        let playerPageActiveEpisodeFile = null;
        let playerPagePlaybackRequest = 0;
        let playerPageCurrentAnimeUrl = null;
        export let playerPageCurrentSource = 'Основне';
        export const setPlayerPageAnimeuaSeasons = value => { playerPageAnimeuaSeasons = value; };
        export const setPlayerPageAnime = value => { playerPageAnime = value; };
        export const setPlayerPageCurrentSeason = value => { playerPageCurrentSeason = value; };
        export const setPlayerPageCurrentDub = value => { playerPageCurrentDub = value; };
        export const setPlayerPageCurrentSource = value => { playerPageCurrentSource = value; };
        let playerPageCurrentView = 'grid';
        let playerPageEpisodes = [];
        let playerPageSources = ['Основне'];
        let playerPageCurrentEpisodeNum = '1';
        let playerPageHistoryUpdated = false;
        let playerPageWatchStartTime = 0;
        let playerPageAccumulatedWatchSeconds = 0;
        let playerPageLastVideoTime = null;
        let playerPageIsPlaying = false;
        let playerPageIsOpen = false;
        let playerPagePreviousBodyOverflow = '';
        let playerPagePreviousActiveElement = null;
        let playerRatingSourceIsTmdb = false; // TMDB рейтинг має пріоритет над локальним рейтингом глядачів
        let playerJikanData = null;
        let playerCharacterItems = [];
        let playerCharacterExpanded = false;
        let playerRelatedItems = [];
        let playerMediaItems = [];
        let playerMediaExpanded = false;
        let playerCountdownTimer = null;

        const QUALITY_OPTIONS = ['Максимальна', '2160p (4K)', '1440p', '1080p', '720p', '480p', '360p'];

        function renderPlayerEpisodeError(message, diagnostics, retryUrl) {
            const grid = document.getElementById('episodeViewGrid');
            if (!grid) return;
            const device = diagnostics?.device?.type || detectDeviceInfo(navigator.userAgent).type;
            const stage = diagnostics?.failedStage || 'завантаження даних плеєра';
            const detail = diagnostics?.emptyObject ? `Не знайдено: ${diagnostics.emptyObject}.` : `Етап: ${stage}.`;
            grid.innerHTML = `<div class="episode-empty player-error-state">
                <i class="fas fa-triangle-exclamation"></i>
                <strong>${escapeHtml(message)}</strong>
                <span>${escapeHtml(detail)} Пристрій: ${escapeHtml(device)}.</span>
                <button class="btn-outline player-retry-btn" type="button"><i class="fas fa-redo"></i> Спробувати ще раз</button>
            </div>`;
            const retry = grid.querySelector('.player-retry-btn');
            retry?.addEventListener('click', () => {
                retry.disabled = true;
                retry.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Повторюємо...';
                openPlayerPage(retryUrl || playerPageCurrentAnimeUrl);
            });
        }

        export async function openPlayerPage(url, options = {}) {
            loadFeature('player').catch(error => console.warn('[VakDab] player feature preload:', error));
            const modal = document.getElementById('playerPageModal');
            if (!modal) return;
            if (!playerPageIsOpen) {
                playerPagePreviousBodyOverflow = document.body.style.overflow || '';
                playerPagePreviousActiveElement = document.activeElement;
            }
            playerPageIsOpen = true;
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            modal.setAttribute('aria-busy', 'true');
            document.documentElement.classList.add('player-page-open');
            document.body.classList.add('player-page-open');
            document.getElementById('bottomNav')?.classList.add('hidden-nav');
            // Скасувати попереднє завантаження якщо є
            if (_playerLoadController) {
                _playerLoadController.abort();
                _playerLoadController = null;
            }
            _playerLoadController = new AbortController();
            const _thisSignal = _playerLoadController.signal;

            if (playerPagePlayer) { playerPagePlayer.destroy();
                playerPagePlayer = null; }
            playerPageAnime = null;
            playerPageTmdbInfo = null;
            playerPageTmdbEpisodeMap = {};
            playerPageActiveEpisodeFile = null;
            playerPageCurrentEpisodeNum = '1';
            playerPagePlaybackRequest += 1;
            playerJikanData = null;
            playerCharacterItems = [];
            playerCharacterExpanded = false;
            playerRelatedItems = [];
            playerMediaItems = [];
            playerMediaExpanded = false;
            if (playerCountdownTimer) { clearInterval(playerCountdownTimer); playerCountdownTimer = null; }
            const infoGridReset = document.getElementById('animeInfoGrid');
            if (infoGridReset) infoGridReset.innerHTML = '<div class="anime-info-placeholder">Завантаження інформації…</div>';
            const countdownReset = document.getElementById('animeCountdown');
            if (countdownReset) countdownReset.textContent = '';
            setSectionState('relatedSection', false);
            setSectionState('mediaSection', false);
            setSectionState('mainCharactersSection', false);
            const mainCharactersMoreReset = document.getElementById('mainCharactersMoreBtn');
            if (mainCharactersMoreReset) mainCharactersMoreReset.hidden = true;
            playerPageCurrentAnimeUrl = url;
            playerPageHistoryUpdated = false;
            playerPageWatchStartTime = 0;
            playerPageAccumulatedWatchSeconds = 0;
            playerPageLastVideoTime = null;
            playerPageIsPlaying = false;
            document.getElementById('playerVideoContainer').classList.add('active');
            const posterTargets = [document.getElementById('playerPosterImg'), document.getElementById('playerHeroPoster')];
            posterTargets.forEach(img => { if (img) { img.src = CATALOG_POSTER_FALLBACK; img.alt = ''; } });
            document.getElementById('playerBlurBg').style.backgroundImage = `url(${CATALOG_POSTER_FALLBACK})`;
            document.getElementById('playerPageVideo').innerHTML = '';
            document.getElementById('episodeViewGrid').innerHTML = '';
            document.getElementById('episodeViewCompact').innerHTML = '';
            document.getElementById('episodeViewClassic').innerHTML = '';
            document.getElementById('episodePanel').classList.remove('visible');
            document.getElementById('page-episodes').classList.remove('active');
            document.getElementById('page-info').classList.add('active');
            document.getElementById('playerSynopsis').textContent = '';
            document.getElementById('synopsisMoreBtn').style.display = 'none';
            document.getElementById('playerTopbarTitle').textContent = '';
            document.getElementById('playerVideoEpisodeOverlay')?.replaceChildren();
            document.getElementById('playerVideoSeasonOverlay')?.replaceChildren();
            document.getElementById('playerKicker').style.display = '';
            const _resetLogoImg = document.getElementById('playerTitleLogo');
            if (_resetLogoImg) { _resetLogoImg.style.display = 'none'; _resetLogoImg.src = ''; }
            document.getElementById('castSection').style.display = 'none';
            document.getElementById('castList').innerHTML = '';
            const resetCastTitle = document.querySelector('#castSection .section-title');
            if (resetCastTitle) resetCastTitle.textContent = 'Актори';
            document.getElementById('mainCharactersList').innerHTML = '';
            document.getElementById('mainCharactersMoreBtn').hidden = true;
            const _resetRelatedSection = document.getElementById('relatedSeasonsSection');
            if (_resetRelatedSection) _resetRelatedSection.style.display = 'none';
            playerRatingSourceIsTmdb = false;
            updateLikeButton();
            updateDislikeButton();
            updateBookmarkButton(url);
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            modal.querySelector('.modal-content').scrollTop = 0;
            modal.focus({ preventScroll: true });
            try {
                const anime = await loadHikkaDetail(url);
                // Якщо плеєр вже закрили поки завантажувалось — не оновлювати DOM
                if (_thisSignal.aborted || modal.style.display === 'none') return;
                playerPageAnime = anime;
                playerPageAnimeuaSeasons = {};
                externalSourceCache = {};
                playerPageSources = anime.mikaiUrl ? ['Mikai / ASHDI'] : anime.animeOnUrl ? ['AnimeON / ASHDI'] : ['Основне'];
                playerPageCurrentSource = playerPageSources[0];
                const posterUrl = normalizePosterUrl(anime.images?.jpg?.large_image_url);
                document.getElementById('playerPosterImg').src = posterUrl;
                const heroPoster = document.getElementById('playerHeroPoster');
                if (heroPoster) { heroPoster.src = posterUrl; heroPoster.alt = anime.title || ''; }
                document.getElementById('playerPosterTitle').textContent = anime.title;
                document.getElementById('playerKicker').textContent = anime.originalTitle || anime.title;
                document.getElementById('playerTopbarTitle').textContent = anime.title;
                document.getElementById('playerBlurBg').style.backgroundImage = `url(${posterUrl})`;
                const totalEpisodes = Object.values(anime.seasons || {}).reduce((sum, s) => sum + Object.values(s).reduce((s2,
                    e) => Math.max(s2, e.length), 0), 0);
                document.getElementById('playerAgeBadge').textContent = anime.score || '—';
                const isMovie = playerAnimeIsMovie(anime);
                document.getElementById('playerStatusTag').textContent = isMovie ? 'Фільм' : (totalEpisodes > 0 ? 'Онгоїнг' : 'Завершено');
                const animeRuntime = formatMovieRuntime(anime.runtimeMinutes);
                document.getElementById('playerMetaLine').textContent = isMovie
                    ? `${anime.year || '—'}, Фільм${animeRuntime ? ` · ${animeRuntime}` : ''}`
                    : `${anime.year || '—'}, ${totalEpisodes} еп.`;
                document.getElementById('playerTagRow').innerHTML =
                    normalizeGenreList(anime.genres).slice(0, 4).map(g => `<span class="tag">${escapeHtml(g)}</span>`).join('');
                document.getElementById('playerEpisodeCountNum').textContent = totalEpisodes;
                const synopsisEl = document.getElementById('playerSynopsis');
                synopsisEl.textContent = anime.synopsis || 'Опис відсутній.';
                const moreBtn = document.getElementById('synopsisMoreBtn');
                setTimeout(() => {
                    if (synopsisEl.scrollHeight > synopsisEl.clientHeight + 2) {
                        moreBtn.style.display = 'block';
                    }
                }, 100);
                moreBtn.onclick = () => {
                    synopsisEl.classList.toggle('expanded');
                    moreBtn.textContent = synopsisEl.classList.contains('expanded') ? 'менше' : 'більше';
                };
                updateSourceChip();
                loadAnimeRatingAggregate(url);
                const seasons = Object.keys(anime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
                playerPageCurrentSeason = seasons[0] || '1';
                playerPageCurrentDub = pickPreferredDub(anime.seasons[playerPageCurrentSeason]);
                playerPageCurrentEpisodeNum = '1';
                playerPageCurrentQuality = '720p';
                buildSeasonRow(seasons);
                buildEpisodeViews();
                updateFilterChip();
                updatePlayFabLabel();
                document.getElementById('episodePanel').classList.add('visible');
                if (seasons.length === 0 || Object.keys(anime.seasons || {}).length === 0) {
                    renderPlayerEpisodeError('Аніме поки що не вийшло в українській озвучці.', anime._diagnostics, anime.url);
                    console.warn('No episodes found for anime:', anime.url, anime._diagnostics);
                }
                buildBottomSheetData();
                modal.setAttribute('aria-busy', 'false');
                if (window.lucide) lucide.createIcons();

                // ============================================================
                //  TMDB — заміна метаданих на офіційні (жанр/рік/опис/постер/
                //  актори/лого/віковий рейтинг). Відео залишається з Hikka/Mikai.
                // ============================================================
                (async () => {
                    try {
                        const tmdbInfo = await fetchTmdbForAnime(anime);
                        if (_thisSignal.aborted || playerPageCurrentAnimeUrl !== url) return;
                        if (!tmdbInfo) { await loadAndRenderJikanExtras(anime, null, null); return; }
                        playerPageTmdbInfo = tmdbInfo;
                        const currentSeasonNum = String(playerPageCurrentSeason || '1');
                        const currentSeasonPoster = await fetchTmdbSeasonPoster(tmdbInfo, currentSeasonNum);
                        if (_thisSignal.aborted || playerPageCurrentAnimeUrl !== url) return;
                        const details = await fetchTmdbFullDetails(tmdbInfo);
                        if (_thisSignal.aborted || playerPageCurrentAnimeUrl !== url) return;
                        if (!details) { await loadAndRenderJikanExtras(anime, tmdbInfo, null); return; }

                        // Artwork always remains from Hikka. TMDB is metadata-only.
                        const isMovie = tmdbInfo.mediaType === 'movie' || playerAnimeIsMovie(anime);
                        const hikkaPoster = posterUrl || ANIME_CARD_PLACEHOLDER;
                        const tmdbPoster = normalizePosterUrl(tmdbImgUrl(currentSeasonPoster || details.poster_path, 'w780'), hikkaPoster);
                        // Hikka є джерелом істини для назви, сезону, року, статусу, жанрів і серій.
                        // TMDB використовується лише для постера, логотипа та рейтингу.
                        const title = anime.title || details.name || details.original_name || 'Без назви';
                        const originalTitle = anime.originalTitle || details.original_name || title;
                        const year = anime.year || (details.release_date || details.first_air_date || '').slice(0, 4) || '—';
                        const numEpisodes = totalEpisodes || anime.totalEpisodes || 0;
                        const runtime = formatMovieRuntime(anime.runtimeMinutes) || formatMovieRuntime(details.runtime);
                        const hikkaStatus = statusLabelUa(anime.status);
                        const statusLabel = isMovie ? 'Фільм' : (hikkaStatus || (numEpisodes > 0 ? 'Онгоїнг' : 'Завершено'));
                        const overview = anime.synopsis || details.overview || '';
                        const ageRating = tmdbAgeRating(details);
                        const logoUrl = tmdbBestLogo(details);

                        // Постери плеєра — з TMDB, fallback залишається Hikka.
                        document.getElementById('playerPosterImg').src = tmdbPoster;
                        const heroPoster = document.getElementById('playerHeroPoster');
                        if (heroPoster) { heroPoster.src = tmdbPoster; heroPoster.alt = title || ''; }
                        const tmdbBackdrop = tmdbBestBackdrop(details);
                        document.getElementById('playerBlurBg').style.backgroundImage = `url(${tmdbBackdrop || tmdbPoster})`;
                        document.getElementById('playerPosterTitle').textContent = title;
                        document.getElementById('playerKicker').textContent = originalTitle;
                        document.getElementById('playerTopbarTitle').textContent = title;
                        document.getElementById('playerAgeBadge').textContent = ageRating || anime.score || '—';
                        document.getElementById('playerStatusTag').textContent = statusLabel;
                        document.getElementById('playerMetaLine').textContent = isMovie ? `${year}, Фільм${runtime ? ` · ${runtime}` : ''}` : `${year}, ${numEpisodes} еп.`;
                        // Не перезаписуємо жанри Hikka навіть коли TMDB повернув свої жанри.
                        document.getElementById('playerEpisodeCountNum').textContent = numEpisodes;
                        // Description comes from Hikka. TMDB is not allowed to replace it.
                        if (!String(anime.synopsis || '').trim() && overview) {
                            synopsisEl.textContent = overview;
                            moreBtn.style.display = 'none';
                            setTimeout(() => {
                                if (synopsisEl.scrollHeight > synopsisEl.clientHeight + 2) moreBtn.style.display = 'block';
                            }, 100);
                        }
                        if (details.vote_average) {
                            playerRatingSourceIsTmdb = true;
                            document.getElementById('playerRatingNum').textContent = details.vote_average.toFixed(1);
                            document.getElementById('playerRatingLabel').textContent = 'TMDB';
                        }
                        const logoImg = document.getElementById('playerTitleLogo');
                        const kickerEl = document.getElementById('playerKicker');
                        if (logoUrl && logoImg) {
                            logoImg.onerror = () => { logoImg.style.display = 'none'; if (kickerEl) kickerEl.style.display = ''; };
                            logoImg.onload = () => { logoImg.style.display = 'block'; if (kickerEl) kickerEl.style.display = 'none'; };
                            logoImg.src = logoUrl;
                        }
                        renderCast(details);
                        loadAndRenderJikanExtras(anime, tmdbInfo, details);
                    } catch (e) {
                        console.warn('TMDB metadata enrich failed', e);
                    }
                })();
            } catch (err) {
                // Якщо запит скасовано (юзер закрив плеєр або відкрив інше) — мовчки ігноруємо
                if (_thisSignal.aborted || modal.style.display === 'none') return;
                if (_thisSignal.aborted || (err && (err.name === 'AbortError' || err._playerAborted || (err.message && (err.message.includes('aborted') || err.message.includes('Fetch is aborted')))))) return;

                const isNotFound = err.message && (err.message.includes('не знайдено') || err.message.includes('404'));
                const isTimeout = err.message && err.message.includes('очікування');
                const isNetwork = err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('502') || err.message.includes('503') || err.message.includes('aborted') || err.message.includes('Fetch is aborted'));

                let userMsg, icon;
                if (isNotFound) {
                    icon = 'fa-search';
                    userMsg = 'Аніме не знайдено на джерелі';
                    document.getElementById('playerSynopsis').textContent = 'Це аніме поки що недоступне.';
                } else if (isTimeout) {
                    icon = 'fa-clock';
                    userMsg = 'Час очікування вичерпано. Перевірте з\'єднання і спробуйте ще раз.';
                    document.getElementById('playerSynopsis').textContent = userMsg;
                } else if (isNetwork) {
                    icon = 'fa-wifi';
                    userMsg = 'Помилка мережі або сервер не відповідає. Спробуйте пізніше.';
                    document.getElementById('playerSynopsis').textContent = userMsg;
                } else {
                    icon = 'fa-exclamation-circle';
                    userMsg = 'Помилка завантаження. Спробуйте пізніше.';
                    document.getElementById('playerSynopsis').textContent = userMsg;
                }
                modal.setAttribute('aria-busy', 'false');

                const diagForErr = err._diagnostics || {
                    url, ua: navigator.userAgent, device: detectDeviceInfo(navigator.userAgent),
                    httpStatus: null, contentType: null, cfCacheStatus: null, cfRay: null, usedCloudflareWorker: true, corsError: isNetwork,
                    htmlLoaded: false, htmlSize: 0, iframeCount: 0, iframeUrls: [], foundAshdi: false, foundVidmoly: false, foundPlayerjs: false,
                    foundDataSrc: false, foundDataFile: false, foundVideoTag: false, foundSourceTag: false, playerUrlsCount: 0, seasonsCount: 0,
                    episodesCount: 0, extractPlayerIframeUrlsRan: false, extractSourcesFromTextRan: false, foundM3u8: false, foundMp4: false,
                    foundPlayerjsJson: false, foundBase64Playerjs: false, jsErrors: [err.stack || err.message || String(err)],
                    failedStage: 'openPlayerPage() — необроблена помилка завантаження', emptyObject: null
                };

                if (options.fromDeepLink) {
                    closePlayerPage();
                    Router.goTo('main');
                    setTimeout(() => showToast('Аніме не знайдено'), 0);
                    return;
                }
                renderPlayerEpisodeError(userMsg, diagForErr, url);
                document.getElementById('episodePanel').classList.add('visible');
                console.error('Player load error:', err.message || err, diagForErr);
            }
        }

        // Будуємо силку на НАШ сайт (не на джерело hikka.io / mikai.me) — при відкритті вона
        // сама відкриє потрібне аніме в плеєрі, див. обробку #anime? при завантаженні сторінки.
        function buildShareUrl(animeUrl) {
            // Посилання працює на Firebase Hosting без окремого /share endpoint.
            // URLSearchParams при відкритті hash уже декодує значення один раз.
            const base = new URL('./', window.location.href);
            base.hash = `anime?url=${encodeURIComponent(animeUrl || '')}`;
            return base.href;
        }

        function shareAnime() {
            const anime = playerPageAnime;
            const url = buildShareUrl(playerPageCurrentAnimeUrl) || window.location.href;
            const title = anime?.title || 'VAKDAB';
            if (navigator.share) {
                navigator.share({ title, text: `Дивись «${title}» у VAKDAB ✨`, url }).catch(() => {});
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(() => showToast('Посилання скопійовано'))
                    .catch(() => showToast('Не вдалося скопіювати посилання'));
            } else {
                showToast('Поділитися не підтримується на цьому пристрої');
            }
        }

        function findContinueWatching(anime) {
            if (!anime || !anime.seasons) return null;
            const history = Storage.getHistory();
            const entry = history.find(h => h.url === anime.url);
            if (!entry) return null;
            const season = entry.season || '1';
            const dubs = Object.keys(anime.seasons[season] || {});
            for (const dub of dubs) {
                const eps = anime.seasons[season][dub] || [];
                const ep = eps.find(e => e.episode === entry.episode);
                if (ep) return { season, dub, ep, progress: entry.progress || 0 };
            }
            return null;
        }

        function updatePlayFabLabel() {
            const label = document.getElementById('playerPlayFabLabel');
            if (!label || !playerPageAnime) return;
            const cw = findContinueWatching(playerPageAnime);
            label.textContent = (cw && cw.progress < 95) ? 'Продовжити' : 'Дивитись';
        }

        function playFeaturedEpisode() {
            if (!playerPageAnime) { showToast('Аніме ще завантажується'); return; }
            const cw = findContinueWatching(playerPageAnime);
            if (cw && cw.progress < 95) {
                if (cw.season !== playerPageCurrentSeason || cw.dub !== playerPageCurrentDub) {
                    playerPageCurrentSeason = cw.season;
                    playerPageCurrentDub = cw.dub;
                    buildEpisodeViews();
                    updateFilterChip();
                    const row = document.getElementById('episodeSeasonRow');
                    if (row) {
                        row.querySelectorAll('.season-num').forEach(b => b.classList.toggle('active', b.dataset.season === cw.season));
                    }
                }
                playEpisode(cw.ep.file, cw.ep.episode);
                return;
            }
            const episodes = getCurrentEpisodes();
            if (!episodes.length) { showToast('Немає доступних серій'); return; }
            playEpisode(episodes[0].file, episodes[0].episode);
        }

        export function updateSourceChip() {
            const label = document.getElementById('playerSourceLabel');
            if (label) label.textContent = playerPageCurrentSource || 'Джерело';
            const watchSourceValue = document.getElementById('watchSourceValue');
            if (watchSourceValue) watchSourceValue.textContent = `${playerPageCurrentSource || 'Джерело'} · ${playerPageCurrentQuality || ''}`;
        }

        function renderDubLogo(dubName) {
            const logoUrl = playerPageAnime?.dubLogos?.[dubName] ||
                playerPageAnime?.seasons?.[playerPageCurrentSeason]?.[dubName]?.find(ep => ep?.teamLogo)?.teamLogo || '';
            const fallback = escapeHtml(String(dubName || 'Оз').trim().slice(0, 2).toUpperCase());
            if (!logoUrl) return `<span class="dub-logo dub-logo-fallback" aria-hidden="true">${fallback}</span>`;
            return `<span class="dub-logo" aria-hidden="true"><img src="${escapeHtml(logoUrl)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'"><span class="dub-logo-fallback" style="display:none">${fallback}</span></span>`;
        }

        export function updateFilterChip() {
            const chip = document.getElementById('playerFilterChip');
            if (chip) chip.textContent = `Сезон ${playerPageCurrentSeason} · ${playerPageCurrentDub}`;
            const watchFilterValue = document.getElementById('watchFilterValue');
            if (watchFilterValue) watchFilterValue.textContent = `Сезон ${playerPageCurrentSeason} · ${playerPageCurrentDub}`;
            const dubs = Object.keys(playerPageAnime?.seasons?.[playerPageCurrentSeason] || {}).sort();
            let formatHtml = dubs.map(d => {
                const active = d === playerPageCurrentDub ? ' active-format' : '';
                return `<span class="format-pill${active}" data-dub="${escapeHtml(d)}" aria-label="${escapeHtml(d)}" style="cursor:pointer;">${renderDubLogo(d)}<span class="dub-label">${escapeHtml(String(d).toUpperCase())}</span></span>`;
            }).join('');
            [document.getElementById('playerDubControls')].forEach(formatRow => {
                if (!formatRow) return;
                formatRow.innerHTML = formatHtml;
                formatRow.querySelectorAll('.format-pill[data-dub]').forEach(pill => {
                    pill.addEventListener('click', () => selectDubFromSheet(pill.dataset.dub));
                });
            });
            renderSeasonTabs();
        }

        function renderSeasonTabs() {
            const sectionTitle = document.getElementById('episodeSectionTitle');
            if (!sectionTitle) return;
            const seasons = Object.keys(playerPageAnime?.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
            if (seasons.length <= 1) {
                sectionTitle.textContent = `Сезон ${playerPageCurrentSeason || 1}`;
                sectionTitle.classList.add('single');
                return;
            }
            sectionTitle.classList.remove('single');
            sectionTitle.innerHTML = seasons.map(s => {
                const active = s === playerPageCurrentSeason ? ' active-season-tab' : '';
                return `<span class="season-tab${active}" data-season="${s}">Сезон ${s}</span>`;
            }).join('');
            sectionTitle.querySelectorAll('.season-tab').forEach(tab => {
                tab.addEventListener('click', () => selectSeasonFromSheet(tab.dataset.season));
            });
        }

        // ====================================================================
        //  СТОРІНКА "ДИВИТИСЯ" — окрема від інформації про аніме
        // ====================================================================
        function openWatchPage() {
            if (!playerPageAnime) { showToast('Аніме ще завантажується'); return; }
            // Episodes now live below the anime information on the same page.
            document.getElementById('page-info')?.classList.add('active');
            const episodesSection = document.querySelector('#playerPageModal #playerVideoContainer');
            if (episodesSection) episodesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const cw = findContinueWatching(playerPageAnime);
            if (cw && cw.progress < 95 && (cw.season !== playerPageCurrentSeason || cw.dub !== playerPageCurrentDub)) {
                playerPageCurrentSeason = cw.season;
                playerPageCurrentDub = cw.dub;
                buildEpisodeViews();
                updateFilterChip();
            }
        }

        function closeWatchPage() {
            // Вбудований плеєр живе на одному screen; при закритті лише очищаємо відео.
            document.getElementById('page-info')?.classList.add('active');
            if (playerPagePlayer) {
                if (playerPagePlayer._timeUpdateListener && playerPagePlayer.videoRef) {
                    playerPagePlayer.videoRef.removeEventListener('timeupdate', playerPagePlayer._timeUpdateListener);
                }
                playerPagePlayer.destroy();
                playerPagePlayer = null;
            }
            document.getElementById('playerVideoContainer').classList.remove('active');
            document.getElementById('playerPageVideo').innerHTML = '';
        }

        export function buildSeasonRow(seasons) {
            const row = document.getElementById('episodeSeasonRow');
            if (!row) return;
            let html = `<span>Сезон</span>`;
            seasons.forEach(s => {
                const active = s === playerPageCurrentSeason ? ' active' : '';
                html += `<div class="season-num${active}" data-season="${s}">${s}</div>`;
            });
            row.innerHTML = html;
            row.querySelectorAll('.season-num').forEach(btn => {
                btn.addEventListener('click', () => {
                    const season = btn.dataset.season;
                    if (season === playerPageCurrentSeason) return;
                    playerPageCurrentSeason = season;
                    const dubs = Object.keys((playerPageAnime.seasons[season]) || {}).sort();
                    playerPageCurrentDub = dubs[0] || '';
                    row.querySelectorAll('.season-num').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    buildEpisodeViews();
                    refreshPlayerSeasonPoster(season);
                    updateFilterChip();
                    updatePlayFabLabel();
                    buildBottomSheetData();
                });
            });
        }

        function getCurrentEpisodes() {
            if (!playerPageAnime) return [];
            const eps = playerPageAnime.seasons?.[playerPageCurrentSeason]?.[playerPageCurrentDub] || [];
            return eps;
        }

        function getEpisodeProgress(episode) {
            const history = Storage.getHistory();
            const animeUrl = playerPageCurrentAnimeUrl;
            const found = history.find(h => h.url === animeUrl && h.episode === episode);
            return found ? Math.min(found.progress || 0, 100) : 0;
        }

        // ====================================================================
        //  TMDB — метадані та постери (постачальник картинок/оцінок), відео
        //  завжди залишається з hikka.io / mikai.me — TMDB тут лише для оформлення.
        // ====================================================================
        const TMDB_API_KEY = '38fef08bc6a49bdd5a69c336d34a7954';
        const TMDB_BASE = 'https://api.themoviedb.org/3';
        const TMDB_IMG = 'https://image.tmdb.org/t/p';
        let tmdbAnimeCache = {};

        function cleanTitleForTmdb(title) {
            return String(title || '')
                .replace(/\[[^\]]*\]/g, '')
                .replace(/[«»"'`]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function tmdbQueryVariants(anime) {
            const values = [anime?.originalTitle, anime?.title];
            try {
                const slug = decodeURIComponent(new URL(anime?.url || '').pathname.split('/').pop() || '')
                    .replace(/\.(html?|php)$/i, '').replace(/^\d+[-_]+/, '').replace(/[-_]+/g, ' ');
                values.push(slug);
            } catch { /* URL may be absent on external items */ }
            const variants = [];
            values.filter(Boolean).forEach(value => {
                const clean = cleanTitleForTmdb(value);
                if (!clean) return;
                variants.push(clean);
                variants.push(clean
                    .replace(/\b(?:сезон|season|частина|part|cour|tv|серіал)\s*\d+\b/gi, '')
                    .replace(/\b\d+\s*(?:сезон|season|частина|part|cour)\b/gi, '')
                    .replace(/\s+/g, ' ').trim());
                variants.push(clean.split(/\s+[/:|]\s+/)[0].trim());
            });
            return [...new Set(variants.filter(v => v.length >= 2))].slice(0, 6);
        }

        function tmdbImgUrl(path, size) {
            return path ? `${TMDB_IMG}/${size || 'w342'}${path}` : null;
        }

        function tmdbNormalizeTitle(value) {
            return cleanTitleForTmdb(value).toLowerCase()
                .replace(/[^a-zа-яіїєґ0-9\s]/gi, ' ')
                .replace(/\b(season|сезон|part|частина|tv|серіал|anime)\b/gi, ' ')
                .replace(/\s+/g, ' ').trim();
        }

        function tmdbCardType(hit) {
            if (!hit) return null;
            if (hit.media_type === 'movie') return 'Фільм';
            const isAnimation = (hit.genre_ids || []).includes(16);
            const isJapanese = ['ja', 'ko'].includes((hit.original_language || '').toLowerCase()) ||
                (hit.origin_country || []).some(c => ['JP', 'KR'].includes(c));
            return isAnimation && isJapanese ? 'Аніме' : 'Серіал';
        }

        function tmdbIsLikelyAnime(hit) {
            if (!hit || !(hit.genre_ids || []).includes(16)) return false;
            const language = (hit.original_language || '').toLowerCase();
            const countries = hit.origin_country || [];
            return ['ja', 'ko', 'zh'].includes(language) || countries.some(c => ['JP', 'KR', 'CN'].includes(c));
        }

        function tmdbCandidateScore(hit, query, anime = null) {
            const q = tmdbNormalizeTitle(query);
            const candidateNames = [hit?.title, hit?.name, hit?.original_name].filter(Boolean).map(tmdbNormalizeTitle);
            const originalQuery = tmdbNormalizeTitle(anime?.originalTitle || '');
            const title = tmdbNormalizeTitle(hit.title || hit.name || hit.original_name || '');
            if (!q || !title) return -1000;
            let score = 0;
            if (candidateNames.includes(originalQuery) && originalQuery) score += 35;
            if (title === q) score += 140;
            else if (title.includes(q) || q.includes(title)) score += 45;
            const qTokens = new Set(q.split(' ').filter(Boolean));
            const overlap = title.split(' ').filter(t => qTokens.has(t)).length;
            score += overlap * 10;
            if (hit.media_type === 'tv') score += 8;
            if (tmdbIsLikelyAnime(hit)) score += 35;
            if (hit.poster_path) score += 5;
            return score + Math.min(Number(hit.popularity) || 0, 20) * 0.1;
        }

        const tmdbCardFrameCache = new Map();

        async function fetchTmdbCardFrame(tmdbId, mediaType, fallbackPath) {
            const key = `${mediaType}:${tmdbId}`;
            if (tmdbCardFrameCache.has(key)) return tmdbCardFrameCache.get(key);
            let frame = fallbackPath ? tmdbImgUrl(fallbackPath, 'w780') : null;
            if (mediaType === 'tv') {
                try {
                    const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}/season/1?api_key=${TMDB_API_KEY}&language=en-US`);
                    if (res.ok) {
                        const data = await res.json();
                        const still = (data.episodes || []).find(ep => ep.still_path)?.still_path;
                        if (still) frame = tmdbImgUrl(still, 'w780');
                    }
                } catch (e) {
                    console.warn('TMDB episode frame failed', { tmdbId, error: e });
                }
            }
            tmdbCardFrameCache.set(key, frame);
            return frame;
        }

        export async function fetchTmdbCardInfo(anime) {
            if (!anime || !TMDB_API_KEY) return null;
            const cacheKey = 'card:' + (anime.url || anime.title);
            if (tmdbAnimeCache[cacheKey] !== undefined) return tmdbAnimeCache[cacheKey];
            const queries = tmdbQueryVariants(anime);
            const languages = ['uk-UA', 'en-US'];
            let candidates = [];
            for (const q of queries) {
                for (const language of languages) {
                    try {
                        const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_API_KEY}&language=${language}&query=${encodeURIComponent(q)}&include_adult=false`);
                        if (!res.ok) continue;
                        const data = await res.json();
                        candidates.push(...(data.results || []).filter(r =>
                            (r.media_type === 'tv' || r.media_type === 'movie') && r.poster_path
                        ).map(r => ({ ...r, _query: q })));
                    } catch (e) {
                        console.error('TMDB card search failed', { query: q, language, error: e });
                    }
                }
            }
            if (candidates.length) {
                const unique = [...new Map(candidates.map(r => [`${r.media_type}:${r.id}`, r])).values()];
                const preferredType = anime.type === 'movie' ? 'movie' : 'tv';
                    const matching = unique
                    .filter(item => item.media_type === preferredType && tmdbIsLikelyAnime(item))
                    .sort((a, b) => tmdbCandidateScore(b, b._query, anime) - tmdbCandidateScore(a, a._query, anime));
                const hit = matching[0];
                if (hit && tmdbCandidateScore(hit, hit._query, anime) >= 45) {
                    const frame = await fetchTmdbCardFrame(hit.id, hit.media_type, hit.backdrop_path);
                    const info = {
                        poster: tmdbImgUrl(hit.poster_path, 'w500'),
                        frame,
                        rating: hit.vote_average ? Number(hit.vote_average).toFixed(1) : null,
                        type: tmdbCardType(hit),
                        mediaType: hit.media_type,
                        tmdbId: hit.id
                    };
                    tmdbAnimeCache[cacheKey] = info;
                    return info;
                }
            }
            tmdbAnimeCache[cacheKey] = null;
            return null;
        }

        async function fetchTmdbForAnime(anime) {
            if (!anime || !TMDB_API_KEY) return null;
            const cacheKey = anime.url || anime.title;
            if (tmdbAnimeCache[cacheKey] !== undefined) return tmdbAnimeCache[cacheKey];
            const queries = tmdbQueryVariants(anime);
            const languages = ['uk-UA', 'en-US', 'ru-RU'];
            const expectedType = playerAnimeIsMovie(anime) ? 'movie' : 'tv';
            let allCandidates = [];
            for (const q of queries) {
                for (const language of languages) {
                    try {
                        const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_API_KEY}&language=${language}&query=${encodeURIComponent(q)}&include_adult=false`);
                        if (!res.ok) continue;
                        const data = await res.json();
                        allCandidates.push(...(data.results || []).filter(r =>
                            r.media_type === expectedType && r.poster_path && tmdbIsLikelyAnime(r)
                        ).map(r => ({ ...r, _query: q })));
                    } catch (e) { console.warn('TMDB search failed', { query: q, language, error: e }); }
                }
            }
            const ranked = [...allCandidates.reduce((map, candidate) => {
                const key = `${candidate.media_type}:${candidate.id}`;
                const score = tmdbCandidateScore(candidate, candidate._query, anime);
                const previous = map.get(key);
                if (!previous || score > previous._tmdbScore) map.set(key, { ...candidate, _tmdbScore: score });
                return map;
            }, new Map()).values()]
                .sort((a, b) => b._tmdbScore - a._tmdbScore);
            const best = ranked[0];
            if (best && best._tmdbScore >= 45) {
                const info = { id: best.id, mediaType: best.media_type, poster: best.poster_path, backdrop: best.backdrop_path, seasonsCache: {}, seasonPosters: {} };
                tmdbAnimeCache[cacheKey] = info;
                return info;
            }
            tmdbAnimeCache[cacheKey] = null;
            return null;
        }

        async function fetchTmdbSeasonEpisodes(tmdbInfo, seasonNum) {
            if (!tmdbInfo || !tmdbInfo.id) return null;
            if (tmdbInfo.seasonsCache[seasonNum] !== undefined) return tmdbInfo.seasonsCache[seasonNum];
            try {
                const res = await fetch(`${TMDB_BASE}/tv/${tmdbInfo.id}/season/${seasonNum}?api_key=${TMDB_API_KEY}`);
                if (!res.ok) { tmdbInfo.seasonsCache[seasonNum] = null; return null; }
                const data = await res.json();
                tmdbInfo.seasonsCache[seasonNum] = data.episodes || [];
                return tmdbInfo.seasonsCache[seasonNum];
            } catch (e) { tmdbInfo.seasonsCache[seasonNum] = null; return null; }
        }
        async function fetchTmdbSeasonPoster(tmdbInfo, seasonNum) {
            if (!tmdbInfo || tmdbInfo.mediaType !== 'tv' || !tmdbInfo.id) return null;
            tmdbInfo.seasonPosters ||= {};
            if (tmdbInfo.seasonPosters[seasonNum] !== undefined) return tmdbInfo.seasonPosters[seasonNum];
            try {
                const res = await fetch(`${TMDB_BASE}/tv/${tmdbInfo.id}/season/${seasonNum}?api_key=${TMDB_API_KEY}&language=uk-UA`);
                if (!res.ok) { tmdbInfo.seasonPosters[seasonNum] = null; return null; }
                const data = await res.json();
                const poster = data.poster_path || null;
                tmdbInfo.seasonPosters[seasonNum] = poster;
                return poster;
            } catch (e) {
                tmdbInfo.seasonPosters[seasonNum] = null;
                return null;
            }
        }
        async function refreshPlayerSeasonPoster(seasonNum) {
            const tmdbInfo = playerPageTmdbInfo;
            if (!tmdbInfo || tmdbInfo.mediaType !== 'tv') return;
            const requestedSeason = String(seasonNum || '1');
            const seasonPoster = await fetchTmdbSeasonPoster(tmdbInfo, requestedSeason);
            if (String(playerPageCurrentSeason || '1') !== requestedSeason || !playerPageIsOpen) return;
            const fallback = tmdbInfo.poster ? tmdbImgUrl(tmdbInfo.poster, 'w780') : ANIME_CARD_PLACEHOLDER;
            const poster = normalizePosterUrl(tmdbImgUrl(seasonPoster, 'w780'), fallback);
            const posterEl = document.getElementById('playerPosterImg');
            const heroPoster = document.getElementById('playerHeroPoster');
            const blur = document.getElementById('playerBlurBg');
            if (posterEl) posterEl.src = poster;
            if (heroPoster) heroPoster.src = poster;
            if (blur) blur.style.backgroundImage = `url(${poster})`;
        }

        // ====================================================================
        //  TMDB — ПОВНІ МЕТАДАНІ (жанр/рік/опис/постер/актори/лого/віковий рейтинг)
        //  Відео завжди залишається з Hikka/Mikai/uaserials — TMDB тут лише дані для UI.
        // ====================================================================
        async function fetchTmdbFullDetails(tmdbInfo) {
            if (!tmdbInfo || !tmdbInfo.id) return null;
            if (tmdbInfo.fullDetails !== undefined) return tmdbInfo.fullDetails;
            try {
                const mediaPath = tmdbInfo.mediaType === 'movie' ? 'movie' : 'tv';
                const append = tmdbInfo.mediaType === 'movie' ? 'credits,images,release_dates' : 'credits,images,content_ratings';
                const res = await fetch(`${TMDB_BASE}/${mediaPath}/${tmdbInfo.id}?api_key=${TMDB_API_KEY}&language=uk-UA&append_to_response=${append}&include_image_language=uk,en,ja,null`);
                if (!res.ok) { tmdbInfo.fullDetails = null; return null; }
                const data = await res.json();
                // Якщо опис або жанри порожні українською — донасичуємо з англійської версії
                if (!data.overview || !(data.genres || []).length) {
                    try {
                        const resEn = await fetch(`${TMDB_BASE}/${mediaPath}/${tmdbInfo.id}?api_key=${TMDB_API_KEY}&language=en-US`);
                        if (resEn.ok) {
                            const dataEn = await resEn.json();
                            if (!data.overview) data.overview = dataEn.overview || '';
                            if (!(data.genres || []).length) data.genres = dataEn.genres || [];
                        }
                    } catch (e) { /* ignore */ }
                }
                tmdbInfo.fullDetails = data;
                return data;
            } catch (e) { console.warn('TMDB full details failed', e); tmdbInfo.fullDetails = null; return null; }
        }

        function tmdbBestLogo(details) {
            const logos = (details && details.images && details.images.logos) || [];
            if (!logos.length) return null;
            const pick = logos.find(l => l.iso_639_1 === 'uk') || logos.find(l => l.iso_639_1 === 'en') ||
                logos.find(l => !l.iso_639_1) || logos[0];
            return pick ? tmdbImgUrl(pick.file_path, 'w500') : null;
        }

        function tmdbAgeRating(details) {
            const ratings = (details?.content_ratings?.results || []).map(r => ({ country: r.iso_3166_1, value: r.rating }));
            const releaseRatings = (details?.release_dates?.results || []).flatMap(country =>
                (country.release_dates || []).map(r => ({ country: country.iso_3166_1, value: r.certification }))
            ).filter(r => r.value);
            const results = [...ratings, ...releaseRatings];
            const pick = results.find(r => r.country === 'UA') || results.find(r => r.country === 'US') ||
                results.find(r => r.country === 'JP') || results[0];
            return pick?.value || null;
        }

        // Кадр (backdrop) з TMDB для фону сторінки аніме — беремо найкращий за мовою/якістю,
        // фолбек на основний backdrop_path, якщо масив images.backdrops порожній.
        function tmdbBestBackdrop(details) {
            const backdrops = (details && details.images && details.images.backdrops) || [];
            if (backdrops.length) {
                const sorted = [...backdrops].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0) || (b.width || 0) - (a.width || 0));
                const pick = sorted.find(b => !b.iso_639_1) || sorted[0];
                if (pick) return tmdbImgUrl(pick.file_path, 'w1280');
            }
            if (details && details.backdrop_path) return tmdbImgUrl(details.backdrop_path, 'w1280');
            return null;
        }

        const TMDB_STATUS_LABELS = {
            'Returning Series': 'Онгоїнг',
            'Ended': 'Завершено',
            'Canceled': 'Завершено',
            'In Production': 'Готується',
            'Planned': 'Заплановано',
            'Pilot': 'Пілот'
        };

        // ====================================================================
        //  JIKAN / MAL — персонажі, сейю, зв'язки, студія, broadcast та media.
        //  Дані завжди прив'язані до MAL ID; пошук за назвою використовується
        //  тільки коли сторінка Hikka не має зовнішнього ID.
        // ====================================================================
        const JIKAN_BASE = 'https://api.jikan.moe/v4';
        const jikanCache = new Map();
        const JIKAN_STATUS_LABELS = {
            'Currently Airing': 'Онґоїнг', 'Finished Airing': 'Завершено',
            'Not yet aired': 'Майбутнє', 'Discontinued': 'Скасовано', 'On Hiatus': 'Призупинено'
        };
        const SEASON_LABELS = { winter: 'Зима', spring: 'Весна', summer: 'Літо', fall: 'Осінь' };

        async function fetchJikan(path) {
            if (jikanCache.has(path)) return jikanCache.get(path);
            const promise = fetch(`${JIKAN_BASE}${path}`, { cache: 'force-cache' }).then(r => {
                if (!r.ok) throw new Error(`Jikan HTTP ${r.status}`);
                return r.json();
            });
            jikanCache.set(path, promise);
            try { return await promise; } catch (e) { jikanCache.delete(path); throw e; }
        }

        function normalizeJikanTitle(v) {
            return String(v || '').toLowerCase().replace(/[«»'"`]/g, '')
                .replace(/\b(season|сезон|part|частина|cour|tv|серіал|anime)\s*\d*\b/gi, ' ')
                .replace(/[^a-zа-яіїєґ0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
        }

        async function resolveJikanById(malId) {
            const data = (await fetchJikan(`/anime/${malId}/full`)).data;
            if (data) data._provider = 'jikan';
            return data || null;
        }

        async function withTimeout(promise, ms, label = 'Запит перевищив час очікування') {
            let timer;
            const timeout = new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(label)), ms);
            });
            try { return await Promise.race([promise, timeout]); }
            finally { clearTimeout(timer); }
        }

        async function resolveJikanByTitle(query) {
            const result = await fetchJikan(`/anime?q=${encodeURIComponent(query)}&limit=5&sfw=true`);
            const target = normalizeJikanTitle(query);
            const candidates = (result.data || []).map(x => {
                const names = [x.title, x.title_english, x.title_japanese, ...(x.title_synonyms || [])].map(normalizeJikanTitle);
                let score = names.includes(target) ? 100 : 0;
                if (names.some(n => n && (n.includes(target) || target.includes(n)))) score += 35;
                if (x.type === 'TV') score += 4;
                return { x, score };
            }).sort((a, b) => b.score - a.score);
            const best = candidates[0];
            // Do not attach a weak unrelated title just because search returned something.
            if (!best || best.score < 35) return null;
            return resolveJikanById(best.x.mal_id);
        }

        // ====================================================================
        //  ANILIST — другий стабільний ID у пріоритеті користувача. Використовуємо,
        //  коли Jikan/MAL недоступний (live search на MAL часто падає з 504,
        //  хоча вже кешовані ID-запити можуть проходити) або не знайшов збіг.
        //  AniList повертає персонажів, зв'язки, студію та nextAiringEpisode
        //  (Unix-час, тому конвертація часової зони відбувається без ручних зсувів)
        //  усе в одному GraphQL-запиті.
        // ====================================================================
        const ANILIST_BASE = 'https://graphql.anilist.co';
        const anilistCache = new Map();
        const ANILIST_STATUS_LABELS = {
            RELEASING: 'Онґоїнг', FINISHED: 'Завершено', NOT_YET_RELEASED: 'Майбутнє',
            CANCELLED: 'Скасовано', HIATUS: 'Призупинено'
        };
        const ANILIST_RELATION_LABELS = {
            PREQUEL: 'попередній сезон', SEQUEL: 'наступний сезон', SIDE_STORY: 'спін-оф',
            SPIN_OFF: 'спін-оф', ALTERNATIVE: "альтернативна версія", SUMMARY: 'короткий переказ',
            ADAPTATION: 'адаптація', PARENT: 'пов’язаний твір', CHARACTER: 'пов’язаний твір',
            FULL_STORY: 'повна історія', OTHER: 'пов’язаний твір'
        };
        const ANILIST_FORMAT_LABELS = { TV: 'TV Серіал', TV_SHORT: 'TV Серіал', MOVIE: 'Фільм', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Спешл', MUSIC: 'Музика' };

        const ANILIST_SEARCH_QUERY = `query ($search: String) { Page(perPage: 5) { media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            id title { romaji english native } format status season seasonYear episodes duration averageScore genres siteUrl
            studios(isMain: true) { nodes { name } }
            nextAiringEpisode { airingAt episode }
            characters(sort: ROLE, perPage: 10) { edges { role node { name { full native } image { large } } voiceActors(language: JAPANESE) { name { full } image { large } } } } }
        } }`;

        async function fetchAnilist(query, variables) {
            const key = JSON.stringify({ query, variables });
            if (anilistCache.has(key)) return anilistCache.get(key);
            const promise = fetch(ANILIST_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query, variables })
            }).then(r => { if (!r.ok) throw new Error(`AniList HTTP ${r.status}`); return r.json(); });
            anilistCache.set(key, promise);
            try { return await promise; } catch (e) { anilistCache.delete(key); throw e; }
        }

        function normalizeAnilistTitle(v) { return normalizeJikanTitle(v); }

        async function fetchAnilistRelations(anilistId) {
            const query = `query ($id: Int) { Media(id: $id) { relations { edges { relationType(version: 2) node {
                id type title { romaji english } format startDate { year } coverImage { large } siteUrl } } } } }`;
            const res = await fetchAnilist(query, { id: anilistId });
            return res?.data?.Media?.relations?.edges || [];
        }

        function adaptAnilistMedia(media) {
            const studios = (media.studios?.nodes || []).map(n => ({ name: n.name }));
            const characters = (media.characters?.edges || []).map(e => ({
                character: { name: e.node?.name?.full, name_kanji: e.node?.name?.native, images: { webp: { image_url: e.node?.image?.large } } },
                role: e.role === 'MAIN' ? 'Головна роль' : 'Другорядна роль',
                voice_actors: e.voiceActors?.length ? [{ language: 'Japanese', person: { name: e.voiceActors[0].name.full, images: { webp: { image_url: e.voiceActors[0].image?.large } } } }] : []
            }));
            const seasonMap = { WINTER: 'winter', SPRING: 'spring', SUMMER: 'summer', FALL: 'fall' };
            return {
                _provider: 'anilist', _anilistId: media.id,
                title: media.title?.romaji || media.title?.english, url: media.siteUrl,
                type: media.format === 'MOVIE' ? 'Movie' : 'TV',
                status: media.status, _statusLabel: ANILIST_STATUS_LABELS[media.status] || null,
                season: seasonMap[media.season] || null, year: media.seasonYear,
                episodes: media.episodes, duration: media.duration, _durationMinutes: media.duration,
                airing: media.status === 'RELEASING',
                _nextAiringDate: media.nextAiringEpisode ? new Date(media.nextAiringEpisode.airingAt * 1000) : null,
                _nextEpisode: media.nextAiringEpisode?.episode || null,
                rating: media.averageScore ? `AniList ${(media.averageScore / 10).toFixed(1)}` : null,
                genres: media.genres || [], studios, characters
            };
        }

        async function resolveAnilistByTitle(query) {
            const res = await fetchAnilist(ANILIST_SEARCH_QUERY, { search: query });
            const list = res?.data?.Page?.media || [];
            const target = normalizeAnilistTitle(query);
            const candidates = list.map(m => {
                const names = [m.title?.romaji, m.title?.english, m.title?.native].map(normalizeAnilistTitle);
                let score = names.includes(target) ? 100 : 0;
                if (names.some(n => n && (n.includes(target) || target.includes(n)))) score += 35;
                if (m.format === 'TV') score += 4;
                return { m, score };
            }).sort((a, b) => b.score - a.score);
            const best = candidates[0];
            if (!best || best.score < 35) return null;
            return adaptAnilistMedia(best.m);
        }

        function hasCharacterData(data) {
            return Array.isArray(data?.characters) && data.characters.some(x => x?.character?.name);
        }

        async function resolveJikanAnime(anime) {
            const stableMalId = Number(anime?.externalIds?.mal_id);
            const stableAnilistId = Number(anime?.externalIds?.anilist_id);
            let jikanFallback = null;
            // Priority 1: MAL ID. Priority 2: AniList ID. Priority 3/4 handled by title fallback below.
            if (stableMalId) {
                try {
                    const byId = await withTimeout(resolveJikanById(stableMalId), 5000, 'Jikan ID запит перевищив час очікування');
                    if (byId && hasCharacterData(byId)) return byId;
                    if (byId) jikanFallback = byId;
                } catch (e) { console.warn('Jikan ID lookup failed, trying other sources:', e); }
            }
            if (stableAnilistId) {
                try {
                    const query = `query ($id: Int) { Media(id: $id, type: ANIME) {
                        id title { romaji english native } format status season seasonYear episodes duration averageScore genres siteUrl
                        studios(isMain: true) { nodes { name } } nextAiringEpisode { airingAt episode }
                        characters(sort: ROLE, perPage: 10) { edges { role node { name { full native } image { large } } voiceActors(language: JAPANESE) { name { full } image { large } } } } } }`;
                    const res = await withTimeout(fetchAnilist(query, { id: stableAnilistId }), 8000, 'AniList ID запит перевищив час очікування');
                    if (res?.data?.Media) return adaptAnilistMedia(res.data.Media);
                } catch (e) { console.warn('AniList ID lookup failed, trying title fallback:', e); }
            }
            const query = anime?.originalTitle || anime?.title;
            if (!query) return jikanFallback;
            // AniList is the preferred title fallback because it usually returns characters and
            // voice actors faster and more consistently than Jikan's rate-limited search endpoint.
            try {
                const anilistMatch = await withTimeout(resolveAnilistByTitle(query), 8000, 'AniList пошук перевищив час очікування');
                if (anilistMatch) return anilistMatch;
            } catch (e) { console.warn('AniList title search unavailable:', e); }
            try {
                const byTitle = await withTimeout(resolveJikanByTitle(query), 5000, 'Jikan пошук перевищив час очікування');
                if (byTitle && hasCharacterData(byTitle)) return byTitle;
                if (byTitle && !jikanFallback) jikanFallback = byTitle;
            } catch (e) { console.warn('Jikan title search unavailable:', e); }
            return jikanFallback;
        }

        function jikanImage(item) {
            return item?.images?.webp?.image_url || item?.images?.jpg?.image_url || '';
        }

        function setSectionState(id, visible) {
            const el = document.getElementById(id);
            if (el) el.style.display = visible ? '' : 'none';
        }

        function formatJikanDuration(value) {
            if (value === null || value === undefined || value === '') return '';
            if (Number.isFinite(Number(value))) return `${Number(value)} хвилин`;
            const m = String(value).match(/(\d+)\s*min/i);
            return m ? `${m[1]} хвилин` : String(value);
        }

        function formatNextEpisodeDate(date) {
            if (!date) return 'Дата невідома';
            return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
        }

        function nextBroadcastDate(broadcast) {
            if (!broadcast?.day || !broadcast?.time) return null;
            const days = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
            const targetDay = days[String(broadcast.day).toLowerCase()];
            if (targetDay === undefined) return null;
            const [hour, minute] = String(broadcast.time).split(':').map(Number);
            if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
            // Build the wall-clock date in Tokyo and convert it through Intl, never by a fixed offset.
            const now = new Date();
            const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            }).formatToParts(now).filter(x => x.type !== 'literal').map(x => [x.type, Number(x.value)]));
            const tokyoWall = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second));
            const currentDay = tokyoWall.getUTCDay();
            let delta = (targetDay - currentDay + 7) % 7;
            const candidateWall = new Date(tokyoWall);
            candidateWall.setUTCDate(candidateWall.getUTCDate() + delta);
            candidateWall.setUTCHours(hour, minute, 0, 0);
            if (candidateWall <= tokyoWall) candidateWall.setUTCDate(candidateWall.getUTCDate() + 7);
            const tokyoOffset = tokyoWall.getTime() - now.getTime();
            return new Date(candidateWall.getTime() - tokyoOffset);
        }

        function countdownText(date) {
            const ms = new Date(date).getTime() - Date.now();
            if (!Number.isFinite(ms) || ms <= 0) return 'Очікуємо оновлення';
            const totalMinutes = Math.floor(ms / 60000);
            const days = Math.floor(totalMinutes / 1440);
            const hours = Math.floor((totalMinutes % 1440) / 60);
            const mins = totalMinutes % 60;
            if (days) return `Вихід через ${days} дн. ${hours} год.`;
            if (hours) return `Вихід через ${hours} год. ${mins} хв.`;
            return `Вихід через ${Math.max(mins, 1)} хв.`;
        }

        function renderAnimeInformation(data, tmdbInfo, details) {
            const root = document.getElementById('animeInfoGrid');
            if (!root) return;
            const type = data?.type || (playerAnimeIsMovie() ? 'Movie' : 'TV');
            const typeLabel = type === 'TV' ? 'TV Серіал' : type === 'Movie' ? 'Фільм' : (type || '—');
            const status = data?._statusLabel || JIKAN_STATUS_LABELS[data?.status] || ANILIST_STATUS_LABELS[data?.status] || data?.status || '—';
            const derivedYear = data?.year || (details?.first_air_date || details?.release_date || '').slice(0, 4);
            const seasonYear = data?.season && derivedYear ? `${SEASON_LABELS[data.season] || data.season} ${derivedYear}` : (derivedYear || '—');
            const episodeCount = playerPageAnime?.totalEpisodes ?? '—';
            const nextDate = data?._nextAiringDate instanceof Date && !Number.isNaN(data._nextAiringDate.getTime())
                ? data._nextAiringDate : (data?.airing ? nextBroadcastDate(data.broadcast) : null);
            const nextEpisode = data?._nextEpisode || (data?.airing && Number.isFinite(Number(data?.episodes)) ? Number(data.episodes) + 1 : null);
            const next = nextDate ? `${nextEpisode ? `Епізод ${nextEpisode} · ` : ''}${formatNextEpisodeDate(nextDate)}` : (data?.airing ? 'Дата невідома' : '—');
            const studio = data?.studios?.[0]?.name || details?.production_companies?.[0]?.name || '—';
            const studioLogo = data?.studios?.[0]?.logo || (details?.production_companies?.[0]?.logo_path ? tmdbImgUrl(details.production_companies[0].logo_path, 'w185') : '');
            const rating = data?.rating || (details?.vote_average ? `TMDB ${details.vote_average.toFixed(1)}` : '—');
            const rows = [
                ['Тип', typeLabel], ['Статус', `<span class="anime-info-badge">${escapeHtml(status)}</span>`],
                ['Сезон / рік', seasonYear], ['Епізоди', episodeCount || '—'], ['Наступний епізод', next],
                ['Тривалість епізоду', formatJikanDuration(data?.duration) || (details?.episode_run_time?.[0] ? `${details.episode_run_time[0]} хвилин` : '—')],
                ['Рейтинг', rating],
                ['Жанри', normalizeGenreList(playerPageAnime?.genres).join(' · ') || '—'],
                ['Студія', studioLogo ? `${escapeHtml(studio)}<img class="anime-info-studio-logo" src="${escapeHtml(studioLogo)}" alt="" loading="lazy" onerror="this.remove()">` : studio]
            ];
            root.innerHTML = rows.map(([label, value]) => `<div class="anime-info-row"><span>${escapeHtml(label)}</span><strong>${String(value).includes('anime-info-badge') || String(value).includes('anime-info-studio-logo') ? value : escapeHtml(String(value))}</strong></div>`).join('');
            const countdown = document.getElementById('animeCountdown');
            if (playerCountdownTimer) { clearInterval(playerCountdownTimer); playerCountdownTimer = null; }
            if (countdown) countdown.textContent = nextDate ? countdownText(nextDate) : '';
            if (nextDate) playerCountdownTimer = setInterval(() => { if (countdown) countdown.textContent = countdownText(nextDate); }, 60000);
        }

        function renderMainCharacters(data) {
            const list = document.getElementById('mainCharactersList');
            const more = document.getElementById('mainCharactersMoreBtn');
            if (!list) return;
            playerCharacterItems = (data?.characters || []).filter(x => x?.character?.name).map(x => ({
                name: x.character.name, original: x.character.name_kanji, role: x.role,
                image: jikanImage(x.character), voice: x.voice_actors?.find(v => v.language === 'Japanese')?.person?.name || ''
            })).sort((a, b) => ((a.role === 'Main' || a.role === 'Головна роль') ? 0 : 1) - ((b.role === 'Main' || b.role === 'Головна роль') ? 0 : 1));
            const items = playerCharacterExpanded ? playerCharacterItems : playerCharacterItems.slice(0, 8);
            if (!items.length) {
                list.innerHTML = '';
                if (more) more.hidden = true;
                setSectionState('mainCharactersSection', false);
                return;
            }
            setSectionState('mainCharactersSection', true);
            list.innerHTML = items.map(c => `<article class="cast-card character-card"><div class="cast-avatar" style="${c.image ? `background-image:url('${escapeHtml(c.image)}')` : ''}"></div><div class="cast-name">${escapeHtml(c.name)}</div>${c.original ? `<div class="character-original">${escapeHtml(c.original)}</div>` : ''}<div class="cast-role">${escapeHtml([c.role, c.voice ? `Сейю: ${c.voice}` : ''].filter(Boolean).join(' · '))}</div></article>`).join('');
            if (more) { more.hidden = playerCharacterItems.length <= 8; more.textContent = playerCharacterExpanded ? '←' : '→'; }
        }

        function relatedCardMarkup(x) {
            return `<article class="related-card" data-related-title="${escapeHtml(x.title || '')}" data-related-title-en="${escapeHtml(x.titleEn || '')}"><img src="${escapeHtml(x.image || '')}" alt="" loading="lazy"><div><strong>${escapeHtml(x.title || '')}</strong><span>${escapeHtml([x.year, x.typeLabel, x.relationLabel].filter(Boolean).join(' · '))}</span></div></article>`;
        }

        async function openRelatedAnimeInPlayer(card) {
            if (!card || card.classList.contains('is-loading')) return;
            const title = card.dataset.relatedTitle || '';
            const titleEn = card.dataset.relatedTitleEn || '';
            if (!title && !titleEn) return;
            card.classList.add('is-loading');
            try {
                const queries = [...new Set([title, titleEn].filter(Boolean))];
                let results = [];
                for (const query of queries) {
                    results = await searchHikka(query, 1);
                    if (results?.length) break;
                }
                const normalizeTitle = value => String(value || '').toLocaleLowerCase('uk-UA')
                    .replace(/[\u2010-\u2015:!?.,'’"()\[\]{}]/g, ' ')
                    .replace(/\s+/g, ' ').trim();
                const wanted = queries.map(normalizeTitle).filter(Boolean);
                const exact = (results || []).find(item => {
                    const names = [item.title, item.originalTitle, ...(item.alternativeTitles || [])].map(normalizeTitle);
                    return names.some(name => wanted.includes(name) || wanted.some(q => q === name || q.includes(name) || name.includes(q)));
                });
                const match = exact || results?.[0];
                if (match?.url) openPlayerPage(match.url);
                else showToast(`«${title}» ще не знайдено в каталозі VakDab`);
            } catch (e) { showToast('Не вдалося відкрити пов’язане аніме'); }
            finally { card.classList.remove('is-loading'); }
        }


        async function renderRelatedAnimeFromJikan(data) {
            const current = Number(data?.mal_id);
            const entries = (data?.relations || []).flatMap(group => (group.entry || []).map(entry => ({ ...entry, relation: group.relation })))
                .filter(x => x.mal_id && Number(x.mal_id) !== current);
            const unique = [...new Map(entries.map(x => [x.mal_id, x])).values()];
            const detailItems = unique.slice(0, 24);
            const details = await Promise.allSettled(detailItems.map(x => fetchJikan(`/anime/${x.mal_id}`)));
            return unique.map((x, i) => {
                const result = i < details.length ? details[i] : null;
                const full = result?.status === 'fulfilled' ? result.value.data : {};
                return { url: full.url || x.url, image: jikanImage(full) || jikanImage(x), title: full.title || x.name, year: full.year || (full.aired?.from || '').slice(0, 4), typeLabel: full.type || '', relationLabel: x.relation };
            });
        }

        async function renderRelatedAnimeFromAnilist(data) {
            if (!data?._anilistId) return [];
            const edges = await fetchAnilistRelations(data._anilistId);
            const filtered = edges.filter(e => e.node?.id !== data._anilistId && e.node?.type === 'ANIME');
            const unique = [...new Map(filtered.map(e => [e.node.id, e])).values()];
            return unique.map(e => ({
                url: e.node.siteUrl, image: e.node.coverImage?.large,
                title: e.node.title?.romaji || e.node.title?.english, titleEn: e.node.title?.english || e.node.title?.romaji, year: e.node.startDate?.year,
                typeLabel: ANILIST_FORMAT_LABELS[e.node.format] || e.node.format,
                relationLabel: ANILIST_RELATION_LABELS[e.relationType] || null
            }));
        }

        async function renderRelatedAnime(data) {
            const list = document.getElementById('relatedList');
            const more = document.getElementById('relatedMoreBtn');
            if (!list) return;
            try {
                playerRelatedItems = data?._provider === 'anilist' ? await renderRelatedAnimeFromAnilist(data) : await renderRelatedAnimeFromJikan(data);
            } catch (e) { console.warn('Related anime lookup failed:', e); playerRelatedItems = []; }
            if (!playerRelatedItems.length) { setSectionState('relatedSection', false); return; }
            setSectionState('relatedSection', true);
            const visible = playerRelatedItems.slice(0, 4);
            list.innerHTML = visible.map(relatedCardMarkup).join('');
            list.querySelectorAll('.related-card').forEach(card => card.addEventListener('click', () => openRelatedAnimeInPlayer(card)));
            const count = document.getElementById('relatedCount');
            if (count) count.textContent = `(${playerRelatedItems.length})`;
            if (more) more.hidden = playerRelatedItems.length <= 4;
        }

        function renderAnimeMedia(data) {
            const list = document.getElementById('mediaList');
            const more = document.getElementById('mediaMoreBtn');
            if (!list) return;
            playerMediaItems = [
                ...(data?.theme?.openings || []).map(x => ({ label: 'Opening', title: x })),
                ...(data?.theme?.endings || []).map(x => ({ label: 'Ending', title: x }))
            ].filter(x => x.title).filter((x, i, arr) => arr.findIndex(y => y.label === x.label && y.title === x.title) === i);
            if (!playerMediaItems.length) { setSectionState('mediaSection', false); return; }
            setSectionState('mediaSection', true);
            const items = playerMediaExpanded ? playerMediaItems : playerMediaItems.slice(0, 8);
            list.innerHTML = items.map((x, i) => `<div class="media-track"><span>${escapeHtml(x.label)}</span><strong>${escapeHtml(x.title)}</strong></div>`).join('');
            if (more) { more.hidden = playerMediaItems.length <= 8; more.textContent = playerMediaExpanded ? '←' : '→'; }
        }

        async function loadAndRenderJikanExtras(anime, tmdbInfo, details) {
            try {
                const data = await resolveJikanAnime(anime);
                if (playerPageCurrentAnimeUrl !== anime.url) return;
                if (!data) {
                    const infoGrid = document.getElementById('animeInfoGrid');
                    if (infoGrid) infoGrid.innerHTML = '<div class="anime-info-placeholder">Розширена інформація тимчасово недоступна</div>';
                    setSectionState('relatedSection', false);
                    setSectionState('mediaSection', false);
                    setSectionState('mainCharactersSection', false);
                    return;
                }
                playerJikanData = data;
                renderAnimeInformation(data, tmdbInfo, details);
                renderMainCharacters(data);
                if (document.getElementById('castSection')?.style.display === 'none') renderVoiceCast(data);
                renderAnimeMedia(data);
                await renderRelatedAnime(data);
            } catch (e) {
                console.warn('Jikan anime extras unavailable:', e);
                const infoGrid = document.getElementById('animeInfoGrid');
                if (infoGrid) infoGrid.innerHTML = '<div class="anime-info-placeholder">Розширена інформація тимчасово недоступна</div>';
                const mainCharactersList = document.getElementById('mainCharactersList');
                if (mainCharactersList && !playerCharacterItems.length) {
                    setSectionState('mainCharactersSection', true);
                    mainCharactersList.innerHTML = '<div class="player-empty-episodes">Персонажі тимчасово недоступні</div>';
                }
                setSectionState('relatedSection', false);
                setSectionState('mediaSection', false);
            }
        }

        function renderCast(details) {
            const section = document.getElementById('castSection');
            const list = document.getElementById('castList');
            if (!section || !list) return;
            const cast = ((details && details.credits && details.credits.cast) || []).slice(0, 8);
            if (!cast.length) { list.innerHTML = ''; section.style.display = 'none'; return; }
            section.style.display = '';
            const castTitle = section.querySelector('.section-title');
            if (castTitle) castTitle.textContent = 'Актори';
            list.innerHTML = cast.map(c => {
                const avatar = c.profile_path ? tmdbImgUrl(c.profile_path, 'w185') : '';
                const avatarStyle = avatar ? `background-image:url(${avatar});background-size:cover;background-position:center;` : '';
                return `
                <div class="cast-card">
                    <div class="cast-avatar" style="${avatarStyle}"></div>
                    <div class="cast-name">${escapeHtml(c.name || '')}</div>
                    <div class="cast-role">${escapeHtml(c.character || '')}</div>
                </div>`;
            }).join('');
        }

        function renderVoiceCast(data) {
            const section = document.getElementById('castSection');
            const list = document.getElementById('castList');
            if (!section || !list) return;
            const cast = (data?.characters || []).filter(x => x?.character?.name && x?.voice_actors?.length).slice(0, 12);
            if (!cast.length) return;
            section.style.display = '';
            section.querySelector('.section-title').textContent = 'Актори / сейю';
            list.innerHTML = cast.map(x => {
                const c = x.character;
                const voice = x.voice_actors?.find(v => v.language === 'Japanese') || x.voice_actors?.[0];
                const person = voice?.person || {};
                const avatar = jikanImage(person);
                const style = avatar ? `background-image:url('${escapeHtml(avatar)}');` : '';
                return `<article class="cast-card"><div class="cast-avatar" style="${style}"></div><div class="cast-name">${escapeHtml(person.name || 'Сейю невідомий')}</div><div class="cast-role">${escapeHtml(c.name || '')}</div></article>`;
            }).join('');
        }

        function tmdbStillFor(ep, epMap, tmdbInfo, fallback) {
            const tmdbEpisode = epMap && epMap[parseInt(ep.episode, 10)];
            return tmdbImgUrl(tmdbEpisode?.still_path, 'w500') || fallback;
        }

        function tmdbRatingFor(ep, epMap) {
            const t = epMap && epMap[parseInt(ep.episode)];
            if (t && t.vote_average) return t.vote_average.toFixed(1);
            return null;
        }

        // ====================================================================
        //  ПОБУДОВА СПИСКУ СЕРІЙ — Сітка / Компактний / Класичний
        // ====================================================================
        function buildGridCard(ep, posterUrl, epMap, tmdbInfo) {
            const progress = getEpisodeProgress(ep.episode);
            const watched = progress >= 95;
            const img = tmdbStillFor(ep, epMap, tmdbInfo, posterUrl);
            const rating = tmdbRatingFor(ep, epMap);
            const statusText = watched ? 'Переглянуто' : (progress > 0 ? `${Math.round(progress)}%` : 'Доступно');
            return `
              <div class="episode-grid-card${watched ? ' watched' : ''}" data-file="${ep.file}" data-episode="${ep.episode}">
                <div class="episode-grid-thumb" style="background-image:url(${img})">
                  <span class="episode-grid-num">${String(ep.episode).padStart(2, '0')}</span>
                </div>
                <div class="episode-grid-info">
                  <div class="episode-grid-title">Серія ${ep.episode}</div>
                  <div class="episode-grid-meta">
                    ${rating ? `<span class="episode-grid-rating">★ ${rating}</span><span>·</span>` : ''}
                    <span>${statusText}</span>
                  </div>
                  <div class="episode-grid-progress"><div class="episode-grid-progress-bar" style="width:${Math.min(progress, 100)}%"></div></div>
                </div>
              </div>`;
        }

        function buildCompactRow(ep, posterUrl, epMap, tmdbInfo) {
            const progress = getEpisodeProgress(ep.episode);
            const watched = progress >= 95;
            const img = tmdbStillFor(ep, epMap, tmdbInfo, posterUrl);
            const rating = tmdbRatingFor(ep, epMap);
            const statusText = watched ? 'Переглянуто' : (progress > 0 ? `${Math.round(progress)}%` : 'Доступно');
            return `
              <div class="epv2c-row${watched ? ' watched' : ''}" data-file="${ep.file}" data-episode="${ep.episode}">
                <div class="epv2c-thumb" style="background-image:url(${img})"><span class="epv2c-num">${ep.episode}</span></div>
                <div class="epv2c-body">
                  <div class="epv2c-title">Серія ${ep.episode}</div>
                  <div class="epv2c-meta">
                    ${rating ? `<span>★ ${rating}</span><span>•</span>` : ''}
                    <span>${statusText}</span>
                  </div>
                </div>
                <span class="epv2c-quality">${playerPageCurrentQuality || '—'}</span>
              </div>`;
        }

        function buildClassicRow(ep, posterUrl, epMap, tmdbInfo) {
            const progress = getEpisodeProgress(ep.episode);
            const watched = progress >= 95;
            const img = tmdbStillFor(ep, epMap, tmdbInfo, posterUrl);
            const rating = tmdbRatingFor(ep, epMap);
            const statusText = watched ? 'Переглянуто' : (progress > 0 ? `${Math.round(progress)}%` : 'Доступно');
            return `
              <div class="epv2l-row${watched ? ' watched' : ''}" data-file="${ep.file}" data-episode="${ep.episode}">
                <div class="epv2l-thumb" style="background-image:url(${img})">
                  <span class="epv2l-badge epv2l-badge-num">Серія ${ep.episode}</span>
                  <span class="epv2l-badge epv2l-badge-quality">${playerPageCurrentQuality || '—'}</span>
                  ${progress > 0 ? `<div class="epv2l-progress"><div class="epv2l-progress-fill" style="width:${Math.min(progress, 100)}%"></div></div>` : ''}
                </div>
                <div class="epv2l-meta-row">
                  ${rating ? `<span class="epv2-rating"><i data-lucide="star" style="width:11px;height:11px;"></i>${rating}</span><span class="epv2-dot">•</span>` : ''}
                  <span>${statusText}</span>
                </div>
              </div>`;
        }

        function attachEpisodeClickHandlers(container) {
            if (!container) return;
            container.querySelectorAll('[data-file]').forEach(card => {
                card.addEventListener('click', () => {
                    const file = card.dataset.file;
                    const epNum = card.dataset.episode;
                    if (!file) return;
                    playerPageCurrentEpisodeNum = epNum;
                    playEpisode(file, epNum);
                });
            });
        }

        function renderAllEpisodeViews(episodes, epMap, tmdbInfo) {
            const picker = document.getElementById('episodeViewGrid');
            const compactContainer = document.getElementById('episodeViewCompact');
            const classicContainer = document.getElementById('episodeViewClassic');
            if (!picker) return;
            if (!episodes.length) {
                const emptyHtml = '<div class="player-empty-episodes">Серії ще не знайдені на цьому джерелі.</div>';
                picker.innerHTML = emptyHtml;
                if (compactContainer) compactContainer.innerHTML = '';
                if (classicContainer) classicContainer.innerHTML = '';
                return;
            }
            // The new player deliberately uses buttons instead of a poster grid.
            picker.innerHTML = episodes.map(ep => {
                const active = String(ep.episode) === String(playerPageCurrentEpisodeNum) ? ' active' : '';
                const progress = getEpisodeProgress(ep.episode);
                return `<button type="button" class="player-episode-btn${active}" data-file="${escapeHtml(ep.file || '')}" data-episode="${escapeHtml(ep.episode || '')}">
                    <span class="player-episode-number">${escapeHtml(ep.episode || '—')}</span>
                    <span class="player-episode-title">${escapeHtml(ep.title || `Серія ${ep.episode || ''}`)}</span>
                    ${progress > 0 ? `<span class="player-episode-progress" style="--progress:${progress}%"></span>` : ''}
                </button>`;
            }).join('');
            if (compactContainer) compactContainer.innerHTML = '';
            if (classicContainer) classicContainer.innerHTML = '';
            attachEpisodeClickHandlers(picker);
        }

        export async function buildEpisodeViews() {
            const episodes = getCurrentEpisodes();
            playerPageEpisodes = episodes;
            renderAllEpisodeViews(episodes, null, null);
            if (!episodes.length) return;
            try {
                if (playerAnimeIsMovie()) return;
                const tmdbInfo = await fetchTmdbForAnime(playerPageAnime);
                if (!tmdbInfo) return;
                const seasonNum = parseInt(playerPageCurrentSeason) || 1;
                const seasonEpisodes = await fetchTmdbSeasonEpisodes(tmdbInfo, seasonNum);
                // якщо сезон/озвучку вже змінили поки йшов запит — не рендеримо застарілі дані
                if (getCurrentEpisodes() !== episodes) return;
                if (!seasonEpisodes) return;
                const epMap = {};
                seasonEpisodes.forEach(e => { epMap[e.episode_number] = e; });
                playerPageTmdbEpisodeMap = epMap;
                renderAllEpisodeViews(episodes, epMap, tmdbInfo);
                setPlayerFramePoster(tmdbImgUrl(epMap[Number(playerPageCurrentEpisodeNum)]?.still_path, 'w1280'));
            } catch (e) { console.warn('TMDB enrich failed', e); }
        }

        function playerAnimeIsMovie(anime = playerPageAnime) {
            return anime?.type === 'movie' || (anime?.genres || []).some(g => /повнометраж|фільм|movie/i.test(g));
        }

        function setPlayerFramePoster(frameUrl = '') {
            const frame = document.getElementById('playerFramePoster');
            if (!frame) return;
            const url = frameUrl || tmdbImgUrl(playerPageTmdbInfo?.backdrop_path, 'w1280') || document.getElementById('playerPosterImg')?.src || '';
            if (url) { frame.src = url; frame.classList.remove('is-hidden'); }
            else frame.classList.add('is-hidden');
        }
        function hidePlayerFramePoster() {
            const frame = document.getElementById('playerFramePoster');
            if (frame) frame.classList.add('is-hidden');
        }
        function formatMovieRuntime(minutes) {
            const n = Number(minutes);
            if (!Number.isFinite(n) || n <= 0) return '';
            const h = Math.floor(n / 60);
            const m = Math.round(n % 60);
            return h ? `${h} год ${m ? m + ' хв' : ''}`.trim() : `${m} хв`;
        }

        async function playEpisode(file, epNum) {
            if (!file) { showToast('Немає файлу для відтворення'); return; }
            if (!playerPageIsOpen) return;
            const playbackRequest = ++playerPagePlaybackRequest;
            playerPageCurrentEpisodeNum = epNum || '1';
            renderAllEpisodeViews(getCurrentEpisodes(), null, null);
            const videoContainer = document.getElementById('playerVideoContainer');
            const videoDiv = document.getElementById('playerPageVideo');
            videoContainer.classList.add('active');
            videoContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const videoTitleEl = document.getElementById('playerTopbarTitle');
            if (videoTitleEl) videoTitleEl.textContent = playerPageAnime?.title || '';
            videoDiv.innerHTML = '';
            setPlayerFramePoster(tmdbImgUrl(playerPageTmdbEpisodeMap[Number(epNum)]?.still_path, 'w1280'));
            let finalUrl = file;
            if (/ashdi\.vip\/vod\//i.test(file)) {
                showToast('Підключення ASHDI через проксі...');
                try {
                    finalUrl = await resolveAshdiPlaybackUrl(file);
                } catch (error) {
                    if (playbackRequest !== playerPagePlaybackRequest || !playerPageIsOpen) return;
                    console.warn('[ASHDI playback]', error);
                    videoContainer.classList.remove('active');
                    videoDiv.innerHTML = '<div class="player-video-error"><i class="fas fa-triangle-exclamation"></i><span>Відео цієї серії недоступне.</span></div>';
                    showToast(`ASHDI: ${error.message || 'відео недоступне'}`);
                    return;
                }
            }
            if (playbackRequest !== playerPagePlaybackRequest || !playerPageIsOpen) return;
            playerPageActiveEpisodeFile = finalUrl;

            if (playerPagePlayer) { playerPagePlayer.destroy();
                playerPagePlayer = null; }
            if (playbackRequest !== playerPagePlaybackRequest || !playerPageIsOpen) return;
            playerPagePlayer = new LampaPlayer(videoDiv, { poster: playerPageAnime?.images?.jpg?.large_image_url });
            playerPagePlayer.loadSource(finalUrl, playerPageAnime?.title || '', `Серія ${epNum}`);
            playerPageHistoryUpdated = false;
            playerPageWatchStartTime = 0;
            playerPageAccumulatedWatchSeconds = 0;
            playerPageLastVideoTime = null;
            playerPageIsPlaying = false;
            const video = playerPagePlayer.videoRef;
            if (video) {
                const hideFrame = () => hidePlayerFramePoster();
                const syncPlaybackClock = () => {
                    if (!playerPageIsPlaying) return;
                    const currentTime = Number(video.currentTime);
                    if (!Number.isFinite(currentTime)) return;
                    if (playerPageLastVideoTime !== null) {
                        const delta = currentTime - playerPageLastVideoTime;
                        // Ignore seeks/jumps; only count normal media progression.
                        if (delta >= 0 && delta <= 5) playerPageAccumulatedWatchSeconds += delta;
                    }
                    playerPageLastVideoTime = currentTime;
                };
                const onPlaying = () => {
                    playerPageIsPlaying = true;
                    playerPageLastVideoTime = Number(video.currentTime) || 0;
                };
                const onPause = () => {
                    syncPlaybackClock();
                    playerPageIsPlaying = false;
                    playerPageLastVideoTime = Number(video.currentTime) || 0;
                };
                const onSeeking = () => { playerPageLastVideoTime = null; };
                const onSeeked = () => { playerPageLastVideoTime = Number(video.currentTime) || 0; };
                video.addEventListener('playing', hideFrame, { once: true });
                video.addEventListener('playing', onPlaying);
                video.addEventListener('pause', onPause);
                video.addEventListener('waiting', onPause);
                video.addEventListener('seeking', onSeeking);
                video.addEventListener('seeked', onSeeked);
                const onTimeUpdate = () => {
                    syncPlaybackClock();
                    if (playerPageHistoryUpdated) return;
                    if (!playerPageAnime) return;
                    const duration = video.duration;
                    if (!duration || duration === Infinity) return;
                    const progress = (video.currentTime / duration) * 100;
                    const watchSecondsSoFar = Math.floor(playerPageAccumulatedWatchSeconds);
                    // Зберігаємо в історію через 2 хвилини перегляду
                    if (watchSecondsSoFar >= 120) {
                        playerPageHistoryUpdated = true;
                        const ep = epNum || playerPageCurrentEpisodeNum || '1';
                        const season = playerPageCurrentSeason || '1';
                        const history = Storage.getHistory();
                        const idx = history.findIndex(h => h.url === playerPageAnime.url);
                        // watchTime вже обчислено вище
                        if (watchSecondsSoFar > 0) {
                            Storage.addWatchTime(watchSecondsSoFar);
                            DailyStats.increment('minutesToday', Math.round(watchSecondsSoFar / 60));
                        }
                        if (idx >= 0) {
                            history[idx].episode = ep;
                            history[idx].season = season;
                            history[idx].timestamp = Date.now();
                            history[idx].progress = Math.min(progress, 100);
                            history[idx].duration = Math.floor(video.currentTime);
                            Storage.setHistory(history);
                        } else {
                            const entry = {
                                animeId: playerPageAnime.mal_id || playerPageAnime.url.hashCode(),
                                title: playerPageAnime.title,
                                poster: playerPageAnime.images?.jpg?.large_image_url || '',
                                url: playerPageAnime.url,
                                episode: ep,
                                season: season,
                                timestamp: Date.now(),
                                progress: Math.min(progress, 100),
                                duration: Math.floor(video.currentTime)
                            };
                            history.unshift(entry);
                            DailyStats.increment('episodesToday', 1);
                            DailyStats.addUniqueAnime(playerPageAnime.url);
                            if (history.length > 200) history.length = 200;
                            Storage.setHistory(history);
                        }
                        showToast(`Серія ${ep} збережена в історію`);
                        video.removeEventListener('timeupdate', onTimeUpdate);
                        buildEpisodeViews();
                    }
                };
                video.addEventListener('timeupdate', onTimeUpdate);
                if (playerPagePlayer._timeUpdateListener) {
                    video.removeEventListener('timeupdate', playerPagePlayer._timeUpdateListener);
                }
                playerPagePlayer._timeUpdateListener = onTimeUpdate;
            }
            setTimeout(() => { videoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);
        }

        function closePlayerPage() {
            const modal = document.getElementById('playerPageModal');
            if (!modal || (!playerPageIsOpen && !modal.classList.contains('is-open'))) return;
            playerPageIsOpen = false;
            playerPagePlaybackRequest += 1;
            modal.setAttribute('aria-busy', 'false');
            modal.setAttribute('aria-hidden', 'true');
            modal.classList.remove('is-open');
            // Скасувати активне завантаження — щоб catch не показував помилку
            if (_playerLoadController) {
                _playerLoadController.abort();
                _playerLoadController = null;
            }
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
            }
            closeWatchPage();
            modal.style.display = 'none';
            document.documentElement.classList.remove('player-page-open');
            document.body.classList.remove('player-page-open');
            document.getElementById('bottomNav')?.classList.remove('hidden-nav');
            document.body.style.overflow = playerPagePreviousBodyOverflow;
            document.getElementById('episodePanel').classList.remove('visible');
            if (playerPagePreviousActiveElement && document.contains(playerPagePreviousActiveElement)) {
                playerPagePreviousActiveElement.focus({ preventScroll: true });
            }
            playerPagePreviousActiveElement = null;
            if (Router.currentRoute === 'profile') renderProfilePage();
        }

        function updateBookmarkButton(url) {
            const btn = document.getElementById('playerBookmarkBtn');
            if (!btn) return;
            const bookmarks = Storage.getBookmarks();
            const isBookmarked = bookmarks.some(b => b.url === url);
            btn.classList.toggle('bookmarked', isBookmarked);
            btn.innerHTML = isBookmarked ?
                '<i class="fas fa-heart" style="color:#ffd700;"></i>' :
                '<i class="fas fa-heart"></i>';
        }

        function toggleBookmark() {
            const url = playerPageCurrentAnimeUrl;
            if (!url) { showToast('Немає аніме для закладки'); return; }
            const bookmarks = Storage.getBookmarks();
            const idx = bookmarks.findIndex(b => b.url === url);
            if (idx >= 0) {
                bookmarks.splice(idx, 1);
                Storage.setBookmarks(bookmarks);
                showToast('Видалено з закладок');
                updateBookmarkButton(url);
                if (Router.currentRoute === 'profile') renderProfilePage();
                return;
            }
            const anime = playerPageAnime;
            if (!anime) { showToast('Помилка: немає даних про аніме'); return; }
            const totalEpisodes = Object.values(anime.seasons || {}).reduce((sum, s) => sum + Object.values(s).reduce((s2,
                e) => Math.max(s2, e.length), 0), 0);
            bookmarks.push({
                url: anime.url,
                title: anime.title,
                poster: anime.images?.jpg?.large_image_url || '',
                episodes: totalEpisodes + ' еп.',
                addedAt: Date.now()
            });
            Storage.setBookmarks(bookmarks);
            DailyStats.increment('bookmarksToday', 1);
            showToast('Додано до закладок');
            updateBookmarkButton(url);
            if (Router.currentRoute === 'profile') renderProfilePage();
        }

        // ====================================================================
        //  ЛАЙК / ДИЗЛАЙК
        // ====================================================================
        function updateLikeButton() {
            const btn = document.getElementById('likeBtn');
            if (!btn) return;
            const likes = Storage.getLikes();
            const url = playerPageCurrentAnimeUrl;
            if (url && likes[url] === 'like') {
                btn.classList.add('liked');
                btn.innerHTML = '<i class="fas fa-thumbs-up" style="color:#00ff88;"></i>';
            } else {
                btn.classList.remove('liked');
                btn.innerHTML = '<i class="fas fa-thumbs-up"></i>';
            }
        }

        function updateDislikeButton() {
            const btn = document.getElementById('dislikeBtn');
            if (!btn) return;
            const likes = Storage.getLikes();
            const url = playerPageCurrentAnimeUrl;
            if (url && likes[url] === 'dislike') {
                btn.classList.add('disliked');
                btn.innerHTML = '<i class="fas fa-thumbs-down" style="color:#ff4444;"></i>';
            } else {
                btn.classList.remove('disliked');
                btn.innerHTML = '<i class="fas fa-thumbs-down"></i>';
            }
        }

        function toggleLike() {
            const url = playerPageCurrentAnimeUrl;
            if (!url) { showToast('Немає аніме для оцінки'); return; }
            const likes = Storage.getLikes();
            if (likes[url] === 'like') {
                delete likes[url];
                Storage.setLikes(likes);
                syncAnimeRating(url, 0);
                showToast('Лайк скасовано');
            } else {
                likes[url] = 'like';
                Storage.setLikes(likes);
                DailyStats.increment('likesToday', 1);
                DailyStats.addTotalRating();
                syncAnimeRating(url, 1);
                showToast('Лайк');
            }
            updateLikeButton();
            updateDislikeButton();
            if (Router.currentRoute === 'profile') renderProfilePage();
        }

        function toggleDislike() {
            const url = playerPageCurrentAnimeUrl;
            if (!url) { showToast('Немає аніме для оцінки'); return; }
            const likes = Storage.getLikes();
            if (likes[url] === 'dislike') {
                delete likes[url];
                Storage.setLikes(likes);
                syncAnimeRating(url, 0);
                showToast('Дизлайк скасовано');
            } else {
                likes[url] = 'dislike';
                Storage.setLikes(likes);
                syncAnimeRating(url, -1);
                showToast('Дизлайк');
            }
            updateLikeButton();
            updateDislikeButton();
            if (Router.currentRoute === 'profile') renderProfilePage();
        }

        // ====================================================================
        //  BOTTOM SHEET
        // ====================================================================
        let bottomSheetMode = 'full';

        export function buildBottomSheetData() {
            const bindItems = (root, selector, callback) => {
                root?.querySelectorAll(selector).forEach(item => {
                    const activate = () => callback(item.dataset.value);
                    item.addEventListener('click', activate);
                    item.addEventListener('keydown', event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            activate();
                        }
                    });
                });
            };

            const sourceList = document.getElementById('bsSourceList');
            if (sourceList) {
                const sources = playerPageSources.length ? playerPageSources : ['Основне'];
                sourceList.innerHTML = sources.map(s => {
                    const active = s === playerPageCurrentSource ? ' active' : '';
                    return `<div class="source-item${active}" data-value="${escapeHtml(String(s))}" role="button" tabindex="0">${escapeHtml(String(s))}</div>`;
                }).join('');
                bindItems(sourceList, '[data-value]', value => switchProviderSource(value));
            }

            const dubList = document.getElementById('bsDubList');
            if (dubList && playerPageAnime?.seasons) {
                const seasons = Object.keys(playerPageAnime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
                const currentSeason = playerPageCurrentSeason || seasons[0] || '1';
                const dubs = Object.keys(playerPageAnime.seasons[currentSeason] || {}).sort();
                dubList.innerHTML = dubs.map(d => {
                    const active = d === playerPageCurrentDub ? ' active' : '';
                    return `<div class="source-item${active}" data-value="${escapeHtml(String(d))}" role="button" tabindex="0">${escapeHtml(String(d))}</div>`;
                }).join('');
                bindItems(dubList, '[data-value]', value => selectDubFromSheet(value));
            }

            const seasonList = document.getElementById('bsSeasonList');
            if (seasonList && playerPageAnime?.seasons) {
                const seasons = Object.keys(playerPageAnime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
                seasonList.innerHTML = seasons.map(s => {
                    const active = s === playerPageCurrentSeason ? ' active' : '';
                    return `<div class="source-item${active}" data-value="${escapeHtml(String(s))}" role="button" tabindex="0">Сезон ${escapeHtml(String(s))}</div>`;
                }).join('');
                bindItems(seasonList, '[data-value]', value => selectSeasonFromSheet(value));
            }

            const qualityRow = document.getElementById('bsQualityRow');
            if (qualityRow) {
                qualityRow.innerHTML = QUALITY_OPTIONS.map(q => {
                    const active = q === playerPageCurrentQuality ? ' active' : '';
                    return `<div class="quality-item${active}" data-value="${escapeHtml(String(q))}" role="button" tabindex="0">${escapeHtml(String(q))}</div>`;
                }).join('');
                bindItems(qualityRow, '[data-value]', value => selectQualityFromSheet(value));
            }
        }

        window.selectDubFromSheet = function(dub) {
            playerPageCurrentDub = dub;
            buildEpisodeViews();
            updateFilterChip();
            buildBottomSheetData();
            showToast(`Озвучка: ${dub}`);
        };

        window.selectSeasonFromSheet = function(season) {
            playerPageCurrentSeason = season;
            const dubs = Object.keys(playerPageAnime?.seasons?.[season] || {}).sort();
            playerPageCurrentDub = dubs[0] || '';
            buildEpisodeViews();
            refreshPlayerSeasonPoster(season);
            updateFilterChip();
            buildBottomSheetData();
            showToast(`Сезон ${season}`);
        };

        window.selectQualityFromSheet = function(quality) {
            playerPageCurrentQuality = quality;
            buildBottomSheetData();
            showToast(`Якість: ${quality}`);
        };

        function openBottomSheet(mode) {
            bottomSheetMode = mode || 'full';
            buildBottomSheetData();
            document.getElementById('bottomSheetOverlay').classList.add('open');
        }

        function closeBottomSheet() {
            document.getElementById('bottomSheetOverlay').classList.remove('open');
        }

        // ====================================================================
        //  ОБРОБНИКИ ПОДІЙ
        // ====================================================================
        function openMenuPopover() {
            const overlay = document.getElementById('menuPopoverOverlay');
            if (overlay) overlay.classList.add('visible');
        }
        function closeMenuPopover() {
            const overlay = document.getElementById('menuPopoverOverlay');
            if (overlay) overlay.classList.remove('visible');
        }
        window.closeMenuPopover = closeMenuPopover;

        document.getElementById('bnMenu')?.addEventListener('click', (e) => {
            e.stopPropagation();
            openMenuPopover();
        });

        document.getElementById('menuPopoverOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'menuPopoverOverlay') closeMenuPopover();
        });

        document.querySelectorAll('.menu-popover-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                closeMenuPopover();
                if (action === 'genres') {
                    Router.goTo('genres');
                } else if (action === 'settings') {
                    Router.goTo('settings');
                } else if (action === 'filters') {
                    Router.goTo('filter');
                } else if (action === 'stickers') {
                    Router.goTo('stickers');
                } else if (action === 'schedule') {
                    Router.goTo('schedule');
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeMenuPopover();
            }
        });

        document.getElementById('searchCircleBtn')?.addEventListener('click', () => {
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
                if (playerPagePlayer) { playerPagePlayer.toggleFullscreen(); return; }
                const container = document.getElementById('playerVideoContainer');
                if (!container) return;
                if (document.fullscreenElement || document.webkitFullscreenElement) {
                    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
                    return;
                }
                const target = container.querySelector('.lampa-player-container') || container;
                const request = target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen;
                if (request) Promise.resolve(request.call(target)).catch(() => {});
                else if (target.querySelector('video')?.webkitEnterFullscreen) target.querySelector('video').webkitEnterFullscreen();
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

        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.dataset.view;
                showViewMode(mode);
            });
        });

        document.getElementById('mainCharactersMoreBtn')?.addEventListener('click', () => {
            playerCharacterExpanded = !playerCharacterExpanded;
            renderMainCharacters(playerJikanData);
        });
        document.getElementById('mediaMoreBtn')?.addEventListener('click', () => {
            playerMediaExpanded = !playerMediaExpanded;
            renderAnimeMedia(playerJikanData);
        });
        document.getElementById('relatedMoreBtn')?.addEventListener('click', () => {
            const list = document.getElementById('relatedList');
            if (!list) return;
            list.innerHTML = playerRelatedItems.map(relatedCardMarkup).join('');
            list.querySelectorAll('.related-card').forEach(card => card.addEventListener('click', () => openRelatedAnimeInPlayer(card)));
            document.getElementById('relatedMoreBtn').hidden = true;
        });

        document.getElementById('likeBtn').addEventListener('click', toggleLike);
        document.getElementById('dislikeBtn').addEventListener('click', toggleDislike);
        document.getElementById('playerBookmarkBtn').addEventListener('click', toggleBookmark);
        document.getElementById('videoBackBtn')?.addEventListener('click', () => {
            const videoContainer = document.getElementById('playerVideoContainer');
            videoContainer.classList.remove('active');
            if (playerPagePlayer) { try { playerPagePlayer.destroy(); } catch(e){} playerPagePlayer = null; }
            document.getElementById('playerPageVideo').innerHTML = '';
        });

        // ====================================================================
        //  РЕЙТИНГ ГЛЯДАЧІВ (реальний, спільний, Firestore anime_ratings)
        // ====================================================================
        async function loadAnimeRatingAggregate(animeUrl) {
            const numEl = document.getElementById('playerRatingNum');
            const labelEl = document.getElementById('playerRatingLabel');
            if (!numEl) return;
            if (!playerRatingSourceIsTmdb) {
                numEl.textContent = '—';
                if (labelEl) labelEl.textContent = 'ОЦІНКА ГЛЯДАЧІВ';
            }
            try {
                if (!db) return;
                await ensureFirebaseGuestAuth();
                const animeId = String(animeUrl.hashCode ? animeUrl.hashCode() : animeUrl);
                const q = query(collection(db, 'anime_ratings'), where('animeId', '==', animeId));
                const snap = await getDocs(q);
                // TMDB-рейтинг має пріоритет — якщо він уже застосований, локальну оцінку глядачів не показуємо в тому ж тайлі
                if (playerRatingSourceIsTmdb) return;
                if (snap.empty) { numEl.textContent = '—'; if (labelEl) labelEl.textContent = 'НЕМАЄ ОЦІНОК'; return; }
                let sum = 0, count = 0;
                snap.forEach(d => { const v = d.data().value; if (v === 1 || v === -1) { sum += v; count++; } });
                if (count === 0) { numEl.textContent = '—'; if (labelEl) labelEl.textContent = 'НЕМАЄ ОЦІНОК'; return; }
                const score = (((sum / count) + 1) / 2) * 10; // -1..1 -> 0..10
                numEl.textContent = score.toFixed(1);
                if (labelEl) labelEl.textContent = `${count} ${count === 1 ? 'ГОЛОС' : 'ГОЛОСІВ'}`;
            } catch (e) {
                console.warn('Rating aggregate error:', e);
            }
        }

        async function syncAnimeRating(animeUrl, value) {
            try {
                if (!db) return;
                await ensureFirebaseGuestAuth();
                const animeId = String(animeUrl.hashCode ? animeUrl.hashCode() : animeUrl);
                const uid = (auth?.currentUser?.uid) || Storage.getDeviceId?.() || 'anon';
                const docId = `${animeId}_${uid}`;
                const ref = doc(db, 'anime_ratings', docId);
                if (value === 0) { await deleteDoc(ref); }
                else { await setDoc(ref, { animeId, uid, value, updatedAt: Date.now() }); }
                loadAnimeRatingAggregate(animeUrl);
            } catch (e) {
                console.warn('syncAnimeRating error:', e);
            }
        }

        // ====================================================================
        //  РЕКОМЕНДАЦІЇ / ПОДІБНІ (реальні дані з каталогу за жанром)
        // ====================================================================
        function relatedAnimeLabel(anime) {
            const title = String(anime?.title || '');
            if (/\b(?:сезон|season)\s*\d+/i.test(title)) return (title.match(/(?:сезон|season)\s*\d+/i) || [''])[0];
            if (/\b\d+(?:-й|-я|-е)?\s*сезон/i.test(title)) return (title.match(/\b\d+(?:-й|-я|-е)?\s*сезон/i) || [''])[0];
            if (/фільм|movie|film/i.test(title)) return 'Фільм';
            if (/OVA|ONA|спешл|special/i.test(title)) return 'OVA / Special';
            return anime?.type === 'movie' ? 'Фільм' : '';
        }

        function renderPosterCards(container, list, excludeUrl) {
            const items = (list || []).filter(a => a.url !== excludeUrl).slice(0, 8);
            if (!items.length) { container.closest('section').style.display = 'none'; return; }
            container.closest('section').style.display = '';
            container.innerHTML = items.map(a => {
                const poster = a.images?.jpg?.large_image_url || '';
                const relationLabel = relatedAnimeLabel(a);
                return `
              <div class="poster-card" data-url="${escapeHtml(a.url)}">
                <div class="poster-thumb" style="background-image:url(${poster})">
                  ${(a.status || relationLabel) ? `<div class="poster-badges">${a.status ? `<span class="pb-format">${escapeHtml(a.status)}</span>` : ''}${relationLabel ? `<span class="pb-format">${escapeHtml(relationLabel)}</span>` : ''}</div>` : ''}
                </div>
                <div class="poster-title">${escapeHtml(a.title)}</div>
              </div>`;
            }).join('');
            container.querySelectorAll('.poster-card').forEach(card => {
                card.addEventListener('click', () => openPlayerPage(card.dataset.url));
            });
        }

        // Прибираємо суфікси сезону/частини/типу з назви, щоб знайти інші сезони/фільми того ж аніме
        function baseTitleForRelated(title) {
            return (title || '')
                .replace(/\[[^\]]*\]/g, '')
                .replace(/[«»"'`]/g, '')
                .replace(/\b\d+(?:-й|-я|-е)?\s*сезон\b/gi, '')
                .replace(/\bсезон\s*\d+\b/gi, '')
                .replace(/\bseason\s*\d+\b/gi, '')
                .replace(/\bs\d+\b/gi, '')
                .replace(/\b\d+\s*частина\b/gi, '')
                .replace(/\bчастина\s*\d+\b/gi, '')
                .replace(/\b(фільм|movie|film|ova|ona|спешл|special)\b/gi, '')
                .replace(/[:\-–—]\s*$/, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function extractRelatedOrderNum(title) {
            const t = String(title || '');
            const m = t.match(/(\d+)(?:-й|-я|-е)?\s*сезон/i) || t.match(/сезон\s*(\d+)/i) ||
                t.match(/season\s*(\d+)/i) || t.match(/\bs(\d+)\b/i) ||
                t.match(/(\d+)\s*частина/i) || t.match(/частина\s*(\d+)/i);
            if (m) return parseInt(m[1], 10);
            if (/фільм|movie|film/i.test(t)) return 900;
            if (/ova|ona|спешл|special/i.test(t)) return 950;
            return 1;
        }

        let relatedSeasonsCache = {};
        async function fetchRelatedSeasons(anime) {
            const base = baseTitleForRelated(anime.title || anime.originalTitle);
            if (!base || base.length < 3) return [];
            const cacheKey = base.toLowerCase();
            if (relatedSeasonsCache[cacheKey] !== undefined) return relatedSeasonsCache[cacheKey];
            try {
                const results = await searchHikka(base, 1);
                const baseNorm = base.toLowerCase();
                const filtered = (results || []).filter(a => {
                    const otherBase = baseTitleForRelated(a.title).toLowerCase();
                    if (!otherBase) return false;
                    return otherBase === baseNorm || otherBase.includes(baseNorm) || baseNorm.includes(otherBase);
                });
                filtered.sort((a, b) => extractRelatedOrderNum(a.title) - extractRelatedOrderNum(b.title));
                relatedSeasonsCache[cacheKey] = filtered;
                return filtered;
            } catch (e) {
                console.warn('Related seasons fetch error:', e);
                relatedSeasonsCache[cacheKey] = [];
                return [];
            }
        }

        async function renderRelatedSeasons(anime) {
            const section = document.getElementById('relatedSeasonsSection');
            const el = document.getElementById('relatedSeasonsHscroll');
            if (section) section.style.display = 'none';
            if (!el) return;
            try {
                const list = await fetchRelatedSeasons(anime);
                renderPosterCards(el, list, anime.url);
            } catch (e) {
                console.warn('Related seasons render error:', e);
            }
        }

        async function renderRecommendationsAndSimilar(anime) {
            const recSection = document.getElementById('recommendationsSection');
            const recEl = document.getElementById('recommendationsHscroll');
            if (recSection) recSection.style.display = 'none';
            if (!recEl) return;
            const genres = anime.genres || [];
            // Пробуємо усі жанри по черзі, поки не знайдемо результат — раніше бралась
            // лише перша генра і секція просто лишалась порожньою/схованою, якщо жанр
            // не мапився або на сторінці жанру нічого не було.
            for (const g of genres) {
                const slug = GENRE_MAP[g];
                if (!slug) continue;
                try {
                    const list = await fetchHikkaByGenre(slug, 1);
                    const filtered = (list || []).filter(a => a.url !== anime.url);
                    if (filtered.length) {
                        renderPosterCards(recEl, filtered, anime.url);
                        return;
                    }
                } catch (e) {
                    console.warn('Recommendations/similar fetch error:', e);
                }
            }
            // Фолбек — якщо жоден жанр не дав результату, показуємо топ-100, щоб секція
            // не зникала непередбачувано в одних плеєрах і не з'являлась в інших.
            try {
                const top = await fetchHikkaTop100();
                renderPosterCards(recEl, top || [], anime.url);
            } catch (e) {
                console.warn('Recommendations fallback (top100) error:', e);
            }
        }

        document.getElementById('playerPageModal')?.addEventListener('click', e => {
            if (e.target === e.currentTarget) closePlayerPage();
        });
        document.getElementById('playerShareBtn').addEventListener('click', shareAnime);
        document.getElementById('watchBackBtn')?.addEventListener('click', closeWatchPage);
        document.getElementById('watchSourcePill')?.addEventListener('click', () => openBottomSheet('source'));
        document.getElementById('watchFilterPill')?.addEventListener('click', () => openBottomSheet('full'));

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
        //  ПОКАЗ ВИГЛЯДУ ЕПІЗОДІВ
        // ====================================================================
        function showViewMode(mode) {
            const grid = document.getElementById('episodeViewGrid');
            const compact = document.getElementById('episodeViewCompact');
            const classic = document.getElementById('episodeViewClassic');
            grid.classList.toggle('hidden', mode !== 'grid');
            compact.classList.toggle('hidden', mode !== 'compact');
            classic.classList.toggle('hidden', mode !== 'classic');
            document.querySelectorAll('.view-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.view === mode);
            });
            playerPageCurrentView = mode;
        }
        window.showViewMode = showViewMode;

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
            applyThemeVariant(getProfile());
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
            function updateBottomNav(route) {
                const items = nav.querySelectorAll('.bn-item[data-route]');
                items.forEach(item => {
                    item.classList.remove('active');
                    if (item.dataset.route === route) {
                        item.classList.add('active');
                    }
                });
                // rating активний для route === 'rating'
            }

            // Router.goTo використовує hashchange → updateBottomNav спрацює автоматично

            // Ховати nav коли відкритий плеєр
            const playerModal = document.getElementById('playerPageModal');
            const _origOpenPlayer = window.openPlayerPage;
            window.openPlayerPage = function(url, options = {}) {
                if (nav) nav.classList.add('hidden-nav');
                return _origOpenPlayer(url, options);
            };
            const _origClosePlayer = window.closePlayerPage;
            window.closePlayerPage = function() {
                if (nav) nav.classList.remove('hidden-nav');
                return _origClosePlayer();
            };

            // Ховати nav при заході в Суспільне, показувати на Рейтингу
            function handleNavVisibility(route) {
                // community — під-вкладка рейтингу: ховаємо nav
                // перевіряємо активну вкладку на сторінці rating
                const isCommunityActive = () => {
                    const panel = document.getElementById('rgPanelCommunity');
                    return panel && panel.classList.contains('active');
                };

                if (route === 'rating' && isCommunityActive()) {
                    nav.classList.add('hidden-nav');
                } else {
                    nav.classList.remove('hidden-nav');
                }
                updateBottomNav(route);
            }

            // Слухаємо кліки по вкладках рейтингу (Рейтинг ↔ Суспільне)
            document.addEventListener('click', e => {
                const tab = e.target.closest('.rg-main-tab');
                if (!tab) return;
                const hash = window.location.hash.slice(1) || 'main';
                const route = hash.split('?')[0];
                if (route !== 'rating') return;
                setTimeout(() => {
                    if (tab.dataset.panel === 'community') {
                        loadFeature('community').catch(error => console.warn('[VakDab] community feature preload:', error));
                        loadFeature('chat').catch(error => console.warn('[VakDab] chat feature preload:', error));
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

        // Глобальний генератор SVG-обличчя наліпки — currentColor, щоб підхоплював тему (світла/темна)
        function stickerFaceSvg(variant) {
            const s = 'stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"';
            const faces = [
                `<g><circle cx="32" cy="30" r="16" ${s} /><path d="M18 24c2-8 8-12 14-12s12 4 14 12" ${s} /><path d="M25 30q3 3 6 0M33 30q3 3 6 0" ${s} /><path d="M27 39q5 4 10 0" ${s} /><path d="M46 44l6-4 3 3-7 6z" ${s} /></g>`,
                `<g><path d="M20 20l4-8 6 8M44 20l-4-8-6 8" ${s} /><circle cx="32" cy="30" r="15" ${s} /><path d="M25 29l3 2M39 29l-3 2" ${s} /><path d="M29 40q3 2 6 0" ${s} /><path d="M46 12l3 5M53 10l1 6M49 8l4 4" ${s} /></g>`,
                `<g><path d="M14 42c-3-16 5-28 18-28s21 12 18 28" ${s} /><circle cx="32" cy="30" r="14" ${s} /><path d="M25 29q2 2 4 0M35 29q2 2 4 0" ${s} /><path d="M27 38q5 4 10 0" ${s} /></g>`,
                `<g><circle cx="32" cy="28" r="14" ${s} /><path d="M20 34c8 6 16 6 24 0" ${s} /><path d="M26 27h2M36 27h2" ${s} /><path d="M28 34q4 2 8 0" ${s} /><path d="M44 46q6-2 8-8" ${s} /></g>`,
                `<g><circle cx="14" cy="26" r="6" ${s} /><circle cx="50" cy="26" r="6" ${s} /><circle cx="32" cy="30" r="14" ${s} /><path d="M25 29l4 1" ${s} /><path d="M35 27q2 2 4 0" ${s} /><path d="M28 39q4 3 8 0" ${s} /></g>`,
                `<g><path d="M16 44c-4-18 4-30 16-30s20 12 16 30" ${s} /><circle cx="32" cy="29" r="13" ${s} /><path d="M26 29h3M35 29h3" ${s} /><path d="M29 37q3 2 6 0" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="15" ${s} /><path d="M18 15l6 4-6 4 6-4-6-4z" ${s} /><path d="M25 30q3 3 6 0M33 30q3 3 6 0" ${s} /><path d="M27 40q5 4 10 0" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="15" ${s} /><path d="M44 16l7-2-3 6z" ${s} /><path d="M25 29q2 2 4 0M35 29q2 2 4 0" ${s} /><path d="M27 39q5 3 10 0" ${s} /></g>`,
                `<g><path d="M18 18l6-8 4 8M46 18l-6-8-4 8" ${s} /><circle cx="32" cy="30" r="15" ${s} /><rect x="21" y="26" width="10" height="6" rx="2" ${s} /><rect x="33" y="26" width="10" height="6" rx="2" ${s} /><path d="M31 29h2" ${s} /><path d="M28 41q4 2 8 0" ${s} /></g>`,
                `<g><path d="M16 22l4-10 4 8 4-9 4 8 4-9 4 8 4-9 4 10" ${s} /><circle cx="32" cy="31" r="14" ${s} /><path d="M26 30q2-2 4 0M34 30q2-2 4 0" ${s} /><path d="M29 40q3-4 6 0" ${s} /><path d="M46 44l3 6M50 44l1 6M54 42l4 5" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="14" ${s} /><path d="M22 20q4-6 10-6M42 20q-4-6-10-6" ${s} /><path d="M26 40q6 4 12 0" ${s} /><path d="M24 30l-3 6M40 30l3 6" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="14" ${s} /><path d="M24 29q3 2 6 0M34 29q3 2 6 0" ${s} /><path d="M28 40q4 2 8 0" ${s} /><path d="M12 20q4-2 6 2M52 20q-4-2-6 2" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="14" ${s} /><path d="M25 29q2 2 4 0M35 29q2 2 4 0" ${s} /><path d="M27 39q5 3 10 0" ${s} /><circle cx="18" cy="17" r="3" ${s} /><circle cx="26" cy="12" r="3" ${s} /><circle cx="38" cy="12" r="3" ${s} /><circle cx="46" cy="17" r="3" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="15" ${s} /><path d="M25 28q2-2 4 0M35 28q2-2 4 0" ${s} /><path d="M25 38q7 6 14 0" ${s} /></g>`
            ];
            const idx = ((variant % faces.length) + faces.length) % faces.length;
            return `<svg viewBox="0 0 64 56" style="width:100%;height:100%;">${faces[idx]}</svg>`;
        }

        const STICKER_VARIANT_COUNT = 14;

        // Всі унікальні варіанти, якими юзер реально володіє (singles + все, що є всередині власних наборів)
        function getOwnedStickerVariants(data) {
            const set = new Set();
            (data.singles || []).forEach(s => { if (s.variant !== undefined && s.variant !== null) set.add(s.variant); });
            (data.sets || []).forEach(st => (st.variants || []).forEach(v => set.add(v)));
            return Array.from(set).sort((a, b) => a - b);
        }

        // Уніфікований ключ наліпки: вбудовані обличчя ідентифікуються номером варіанта,
        // власні завантажені фото — унікальним id (у них немає variant). Ключ дозволяє
        // однаково зберігати нік-бейдж/медалі незалежно від типу наліпки.
        function stickerKeyFor(s) {
            return s.image ? ('img:' + s.id) : ('v:' + s.variant);
        }
        function resolveStickerByKey(d, key) {
            if (!key) return null;
            if (key.startsWith('img:')) return (d.singles || []).find(x => x.id === key.slice(4)) || null;
            if (key.startsWith('v:')) return { variant: parseInt(key.slice(2), 10) };
            return null;
        }
        function renderStickerVisual(s, color) {
            if (s && s.image) return `<img src="${escapeHtml(s.image)}" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;border-radius:8px;background:transparent;">`;
            const safeColor = color || s?.color || 'var(--text)';
            return `<span class="sticker-svg-visual" style="color:${escapeHtml(safeColor)};display:block;width:100%;height:100%;">${stickerFaceSvg(s ? s.variant : 0)}</span>`;
        }
        export function renderStickerFaceByKey(d, key) {
            const s = resolveStickerByKey(d, key);
            return s ? renderStickerVisual(s, d.colors?.[key]) : '';
        }

        let _everyoneStickersCache = null;
        async function fetchEveryoneStickers() {
            if (_everyoneStickersCache) return _everyoneStickersCache;
            try {
                const { collection, query, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js');
                const q = query(collection(db, 'users'), limit(500));
                const snap = await getDocs(q);
                let sets = [];
                let singles = [];
                const users = [];
                snap.forEach(docSnap => {
                    const d = docSnap.data();
                    if (!d.stickers) return;
                    const ownerId = docSnap.id;
                    const ownerNickname = d.profile?.nickname || 'Користувач';
                    const ownerAvatar = d.profile?.avatar || '';
                    const source = Object.assign(getDefaultStickers(), d.stickers);
                    const sourceSingles = (Array.isArray(source.singles) ? source.singles : []).filter(single => single && single.image);
                    const sourceColors = source.colors || {};
                    sourceSingles.forEach(single => singles.push({
                        ...single,
                        _public: true,
                        _ownerId: ownerId,
                        _ownerNickname: ownerNickname,
                        _ownerAvatar: ownerAvatar,
                        _sourceColor: sourceColors[stickerKeyFor(single)] || ''
                    }));
                    (Array.isArray(source.sets) ? source.sets : []).forEach(set => {
                        const imageIds = (Array.isArray(set.images) ? set.images : []).filter(id => sourceSingles.some(single => single.id === id));
                        if (!imageIds.length) return;
                        sets.push({
                        ...set,
                        variants: [],
                        images: imageIds,
                        _public: true,
                        _ownerId: ownerId,
                        _ownerNickname: ownerNickname,
                        _ownerAvatar: ownerAvatar,
                        _sourceSingles: sourceSingles,
                        _sourceColors: sourceColors
                        });
                    });
                    users.push({ id: ownerId, nickname: ownerNickname, avatar: ownerAvatar, stickers: source });
                });
                // Фільтруємо дублікати за ID
                const uniqueSets = [];
                const setIds = new Set();
                sets.forEach(s => { if (s.id && !setIds.has(s.id)) { setIds.add(s.id); uniqueSets.push(s); } });

                const uniqueSingles = [];
                const singleIds = new Set();
                singles.forEach(s => { if (s.id && !singleIds.has(s.id)) { singleIds.add(s.id); uniqueSingles.push(s); } });

                _everyoneStickersCache = { sets: uniqueSets, singles: uniqueSingles, users };
                return _everyoneStickersCache;
            } catch (e) {
                console.error('[Stickers] Global fetch failed:', e);
                return { sets: [], singles: [], users: [] };
            }
        }

        window.renderStickersPage = function() {
            const container = document.getElementById('stickersPageContainer');
            if (!container) return;

            if (!window.stickersUI) {
                window.stickersUI = {
                    activeFilter: 'Усі',
                    view: 'grid',
                    search: '',
                    step: null,           // null | 'choose' | 'single' | 'pack' | 'actions' | 'setView'
                    pickedSingle: null,
                    pickedForPack: [],
                    packName: '',
                    actionsTarget: null   // { type: 'single'|'set', id }
                };
            }
            const ui = window.stickersUI;

            let stickersDataSanitized = false;
            function data() {
                const current = Storage.getStickers();
                if (!stickersDataSanitized) {
                    stickersDataSanitized = true;
                    const legacyKeys = new Set((current.singles || []).filter(s => s && !s.image && s.variant !== undefined).map(stickerKeyFor));
                    current.singles = (current.singles || []).filter(s => s && s.image);
                    current.sets = (current.sets || []).map(st => ({ ...st, variants: [], images: (st.images || []).filter(id => current.singles.some(s => s.id === id)) })).filter(st => st.images.length);
                    current.medals = (current.medals || []).filter(key => !legacyKeys.has(key));
                    if (current.nickBadge && legacyKeys.has(current.nickBadge)) current.nickBadge = null;
                    if (current.colors) legacyKeys.forEach(key => delete current.colors[key]);
                    if (legacyKeys.size) Storage.setStickers(current);
                }
                return current;
            }
            function saveData(d) {
                Storage.setStickers(d);
                if (Router.currentRoute === 'profile') renderProfilePage();
            }

            function Tile(variant, opts = {}) {
                const { selected = false, size = '' } = opts;
                return `
                    <button type="button" class="aspect-square rounded-xl border flex items-center justify-center p-2.5 shrink-0 relative transition-all ${size}"
                        style="background:${selected ? 'var(--accent)' : 'var(--tag-bg)'};border-color:${selected ? 'var(--accent)' : 'var(--border)'};color:${selected ? 'var(--accent-text)' : 'var(--text)'};"
                        data-variant="${variant}">
                        ${stickerFaceSvg(variant)}
                        ${selected ? `<span class="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style="background:var(--accent-text);color:var(--accent);"><i class="fas fa-check" style="font-size:9px;"></i></span>` : ''}
                    </button>
                `;
            }

            const FILTERS = ['Усі', 'Набори', 'Одиночні', 'Улюблені', 'Користувачі'];

                function matchesSearch(title) {
                    if (!ui.search.trim()) return true;
                    return title.toLowerCase().includes(ui.search.trim().toLowerCase());
                }

                function setStickerItems(st, localData) {
                    const sourceSingles = [...(localData.singles || []), ...(st._sourceSingles || [])];
                    const byId = id => sourceSingles.find(s => s.id === id);
                    return [
                        ...(st.variants || []).map(v => ({ variant: v, color: st._sourceColors?.['v:' + v] || '' })),
                        ...(st.images || []).map(id => byId(id)).filter(Boolean)
                    ];
                }

                function render() {
                const d = data();
                const owned = getOwnedStickerVariants(d);
                const showUsers = ui.activeFilter === 'Користувачі';
                const showSets = !showUsers && (ui.activeFilter === 'Усі' || ui.activeFilter === 'Набори' || (ui.activeFilter === 'Улюблені'));
                const showSingles = !showUsers && (ui.activeFilter === 'Усі' || ui.activeFilter === 'Одиночні' || (ui.activeFilter === 'Улюблені'));

                let visibleSets = (ui.activeFilter === 'Одиночні') ? [] : d.sets.filter(st => matchesSearch(st.title));
                if (ui.activeFilter === 'Улюблені') visibleSets = visibleSets.filter(st => st.favorite);

                let visibleSingles = (ui.activeFilter === 'Набори') ? [] : d.singles.filter(s => matchesSearch('наліпка ' + (s.variant + 1)));
                if (ui.activeFilter === 'Улюблені') visibleSingles = visibleSingles.filter(s => s.favorite);

                if (ui.activeFilter === 'Усі') {
                    const everyone = _everyoneStickersCache || { sets: [], singles: [] };
                    const mySetIds = new Set(d.sets.map(s => s.id));
                    everyone.sets.forEach(s => {
                        if (!mySetIds.has(s.id) && matchesSearch(s.title)) {
                            visibleSets.push(s);
                        }
                    });
                    const mySingleIds = new Set(d.singles.map(s => s.id));
                    everyone.singles.forEach(s => {
                        if (!mySingleIds.has(s.id) && matchesSearch(s.image ? 'власна' : 'наліпка ' + (s.variant + 1))) {
                            visibleSingles.push(s);
                        }
                    });
                    if (!_everyoneStickersCache) {
                        fetchEveryoneStickers().then(() => render());
                    }
                }

                const everyoneUsers = (_everyoneStickersCache?.users || []).filter(u => matchesSearch(u.nickname));
                const usersSection = showUsers ? (everyoneUsers.length ? everyoneUsers.map(u => {
                    const us = u.stickers || getDefaultStickers();
                    const userSingles = us.singles || [];
                    const userSets = us.sets || [];
                    const userStickers = userSingles.length ? userSingles : (userSets.flatMap(st => (st.variants || []).map(v => ({ variant: v }))).slice(0, 28));
                    return `<article class="sticker-user-card">
                        <div class="sticker-user-card__head"><div class="sticker-user-avatar">${u.avatar ? `<img src="${escapeHtml(u.avatar)}" alt="">` : `<span>${escapeHtml(u.nickname.charAt(0).toUpperCase())}</span>`}</div><div><strong>${escapeHtml(u.nickname)}</strong><small>${userStickers.length} наліпок</small></div></div>
                        <div class="sticker-user-card__grid">${userStickers.slice(0, 28).map(st => `<div class="sticker-user-card__item">${renderStickerVisual(st, us.colors?.[stickerKeyFor(st)])}</div>`).join('') || '<span class="sticker-empty-note">Наліпок ще немає</span>'}</div>
                    </article>`;
                }).join('') : '<div class="sticker-empty-note">Інших користувачів із наліпками поки немає.</div>') : '';
                if (showUsers && !_everyoneStickersCache) fetchEveryoneStickers().then(() => render());
                const nothingAtAll = !showUsers && d.singles.length === 0 && d.sets.length === 0;
                const nothingVisible = !showUsers && visibleSets.length === 0 && visibleSingles.length === 0;

                container.innerHTML = `
                    <div class="stickers-page" style="max-width:480px;margin:0 auto;color:var(--text);font-family:inherit;">
                        <div class="filter-page__header" style="margin-bottom:0.9rem;">
                            <button class="filter-page__back" id="stickersBackBtn" aria-label="Назад"><i class="fas fa-arrow-left"></i></button>
                            <div style="flex:1;">
                                <div class="filter-page__title">Наліпки</div>
                            </div>
                            <button id="stickersToggleView" class="filter-page__back" aria-label="Вигляд">
                                <i class="fas ${ui.view === 'grid' ? 'fa-list' : 'fa-table-cells'}"></i>
                            </button>
                        </div>

                        <div style="display:flex;align-items:center;gap:0.6rem;background:var(--tag-bg);border:1px solid var(--border);border-radius:14px;padding:0.7rem 0.9rem;margin-bottom:0.8rem;">
                            <i class="fas fa-search" style="color:var(--text-muted);"></i>
                            <input type="text" id="stickersSearchInput" placeholder="Пошук наборів і наліпок..." value="${escapeHtml(ui.search)}"
                                style="background:none;border:none;outline:none;color:var(--text);font-family:inherit;font-size:0.9rem;width:100%;">
                        </div>

                        <div style="display:flex;gap:0.5rem;overflow-x:auto;margin-bottom:1rem;padding-bottom:2px;">
                            ${FILTERS.map(f => `
                                <button class="sticker-filter-btn" data-filter="${f}" style="flex-shrink:0;padding:0.5rem 1rem;border-radius:999px;font-size:0.8rem;font-weight:700;border:1px solid ${ui.activeFilter === f ? 'var(--accent)' : 'var(--border)'};background:${ui.activeFilter === f ? 'var(--accent)' : 'var(--surface)'};color:${ui.activeFilter === f ? 'var(--accent-text)' : 'var(--text-secondary)'};white-space:nowrap;transition:all var(--transition);">
                                    ${f === 'Улюблені' ? '<i class="fas fa-star" style="font-size:0.7rem;margin-right:0.3rem;"></i>' : ''}${f}
                                </button>
                            `).join('')}
                        </div>

                        <button id="stickersOpenAdd" style="width:100%;margin-bottom:1.1rem;border:2px dashed var(--border-hover);border-radius:16px;padding:1.3rem;display:flex;flex-direction:column;align-items:center;gap:0.5rem;background:none;cursor:pointer;color:var(--text);transition:all var(--transition);">
                            <div style="width:44px;height:44px;border-radius:50%;border:2px solid var(--text);display:flex;align-items:center;justify-content:center;">
                                <i class="fas fa-plus"></i>
                            </div>
                            <span style="font-size:0.88rem;font-weight:700;">Додати наліпку</span>
                            <span style="font-size:0.75rem;color:var(--text-muted);">Одну наліпку або цілий набір</span>
                        </button>

                        ${showUsers ? `<section class="stickers-users-section"><div class="stickers-section-heading"><h2>Усі наліпки користувачів</h2><span>${everyoneUsers.length}</span></div>${usersSection}</section>` : ''}

                        ${nothingAtAll ? `
                            <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-muted);">
                                <i class="fas fa-icons" style="font-size:2rem;margin-bottom:0.8rem;display:block;"></i>
                                У вас поки немає наліпок. Додайте першу!
                            </div>
                        ` : nothingVisible ? `
                            <div style="text-align:center;padding:2rem 1rem;color:var(--text-muted);">Нічого не знайдено</div>
                        ` : `
                            ${showSets && visibleSets.length ? `
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.7rem;">
                                    <h2 style="font-size:0.95rem;font-weight:800;">Набори</h2>
                                    <span style="font-size:0.72rem;color:var(--text-muted);background:var(--tag-bg);border-radius:999px;padding:0.15rem 0.6rem;">${visibleSets.length}</span>
                                </div>
                                <div style="display:flex;flex-direction:column;gap:0.7rem;margin-bottom:1.3rem;">
                                    ${visibleSets.map(st => `
                                        <div style="border:1px solid var(--border);border-radius:16px;padding:0.9rem;background:var(--surface);">
                                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.7rem;">
                                                <div>
                                                    <div style="font-size:0.92rem;font-weight:800;">${escapeHtml(st.title)}</div>
                                                    <div style="font-size:0.75rem;color:var(--text-muted);">${setStickerItems(st, d).length} наліпок${st._public ? ` · ${escapeHtml(st._ownerNickname || 'Користувач')}` : ''}</div>
                                                </div>
                                                <button class="sticker-set-actions${st._public ? ' sticker-public-set-add' : ''}" data-set-id="${st.id}" ${st._public ? `data-public-owner="${escapeHtml(st._ownerId || '')}"` : ''} style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:var(--tag-bg);color:var(--text);cursor:pointer;">
                                                    <i class="fas ${st._public ? 'fa-plus' : (st.favorite ? 'fa-star' : 'fa-ellipsis-vertical')}"></i>
                                                </button>
                                            </div>
                                            <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:0.4rem;">
                                                ${setStickerItems(st, d).slice(0, 6).map(s => `<div style="aspect-ratio:1;border-radius:10px;background:${s.image ? 'transparent' : 'var(--tag-bg)'};border:${s.image ? 'none' : '1px solid var(--border)'};padding:${s.image ? '0' : '0.35rem'};overflow:hidden;">${renderStickerVisual(s, s.color)}</div>`).join('')}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}

                            ${showSingles && visibleSingles.length ? `
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.7rem;">
                                    <h2 style="font-size:0.95rem;font-weight:800;">Одиночні наліпки</h2>
                                    <span style="font-size:0.72rem;color:var(--text-muted);background:var(--tag-bg);border-radius:999px;padding:0.15rem 0.6rem;">${visibleSingles.length}</span>
                                </div>
                                <div style="display:grid;grid-template-columns:${ui.view === 'grid' ? 'repeat(4,1fr)' : '1fr'};gap:0.6rem;margin-bottom:1.5rem;">
                                                                            ${visibleSingles.map(s => { const sKey = stickerKeyFor(s); const sLabel = s.image ? 'Власна наліпка' : ('Наліпка #' + (s.variant + 1)); return ui.view === 'grid' ? `
                                        <button class="sticker-single-tile${s._public ? ' sticker-public-single-add' : ''}" data-single-id="${s.id}" ${s._public ? `data-public-owner="${escapeHtml(s._ownerId || '')}"` : ''} style="aspect-ratio:1;border-radius:14px;border:${s.image ? 'none' : '1px solid var(--border)'};background:${s.image ? 'transparent' : 'var(--tag-bg)'};padding:${s.image ? '0' : '0.6rem'};position:relative;cursor:pointer;transition:all var(--transition);overflow:hidden;">
                                            ${renderStickerVisual(s)}
                                            ${s.favorite ? `<i class="fas fa-star" style="position:absolute;top:6px;right:6px;font-size:0.65rem;color:#fff;text-shadow:0 0 3px rgba(0,0,0,0.6);"></i>` : ''}
                                            ${d.nickBadge === sKey ? `<i class="fas fa-id-badge" style="position:absolute;bottom:6px;left:6px;font-size:0.65rem;color:#fff;text-shadow:0 0 3px rgba(0,0,0,0.6);"></i>` : ''}
                                            ${d.medals.includes(sKey) ? `<i class="fas fa-medal" style="position:absolute;bottom:6px;right:6px;font-size:0.65rem;color:#fff;text-shadow:0 0 3px rgba(0,0,0,0.6);"></i>` : ''}
                                        </button>
                                    ` : `
                                        <button class="sticker-single-tile" data-single-id="${s.id}" style="display:flex;align-items:center;gap:0.8rem;border:1px solid var(--border);border-radius:14px;padding:0.6rem 0.8rem;background:var(--surface);cursor:pointer;text-align:left;">
                                            <div style="width:42px;height:42px;flex-shrink:0;background:${s.image ? 'transparent' : 'var(--tag-bg)'};border-radius:10px;padding:${s.image ? '0' : '0.4rem'};overflow:hidden;">${renderStickerVisual(s)}</div>
                                            <div style="flex:1;">
                                                <div style="font-size:0.85rem;font-weight:700;">${sLabel}</div>
                                                <div style="font-size:0.72rem;color:var(--text-muted);">
                                                    ${s.favorite ? '<i class="fas fa-star"></i> Улюблена' : ''}
                                                    ${d.nickBadge === sKey ? ' · Біля ніку' : ''}
                                                    ${d.medals.includes(sKey) ? ' · Медаль' : ''}
                                                </div>
                                            </div>
                                            <i class="fas fa-chevron-right" style="color:var(--text-muted);"></i>
                                        </button>
                                    `; }).join('')}
                                </div>
                            ` : ''}
                        `}

                        ${ui.step ? renderOverlay(d, owned) : ''}
                    </div>
                `;
                bindEvents(d, owned);
            }

            function renderOverlay(d, owned) {
                return `
                    <div style="position:fixed;inset:0;z-index:1001;display:flex;align-items:flex-end;justify-content:center;">
                        <div id="stickersOverlayBg" style="position:absolute;inset:0;background:rgba(0,0,0,0.5);"></div>
                        <div style="position:relative;width:100%;max-width:480px;background:var(--surface);border-radius:24px 24px 0 0;padding:1rem 1.1rem 1.6rem;max-height:85%;overflow-y:auto;animation:fadeInUp 0.25s ease;">
                            <div style="width:40px;height:5px;background:var(--border-hover);border-radius:999px;margin:0 auto 1rem;"></div>
                            ${renderOverlayContent(d, owned)}
                        </div>
                    </div>
                `;
            }

            function renderOverlayContent(d, owned) {
                if (ui.step === 'choose') {
                    return `
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                            <h3 style="font-size:1.05rem;font-weight:800;">Що додати?</h3>
                            <button id="stickersCloseOverlay" style="color:var(--text-muted);background:none;border:none;font-size:1.1rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:0.7rem;">
                            <button id="stickersChooseSingle" style="display:flex;align-items:center;gap:0.8rem;border:1px solid var(--border);border-radius:16px;padding:0.9rem;background:var(--tag-bg);cursor:pointer;text-align:left;color:var(--text);">
                                <div style="width:44px;height:44px;border-radius:12px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-face-smile"></i></div>
                                <div><div style="font-weight:700;font-size:0.88rem;">Власне фото</div><div style="font-size:0.75rem;color:var(--text-muted);">Завантажити одне фото як наліпку</div></div>
                            </button>
                            <button id="stickersChoosePack" style="display:flex;align-items:center;gap:0.8rem;border:1px solid var(--border);border-radius:16px;padding:0.9rem;background:var(--tag-bg);cursor:pointer;text-align:left;color:var(--text);">
                                <div style="width:44px;height:44px;border-radius:12px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-layer-group"></i></div>
                                <div><div style="font-weight:700;font-size:0.88rem;">Набір наліпок</div><div style="font-size:0.75rem;color:var(--text-muted);">Створити іменований набір з кількох наліпок</div></div>
                            </button>
                        </div>
                    `;
                }
                if (ui.step === 'single') {
                    return `
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                            <button id="stickersBackToChoose" style="color:var(--text-muted);background:none;border:none;font-size:1rem;cursor:pointer;"><i class="fas fa-arrow-left"></i></button>
                            <h3 style="font-size:1rem;font-weight:800;">Виберіть наліпку</h3>
                            <button id="stickersCloseOverlay" style="color:var(--text-muted);background:none;border:none;font-size:1.1rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.6rem;margin-bottom:1.2rem;">
                            ${Array.from({ length: STICKER_VARIANT_COUNT }, (_, i) => i).map(v => Tile(v, { selected: ui.pickedSingle === v })).join('')}
                        </div>
                        <button id="stickersConfirmSingle" ${ui.pickedSingle === null ? 'disabled' : ''} style="width:100%;padding:0.9rem;border-radius:14px;border:none;font-weight:800;font-size:0.9rem;cursor:pointer;background:var(--accent);color:var(--accent-text);opacity:${ui.pickedSingle === null ? 0.5 : 1};transition:all var(--transition);">
                            Додати наліпку
                        </button>
                    `;
                }
                if (ui.step === 'pack') {
                    const allOwned = d.singles.filter(Boolean);

                    return `
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                            <button id="stickersBackToChoose" style="color:var(--text-muted);background:none;border:none;font-size:1rem;cursor:pointer;"><i class="fas fa-arrow-left"></i></button>
                            <h3 style="font-size:1rem;font-weight:800;">Новий набір</h3>
                            <button id="stickersCloseOverlay" style="color:var(--text-muted);background:none;border:none;font-size:1.1rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                        </div>
                        <div style="margin-bottom:1rem;">
                            <label style="display:block;font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:0.4rem;">Назва набору</label>
                            <input id="stickersPackNameInput" type="text" maxlength="30" placeholder="Наприклад: Мої улюблені" value="${escapeHtml(ui.packName)}"
                                style="width:100%;background:var(--tag-bg);border:1.5px solid var(--border);border-radius:12px;padding:0.75rem 0.9rem;color:var(--text);font-family:inherit;font-size:0.9rem;outline:none;">
                        </div>
                        <label style="display:block;font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:0.5rem;">Виберіть свої одиночні наліпки (${ui.pickedForPack.length})</label>
                        ${allOwned.length ? '' : '<div style="padding:1rem;border:1px dashed var(--border);border-radius:14px;color:var(--text-muted);text-align:center;margin-bottom:1rem;">Спочатку додайте власне фото як одиночну наліпку.</div>'}
                        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.6rem;margin-bottom:1.2rem;max-height:300px;overflow-y:auto;padding:2px;">
                            ${allOwned.map(s => {
                                const v = s.variant !== undefined ? s.variant : null;
                                const isSelected = v !== null ? ui.pickedForPack.includes(v) : ui.pickedForPack.includes('img:' + s.id);
                                return `
                                    <button type="button" class="aspect-square rounded-xl border flex items-center justify-center p-2.5 shrink-0 relative transition-all"
                                        style="background:${isSelected ? 'var(--accent)' : 'var(--tag-bg)'};border-color:${isSelected ? 'var(--accent)' : 'var(--border)'};color:${isSelected ? 'var(--accent-text)' : 'var(--text)'};"
                                        data-pack-sticker="${v !== null ? v : 'img:' + s.id}">
                                        <div style="width:100%;height:100%;padding:${s.image ? '0' : '0.2rem'};">${renderStickerVisual(s)}</div>
                                        ${isSelected ? `<span class="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style="background:var(--accent-text);color:var(--accent);"><i class="fas fa-check" style="font-size:9px;"></i></span>` : ''}
                                    </button>
                                `;
                            }).join('')}
                        </div>
                        <button id="stickersConfirmPack" ${!ui.packName.trim() || ui.pickedForPack.length === 0 ? 'disabled' : ''} style="width:100%;padding:0.9rem;border-radius:14px;border:none;font-weight:800;font-size:0.9rem;cursor:pointer;background:var(--accent);color:var(--accent-text);opacity:${!ui.packName.trim() || ui.pickedForPack.length === 0 ? 0.5 : 1};transition:all var(--transition);">
                            Створити набір
                        </button>
                    `;
                }
                if (ui.step === 'actions' && ui.actionsTarget) {
                    const t = ui.actionsTarget;
                    if (t.type === 'single') {
                        const s = d.singles.find(x => x.id === t.id);
                        if (!s) return '';
                        const sKey = stickerKeyFor(s);
                        const isNick = d.nickBadge === sKey;
                        const isMedal = d.medals.includes(sKey);
                        return `
                            <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:1.2rem;">
                                <div style="width:56px;height:56px;background:var(--tag-bg);border-radius:14px;padding:${s.image ? '0' : '0.6rem'};flex-shrink:0;overflow:hidden;">${renderStickerVisual(s)}</div>
                                <div style="font-size:1rem;font-weight:800;">${s.image ? 'Власна наліпка' : ('Наліпка #' + (s.variant + 1))}</div>
                            </div>
                            <label class="sticker-color-control">Колір стікера та blur <input id="stickerColorInput" type="color" value="${escapeHtml(d.colors?.[sKey] || '#7c8494')}" title="Змінити колір стікера"><span>фон — тільки розмиття</span></label>
                            <div style="display:flex;flex-direction:column;gap:0.5rem;">
                                ${s.image ? '<button class="sticker-action-btn" data-act="remove-bg" data-single-id="' + s.id + '">' + sIconRow('fa-wand-magic-sparkles', 'Видалити фон AI') + '</button>' : ''}
                                <button class="sticker-action-btn" data-act="favorite" data-single-id="${s.id}">${sIconRow(s.favorite ? 'fa-star' : 'fa-star', s.favorite ? 'Прибрати з улюблених' : 'Додати в улюблені')}</button>
                                <button class="sticker-action-btn" data-act="nick" data-single-id="${s.id}">${sIconRow('fa-id-badge', isNick ? 'Прибрати біля ніку' : 'Встановити біля ніку')}</button>
                                <button class="sticker-action-btn" data-act="medal" data-single-id="${s.id}">${sIconRow('fa-medal', isMedal ? 'Прибрати медаль' : 'Додати як медаль')}</button>
                                <button class="sticker-action-btn" data-act="delete" data-single-id="${s.id}" style="border-style:dashed;">${sIconRow('fa-trash', 'Видалити наліпку')}</button>
                            </div>
                        `;
                    }
                    if (t.type === 'set') {
                        const st = d.sets.find(x => x.id === t.id);
                        if (!st) return '';
                        return `
                            <div style="margin-bottom:1rem;">
                                <div style="font-size:1rem;font-weight:800;margin-bottom:0.7rem;">${escapeHtml(st.title)}</div>
                                <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.5rem;margin-bottom:1rem;">
                                    ${[...(st.variants || []).map(v => ({variant: v})), ...(st.images || []).map(id => d.singles.find(s => s.id === id))].filter(Boolean).map(s => {
                                        const sKey = stickerKeyFor(s);
                                        return `<div style="aspect-ratio:1;background:${s.image ? 'transparent' : 'var(--tag-bg)'};border:${s.image ? 'none' : '1px solid var(--border)'};border-radius:10px;padding:${s.image ? '0' : '0.35rem'};position:relative;overflow:hidden;">
                                            ${renderStickerVisual(s)}
                                            ${d.nickBadge === sKey ? `<i class="fas fa-id-badge" style="position:absolute;bottom:2px;left:2px;font-size:0.55rem;color:#fff;text-shadow:0 0 2px #000;"></i>` : ''}
                                            ${d.medals.includes(sKey) ? `<i class="fas fa-medal" style="position:absolute;bottom:2px;right:2px;font-size:0.55rem;color:#fff;text-shadow:0 0 2px #000;"></i>` : ''}
                                        </div>`;
                                    }).join('')}
                                </div>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:0.5rem;">
                                <button class="sticker-action-btn" data-act="favorite-set" data-set-id="${st.id}">${sIconRow('fa-star', st.favorite ? 'Прибрати з улюблених' : 'Додати в улюблені')}</button>
                                <button class="sticker-action-btn" data-act="delete-set" data-set-id="${st.id}" style="border-style:dashed;">${sIconRow('fa-trash', 'Видалити набір')}</button>
                            </div>
                            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.8rem;">Щоб встановити конкретну наліпку з набору біля ніку чи як медаль — спочатку додайте її окремо через «Додати наліпку → Одиночна».</div>
                        `;
                    }
                }
                return '';
            }

            function sIconRow(icon, label) {
                return `<span style="display:flex;align-items:center;gap:0.7rem;padding:0.85rem 1rem;border:1px solid var(--border);border-radius:14px;background:var(--tag-bg);color:var(--text);font-size:0.85rem;font-weight:600;"><i class="fas ${icon}" style="width:18px;"></i>${label}</span>`;
            }

            function closeOverlay() {
                ui.step = null;
                ui.pickedSingle = null;
                ui.pickedForPack = [];
                ui.packName = '';
                ui.actionsTarget = null;
                render();
            }

            function makeLocalStickerId(prefix = 'sng_') {
                return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
            }

            function importPublicSingle(remoteId) {
                const remote = _everyoneStickersCache?.singles?.find(s => s.id === remoteId);
                if (!remote) return;
                const cur = data();
                if (remote.variant !== undefined && cur.singles.some(s => s.variant === remote.variant)) {
                    showToast('Ця наліпка вже є у вашій колекції');
                    return;
                }
                const copy = { ...remote, id: makeLocalStickerId(), _public: undefined, _ownerId: undefined, _ownerNickname: undefined, _ownerAvatar: undefined, _sourceColor: undefined, favorite: false, addedAt: Date.now() };
                delete copy._public; delete copy._ownerId; delete copy._ownerNickname; delete copy._ownerAvatar; delete copy._sourceColor;
                cur.singles.unshift(copy);
                saveData(cur);
                showToast('Наліпку додано до вашої колекції');
                render();
            }

            function importPublicSet(remoteId) {
                const remote = _everyoneStickersCache?.sets?.find(s => s.id === remoteId);
                if (!remote) return;
                const cur = data();
                const already = cur.sets.some(s => s.sourceSetId === remote.id && s.sourceOwnerId === remote._ownerId);
                if (already) {
                    showToast('Цей набір вже є у вашій колекції');
                    return;
                }
                const sourceSingles = remote._sourceSingles || [];
                const imageIdMap = {};
                sourceSingles.filter(s => (remote.images || []).includes(s.id)).forEach(source => {
                    if (!source.image) return;
                    const copy = { ...source, id: makeLocalStickerId(), favorite: false, addedAt: Date.now() };
                    delete copy._public; delete copy._ownerId; delete copy._ownerNickname; delete copy._ownerAvatar; delete copy._sourceColor;
                    cur.singles.unshift(copy);
                    imageIdMap[source.id] = copy.id;
                });
                cur.sets.unshift({
                    id: makeLocalStickerId('set_'),
                    title: remote.title || 'Набір наліпок',
                    variants: [...(remote.variants || [])],
                    images: (remote.images || []).map(id => imageIdMap[id]).filter(Boolean),
                    favorite: false,
                    addedAt: Date.now(),
                    sourceSetId: remote.id,
                    sourceOwnerId: remote._ownerId || ''
                });
                saveData(cur);
                showToast('Набір додано до вашої колекції');
                render();
            }

            function bindEvents(d, owned) {
                document.getElementById('stickersBackBtn')?.addEventListener('click', () => {
                    if (history.length > 1) history.back(); else Router.goTo('profile');
                });
                document.getElementById('stickersToggleView')?.addEventListener('click', () => {
                    ui.view = ui.view === 'grid' ? 'list' : 'grid';
                    render();
                });
                document.getElementById('stickersSearchInput')?.addEventListener('input', (e) => {
                    ui.search = e.target.value;
                    render();
                });
                document.querySelectorAll('.sticker-filter-btn').forEach(btn => {
                    btn.addEventListener('click', () => { ui.activeFilter = btn.dataset.filter; render(); });
                });
                document.getElementById('stickersOpenAdd')?.addEventListener('click', () => { ui.step = 'choose'; render(); });
                document.getElementById('stickersOverlayBg')?.addEventListener('click', closeOverlay);
                document.getElementById('stickersCloseOverlay')?.addEventListener('click', closeOverlay);
                document.getElementById('stickersBackToChoose')?.addEventListener('click', () => { ui.step = 'choose'; render(); });
                document.getElementById('stickersChooseSingle')?.addEventListener('click', () => {
                    ui.step = null;
                    render();
                    document.getElementById('stickerFileInput')?.click();
                });
                document.getElementById('stickersChoosePack')?.addEventListener('click', () => { ui.step = 'pack'; render(); });
                document.getElementById('stickersChooseUpload')?.addEventListener('click', () => {
                    ui.step = null;
                    render();
                    document.getElementById('stickerFileInput')?.click();
                });

                if (ui.step === 'single') {
                    document.querySelectorAll('[data-variant]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            ui.pickedSingle = parseInt(btn.dataset.variant, 10);
                            render();
                        });
                    });
                }
                if (ui.step === 'pack') {
                    document.querySelectorAll('[data-pack-sticker]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const val = btn.dataset.packSticker;
                            const stickerVal = val.startsWith('img:') ? val : parseInt(val, 10);
                            if (ui.pickedForPack.includes(stickerVal)) {
                                ui.pickedForPack = ui.pickedForPack.filter(x => x !== stickerVal);
                            } else {
                                ui.pickedForPack.push(stickerVal);
                            }
                            render();
                        });
                    });
                }

                document.getElementById('stickersPackNameInput')?.addEventListener('input', (e) => {
                    ui.packName = e.target.value;
                    const btn = document.getElementById('stickersConfirmPack');
                    if (btn) { btn.disabled = !ui.packName.trim() || ui.pickedForPack.length === 0; btn.style.opacity = btn.disabled ? '0.5' : '1'; }
                });

                document.getElementById('stickersConfirmSingle')?.addEventListener('click', () => {
                    if (ui.pickedSingle === null) return;
                    const cur = data();
                    const stickerId = 'sng_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                    const stickerKey = 'v:' + ui.pickedSingle;
                    cur.singles.unshift({ id: stickerId, variant: ui.pickedSingle, favorite: false, addedAt: Date.now() });
                    if (!Array.isArray(cur.medals)) cur.medals = [];
                    if (!cur.medals.includes(stickerKey) && cur.medals.length < PROFILE_STICKER_SLOTS) cur.medals.push(stickerKey);
                    if (!cur.colors) cur.colors = {};
                    if (!cur.colors[stickerKey]) cur.colors[stickerKey] = '#7c8494';
                    saveData(cur);
                    showToast(cur.medals.includes(stickerKey) ? 'Наліпку додано в профіль' : 'Наліпку додано');
                    closeOverlay();
                });

                document.getElementById('stickersConfirmPack')?.addEventListener('click', () => {
                    if (!ui.packName.trim() || ui.pickedForPack.length === 0) return;
                    const cur = data();
                    // Підтримка і варіантів (числа) і власних зображень (img:id)
                    const packVariants = ui.pickedForPack.filter(x => typeof x === 'number');
                    const packImages = ui.pickedForPack.filter(x => typeof x === 'string' && x.startsWith('img:'));

                    cur.sets.unshift({
                        id: 'set_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                        title: ui.packName.trim(),
                        variants: packVariants,
                        images: packImages.map(x => x.slice(4)), // зберігаємо тільки ID
                        favorite: false,
                        addedAt: Date.now()
                    });
                    saveData(cur);
                    showToast('Набір створено');
                    closeOverlay();
                });

                document.querySelectorAll('.sticker-public-single-add').forEach(el => {
                    el.addEventListener('click', () => importPublicSingle(el.dataset.singleId));
                });
                document.querySelectorAll('.sticker-public-set-add').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        importPublicSet(el.dataset.setId);
                    });
                });
                document.querySelectorAll('.sticker-single-tile:not(.sticker-public-single-add)').forEach(el => {
                    el.addEventListener('click', () => {
                        ui.step = 'actions';
                        ui.actionsTarget = { type: 'single', id: el.dataset.singleId };
                        render();
                    });
                });
                document.querySelectorAll('.sticker-set-actions:not(.sticker-public-set-add)').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        ui.step = 'actions';
                        ui.actionsTarget = { type: 'set', id: el.dataset.setId };
                        render();
                    });
                });

                document.getElementById('stickerColorInput')?.addEventListener('change', e => {
                    const target = ui.actionsTarget;
                    const cur = data();
                    const sticker = target && cur.singles.find(x => x.id === target.id);
                    if (sticker) {
                        if (!cur.colors) cur.colors = {};
                        cur.colors[stickerKeyFor(sticker)] = e.target.value;
                        saveData(cur);
                        render();
                    }
                });

                document.querySelectorAll('.sticker-action-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const act = btn.dataset.act;
                        const cur = data();
                        if (act === 'remove-bg') {
                            const s = cur.singles.find(x => x.id === btn.dataset.singleId);
                            if (!s?.image) return;
                            btn.disabled = true;
                            showToastProgress('AI готує видалення фону…');
                            try {
                                const response = await fetch(s.image, { mode: 'cors', cache: 'no-store' });
                                if (!response.ok) throw new Error('Не вдалося завантажити зображення наліпки');
                                const sourceBlob = await response.blob();
                                const processedBlob = await removeStickerBackground(sourceBlob);
                                showToast('Завантажую наліпку без фону...');
                                s.image = await uploadBlobToCloudinary(processedBlob, 'sticker-no-bg.png');
                                s.updatedAt = Date.now();
                                saveData(cur);
                                showToast('Фон наліпки видалено');
                                render();
                            } catch (error) {
                                console.error('Sticker reprocess error:', error);
                                showToast('Не вдалося видалити фон: ' + (error.message || 'невідома помилка'));
                                btn.disabled = false;
                            }
                            return;
                        }
                        if (act === 'favorite') {
                            const s = cur.singles.find(x => x.id === btn.dataset.singleId);
                            if (s) s.favorite = !s.favorite;
                            saveData(cur);
                        } else if (act === 'nick') {
                            const s = cur.singles.find(x => x.id === btn.dataset.singleId);
                            if (s) { const sKey = stickerKeyFor(s); cur.nickBadge = cur.nickBadge === sKey ? null : sKey; }
                            saveData(cur);
                            showToast(cur.nickBadge !== null ? 'Наліпку встановлено біля ніку' : 'Наліпку прибрано');
                        } else if (act === 'medal') {
                            const s = cur.singles.find(x => x.id === btn.dataset.singleId);
                            if (s) {
                                const sKey = stickerKeyFor(s);
                                if (cur.medals.includes(sKey)) {
                                    cur.medals = cur.medals.filter(k => k !== sKey);
                                } else {
                                    if (cur.medals.length >= PROFILE_STICKER_SLOTS) { showToast('Максимум 8 наліпок у профілі — спочатку приберіть одну'); return; }
                                    cur.medals.push(sKey);
                                }
                            }
                            saveData(cur);
                            showToast('Медалі оновлено');
                        } else if (act === 'delete') {
                            cur.singles = cur.singles.filter(x => x.id !== btn.dataset.singleId);
                            saveData(cur);
                            showToast('Наліпку видалено');
                            closeOverlay();
                            return;
                        } else if (act === 'favorite-set') {
                            const st = cur.sets.find(x => x.id === btn.dataset.setId);
                            if (st) st.favorite = !st.favorite;
                            saveData(cur);
                        } else if (act === 'delete-set') {
                            cur.sets = cur.sets.filter(x => x.id !== btn.dataset.setId);
                            saveData(cur);
                            showToast('Набір видалено');
                            closeOverlay();
                            return;
                        }
                        render();
                    });
                });
            }

            render();
        };
