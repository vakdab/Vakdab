import { HIKKA_API, GENRE_MAP, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../../config/constants.js?v=20260824-settings-redesign-v1';
import {
    Auth, DailyStats, Router, Storage, escapeHtml,
    loadGenrePageContent, renderProfilePage, renderSettingsPage,
    showToast, showToastProgress, syncLeftdockActive
} from '../../legacy/app-legacy.js?v=20260829-vertical-catalog-28-v1';
import { getProfile, saveProfile, getProfileDisplayName, stripNicknamePrefix } from '../settings/settingsLegacy.js?v=20260824-settings-redesign-v1';
import { debugLog } from '../../utils/debug.js';
import { fetchTmdbCardInfo } from '../../services/tmdb.js?v=20260824-settings-redesign-v1';
import { fetchAnimeLite, fetchHikkaByCategory, fetchHikkaMain, fetchHikkaTop100, hikkaCatalog, hikkaItem, hikkaRequest, normalizeGenreList, normalizeSynopsisText, searchHikka } from '../../services/catalog/catalog.js?v=20260829-catalog-28-v1';
import { getProxyUrl } from '../../utils/image.js';
import { hasHoneyPageResources, isHoneyComicItem, selectHoneyReaderChapter, sortHoneyChaptersForReading } from '../../services/api/manga.js?v=20260824-settings-redesign-v1';
import { fetchRanobeCatalogPage, fetchRanobeCatalogTotal, resolveRanobeReader } from '../../services/api/novel.js?v=20260824-settings-redesign-v1';

        // Hikka may remain pending behind corsproxy for 25+ seconds. The catalog
        // shell must stay interactive so users can switch to Honey Manga or
        // RanobeLib without waiting for the unrelated anime request.
        export const HOME_CATALOG_ANIME_TIMEOUT_MS = 12000;
        export function withHomeCatalogTimeout(promise, timeoutMs = HOME_CATALOG_ANIME_TIMEOUT_MS) {
            return new Promise((resolve, reject) => {
                let settled = false;
                const timer = setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    reject(new Error('Hikka catalog timeout'));
                }, timeoutMs);
                Promise.resolve(promise).then(value => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    resolve(value);
                }, error => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    reject(error);
                });
            });
        }

        export async function fetchHomeCatalogPageSafe(page = 1) {
            const request = fetchHomeCatalogPage(page);
            return homeCatalogMode === 'anime' ? withHomeCatalogTimeout(request) : request;
        }

        // ====================================================================
        export let currentTab = 'main',
            currentPage = 1,
            currentSearchQuery = '',
            currentCategory = '';

        export const setCurrentTab = value => { currentTab = value; };
        export const setCurrentPage = value => { currentPage = value; };
        export const setCurrentSearchQuery = value => { currentSearchQuery = value; };
        export const setCurrentCategory = value => { currentCategory = value; };

        export async function fetchContent() {
            if (currentTab === 'top100') { return await fetchHikkaTop100(); }
            if (currentSearchQuery) { return await searchHikka(currentSearchQuery, currentPage); }
            if (currentCategory) { return await fetchHikkaByCategory(currentCategory, currentPage); }
            return await fetchHikkaMain(currentPage);
        }

        export function showSkeleton() {
            const container = document.getElementById('animeContainer');
            if (!container) return;
            if (currentTab === 'top100') {
                container.classList.add('popular-list');
                container.classList.remove('anime-grid');
                container.style.display = '';
                let html = '';
                for (let i = 0; i < 6; i++) {
                    html += `
                    <div class="popular-card">
                        <div class="popular-card__poster-wrap"><div class="popular-card__poster skeleton"></div></div>
                        <div class="popular-card__title">&nbsp;</div>
                        <div class="popular-card__desc-skel skeleton"></div>
                        <div class="popular-card__desc-skel skeleton" style="width:70%;"></div>
                    </div>`;
                }
                container.innerHTML = html;
                return;
            }
            container.classList.remove('popular-list');
            container.classList.add('anime-grid');
            container.style.display = 'grid';
            const cols = 2;
            let html = '';
            for (let i = 0; i < cols * 3; i++) {
                html += `<div class="anime-card"><div class="anime-poster skeleton" style="padding-top: 140%;"></div></div>`;
            }
            container.innerHTML = html;
        }

        export async function loadContent() {
            const container = document.getElementById('animeContainer');
            if (!container) return;
            if (Router.currentRoute !== 'main') return;
            document.getElementById('genreSectionsContainer').style.display = 'none';
            document.getElementById('animeContainer').style.display = 'grid';
            document.getElementById('profilePageContainer').classList.remove('active');
            document.getElementById('profilePageContainer').style.display = 'none';
            document.getElementById('genrePageContainer').classList.remove('active');
            document.getElementById('genrePageContainer').style.display = 'none';
            document.getElementById('searchPageContainer').classList.remove('active');
            document.getElementById('searchPageContainer').style.display = 'none';
            document.getElementById('settingsPageContainer').classList.remove('active');
            document.getElementById('settingsPageContainer').style.display = 'none';
            showSkeleton();
            try {
                const list = await fetchContent();
                renderCards(list);
            } catch (err) {
                container.innerHTML =
                    `<div class="loader"><i class="fas fa-exclamation-triangle"></i> Помилка: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadContent()">Спробувати знову</button></div>`;
            }
        }

        export let popularRenderGen = 0;

        export function renderPopularCards(list) {
            const container = document.getElementById('animeContainer');
            container.classList.add('popular-list');
            container.classList.remove('anime-grid');
            container.style.display = '';
            const gen = ++popularRenderGen;
            container.innerHTML = list.map((a, idx) => {
                const poster = a.images?.jpg?.large_image_url || '';
                const title = a.title || 'Без назви';
                const shortSynopsis = (a.synopsis || '').trim();
                const descHtml = shortSynopsis
                    ? `<div class="popular-card__desc">${escapeHtml(shortSynopsis.length > 130 ? shortSynopsis.slice(0,130)+'…' : shortSynopsis)}</div>`
                    : `<div class="popular-card__desc popular-card__desc--empty"></div>`;
                return `
            <div class="popular-card" data-url="${a.url}" data-idx="${idx}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${idx*0.03}s">
              <div class="popular-card__poster-wrap">
                <div class="popular-card__poster">
                  <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='data:image/svg+xml,...'">
                  <span class="popular-card__type" data-role="type" hidden></span>
                </div>
                <div class="popular-card__rank popular-card__rank--loading"><i class="fas fa-spinner fa-pulse"></i></div>
              </div>
              <div class="popular-card__title">${title}</div>
              ${descHtml}
            </div>`;
            }).join('');
            container.querySelectorAll('.popular-card').forEach(card => {
                card.addEventListener('click', () => openPlayerPage(card.dataset.url));
                card.addEventListener('keydown', e => { if (e.key === 'Enter') openPlayerPage(card.dataset.url); });
            });
            renderPagination();
            loadPopularCardDetails(list, gen);
        }

        export async function loadPopularCardDetails(list, gen) {
            const container = document.getElementById('animeContainer');
            const CONCURRENCY = 4;
            let cursor = 0;
            async function worker() {
                while (cursor < list.length) {
                    const i = cursor++;
                    const item = list[i];
                    if (gen !== popularRenderGen) return;
                    const card = container?.querySelector(`.popular-card[data-idx="${i}"]`);
                    if (!card) continue;
                    const badge = card.querySelector('.popular-card__rank');
                    const descEl = card.querySelector('.popular-card__desc');
                    try {
                        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 9000));
                        const detail = await Promise.race([fetchAnimeLite(item.url), timeoutPromise]);
                        if (gen !== popularRenderGen) return;
                        if (badge) {
                            badge.classList.remove('popular-card__rank--loading');
                            badge.textContent = detail.episodes != null ? detail.episodes : '–';
                        }
                        if (descEl && detail.synopsis) {
                            descEl.classList.remove('popular-card__desc--empty');
                            descEl.textContent = detail.synopsis.length > 130 ? detail.synopsis.slice(0, 130) + '…' : detail.synopsis;
                        } else if (descEl && !descEl.textContent.trim()) {
                            descEl.textContent = 'Опис відсутній.';
                        }
                    } catch (e) {
                        if (gen !== popularRenderGen) return;
                        if (badge) {
                            badge.classList.remove('popular-card__rank--loading');
                            badge.textContent = '–';
                        }
                        if (descEl && !descEl.textContent.trim()) {
                            descEl.textContent = 'Опис відсутній.';
                        }
                    }
                }
            }
            await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, worker));
        }

        export const ANIME_CARD_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><rect width="300" height="420" fill="#2a2a2a"/><text x="150" y="215" font-family="sans-serif" font-size="42" fill="#666" text-anchor="middle">?</text></svg>`
        );

        // ====================================================================
        //  Лінива TMDB-енріхментація метаданих — універсальна
        //  для всіх .anime-card на сайті. Постери завжди залишаються Hikka.
        //  Вантажимо TMDB лише коли картка реально потрапляє у видиму область,
        //  щоб не робити тисячі зайвих запитів і не підвішувати сторінку.
        // ====================================================================
        export const animeCardDataMap = new Map();
        export function registerAnimeCardData(list) {
            (list || []).forEach(a => { if (a && a.url) animeCardDataMap.set(a.url, a); });
        }

        export const TMDB_ENRICH_CONCURRENCY = 3;
        export let tmdbEnrichActive = 0;
        export const tmdbEnrichQueue = [];

        export function queueTmdbEnrich(card) {
            if (!card || card.dataset.tmdbEnriched) return;
            card.dataset.tmdbEnriched = 'pending';
            tmdbEnrichQueue.push(card);
            pumpTmdbEnrichQueue();
        }

        export function pumpTmdbEnrichQueue() {
            while (tmdbEnrichActive < TMDB_ENRICH_CONCURRENCY && tmdbEnrichQueue.length) {
                const card = tmdbEnrichQueue.shift();
                tmdbEnrichActive++;
                runTmdbEnrichJob(card).finally(() => {
                    tmdbEnrichActive--;
                    pumpTmdbEnrichQueue();
                });
            }
        }

        export async function runTmdbEnrichJob(card) {
            const item = animeCardDataMap.get(card.dataset.url);
            if (!item) { card.dataset.tmdbEnriched = 'failed'; return; }
            try {
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000));
                const info = await Promise.race([fetchTmdbCardInfo(item), timeoutPromise]);
                if (!document.body.contains(card)) return;
                // Підміняємо постер лише після суворого збігу TMDB.
                // Якщо TMDB нічого не знайшов, картка безпечно лишається з Hikka.
                const image = card.querySelector('img');
                const verifiedImage = card.classList.contains('wide-card') ? (info?.frame || info?.poster) : info?.poster;
                if (image && verifiedImage) {
                    image.src = verifiedImage;
                    image.dataset.tmdbArtwork = 'true';
                    image.classList.add('img--loaded');
                }
                const typeBadge = card.querySelector('[data-role="type"]');
                if (typeBadge && item.typeLabel) {
                    typeBadge.textContent = item.typeLabel;
                    typeBadge.hidden = false;
                }
                card.dataset.tmdbType = info?.type || '';
                card.dataset.tmdbEnriched = 'done';
            } catch (e) {
                console.error('TMDB card enrichment failed', { url: card?.dataset?.url, error: e });
                card.dataset.tmdbEnriched = 'failed';
            }
        }

        export let animeCardObserver = null;
        export function getAnimeCardObserver() {
            if (animeCardObserver) return animeCardObserver;
            animeCardObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    animeCardObserver.unobserve(entry.target);
                    queueTmdbEnrich(entry.target);
                });
            }, { root: null, rootMargin: '250px', threshold: 0.01 });
            return animeCardObserver;
        }

        // TMDB додає тип і wide-карткам landscape artwork; portrait-картки мають fallback Hikka.
        export function observeAnimeCardsForTmdb(container) {
            if (!container || Router.currentRoute !== 'main' || typeof IntersectionObserver === 'undefined') return;
            const observer = getAnimeCardObserver();
            container.querySelectorAll('.anime-card, .wide-card').forEach(card => observer.observe(card));
        }

        export function renderCards(list) {
            const container = document.getElementById('animeContainer');
            if (!container) return;
            if (!list.length) {
                container.classList.remove('popular-list');
                container.classList.add('anime-grid');
                container.style.display = 'grid';
                container.innerHTML = `
              <div class="loader" style="grid-column:1/-1;text-align:center;">
                <i class="fas fa-search" style="font-size:2.5rem;display:block;margin-bottom:0.8rem;color:var(--text-muted);"></i>
                <p style="font-size:1rem;margin-bottom:0.5rem;">Нічого не знайдено</p>
                <p style="font-size:0.8rem;color:var(--text-muted);">Спробуйте змінити пошуковий запит або фільтри</p>
              </div>`;
                document.getElementById('paginationRow').innerHTML = '';
                return;
            }
            if (currentTab === 'top100') {
                renderPopularCards(list);
                return;
            }
            container.classList.remove('popular-list');
            container.classList.add('anime-grid');
            container.style.display = 'grid';
            registerAnimeCardData(list);
            container.innerHTML = list.map((a, idx) => {
                const poster = a.images?.jpg?.large_image_url || '';
                const title = a.title || 'Без назви';
                return `
            <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${idx*0.03}s">
              <div class="anime-poster">
                <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='${ANIME_CARD_PLACEHOLDER}'">
                <span class="anime-card-type" data-role="type">${escapeHtml(a.typeLabel || animeTypeLabel(a.type))}</span>
              </div>
              <div class="anime-title-under">${title}</div>
            </div>`;
            }).join('');
            container.querySelectorAll('.anime-card').forEach(card => {
                card.addEventListener('click', () => openPlayerPage(card.dataset.url));
                card.addEventListener('keydown', e => { if (e.key === 'Enter') openPlayerPage(card.dataset.url); });
            });
            renderPagination();
            observeAnimeCardsForTmdb(container);
        }

        export function renderPagination() {
            const row = document.getElementById('paginationRow');
            if (!row) return;
            const prevDisabled = currentPage <= 1 ? 'disabled' : '';
            row.innerHTML = `
            <button class="btn-outline" onclick="changePage(${currentPage-1})" ${prevDisabled}><i class="fas fa-chevron-left"></i> Назад</button>
            <span class="page-indicator">Сторінка ${currentPage}</span>
            <button class="btn-outline" onclick="changePage(${currentPage+1})">Вперед <i class="fas fa-chevron-right"></i></button>
          `;
        }

        window.changePage = (p) => {
            if (p < 1) return;
            currentPage = p;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loadContent();
        };

        export function showTop100() {
            currentTab = 'top100';
            currentPage = 1;
            currentSearchQuery = '';
            currentCategory = '';
            document.querySelectorAll('.action-pill').forEach(p => p.classList.remove('active-pill'));
            document.getElementById('top100Btn')?.classList.add('active-pill');
            if (Router.currentRoute === 'main') loadContent();
            syncLeftdockActive();
            showToast('Популярні аніме');
        }

        export function openRandomAnime() {
            fetchHikkaTop100().then(list => list[0] && openPlayerPage(list[0].url)).catch(() => showToast('Не вдалося завантажити каталог'));
            showToast('Випадкове аніме');
        }

        // ====================================================================
        //  ЖАНРОВІ СЕКЦІЇ (ПАРАЛЕЛЬНЕ ЗАВАНТАЖЕННЯ)
        // ====================================================================
        export const genreList = Object.entries(GENRE_MAP).map(([name, slug]) => ({ name, slug }));
        export let homeSectionsRequestId = 0;
        export let homeCatalogRequestId = 0;

        // Homepage artwork comes from Hikka. Preload only lightweight
        // metadata for the first visible cards; posters are never replaced.
        export async function preloadHomepageTmdbGroups(groups, limit = 6) {
            const visible = groups.flatMap(group => (group || []).slice(0, limit));
            let cursor = 0;
            const worker = async () => {
                while (cursor < visible.length) {
                    const item = visible[cursor++];
                    try {
                        const info = await fetchTmdbCardInfo(item);
                        if (info?.type) item.tmdbType = info.type;
                    } catch (e) {
                        console.error('Homepage TMDB preload failed', { title: item?.title, error: e });
                    }
                }
            };
            await Promise.all(Array.from({ length: Math.min(4, visible.length) }, worker));
        }

        export let homeCatalogPage = 1;
        export let homeCatalogItems = [];
        export let homeCatalogLoading = false;
        // Total reported by Honey Manga, independent from loaded card count.
        export let homeCatalogTotal = 0;
        export let homeCatalogAvailableTotal = 0;
        export let homeCatalogHasMore = true;
        export let homeCatalogMode = 'anime';
        export let homeCatalogQuery = '';
        export let homeCatalogSort = 'score';
        export let homeCatalogView = 'grid';
        export let homeCatalogPreset = 'all';
        export let homeCatalogGenre = 'all';
        export let homeCatalogAdult = false;
        export let homeCatalogStatus = 'all';
        export let homeCatalogAvailability = 'all';
        export let homeCatalogAge = 'all';
        export let homeCatalogOrigin = 'all';
        export let homeCatalogGenres = new Set();
        export let homeCatalogType = 'all';
        export let homeCatalogYearMin = '';
        export let homeCatalogYearMax = '';
        export let homeCatalogScoreMin = '';
        // Full manga index is loaded lazily only when exact manga filters are opened.
        export let homeCatalogFilterResultItems = null;
        export let homeCatalogFilterResultOffset = 0;
        export let homeCatalogFilterIndexReady = false;
        export const HOME_MANGA_AGE_OPTIONS = [
            { key: 'all', label: 'Усі' },
            { key: 'adult', label: 'Для дорослих' },
            { key: 'teen', label: 'Для підлітків' },
            { key: 'children', label: 'Для дітей' }
        ];
        export const HOME_CATALOG_AGE_OPTIONS = [
            { key: 'adult', label: 'Для дорослих', icon: '18+' },
            { key: 'teen', label: 'Для підлітків', icon: '13+' },
            { key: 'children', label: 'Для дітей', icon: 'Діти' }
        ];
        export const honeyCatalogPageCache = new Map();
        export const honeyMangaApiCache = new Map();
        export const honeyMangaFullCatalogPromises = new Map();
        export let honeyAdultCatalogPromise = null;
        export let honeyAdultCatalogBackgroundPromise = null;
        const honeyJsonCache = new Map();

        export const HOME_CATALOG_MODES = [
            { key: 'anime', label: 'Аніме', icon: 'fa-photo-film' },
            { key: 'manga', label: 'Манґа', icon: 'fa-palette' },
            { key: 'novel', label: 'Ранобе', icon: 'fa-book-open' }
        ];
        export const HOME_CATALOG_PRESETS = [
            { key: 'all', label: 'Усі' },
            { key: 'finished', label: 'Нещодавно завершені' },
            { key: 'ongoing', label: 'Онґоїнг' }
        ];

        export function homeCatalogRequestBody() {
            const body = {};
            if (homeCatalogMode === 'anime') body.only_translated = true;
            if (homeCatalogQuery) body.query = homeCatalogQuery;
            if (homeCatalogSort === 'score') body.sort = ['score:desc', 'scored_by:desc'];
            if (homeCatalogSort === 'newest') body.sort = ['start_date:desc'];
            if (homeCatalogSort === 'title') body.sort = ['title_ua:asc'];
            if (homeCatalogMode === 'anime' && homeCatalogGenre !== 'all') {
                const genreSlug = String(homeCatalogGenre || '').trim();
                if (genreSlug.startsWith('format:')) body.media_type = [genreSlug.slice(7)];
                else if (genreSlug) body.genres = [genreSlug];
            }
            if (homeCatalogMode === 'anime' && homeCatalogAge !== 'all') {
                body.rating = homeCatalogAge === 'adult' ? ['rx', 'r_plus'] : homeCatalogAge === 'teen' ? ['r', 'pg_13'] : ['g', 'pg'];
            }
            return body;
        }

        // Honey Manga is the only manga source. Hikka remains the source for anime and novels.
        export const HONEY_API = 'https://data.api.honey-manga.com.ua';
        export const HONEY_SEARCH_API = 'https://search.api.honey-manga.com.ua';
        export const HONEY_WEB = 'https://honey-manga.com.ua';
        export const HONEY_IMAGE = 'https://honeymangastorage-nocache.b-cdn.net/public-resources';
        export const HONEY_SEARCH_PATTERN = '/v2/manga/pattern?query=';
        export const honeySearchCache = new Map();
        export const honeyReaderCache = new Map();
        const honeyReaderPendingCache = new Map();
        export let honeyAvailabilityMap = null;
        export let honeyAvailabilityMapPromise = null;
        export const HONEY_CATALOG_READABLE_FALLBACK = 0;
        export let honeyCatalogReadableTotal = 0;
        export let honeyCatalogReadableTotalPromise = null;

        export function honeyCatalogFilters({ adult = homeCatalogAdult } = {}) {
            return [{ filterBy: 'adult', filterValue: ['18+'], filterOperator: adult ? 'IN' : 'NOT_IN' }];
        }

        export async function loadHoneyAvailabilityMap() {
            if (!honeyAvailabilityMap) honeyAvailabilityMap = { byHikka: {}, byHoney: {}, available: 0, honeyAvailable: 0 };
            return honeyAvailabilityMap;
        }

        export async function fetchHoneyJson(path, options = {}, baseUrl = HONEY_API) {
            const url = `${baseUrl}${path}`;
            const cacheKey = `${baseUrl}:${path}:${options.method || 'GET'}:${options.body || ''}`;
            if (honeyMangaApiCache.has(cacheKey)) return honeyMangaApiCache.get(cacheKey);
            const request = (async () => {
                const maxAttempts = 3;
                for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                    try {
                        const response = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-store', ...options });
                        if (response.ok) return response.json();
                        const retryable = response.status === 429 || response.status >= 500;
                        if (!retryable || attempt === maxAttempts - 1) throw new Error(`honey-manga.com.ua API: HTTP ${response.status}`);
                        const retryAfter = Number(response.headers.get('Retry-After'));
                        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 8000) : 700 * (attempt + 1);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } catch (error) {
                        if (attempt === maxAttempts - 1 || /HTTP (?!429|5\d\d)/.test(String(error?.message || ''))) throw error;
                        await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)));
                    }
                }
                throw new Error('honey-manga.com.ua API: повторні спроби вичерпано');
            })().catch(error => { honeyMangaApiCache.delete(cacheKey); throw error; });
            honeyMangaApiCache.set(cacheKey, request);
            return request;
        }

        export function normalizeHoneyMatch(value = '') {
            return String(value || '').toLocaleLowerCase('uk-UA').normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '').replace(/[’'\x60]/g, '')
                .replace(/[^a-z0-9а-яіїєґ]+/gi, ' ').trim();
        }

        export function honeyNamesMatch(left, right) {
            const a = normalizeHoneyMatch(left);
            const b = normalizeHoneyMatch(right);
            if (!a || !b) return false;
            if (a === b) return true;
            const leftTokens = a.split(/\s+/).filter(token => token.length >= 2);
            const rightTokens = b.split(/\s+/);
            return leftTokens.length >= 2 && leftTokens.every(token => rightTokens.includes(token));
        }

        export async function searchHoneyTitles(query) {
            const normalized = normalizeHoneyMatch(query);
            if (!normalized) return [];
            if (honeySearchCache.has(normalized)) return honeySearchCache.get(normalized);
            const promise = fetchHoneyJson(`${HONEY_SEARCH_PATTERN}${encodeURIComponent(query)}`, {}, HONEY_SEARCH_API)
                .then(payload => Array.isArray(payload) ? payload : [])
                .catch(error => { console.warn('Honey Manga title search failed:', error); return []; });
            honeySearchCache.set(normalized, promise);
            return promise;
        }

        export function honeyCatalogItem(item) {
            const posterId = item?.posterUrl || item?.posterId || '';
            const poster = posterId ? `${HONEY_IMAGE}/${posterId}?optimizer=image&width=296` : ANIME_CARD_PLACEHOLDER;
            const mangaId = String(item?.id || '');
            const chapterCount = Number(item?.chapters || 0);
            const adult = String(item?.adult || 'NONE');
            const comic = isHoneyComicItem(item);
            const sourceType = String(item?.type || item?.contentType || item?.kind || '').trim();
            return {
                honeyId: mangaId,
                mal_id: `honey-${mangaId}`,
                slug: mangaId,
                title: item?.title || item?.lowTitle || 'Без назви',
                originalTitle: item?.alternativeTitle || item?.title || '',
                url: mangaId ? `${HONEY_WEB}/book/${mangaId}` : HONEY_WEB,
                readerUrl: '',
                readerAvailable: comic && chapterCount > 0,
                honeyTitleId: mangaId,
                honeyChapterId: '',
                chapters: chapterCount,
                images: { jpg: { large_image_url: poster, image_url: poster } },
                genres: normalizeGenreList(item?.genresAndTags || item?.genres || []),
                tags: normalizeGenreList(item?.tags || []),
                ageRating: adult === 'NONE' ? '' : adult,
                adult,
                isAdultCover: Boolean(item?.isAdultCover),
                type: comic ? 'manga' : 'novel',
                typeLabel: sourceType || (comic ? 'Манґа' : 'Ранобе'),
                honeySourceType: sourceType,
                status: item?.titleStatus || '',
                synopsis: normalizeSynopsisText(item?.description || ''),
                score: Number(item?.rate || item?.rateScore || 0),
                year: item?.lastUpdated ? String(item.lastUpdated).slice(0, 4) : '',
                lastUpdated: item?.lastUpdated || '',
                from: 'honey-manga.com.ua'
            };
        }

        const HONEY_PROMO_MARKERS = Object.freeze([
            'наша команда покидає',
            'group 17 october',
            'не будемо публікуватися',
            'більше не публікується',
            'повний переклад вже доступний на інших платформах',
            'продовжить публікуватися лише на сайтах',
            'публікуватися на цьому сайті',
            'лише на сайтах',
            'шукайте нас в телеграм',
            'шукайте нас у телеграм',
            'слідкувати за оновленнями',
            'honey manga test',
            'це тестовий проєкт створений адміністрацією honey manga'
        ]);

        // Some QR promo cards use ordinary titles/descriptions and differ only
        // by their poster record. These IDs were obtained from the live API and
        // verified to resolve to the same QR announcement image as the visible
        // "ми більше не будемо публікуватися" cards.
        const HONEY_PROMO_POSTER_IDS = new Set([
            '3e0744af-b2df-4b30-88ff-b7eebac6040a',
            '6a651260-ba1f-4ddc-a329-f4816eedce66',
            '597ce558-0b8e-4770-bfd0-245e5f560253',
            '8500522d-977e-414a-bd54-a96b97724a6b',
            '5e2e6f20-30e0-4c3e-942c-67319481ec5f',
            'b2b40eb4-a98a-4012-9152-b476d56724e4',
            '76a4d92d-6009-42aa-b479-b42a57bcf880',
            '9c5e401f-e289-4933-9bad-d254e9452c8d',
            'defc7451-92f7-4f5e-b08e-622ffda621c9',
            'ea9d0b02-df08-419e-9fcc-e880b8046075',
            'ea7bfd2a-fbf4-48a4-b081-2e5b483e96df',
            'ac818eaf-a24b-43dc-9be9-f20686b10dc3',
            'f4047b8f-466f-458f-99dd-7b4cf716e643',
            '1e0749b9-a3ff-437d-b3e4-096c61f991d3',
            '745a8a95-02d0-4424-ab89-52bc768bdeb5',
            '68fcb44c-f5c6-4d0a-b204-90a768d5f3e4',
            'd47f4001-4623-4c24-949c-3614e1b6c9eb',
            'cf0aa010-9ca1-456a-b4c6-9635bf647681',
            '85847872-a303-41b5-9a37-4a010f048e84'
        ]);

        function honeyPromoTextMatches(value = '') {
            const haystack = normalizeHoneyMatch(value);
            return Boolean(haystack) && HONEY_PROMO_MARKERS.some(marker => haystack.includes(normalizeHoneyMatch(marker)));
        }

        function honeyPromoPosterMatches(item = {}) {
            const posterValues = [
                item?.posterId,
                item?.posterUrl,
                item?.images?.jpg?.large_image_url,
                item?.images?.jpg?.image_url
            ].filter(Boolean).map(value => String(value).trim());
            return posterValues.some(value => HONEY_PROMO_POSTER_IDS.has(value)
                || [...HONEY_PROMO_POSTER_IDS].some(posterId => value.includes(posterId)));
        }

        // Run this against the raw API record before honeyCatalogItem() drops
        // source-only fields such as description, lowTitle, and posterId.
        export function isHoneyPromoItemRaw(item = {}) {
            const posterId = String(item?.posterUrl || item?.posterId || '').trim();
            return HONEY_PROMO_POSTER_IDS.has(posterId) || honeyPromoPosterMatches(item) || honeyPromoTextMatches([
                item?.title, item?.lowTitle, item?.alternativeTitle, item?.description,
                item?.slug, item?.posterUrl, item?.posterId
            ].filter(Boolean).join(' '));
        }

        // Keep a second check after normalization for search responses and
        // already-normalized callers. Do not match generic "honey manga":
        // ordinary licensed titles may mention the source in their synopsis.
        export function isHoneyPromoItem(item = {}) {
            return honeyPromoPosterMatches(item) || honeyPromoTextMatches([
                item?.title, item?.lowTitle, item?.alternativeTitle, item?.description,
                item?.synopsis, item?.slug, item?.posterUrl, item?.posterId
            ].filter(Boolean).join(' '));
        }

        export function isAdultHoneyManga(item) {
            return /^18\+/.test(String(item?.adult || item?.ageRating || '').trim()) || item?.isAdultCover === true;
        }

        export async function resolveHoneyReader(item) {
            if (!item || homeCatalogMode !== 'manga') return item;
            const mangaId = item.honeyId || item.honeyTitleId;
            if (!mangaId || Number(item.chapters || 0) <= 0) return item;
            const cacheKey = String(mangaId);
            if (honeyReaderCache.has(cacheKey)) return { ...item, ...honeyReaderCache.get(cacheKey) };
            if (honeyReaderPendingCache.has(cacheKey)) {
                const pendingReader = await honeyReaderPendingCache.get(cacheKey);
                return { ...item, ...pendingReader };
            }
            const pendingReader = (async () => {
                try {
                    const payload = await fetchHoneyJson('/v2/chapter/cursor-list', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // Honey returns newest chapters first. The newest chapter can be
                    // monetized while older chapters remain public, so pageSize: 1
                    // incorrectly sent users straight to the paywall.
                    body: JSON.stringify({ page: 1, pageSize: 100, mangaId: String(mangaId), sortOrder: 'DESC' })
                    });
                    const chapters = Array.isArray(payload?.data) ? payload.data : [];
                    const readingOrder = sortHoneyChaptersForReading(chapters);
                    const publicFirst = [
                        ...readingOrder.filter(entry => entry && entry.isMonetized !== true),
                        ...readingOrder.filter(entry => entry && entry.isMonetized === true)
                    ];
                    let chapter = null;
                    // A chapter may be marked public but still have no uploaded pages.
                    // Probe the frames manifest and skip empty chapters before routing.
                    for (const candidate of publicFirst.slice(0, 12)) {
                        if (!candidate?.id) continue;
                        try {
                            const frames = await fetchHoneyJson(`/v2/chapter/frames/${encodeURIComponent(candidate.id)}/${encodeURIComponent(mangaId)}`);
                            if (hasHoneyPageResources(frames)) { chapter = candidate; break; }
                        } catch { /* Try the next chapter; the reader will report paywall only after all candidates fail. */ }
                    }
                    chapter ||= selectHoneyReaderChapter(chapters);
                    return chapter?.id ? {
                        readerUrl: `${HONEY_WEB}/read/${chapter.id}/${mangaId}`,
                        honeyChapterId: chapter.id,
                        readerTitle: item.title || 'Манґа',
                        readerSource: 'honey-manga.com.ua'
                    } : { readerUrl: '', honeyChapterId: '' };
                } catch (error) {
                    console.warn('Honey Manga chapter lookup failed:', error);
                    return { readerUrl: '', honeyChapterId: '' };
                }
            })();
            honeyReaderPendingCache.set(cacheKey, pendingReader);
            try {
                const reader = await pendingReader;
                honeyReaderCache.set(cacheKey, reader);
                return { ...item, ...reader };
            } finally {
                honeyReaderPendingCache.delete(cacheKey);
            }
        }

        export async function attachHoneyReaders(items) {
            if (homeCatalogMode !== 'manga') return items;
            await loadHoneyAvailabilityMap();
            return items.map(item => ({ ...item, readerAvailable: Boolean(item.readerUrl) || Number(item.chapters) > 0 }));
        }

        export function honeyAgeCategory(item) {
            const age = String(item?.ageRating || item?.adult || '').trim().toLowerCase();
            if (/^18\+/.test(age) || item?.isAdultCover === true) return 'adult';
            if (/^(0|6|12)\+/.test(age)) return 'children';
            if (/^(14|16)\+/.test(age)) return 'teen';
            const words = normalizeHoneyMatch([...(item?.genres || []), ...(item?.tags || [])].join(' '));
            if (/(18|adult|ерот|еччі|гарем|порн|для дорослих|хентай)/i.test(words)) return 'adult';
            if (/(кодомо|для дітей|дитяч|сімейн|казк|дошкіль)/i.test(words)) return 'children';
            return 'teen';
        }

        export function catalogAgeCategory(item) {
            if (homeCatalogMode === 'manga') return honeyAgeCategory(item);
            const raw = Array.isArray(item?.rating) ? item.rating.join(' ') : String(item?.rating || item?.ageRating || item?.age_rating || '');
            const age = normalizeHoneyMatch(raw);
            if (item?.isAdult === true || item?.adult === true || /rx|r plus|r\+|18|adult|hentai|ecchi/.test(age)) return 'adult';
            if (/r|pg 13|pg13|13|14|15|16|teen/.test(age)) return 'teen';
            if (/g|pg|0|6|12|children|kids|family|all ages/.test(age)) return 'children';
            return 'teen';
        }

        export function getHoneyGenreOptions(items = homeCatalogItems) {
            const values = new Map();
            items.forEach(item => (item?.genres || []).forEach(genre => {
                const value = String(typeof genre === 'object' ? genre.name || genre.name_ua || '' : genre).trim();
                if (value) values.set(normalizeHoneyMatch(value), value);
            }));
            return [...values.values()].sort((a, b) => a.localeCompare(b, 'uk'));
        }

        export function homeCatalogGenreHtml() {
            const genres = Object.entries(GENRE_MAP)
                .map(([name, slug]) => ({ name, slug }))
                .sort((a, b) => a.name.localeCompare(b.name, 'uk'));
            const allActive = homeCatalogGenre === 'all';
            const allCard = `<button class="home-catalog-genre-card${allActive ? ' active' : ''}" type="button" data-catalog-genre="all" aria-pressed="${allActive ? 'true' : 'false'}" role="listitem"><span class="home-catalog-genre-card__icon home-catalog-genre-card__icon--all">Усі</span><span class="home-catalog-genre-card__name">Усі жанри</span></button>`;
            const cards = genres.map(({ name, slug }) => {
                const active = homeCatalogGenre === slug;
                const letter = name.trim().charAt(0).toUpperCase();
                return `<button class="home-catalog-genre-card${active ? ' active' : ''}" type="button" data-catalog-genre="${escapeHtml(slug)}" aria-pressed="${active ? 'true' : 'false'}" role="listitem"><span class="home-catalog-genre-card__icon">${escapeHtml(letter)}</span><span class="home-catalog-genre-card__name">${escapeHtml(name)}</span></button>`;
            }).join('');
            return allCard + cards;
        }

        function homeCatalogGenreMatches(item, selectedGenre) {
            const selected = normalizeHoneyMatch(selectedGenre);
            if (!selected || selected === 'all') return true;
            if (selected.startsWith('format ')) return normalizeHoneyMatch(item?.type || item?.media_type) === selected.slice(7);
            const mappedName = Object.entries(GENRE_MAP).find(([, slug]) => normalizeHoneyMatch(slug) === selected)?.[0] || '';
            const candidates = [selected, normalizeHoneyMatch(mappedName)].filter(Boolean);
            return (item?.genres || []).some(genre => {
                const source = typeof genre === 'object' ? genre : { name_ua: genre };
                const values = [
                    ...(Array.isArray(item?.genreSlugs) ? item.genreSlugs : []),
                    source?.slug, source?.name_ua, source?.name, genre
                ].map(value => normalizeHoneyMatch(value)).filter(Boolean);
                return candidates.some(candidate => values.some(value => value === candidate || value.includes(candidate) || candidate.includes(value)));
            });
        }

        export function syncHomeCatalogGenreControl(root = document) {
            const host = root.querySelector('#homeCatalogGenreRailHost');
            if (!host) return;
            host.innerHTML = homeCatalogGenreHtml();
            host.querySelectorAll('[data-catalog-genre]').forEach(button => button.addEventListener('click', async () => {
                if (homeCatalogLoading) return;
                const nextGenre = button.dataset.catalogGenre || 'all';
                if (nextGenre === homeCatalogGenre) return;
                homeCatalogGenre = nextGenre;
                // The selected genre must be part of the Hikka request. Reset the
                // page/cache so genres absent from the first catalog page still work.
                homeCatalogPage = 1;
                homeCatalogFilterResultItems = null;
                homeCatalogFilterResultOffset = 0;
                host.setAttribute('aria-busy', 'true');
                try {
                    await reloadHomeCatalog();
                } finally {
                    host.setAttribute('aria-busy', 'false');
                }
            }));
        }

        export function syncHomeCatalogAgeControl(root = document) {
            const host = root.querySelector('#homeCatalogAgeRailHost');
            if (!host) return;
            host.innerHTML = homeCatalogAgeCardHtml();
            host.querySelectorAll('[data-catalog-age]').forEach(button => button.addEventListener('click', async () => {
                if (homeCatalogLoading) return;
                homeCatalogAge = button.dataset.catalogAge || 'all';
                homeCatalogAdult = homeCatalogMode === 'manga' && homeCatalogAge === 'adult';
                host.querySelectorAll('[data-catalog-age]').forEach(item => {
                    const active = item === button;
                    item.classList.toggle('active', active);
                    item.setAttribute('aria-pressed', String(active));
                });
                homeCatalogFilterResultItems = null;
                homeCatalogFilterResultOffset = 0;
                await reloadHomeCatalog();
            }));
        }

        function homeCatalogFilterCardIcon(groupKey, option, label) {
            if (option.key === 'all') return 'Усі';
            if (option.key === 'adult') return '18+';
            if (option.key === 'teen') return '13+';
            if (option.key === 'children') return 'Діти';
            if (option.key === 'available') return 'Чит';
            if (option.key === 'ongoing') return 'О';
            if (option.key === 'finished') return 'З';
            return String(option.icon || label || option.label || '').trim().charAt(0).toUpperCase() || '•';
        }

        function homeCatalogFilterCardGroup(groupKey, label, options, value) {
            return options.map(option => {
                const active = option.key === value;
                const icon = homeCatalogFilterCardIcon(groupKey, option, label);
                const groupMarkup = label ? `<span class="home-catalog-mode-filter-card__group">${escapeHtml(label)}</span>` : '';
                return `<button class="home-catalog-genre-card home-catalog-mode-filter-card${active ? ' active' : ''}" type="button" data-home-catalog-filter-card data-home-catalog-filter-group="${escapeHtml(groupKey)}" data-home-catalog-filter-value="${escapeHtml(option.key)}" aria-pressed="${active ? 'true' : 'false'}" role="listitem"><span class="home-catalog-genre-card__icon${option.key === 'all' ? ' home-catalog-genre-card__icon--all' : ''}">${escapeHtml(icon)}</span>${groupMarkup}<span class="home-catalog-genre-card__name">${escapeHtml(option.label)}</span></button>`;
            }).join('');
        }

        function homeCatalogAgeCardHtml() {
            return HOME_CATALOG_AGE_OPTIONS.map(option => {
                const active = homeCatalogAge === option.key;
                return `<button class="home-catalog-genre-card home-catalog-age-card${active ? ' active' : ''}" type="button" data-catalog-age="${option.key}" aria-label="${escapeHtml(option.label)}" title="${escapeHtml(option.label)}" aria-pressed="${active ? 'true' : 'false'}" role="listitem"><span class="home-catalog-genre-card__icon">${escapeHtml(option.icon)}</span><span class="home-catalog-genre-card__name">${escapeHtml(option.label)}</span></button>`;
            }).join('');
        }

        export function homeCatalogAgeHtml() {
            if (homeCatalogMode !== 'manga') return '';
            return `<div class="home-catalog-age-rail" id="homeCatalogAgeRailHost" role="list" aria-label="Вікові категорії">${homeCatalogAgeCardHtml()}</div>`;
        }

        export function homeCatalogModeFilterHtml() {
            return '';
        }

        export async function loadHoneyMangaFullCatalog() {
            const filterAdult = homeCatalogAdult;
            const promiseKey = filterAdult ? 'adult' : 'public';
            if (honeyMangaFullCatalogPromises.has(promiseKey)) return honeyMangaFullCatalogPromises.get(promiseKey);
            const requestPromise = (async () => {
                const pageSize = 200;
                const makeRequest = page => fetchHoneyJson('/v2/manga/cursor-list', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ page, pageSize, sort: { sortBy: 'lastUpdated', sortOrder: 'DESC' }, filters: honeyCatalogFilters({ adult: filterAdult }) })
                });
                const firstPayload = await makeRequest(1);
                const total = Number(firstPayload?.counter || 0);
                const totalPages = Math.max(1, Math.ceil(total / pageSize));
                const allItems = (Array.isArray(firstPayload?.data) ? firstPayload.data : []).filter(item => !isHoneyPromoItemRaw(item)).map(honeyCatalogItem).filter(item => !isHoneyPromoItem(item)).filter(isHoneyComicItem);
                let nextPage = 2;
                const worker = async () => {
                    while (true) {
                        const page = nextPage++;
                        if (page > totalPages) return;
                        const payload = await makeRequest(page);
                        allItems.push(...(Array.isArray(payload?.data) ? payload.data : []).filter(item => !isHoneyPromoItemRaw(item)).map(honeyCatalogItem).filter(item => !isHoneyPromoItem(item)).filter(isHoneyComicItem));
                    }
                };
                await Promise.all(Array.from({ length: Math.min(4, Math.max(0, totalPages - 1)) }, worker));
                const unique = [...new Map(allItems.filter(item => item.honeyId).map(item => [item.honeyId, item])).values()];
                homeCatalogAvailableTotal = unique.filter(item => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
                honeyCatalogPageCache.set(`honey-full:${filterAdult ? 'adult' : 'public'}`, { total: unique.length, items: unique, complete: true });
                debugLog('catalog', 'honey-manga-full-index', { requestedPages: totalPages, receivedItems: allItems.length, uniqueItems: unique.length, total });
                return unique;
            })().catch(error => { honeyMangaFullCatalogPromises.delete(promiseKey); throw error; });
            honeyMangaFullCatalogPromises.set(promiseKey, requestPromise);
            return requestPromise;
        }

        export async function fetchHoneyAdultCatalog() {
            const previousAdult = homeCatalogAdult;
            homeCatalogAdult = true;
            try { return await loadHoneyMangaFullCatalog(); }
            finally { homeCatalogAdult = previousAdult; }
        }

        export async function fetchHoneyCatalogPage(page = 1) {
            const mode = homeCatalogAdult ? 'adult' : 'public';
            const query = normalizeHoneyMatch(homeCatalogQuery) || '__all__';
            const cacheKey = `honey-manga:${mode}:${query}:${page}`;
            const cached = honeyCatalogPageCache.get(cacheKey);
            if (cached) {
                homeCatalogTotal = cached.total;
                homeCatalogHasMore = cached.hasMore;
                return cached.items;
            }
            if (homeCatalogQuery) {
                const searched = await searchHoneyTitles(homeCatalogQuery);
                let items = searched.filter(item => !isHoneyPromoItemRaw(item)).map(honeyCatalogItem).filter(item => !isHoneyPromoItem(item)).filter(isHoneyComicItem);
                items = items.filter(item => homeCatalogAdult ? isAdultHoneyManga(item) : !isAdultHoneyManga(item));
                homeCatalogTotal = items.length;
                homeCatalogHasMore = false;
                items = await attachHoneyReaders(items);
                Object.defineProperties(items, { total: { value: homeCatalogTotal, enumerable: false }, hasNextPage: { value: false, enumerable: false } });
                honeyCatalogPageCache.set(cacheKey, { total: homeCatalogTotal, items, hasMore: false });
                return items;
            }
            const pageSize = 28;
            const payload = await fetchHoneyJson('/v2/manga/cursor-list', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ page, pageSize, sort: { sortBy: 'lastUpdated', sortOrder: 'DESC' }, filters: honeyCatalogFilters({ adult: homeCatalogAdult }) })
            });
            homeCatalogTotal = Number(payload?.counter || 0);
            homeCatalogHasMore = Boolean(payload?.cursorNext?.page);
            let items = (Array.isArray(payload?.data) ? payload.data : []).filter(item => !isHoneyPromoItemRaw(item)).map(honeyCatalogItem).filter(item => !isHoneyPromoItem(item)).filter(isHoneyComicItem);
            items = await attachHoneyReaders(items);
            Object.defineProperties(items, { total: { value: homeCatalogTotal, enumerable: false }, hasNextPage: { value: homeCatalogHasMore, enumerable: false } });
            honeyCatalogPageCache.set(cacheKey, { total: homeCatalogTotal, items, hasMore: homeCatalogHasMore });
            debugLog('catalog', 'honey-manga-page', { requestedPage: page, requestedLimit: pageSize, receivedItems: items.length, total: homeCatalogTotal, hasNextPage: homeCatalogHasMore });
            return items;
        }

        function filterMangaCatalogItems(items) {
            let filtered = [...items].filter(item => !isHoneyPromoItem(item));
            const query = normalizeHoneyMatch(homeCatalogQuery);
            if (query) filtered = filtered.filter(item => normalizeHoneyMatch(item.title).includes(query));
            if (homeCatalogAvailability === 'available') filtered = filtered.filter(item => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0);
            if (homeCatalogAdult || homeCatalogAge === 'adult') filtered = filtered.filter(item => honeyAgeCategory(item) === 'adult');
            else if (homeCatalogAge !== 'all') filtered = filtered.filter(item => honeyAgeCategory(item) === homeCatalogAge);
            if (homeCatalogGenres.size && (homeCatalogMode !== 'novel' || ranobeHasGenreData(filtered))) {
                filtered = filtered.filter(item => (item.genres || []).some(genre => homeCatalogGenres.has(normalizeHoneyMatch(typeof genre === 'object' ? genre.name || genre.name_ua : genre))));
            }
            return filtered.sort((a, b) => {
                if (homeCatalogSort === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'uk');
                if (homeCatalogSort === 'newest') return Number(b.year || 0) - Number(a.year || 0);
                return Number(b.score || 0) - Number(a.score || 0);
            });
        }

        function mangaFilterGenres(items) {
            return [...new Map(items.flatMap(item => (item.genres || []).map(genre => {
                const value = String(typeof genre === 'object' ? genre.name || genre.name_ua || '' : genre).trim();
                return value ? [normalizeHoneyMatch(value), value] : null;
            }).filter(Boolean)).map(([key, value]) => [key, value])).values()].sort((a, b) => a.localeCompare(b, 'uk'));
        }

        function catalogFilterGenres(items) {
            return mangaFilterGenres(items);
        }

        const RANOBE_GENRE_OPTIONS = Object.freeze([
            'Екшен', 'Пригоди', 'Фентезі', 'Фантастика', 'Романтика', 'Комедія',
            'Драма', 'Містика', 'Трилер', 'Детектив', 'Психологія', 'Надприродне',
            'Ісайкай', 'Гарем', 'Повсякденність', 'Культивація', 'Східна фентезі',
            'ЛітРПГ', 'Веб-новела', 'Сьонен', 'Сьодзьо', 'Дзьосей'
        ]);

        function ranobeFilterOrigins(items = homeCatalogItems) {
            return [...new Set(items.map(item => String(item?.originLabel || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'uk'));
        }

        function ranobeFilterGenres(items = homeCatalogItems) {
            const sourceGenres = items.flatMap(item => (item?.genres || []).map(genre => {
                const value = String(typeof genre === 'object' ? genre.name || genre.name_ua || '' : genre).trim();
                return value;
            }).filter(Boolean));
            return [...new Set([...RANOBE_GENRE_OPTIONS, ...sourceGenres])].sort((a, b) => a.localeCompare(b, 'uk'));
        }

        function ranobeHasGenreData(items = homeCatalogItems) {
            return items.some(item => Array.isArray(item?.genres) && item.genres.some(Boolean));
        }

        function ranobeFilterAges() {
            return [
                { key: 'all', label: 'Будь-який вік' },
                { key: 'adult', label: '18+' },
                { key: 'teen', label: '13–17 років' },
                { key: 'general', label: 'Без вікового обмеження' }
            ];
        }

        function ranobeAgeCategory(item) {
            const value = String(item?.ageRating || '').toLowerCase();
            if (/18/.test(value)) return 'adult';
            if (/16|14|13|12/.test(value)) return 'teen';
            return 'general';
        }

        export async function fetchHomeCatalogPage(page) {
            if (homeCatalogMode === 'manga') return fetchHoneyCatalogPage(page);
            if (homeCatalogMode === 'novel') {
                const items = await fetchRanobeCatalogPage(page, homeCatalogQuery);
                // RanobeLib's API exposes a next link but not a reliable total count.
                // Keep the UI count honest as pages are loaded progressively.
                homeCatalogTotal = Math.max(Number(items.total) || 0, Number(page || 1) * Math.max(items.length, 60));
                homeCatalogHasMore = items.hasNextPage !== false && items.length > 0;
                return items;
            }
            const endpoint = 'anime';
            const requestBody = homeCatalogRequestBody();
            if (homeCatalogMode === 'anime' && homeCatalogAdult) requestBody.rating = ['rx'];
            const items = await hikkaCatalog(endpoint, page, requestBody);
            homeCatalogTotal = Number(items.total || items.pagination?.total || 0);
            homeCatalogHasMore = items.hasNextPage !== undefined ? Boolean(items.hasNextPage) : items.length >= 28;
            return items;
        }

        async function loadRemainingHomeCatalogPages(requestId) {
            if (homeCatalogQuery || homeCatalogFilterResultItems || !homeCatalogHasMore) return;
            let nextPage = Math.max(2, Number(homeCatalogPage || 1) + 1);
            const maxPages = 250;
            while (homeCatalogHasMore && nextPage <= maxPages) {
                if (requestId !== homeCatalogRequestId) return;
                const pageNumbers = [nextPage, nextPage + 1, nextPage + 2, nextPage + 3];
                const pageResults = await Promise.all(pageNumbers.map(page => fetchHomeCatalogPage(page).catch(() => [])));
                if (requestId !== homeCatalogRequestId) return;
                const additions = pageResults.flat().filter(item => item?.url);
                const existing = new Set(homeCatalogItems.map(item => item.url));
                homeCatalogItems.push(...additions.filter(item => !existing.has(item.url)));
                const lastResult = pageResults[pageResults.length - 1] || [];
                const anyPageHasNext = pageResults.some(items => items?.hasNextPage !== false && items.length > 0);
                homeCatalogPage = pageNumbers[pageNumbers.length - 1];
                homeCatalogHasMore = Boolean(anyPageHasNext && lastResult.length);
                renderHomeCatalogGrid();
                nextPage += pageNumbers.length;
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            if (requestId === homeCatalogRequestId) {
                homeCatalogHasMore = false;
                renderHomeCatalogGrid();
            }
        }

        export function getHomeCatalogVisibleItems() {
            if (homeCatalogMode === 'manga') {
                if (homeCatalogFilterResultItems) return [...homeCatalogItems];
                return filterMangaCatalogItems(homeCatalogItems);
            }
            const items = [...homeCatalogItems];
            let filtered = items;
            if (homeCatalogGenre !== 'all') filtered = filtered.filter(item => homeCatalogGenreMatches(item, homeCatalogGenre));
            if ((homeCatalogMode === 'anime' || homeCatalogMode === 'manga') && homeCatalogAge !== 'all') filtered = filtered.filter(item => catalogAgeCategory(item) === homeCatalogAge);
            if (homeCatalogStatus !== 'all') {
                filtered = filtered.filter(item => {
                    const status = String(item.status || item.state || '').toLowerCase();
                    return homeCatalogStatus === 'ongoing' ? /ongoing|онго|publishing|active/.test(status) : /finished|completed|released|заверш/.test(status);
                });
            }
            if (homeCatalogAvailability === 'available') filtered = filtered.filter(item => item.readerAvailable || item.readerUrl);
            if (homeCatalogMode === 'anime' && homeCatalogType !== 'all') filtered = filtered.filter(item => String(item.type || '').toLowerCase() === homeCatalogType);
            if (homeCatalogMode === 'anime' && homeCatalogYearMin) filtered = filtered.filter(item => Number(item.year || item.start_year || 0) >= Number(homeCatalogYearMin));
            if (homeCatalogMode === 'anime' && homeCatalogYearMax) filtered = filtered.filter(item => Number(item.year || item.start_year || 0) <= Number(homeCatalogYearMax));
            if (homeCatalogMode === 'anime' && homeCatalogScoreMin) filtered = filtered.filter(item => Number(item.score || item.native_score || 0) >= Number(homeCatalogScoreMin));
            if (homeCatalogMode === 'novel' && homeCatalogOrigin !== 'all') filtered = filtered.filter(item => normalizeHoneyMatch(item.originLabel) === normalizeHoneyMatch(homeCatalogOrigin));
            if (homeCatalogMode === 'novel' && homeCatalogAge !== 'all') filtered = filtered.filter(item => ranobeAgeCategory(item) === homeCatalogAge);
            if (homeCatalogMode === 'novel' && homeCatalogYearMin) filtered = filtered.filter(item => Number(item.year || 0) >= Number(homeCatalogYearMin));
            if (homeCatalogMode === 'novel' && homeCatalogYearMax) filtered = filtered.filter(item => Number(item.year || 0) <= Number(homeCatalogYearMax));
            if (homeCatalogMode === 'novel' && homeCatalogScoreMin) filtered = filtered.filter(item => Number(item.score || 0) >= Number(homeCatalogScoreMin));
            if (homeCatalogGenres.size && (homeCatalogMode !== 'novel' || ranobeHasGenreData(filtered))) {
                filtered = filtered.filter(item => (item.genres || []).some(genre => homeCatalogGenres.has(normalizeHoneyMatch(typeof genre === 'object' ? genre.name || genre.name_ua : genre))));
            }
            return filtered.sort((a, b) => {
                const availability = Number(Boolean(b.readerAvailable || b.readerUrl)) - Number(Boolean(a.readerAvailable || a.readerUrl));
                if (availability) return availability;
                if (homeCatalogSort === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'uk');
                if (homeCatalogSort === 'newest') return Number(b.year || 0) - Number(a.year || 0);
                return (Number(b.score || b.native_score || 0) - Number(a.score || a.native_score || 0));
            });
        }

        export function formatHomeCatalogNumber(value) {
            return new Intl.NumberFormat('uk-UA').format(Number(value) || 0).replace(/\u00a0/g, ' ');
        }

        function homeCatalogPageSize() {
            // One predictable vertical page for every catalog type.
            return 28;
        }

        function homeCatalogPageCount() {
            const total = homeCatalogFilterResultItems?.length || homeCatalogTotal;
            return total ? Math.max(1, Math.ceil(total / homeCatalogPageSize())) : 0;
        }

        export function syncHomeCatalogPagination() {
            const pagination = document.getElementById('homeCatalogPagination');
            if (!pagination) return;
            const pageCount = homeCatalogPageCount();
            const previous = pagination.querySelector('[data-catalog-page="prev"]');
            const next = pagination.querySelector('[data-catalog-page="next"]');
            const label = pagination.querySelector('[data-catalog-page-label]');
            const canNext = pageCount ? homeCatalogPage < pageCount : homeCatalogHasMore;
            pagination.hidden = !pageCount && homeCatalogPage <= 1 && !homeCatalogHasMore;
            if (previous) previous.disabled = homeCatalogPage <= 1 || homeCatalogLoading;
            if (next) next.disabled = !canNext || homeCatalogLoading;
            if (label) label.textContent = pageCount
                ? `Сторінка ${formatHomeCatalogNumber(homeCatalogPage)} із ${formatHomeCatalogNumber(pageCount)}`
                : `Сторінка ${formatHomeCatalogNumber(homeCatalogPage)}`;
        }

        export function homeCatalogCountText(visibleCount) {
            const isFilteredManga = homeCatalogMode === 'manga' && (homeCatalogAdult || homeCatalogAge !== 'all' || homeCatalogFilterResultItems !== null);
            const isFilteredAnime = homeCatalogMode === 'anime' && (homeCatalogGenre !== 'all' || homeCatalogAge !== 'all' || homeCatalogStatus !== 'all' || homeCatalogType !== 'all' || homeCatalogYearMin || homeCatalogYearMax || homeCatalogScoreMin);
            const isFilteredNovel = homeCatalogMode === 'novel' && (homeCatalogStatus !== 'all' || homeCatalogAvailability !== 'all' || homeCatalogAge !== 'all' || homeCatalogOrigin !== 'all' || homeCatalogYearMin || homeCatalogYearMax || homeCatalogScoreMin || homeCatalogGenres.size);
            const total = isFilteredManga
                ? (homeCatalogFilterIndexReady && homeCatalogFilterResultItems ? homeCatalogFilterResultItems.length : visibleCount)
                : (homeCatalogTotal || visibleCount);
            if (homeCatalogMode === 'manga') {
                const available = homeCatalogAvailableTotal || homeCatalogItems.filter(item => item?.readerAvailable || item?.readerUrl).length;
                const suffix = isFilteredManga && !homeCatalogFilterIndexReady ? '' : ` із ${formatHomeCatalogNumber(total)}`;
                return `Доступно для читання: ${formatHomeCatalogNumber(available)}${suffix} манґи`;
            }
            if (homeCatalogMode === 'anime' && isFilteredAnime) return `Показано ${formatHomeCatalogNumber(visibleCount)} з ${formatHomeCatalogNumber(homeCatalogTotal || total)} результатів`;
            if (homeCatalogMode === 'novel' && isFilteredNovel) return `Показано ${formatHomeCatalogNumber(visibleCount)} з ${formatHomeCatalogNumber(homeCatalogTotal || total)} результатів`;
            if (homeCatalogMode === 'novel' && !homeCatalogTotal) return `Показано ${formatHomeCatalogNumber(total)}+ результатів`;
            return `Знайдено ${formatHomeCatalogNumber(total)} результатів`;
        }

        // Улюблене на картках каталогу — той самий локальний список закладок,
        // що й кнопка в плеєрі (Storage.getBookmarks/setBookmarks), тож стан
        // синхронний з профілем і не залежить від режиму каталогу.
        export function isCatalogUrlBookmarked(url) {
            if (!url) return false;
            return Storage.getBookmarks().some(b => b?.url === url);
        }

        export function toggleCatalogBookmark(url, title, poster) {
            if (!url) return false;
            const bookmarks = Storage.getBookmarks();
            const idx = bookmarks.findIndex(b => b?.url === url);
            if (idx >= 0) {
                bookmarks.splice(idx, 1);
                Storage.setBookmarks(bookmarks);
                showToast('Видалено з обраного');
                return false;
            }
            bookmarks.push({ url, title: title || 'Без назви', poster: poster || '', addedAt: Date.now() });
            Storage.setBookmarks(bookmarks);
            DailyStats.increment('bookmarksToday', 1);
            showToast('Додано до обраного');
            return true;
        }

        export function homeCatalogCardHtml(a) {
            const poster = a.images?.jpg?.large_image_url || ANIME_CARD_PLACEHOLDER;
            const title = a.title || 'Без назви';
            const type = a.typeLabel || animeTypeLabel(a.type);
            const status = homeCatalogMode === 'manga' ? (a.ageRating || (homeCatalogAdult ? '18+' : '')) : statusLabelUa(a.status);
            const meta = [type, a.year, status].filter(Boolean).join(' · ');
            const honeyId = a.honeyId || a.honeyTitleId || (homeCatalogMode === 'manga' ? String(a.url || '').split('/').filter(Boolean).pop() : '');
            const isMangaCard = homeCatalogMode === 'manga' && Boolean(honeyId);
            const url = String(a.url || '');
            const score = Number(a.score || a.native_score || 0);
            const ratingHtml = score > 0 ? `<span class="home-catalog-card__rating"><i class="fas fa-star"></i>${score.toFixed(1)}</span>` : '';
            const bookmarked = isCatalogUrlBookmarked(url);
            return `<article class="home-catalog-card${a.readerUrl || a.readerAvailable || isMangaCard ? ' home-catalog-card--reader' : ''}" data-url="${escapeHtml(url)}"${a.readerUrl ? ` data-reader-url="${escapeHtml(a.readerUrl)}"` : ''}${isMangaCard && !a.readerUrl ? ` data-reader-pending="1" data-honey-id="${escapeHtml(String(honeyId))}"` : ''} data-reader-title="${escapeHtml(title)}" tabindex="0" role="button" aria-label="${escapeHtml(title)}">
                <div class="home-catalog-card__poster">
                    <img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy" onload="this.classList.add('img--loaded')" onerror="this.onerror=null;this.src='${ANIME_CARD_PLACEHOLDER}'">
                    ${status ? `<span class="home-catalog-card__status">${escapeHtml(status)}</span>` : ''}
                    ${ratingHtml}
                </div>
                <div class="home-catalog-card__title">${escapeHtml(title)}</div>
                <div class="home-catalog-card__meta">${escapeHtml(meta || 'Аніме')}</div>
            </article>`;
        }

        export function bindHomeCatalogCards(root) {
            root?.querySelectorAll('.home-catalog-card:not([data-bound])').forEach(card => {
                card.dataset.bound = '1';
                if (!card.dataset.readerTitle) card.dataset.readerTitle = card.getAttribute('aria-label') || '';
                const open = async () => {
                    if (!card.dataset.url || card.dataset.opening === '1') return;
                    const cardTitle = card.dataset.readerTitle || card.getAttribute('aria-label') || 'Манґа';
                    if (homeCatalogMode === 'novel' && card.dataset.readerUrl) {
                        const item = homeCatalogItems.find(entry => String(entry.url || '') === String(card.dataset.url));
                        const poster = item?.images?.jpg?.large_image_url || item?.poster || '';
                        Router.goTo('novel', { url: card.dataset.readerUrl, title: cardTitle, poster });
                        return;
                    }
                    if (card.dataset.readerUrl) {
                        Router.goTo('manga', { url: card.dataset.readerUrl, title: cardTitle });
                        return;
                    }
                    if (homeCatalogMode === 'manga' && card.dataset.honeyId) {
                        card.dataset.opening = '1';
                        card.setAttribute('aria-busy', 'true');
                        try {
                            const item = homeCatalogItems.find(entry => String(entry.honeyId || entry.honeyTitleId) === String(card.dataset.honeyId)) || { honeyId: card.dataset.honeyId, honeyTitleId: card.dataset.honeyId, title: cardTitle, chapters: 1 };
                            const resolved = await resolveHoneyReader({ ...item, honeyTitleId: card.dataset.honeyId, chapters: Math.max(1, Number(item.chapters || 1)) });
                            if (resolved.readerUrl) {
                                card.dataset.readerUrl = resolved.readerUrl;
                                Router.goTo('manga', { url: resolved.readerUrl, title: cardTitle });
                                return;
                            }
                        } finally {
                            card.removeAttribute('aria-busy');
                            delete card.dataset.opening;
                        }
                        showToast('Розділи цього тайтлу ще не готові');
                        return;
                    }
                    if (homeCatalogMode === 'novel') {
                        card.dataset.opening = '1';
                        card.setAttribute('aria-busy', 'true');
                        try {
                            const item = homeCatalogItems.find(entry => String(entry.url || '') === String(card.dataset.url)) || { url: card.dataset.url, title: cardTitle, originalTitle: cardTitle };
                            const resolved = await resolveRanobeReader(item);
                            if (resolved.readerUrl) {
                                card.dataset.readerUrl = resolved.readerUrl;
                                const poster = item?.images?.jpg?.large_image_url || item?.poster || '';
                                Router.goTo('novel', { url: resolved.readerUrl, title: cardTitle, poster });
                                return;
                            }
                        } finally {
                            card.removeAttribute('aria-busy');
                            delete card.dataset.opening;
                        }
                        showToast('Для цього тайтлу RanobeLib ще не повернув доступний розділ');
                        return;
                    }
                    if (homeCatalogMode !== 'anime') { showToast('Розділи цього тайтлу ще не готові'); return; }
                    openPlayerPage(card.dataset.url);
                };
                // On iOS Safari, a non-native clickable card with :hover styles can
                // consume the first tap to activate the hover state. Handle the
                // touch/pointer activation directly and ignore the synthetic click
                // Safari dispatches immediately afterwards.
                // The favorite button is a real nested <button> with its own click
                // handler below — every card-level activation path must ignore
                // events that originate from it, or tapping the heart would also
                // open the reader/player underneath it.
                const isFavTarget = event => Boolean(event.target.closest?.('.home-catalog-card__fav'));
                let pointerStart = null;
                let pointerMoved = false;
                let suppressClickUntil = 0;
                const activateCard = event => {
                    if (isFavTarget(event)) return;
                    if (event.type === 'click' && (pointerMoved || Date.now() < suppressClickUntil)) {
                        event.preventDefault();
                        event.stopPropagation();
                        pointerMoved = false;
                        return;
                    }
                    // Deliberately use click rather than pointerup for opening. This
                    // prevents a light touch or the end of a swipe from launching a title.
                    open();
                };
                card.addEventListener('pointerdown', event => {
                    if (event.pointerType === 'mouse' || isFavTarget(event)) return;
                    pointerStart = { x: event.clientX, y: event.clientY };
                    pointerMoved = false;
                }, { passive: true });
                card.addEventListener('pointermove', event => {
                    if (!pointerStart || event.pointerType === 'mouse') return;
                    const dx = event.clientX - pointerStart.x;
                    const dy = event.clientY - pointerStart.y;
                    if (Math.hypot(dx, dy) > 10) {
                        pointerMoved = true;
                        suppressClickUntil = Date.now() + 500;
                    }
                }, { passive: true });
                card.addEventListener('pointerup', () => {
                    pointerStart = null;
                }, { passive: true });
                card.addEventListener('pointercancel', () => {
                    pointerStart = null;
                    pointerMoved = true;
                    suppressClickUntil = Date.now() + 500;
                }, { passive: true });
                card.addEventListener('click', activateCard);
                card.addEventListener('keydown', event => {
                    if (isFavTarget(event)) return;
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
                });

                const favBtn = card.querySelector('.home-catalog-card__fav');
                favBtn?.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    const posterImg = card.querySelector('.home-catalog-card__poster img');
                    const title = card.dataset.readerTitle || card.getAttribute('aria-label') || '';
                    const active = toggleCatalogBookmark(card.dataset.url, title, posterImg?.src || '');
                    favBtn.classList.toggle('is-active', active);
                    favBtn.setAttribute('aria-pressed', String(active));
                    favBtn.setAttribute('aria-label', active ? 'Видалити з обраного' : 'Додати в обране');
                    // Icon stays a solid heart; only color/opacity communicate the active state (see .home-catalog-card__fav.is-active).
                });
            });
        }

        export function buildHomeCatalogSectionHtml(items) {
            const activeMode = HOME_CATALOG_MODES.find(mode => mode.key === homeCatalogMode) || HOME_CATALOG_MODES[0];
            const visibleItems = getHomeCatalogVisibleItems();
            const catalogTitle = homeCatalogAdult ? '18+ манґа' : `Каталог ${activeMode.label.toLowerCase()}`;
            return `<section class="home-catalog-section" id="homeCatalogSection">
                <div class="catalog-feature-actions" role="group" aria-label="Швидкі дії">
                    <button type="button" class="catalog-feature-btn catalog-feature-btn--popular" id="catalogPopularBtn"><i class="fas fa-crown"></i><span>Популярне</span><small>Топ аніме</small></button>
                    <button type="button" class="catalog-feature-btn catalog-feature-btn--random" id="catalogRandomBtn"><i class="fas fa-dice"></i><span>Випадкове</span><small>Обрати навмання</small></button>
                </div>
                <div class="home-catalog-heading">
                    <div><h2>${escapeHtml(catalogTitle)}</h2></div>
                    <span class="home-catalog-count" id="homeCatalogCount">${homeCatalogCountText(visibleItems.length)}</span>
                </div>
                <nav class="home-catalog-tabs" id="homeCatalogTabs" aria-label="Тип каталогу">
                    ${HOME_CATALOG_MODES.map(mode => `<button class="home-catalog-tab${mode.key === homeCatalogMode ? ' active' : ''}" type="button" data-catalog-mode="${mode.key}"><i class="fas ${mode.icon}"></i><span>${mode.label}</span></button>`).join('')}
                </nav>
                <div class="home-catalog-search-row">
                    <label class="home-catalog-search"><i class="fas fa-search"></i><input id="homeCatalogSearch" type="search" value="${escapeHtml(homeCatalogQuery)}" placeholder="Введіть назву ${activeMode.label.toLowerCase()}..." autocomplete="off"></label>
                </div>
                <div class="home-catalog-controls">
                    <label class="home-catalog-sort"><select id="homeCatalogSort" aria-label="Сортування"><option value="score"${homeCatalogSort === 'score' ? ' selected' : ''}>За оцінкою</option><option value="newest"${homeCatalogSort === 'newest' ? ' selected' : ''}>Новіші</option><option value="title"${homeCatalogSort === 'title' ? ' selected' : ''}>За назвою</option></select><i class="fas fa-arrow-up-wide-short"></i></label>
                    <div class="home-catalog-view-toggle" role="group" aria-label="Вигляд каталогу"><button type="button" class="home-catalog-view${homeCatalogView === 'grid' ? ' active' : ''}" data-catalog-view="grid" aria-label="Сітка"><i class="fas fa-grip"></i></button><button type="button" class="home-catalog-view${homeCatalogView === 'list' ? ' active' : ''}" data-catalog-view="list" aria-label="Список"><i class="fas fa-list"></i></button></div>
                    <div class="home-catalog-quick-actions${homeCatalogMode === 'anime' ? ' home-catalog-quick-actions--genres' : ''}" role="group" aria-label="Швидкі дії каталогу">
                        <button class="home-catalog-filter-btn home-catalog-schedule-btn" id="homeCatalogScheduleBtn" type="button"><i class="fas fa-calendar-days"></i><span>Розклад виходу</span></button>
                        ${homeCatalogMode === 'anime' ? '<div class="home-catalog-genre-rail home-catalog-genre-rail--inline" id="homeCatalogGenreRailHost" role="list" aria-label="Жанри каталогу"></div>' : homeCatalogAgeHtml()}
                    </div>
                </div>

                ${homeCatalogModeFilterHtml()}
                <div class="home-catalog-results-label" id="homeCatalogResultsLabel">${homeCatalogCountText(visibleItems.length)}</div>
                <div class="home-catalog-grid${homeCatalogView === 'list' ? ' is-list' : ' is-swipe'}" id="homeCatalogGrid">${visibleItems.length ? visibleItems.map(homeCatalogCardHtml).join('') : '<div class="home-catalog-empty">Каталог тимчасово недоступний.</div>'}</div>
                <div class="home-catalog-pagination" id="homeCatalogPagination" hidden aria-label="Навігація сторінками каталогу">
                    <button type="button" class="home-catalog-page-btn" data-catalog-page="prev"><i class="fas fa-chevron-left"></i><span>Назад</span></button>
                    <span class="home-catalog-page-label" data-catalog-page-label>Сторінка 1</span>
                    <button type="button" class="home-catalog-page-btn" data-catalog-page="next"><span>Далі</span><i class="fas fa-chevron-right"></i></button>
                </div>
            </section>`;
        }

        function prefetchHomeCatalogReaderUrls(root) {
            if (!root || !['manga', 'novel'].includes(homeCatalogMode)) return;
            const mode = homeCatalogMode;
            const selector = mode === 'manga'
                ? '.home-catalog-card[data-honey-id]:not([data-reader-url])'
                : '.home-catalog-card[data-url]:not([data-reader-url])';
            const cards = [...root.querySelectorAll(selector)];
            if (!cards.length) return;
            let cursor = 0;
            const worker = async () => {
                while (cursor < cards.length) {
                    const card = cards[cursor++];
                    if (card.dataset.readerUrl) continue;
                    try {
                        let resolved;
                        if (mode === 'manga') {
                            const honeyId = card.dataset.honeyId;
                            const item = homeCatalogItems.find(entry => String(entry.honeyId || entry.honeyTitleId) === String(honeyId))
                                || { honeyId, honeyTitleId: honeyId, title: card.dataset.readerTitle, chapters: 1 };
                            resolved = await resolveHoneyReader({ ...item, honeyTitleId: honeyId, chapters: Math.max(1, Number(item.chapters || 1)) });
                        } else {
                            const url = card.dataset.url;
                            const item = homeCatalogItems.find(entry => String(entry.url || '') === String(url))
                                || { url, title: card.dataset.readerTitle, originalTitle: card.dataset.readerTitle };
                            resolved = await resolveRanobeReader(item);
                        }
                        if (resolved?.readerUrl && card.isConnected && homeCatalogMode === mode) card.dataset.readerUrl = resolved.readerUrl;
                    } catch { /* A later tap can retry unavailable catalog entries. */ }
                }
            };
            const start = () => { void Promise.all(Array.from({ length: Math.min(3, cards.length) }, worker)); };
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 1200 });
            else setTimeout(start, 0);
        }
        export function renderHomeCatalogGrid() {
            const grid = document.getElementById('homeCatalogGrid');
            const count = document.getElementById('homeCatalogCount');
            const number = document.getElementById('homeCatalogResultNumber');
            if (!grid) return;
            const visibleItems = getHomeCatalogVisibleItems();
            grid.classList.toggle('is-list', homeCatalogView === 'list');
            grid.classList.toggle('is-swipe', homeCatalogView === 'grid');
            grid.innerHTML = visibleItems.length ? visibleItems.map(homeCatalogCardHtml).join('') : '<div class="home-catalog-empty">Нічого не знайдено за цими параметрами.</div>';
            bindHomeCatalogCards(grid);
            if (!homeCatalogHasMore) {
                document.getElementById('homeCatalogMoreBtn')?.remove();
            }
            if (count) count.textContent = homeCatalogCountText(visibleItems.length);
            const label = document.getElementById('homeCatalogResultsLabel');
            if (label) label.textContent = homeCatalogCountText(visibleItems.length);
            if (number) number.textContent = formatHomeCatalogNumber(homeCatalogTotal || visibleItems.length);
            syncHomeCatalogPagination();
        }

        export function openHomeCatalogFilters(root = document) {
            document.querySelector('#homeCatalogFilterDialog')?.remove();
            const initialGenres = homeCatalogMode === 'novel'
                ? ranobeFilterGenres(homeCatalogItems)
                : catalogFilterGenres(homeCatalogItems);
            const dialog = document.createElement('div');
            dialog.id = 'homeCatalogFilterDialog';
            dialog.className = 'home-catalog-filter-dialog';
            const genreMarkup = genres => genres.length
                ? genres.map(genre => `<label><input type="checkbox" value="${escapeHtml(genre)}"${homeCatalogGenres.has(normalizeHoneyMatch(genre)) ? ' checked' : ''}><span>${escapeHtml(genre)}</span></label>`).join('')
                : `<small>${homeCatalogMode === 'novel' ? 'Жанри для Ранобе ще завантажуються.' : 'Жанри для цього каталогу ще не надані джерелом.'}</small>`;
            const selected = (value, expected) => value === expected ? ' selected' : '';
            const modeFilterMarkup = homeCatalogMode === 'anime' ? `<label>Статус<select id="homeFilterStatus"><option value="all">Усі статуси</option><option value="ongoing"${selected(homeCatalogStatus, 'ongoing')}>Онґоїнг</option><option value="finished"${selected(homeCatalogStatus, 'finished')}>Завершені</option></select></label><label>Формат<select id="homeFilterType"><option value="all">Усі формати</option><option value="tv"${selected(homeCatalogType, 'tv')}>Серіал</option><option value="movie"${selected(homeCatalogType, 'movie')}>Фільм</option><option value="ova"${selected(homeCatalogType, 'ova')}>OVA / ONA</option></select></label><div class="home-catalog-filter-dialog__row"><label>Рік від<input id="homeFilterYearMin" type="number" min="1960" max="2030" value="${escapeHtml(homeCatalogYearMin)}" placeholder="від"></label><label>Рік до<input id="homeFilterYearMax" type="number" min="1960" max="2030" value="${escapeHtml(homeCatalogYearMax)}" placeholder="до"></label></div><label>Мінімальна оцінка<input id="homeFilterScoreMin" type="number" min="0" max="10" step="0.1" value="${escapeHtml(homeCatalogScoreMin)}" placeholder="0–10"></label>` : homeCatalogMode === 'manga' ? `<label>Доступність<select id="homeFilterAvailability"><option value="all">Усі тайтли</option><option value="available"${selected(homeCatalogAvailability, 'available')}>Є що читати</option></select></label><label>Вікова категорія<select id="homeFilterAge"><option value="all">Усі вікові категорії</option>${HOME_MANGA_AGE_OPTIONS.filter(x => x.key !== 'all').map(x => `<option value="${x.key}"${selected(homeCatalogAge, x.key)}>${x.label}</option>`).join('')}</select></label>` : `<label>Статус<select id="homeFilterStatus"><option value="all">Усі статуси</option><option value="ongoing"${selected(homeCatalogStatus, 'ongoing')}>Онґоїнг</option><option value="finished"${selected(homeCatalogStatus, 'finished')}>Завершені</option></select></label><label>Доступність<select id="homeFilterAvailability"><option value="all">Усі тайтли</option><option value="available"${selected(homeCatalogAvailability, 'available')}>Є доступний розділ</option></select></label><label>Вікова категорія<select id="homeFilterAge">${ranobeFilterAges().map(option => `<option value="${option.key}"${selected(homeCatalogAge, option.key)}>${option.label}</option>`).join('')}</select></label><label>Походження<select id="homeFilterOrigin"><option value="all">Усі країни та типи</option>${ranobeFilterOrigins().map(origin => `<option value="${escapeHtml(origin)}"${selected(homeCatalogOrigin, origin)}>${escapeHtml(origin)}</option>`).join('')}</select></label><div class="home-catalog-filter-dialog__row"><label>Рік від<input id="homeFilterYearMin" type="number" min="1900" max="2030" value="${escapeHtml(homeCatalogYearMin)}" placeholder="від"></label><label>Рік до<input id="homeFilterYearMax" type="number" min="1900" max="2030" value="${escapeHtml(homeCatalogYearMax)}" placeholder="до"></label></div><label>Мінімальна оцінка<input id="homeFilterScoreMin" type="number" min="0" max="10" step="0.1" value="${escapeHtml(homeCatalogScoreMin)}" placeholder="0–10"></label>`;
            dialog.innerHTML = `<div class="home-catalog-filter-dialog__backdrop" data-filter-close></div><section class="home-catalog-filter-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="homeCatalogFilterTitle"><div class="home-catalog-filter-dialog__head"><div><span class="home-catalog-filter-dialog__eyebrow">Налаштування каталогу</span><h3 id="homeCatalogFilterTitle">Фільтри · ${escapeHtml((HOME_CATALOG_MODES.find(x => x.key === homeCatalogMode) || HOME_CATALOG_MODES[0]).label)}</h3></div><button type="button" data-filter-close aria-label="Закрити"><i class="fas fa-xmark"></i></button></div><p id="homeFilterDataStatus" class="home-catalog-filter-dialog__status">${homeCatalogMode === 'manga' ? 'Завантажуємо повний каталог для точного фільтра…' : 'Оберіть потрібні параметри каталогу.'}</p>${modeFilterMarkup}<fieldset><legend>Жанри</legend><div class="home-catalog-filter-dialog__genres">${genreMarkup(initialGenres)}</div></fieldset><div class="home-catalog-filter-dialog__actions"><button type="button" class="btn-outline" data-filter-reset>Скинути</button><button type="button" class="btn-primary" data-filter-apply>Застосувати</button></div></section>`;
            document.body.appendChild(dialog);
            const close = () => dialog.remove();
            dialog.querySelectorAll('[data-filter-close]').forEach(button => button.addEventListener('click', close));
            const status = dialog.querySelector('#homeFilterDataStatus');
            if (homeCatalogMode === 'manga') {
                loadHoneyMangaFullCatalog().then(items => {
                    if (!dialog.isConnected) return;
                    dialog.querySelector('.home-catalog-filter-dialog__genres').innerHTML = genreMarkup(mangaFilterGenres(items));
                    if (status) status.textContent = `Повний каталог завантажено: ${formatHomeCatalogNumber(items.length)} тайтлів`;
                }).catch(() => { if (status) status.textContent = 'Не вдалося завантажити повний каталог; спробуйте ще раз.'; });
            }
            dialog.querySelector('[data-filter-reset]')?.addEventListener('click', async () => {
                homeCatalogStatus = 'all'; homeCatalogAvailability = 'all'; homeCatalogGenre = 'all'; homeCatalogAge = 'all'; homeCatalogOrigin = 'all'; homeCatalogAdult = false; homeCatalogType = 'all'; homeCatalogYearMin = ''; homeCatalogYearMax = ''; homeCatalogScoreMin = ''; homeCatalogGenres = new Set(); homeCatalogFilterResultItems = null; homeCatalogFilterResultOffset = 0;
                close();
                await reloadHomeCatalog();
            });
            dialog.querySelector('[data-filter-apply]')?.addEventListener('click', async event => {
                const button = event.currentTarget;
                button.disabled = true;
                button.textContent = 'Завантаження…';
                homeCatalogStatus = dialog.querySelector('#homeFilterStatus')?.value || 'all';
                homeCatalogAvailability = dialog.querySelector('#homeFilterAvailability')?.value || 'all';
                homeCatalogAge = dialog.querySelector('#homeFilterAge')?.value || 'all';
                homeCatalogOrigin = dialog.querySelector('#homeFilterOrigin')?.value || 'all';
                homeCatalogAdult = homeCatalogMode === 'manga' && homeCatalogAge === 'adult';
                homeCatalogGenre = 'all';
                homeCatalogType = dialog.querySelector('#homeFilterType')?.value || 'all';
                homeCatalogYearMin = dialog.querySelector('#homeFilterYearMin')?.value || '';
                homeCatalogYearMax = dialog.querySelector('#homeFilterYearMax')?.value || '';
                homeCatalogScoreMin = dialog.querySelector('#homeFilterScoreMin')?.value || '';
                homeCatalogGenres = new Set([...dialog.querySelectorAll('.home-catalog-filter-dialog__genres input:checked')].map(input => normalizeHoneyMatch(input.value)));
                if (homeCatalogMode === 'manga') {
                    const source = await loadHoneyMangaFullCatalog();
                    const result = filterMangaCatalogItems(source);
                    homeCatalogFilterResultItems = result;
                    homeCatalogFilterIndexReady = true;
                    homeCatalogFilterResultOffset = Math.min(24, result.length);
                    homeCatalogItems = result.slice(0, homeCatalogFilterResultOffset);
                    homeCatalogPage = 0;
                    homeCatalogHasMore = homeCatalogFilterResultOffset < result.length;
                    homeCatalogTotal = result.length;
                    homeCatalogAvailableTotal = result.filter(item => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
                    close();
                    renderHomeCatalogGrid();
                    syncHomeCatalogMoreButton();
                    return;
                }
                close();
                renderHomeCatalogGrid();
            });
        }

        function bindHomeCatalogModeFilters(root) {
            root.querySelectorAll('[data-home-catalog-filter-card][data-home-catalog-filter-group="all"]').forEach(control => control.addEventListener('click', async () => {
                resetHomeCatalogModeFilters();
                await reloadHomeCatalog();
            }));
        }

        function syncHomeCatalogModeControls(root = document) {
            const section = root.querySelector('#homeCatalogSection');
            const resultsLabel = section?.querySelector('#homeCatalogResultsLabel');
            if (!section || !resultsLabel) return;
            const panel = section.querySelector('.home-catalog-mode-filter-panel');
            const genreBrowser = section.querySelector('.home-catalog-genre-browser:not(.home-catalog-mode-filter-panel)');
            const quickActions = section.querySelector('.home-catalog-quick-actions');
            const ageHost = section.querySelector('#homeCatalogAgeRailHost');
            const genreHost = section.querySelector('#homeCatalogGenreRailHost');
            if (homeCatalogMode === 'anime') {
                panel?.remove();
                ageHost?.remove();
                genreBrowser?.remove();
                if (!section.querySelector('#homeCatalogGenreRailHost') && quickActions) {
                    quickActions.classList.add('home-catalog-quick-actions--genres');
                    quickActions.insertAdjacentHTML('beforeend', '<div class="home-catalog-genre-rail home-catalog-genre-rail--inline" id="homeCatalogGenreRailHost" role="list" aria-label="Жанри каталогу"></div>');
                }
                syncHomeCatalogGenreControl(section);
                return;
            }
            if (homeCatalogMode === 'manga') {
                genreBrowser?.remove();
                genreHost?.remove();
                panel?.remove();
                if (!ageHost && quickActions) quickActions.insertAdjacentHTML('beforeend', homeCatalogAgeHtml());
                syncHomeCatalogAgeControl(section);
                return;
            }
            ageHost?.remove();
            genreHost?.remove();
            genreBrowser?.remove();
            const markup = homeCatalogModeFilterHtml();
            if (panel) panel.outerHTML = markup;
            else resultsLabel.insertAdjacentHTML('beforebegin', markup);
            bindHomeCatalogModeFilters(section);
        }

        async function applyHomeCatalogModeFilters(root) {
            const read = key => root.querySelector(`[data-home-catalog-filter-card][data-home-catalog-filter-group="${key}"].active`)?.dataset.homeCatalogFilterValue || root.querySelector(`[data-home-catalog-filter="${key}"]`)?.value || 'all';
            if (homeCatalogMode === 'manga') {
                homeCatalogAvailability = read('availability');
                homeCatalogAge = read('age');
                homeCatalogAdult = homeCatalogAge === 'adult';
                homeCatalogStatus = 'all';
                homeCatalogOrigin = 'all';
                const source = await loadHoneyMangaFullCatalog();
                const result = filterMangaCatalogItems(source);
                homeCatalogFilterResultItems = result;
                homeCatalogFilterIndexReady = true;
                homeCatalogFilterResultOffset = Math.min(homeCatalogPageSize(), result.length);
                homeCatalogItems = result.slice(0, homeCatalogFilterResultOffset);
                homeCatalogPage = 1;
                homeCatalogHasMore = homeCatalogFilterResultOffset < result.length;
                homeCatalogTotal = result.length;
                homeCatalogAvailableTotal = result.filter(item => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
                renderHomeCatalogGrid();
                syncHomeCatalogMoreButton();
                return;
            }
            homeCatalogStatus = read('status');
            homeCatalogAvailability = read('availability');
            homeCatalogAge = read('age');
            homeCatalogOrigin = read('origin');
            homeCatalogAdult = false;
            homeCatalogFilterResultItems = null;
            homeCatalogFilterResultOffset = 0;
            homeCatalogFilterIndexReady = false;
            renderHomeCatalogGrid();
        }

        function resetHomeCatalogModeFilters() {
            homeCatalogStatus = 'all';
            homeCatalogAvailability = 'all';
            homeCatalogAge = 'all';
            homeCatalogOrigin = 'all';
            homeCatalogAdult = false;
            homeCatalogYearMin = '';
            homeCatalogYearMax = '';
            homeCatalogScoreMin = '';
            homeCatalogGenres = new Set();
            homeCatalogFilterResultItems = null;
            homeCatalogFilterResultOffset = 0;
            homeCatalogFilterIndexReady = false;
        }

        export function bindHomeCatalogMenu(root) {
            root.querySelector('#catalogPopularBtn')?.addEventListener('click', () => {
                homeCatalogSort = 'score';
                homeCatalogPreset = 'all';
                reloadHomeCatalog();
                showToast('Популярне аніме');
            });
            root.querySelector('#catalogRandomBtn')?.addEventListener('click', () => openRandomAnime());
            const tabs = root.querySelectorAll('[data-catalog-mode]');
            tabs.forEach(tab => tab.addEventListener('click', async () => {
                if (tab.dataset.catalogMode === homeCatalogMode || homeCatalogLoading) return;
                // Invalidate a still-pending initial anime request. Without this,
                // a late Hikka response could overwrite a freshly selected Ranobe tab.
                homeSectionsRequestId++;
                homeCatalogMode = tab.dataset.catalogMode;
                homeCatalogAdult = false;
                homeCatalogAge = 'all';
                homeCatalogOrigin = 'all';
                homeCatalogQuery = '';
                homeCatalogPreset = 'all';
                homeCatalogGenre = 'all';
                homeCatalogStatus = 'all';
                homeCatalogAvailability = 'all';
                homeCatalogGenres = new Set();
                homeCatalogFilterResultItems = null; homeCatalogFilterResultOffset = 0;
                homeCatalogType = 'all'; homeCatalogYearMin = ''; homeCatalogYearMax = ''; homeCatalogScoreMin = '';
                await reloadHomeCatalog();
            }));
            root.querySelector('#homeCatalogSort')?.addEventListener('change', async event => {
                homeCatalogSort = event.target.value;
                homeCatalogFilterResultItems = null; homeCatalogFilterResultOffset = 0;
                await reloadHomeCatalog();
            });
            root.querySelectorAll('[data-catalog-view]').forEach(button => button.addEventListener('click', () => {
                homeCatalogView = button.dataset.catalogView;
                root.querySelectorAll('[data-catalog-view]').forEach(item => item.classList.toggle('active', item === button));
                renderHomeCatalogGrid();
            }));
            bindHomeCatalogModeFilters(root);
            syncHomeCatalogAgeControl(root);
            root.querySelector('#homeCatalogAdultBtn')?.addEventListener('click', async () => {
                if (homeCatalogLoading) return;
                homeCatalogAdult = !homeCatalogAdult;
                homeCatalogMode = 'manga';
                homeCatalogAge = homeCatalogAdult ? 'adult' : 'all';
                homeCatalogOrigin = 'all';
                homeCatalogQuery = '';
                homeCatalogPreset = 'all';
                homeCatalogGenre = 'all';
                homeCatalogStatus = 'all';
                homeCatalogAvailability = 'all';
                homeCatalogGenres = new Set();
                homeCatalogFilterResultItems = null; homeCatalogFilterResultOffset = 0;
                homeCatalogType = 'all'; homeCatalogYearMin = ''; homeCatalogYearMax = ''; homeCatalogScoreMin = '';
                await reloadHomeCatalog();
            });
            let searchTimer = null;
            root.querySelector('#homeCatalogSearch')?.addEventListener('input', event => {
                clearTimeout(searchTimer);
                homeCatalogQuery = event.target.value.trim();
                searchTimer = setTimeout(() => reloadHomeCatalog(), 450);
            });
            root.querySelector('#homeCatalogScheduleBtn')?.addEventListener('click', () => {
                Router.goTo('schedule');
            });
            root.querySelectorAll('[data-catalog-page]').forEach(button => button.addEventListener('click', () => {
                const delta = button.dataset.catalogPage === 'prev' ? -1 : 1;
                void loadHomeCatalogPage(homeCatalogPage + delta);
            }));

        }

        export function updateHomeCatalogModeLabels() {
            const mode = HOME_CATALOG_MODES.find(item => item.key === homeCatalogMode) || HOME_CATALOG_MODES[0];
            const title = document.querySelector('#homeCatalogSection h2');
            const search = document.getElementById('homeCatalogSearch');
            if (title) title.textContent = homeCatalogAdult ? '18+ манґа' : `Каталог ${mode.label.toLowerCase()}`;
            if (search) search.placeholder = `Введіть назву ${homeCatalogAdult ? 'манґи' : mode.label.toLowerCase()}...`;
            document.querySelectorAll('[data-catalog-mode]').forEach(tab => tab.classList.toggle('active', tab.dataset.catalogMode === homeCatalogMode));
            const adultButton = document.getElementById('homeCatalogAdultBtn');
            if (adultButton) {
                adultButton.hidden = homeCatalogMode !== 'manga';
                adultButton.classList.toggle('active', homeCatalogAdult && homeCatalogMode === 'manga');
                adultButton.setAttribute('aria-pressed', String(homeCatalogAdult && homeCatalogMode === 'manga'));
            }
        }

        export async function loadHomeCatalogPage(targetPage = 1) {
            if (homeCatalogLoading) return;
            const grid = document.getElementById('homeCatalogGrid');
            if (!grid) return;
            const page = Math.max(1, Number(targetPage) || 1);
            const pageSize = homeCatalogPageSize();
            const knownPages = homeCatalogPageCount();
            if (knownPages && page > knownPages) return;
            homeCatalogLoading = true;
            syncHomeCatalogPagination();
            grid.innerHTML = '<div class="loader home-catalog-loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження сторінки...</div>';
            try {
                if (homeCatalogFilterResultItems) {
                    const start = (page - 1) * pageSize;
                    homeCatalogItems = homeCatalogFilterResultItems.slice(start, start + pageSize);
                    homeCatalogFilterResultOffset = Math.min(start + pageSize, homeCatalogFilterResultItems.length);
                    homeCatalogPage = page;
                    homeCatalogHasMore = homeCatalogFilterResultOffset < homeCatalogFilterResultItems.length;
                } else {
                    const items = await fetchHomeCatalogPageSafe(page);
                    homeCatalogItems = (Array.isArray(items) ? items : []).filter(item => item?.url);
                    homeCatalogPage = page;
                    homeCatalogHasMore = items?.hasNextPage !== undefined
                        ? Boolean(items.hasNextPage)
                        : Boolean(homeCatalogHasMore);
                }
                if (homeCatalogMode === 'manga') {
                    homeCatalogAvailableTotal = homeCatalogItems.filter(item => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
                }
                syncHomeCatalogGenreControl();
                renderHomeCatalogGrid();
                document.getElementById('homeCatalogGrid')?.scrollTo({ left: 0, behavior: 'instant' });
                document.getElementById('homeCatalogSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch (error) {
                grid.innerHTML = '<div class="home-catalog-empty">Не вдалося завантажити сторінку. Спробуйте ще раз.</div>';
                showToast('Не вдалося завантажити сторінку каталогу');
            } finally {
                homeCatalogLoading = false;
                syncHomeCatalogPagination();
            }
        }

        export async function reloadHomeCatalog() {
            const grid = document.getElementById('homeCatalogGrid');
            if (!grid || homeCatalogLoading) return;
            const requestId = ++homeCatalogRequestId;
            updateHomeCatalogModeLabels();
            syncHomeCatalogModeControls();
            homeCatalogLoading = true;
            homeCatalogFilterResultItems = null;
            homeCatalogFilterResultOffset = 0;
            homeCatalogFilterIndexReady = false;
            homeCatalogPage = 1;
            // Do not carry the previous anime/novel page total (usually 24) into manga.
            homeCatalogTotal = 0;
            homeCatalogAvailableTotal = 0;
            homeCatalogHasMore = true;
            document.getElementById('homeCatalogCount')?.replaceChildren(document.createTextNode('Завантаження...'));
            document.getElementById('homeCatalogResultsLabel')?.replaceChildren(document.createTextNode('Завантаження...'));
            grid.innerHTML = '<div class="loader home-catalog-loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>';
            try {
                let nextItems;
                if (homeCatalogMode === 'manga' && homeCatalogAge !== 'all') {
                    const firstItems = await fetchHomeCatalogPage(1);
                    nextItems = filterMangaCatalogItems(firstItems);
                    homeCatalogPage = 1;
                    homeCatalogHasMore = true;
                    // Do not block first paint on all manga pages. The same full
                    // pagination loader completes the exact 18+ result in background.
                    loadHoneyMangaFullCatalog().then(fullCatalog => {
                        if (requestId !== homeCatalogRequestId || homeCatalogMode !== 'manga' || homeCatalogAge === 'all') return;
                        homeCatalogFilterResultItems = filterMangaCatalogItems(fullCatalog);
                        homeCatalogFilterIndexReady = true;
                        homeCatalogFilterResultOffset = Math.min(homeCatalogPageSize(), homeCatalogFilterResultItems.length);
                        homeCatalogItems = homeCatalogFilterResultItems.slice(0, homeCatalogFilterResultOffset);
                        homeCatalogTotal = homeCatalogFilterResultItems.length;
                        homeCatalogAvailableTotal = homeCatalogItems.filter(item => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
                        homeCatalogHasMore = homeCatalogFilterResultOffset < homeCatalogFilterResultItems.length;
                        renderHomeCatalogGrid();
                        syncHomeCatalogMoreButton();
                    }).catch(() => {});
                } else {
                    nextItems = await fetchHomeCatalogPageSafe(1);
                }
                if (requestId !== homeCatalogRequestId) return;
                homeCatalogItems = nextItems;
                if (homeCatalogMode === 'manga') homeCatalogAvailableTotal = homeCatalogItems.filter(item => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
                syncHomeCatalogGenreControl();
                renderHomeCatalogGrid();
                syncHomeCatalogMoreButton();
            } catch (error) {
                if (requestId !== homeCatalogRequestId) return;
                grid.innerHTML = `<div class="home-catalog-empty">Не вдалося завантажити каталог. Спробуйте ще раз.</div>`;
                showToast('Помилка завантаження каталогу');
            } finally {
                if (requestId === homeCatalogRequestId) homeCatalogLoading = false;
            }
        }

        export async function loadHomeCatalogMore() {
            if (homeCatalogLoading) return;
            const button = document.getElementById('homeCatalogMoreBtn');
            if (!button) return;
            homeCatalogLoading = true;
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Завантаження...';
            try {
                if (homeCatalogMode === 'manga' && homeCatalogAge !== 'all' && !homeCatalogFilterResultItems) {
                    const fullCatalog = await loadHoneyMangaFullCatalog();
                    homeCatalogFilterResultItems = filterMangaCatalogItems(fullCatalog);
                    homeCatalogFilterIndexReady = true;
                    homeCatalogFilterResultOffset = Math.min(homeCatalogItems.length || homeCatalogPageSize(), homeCatalogFilterResultItems.length);
                    homeCatalogItems = homeCatalogFilterResultItems.slice(0, homeCatalogFilterResultOffset);
                    homeCatalogTotal = homeCatalogFilterResultItems.length;
                    homeCatalogAvailableTotal = homeCatalogItems.filter(item => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
                    homeCatalogHasMore = homeCatalogFilterResultOffset < homeCatalogFilterResultItems.length;
                    renderHomeCatalogGrid();
                    if (!homeCatalogHasMore) button.remove();
                    else { button.disabled = false; button.innerHTML = '<i class="fas fa-plus"></i> Продовжити'; }
                    return;
                }
                if (homeCatalogFilterResultItems) {
                    homeCatalogFilterResultOffset = Math.min(homeCatalogFilterResultOffset + 24, homeCatalogFilterResultItems.length);
                    homeCatalogItems = homeCatalogFilterResultItems.slice(0, homeCatalogFilterResultOffset);
                    homeCatalogAvailableTotal = homeCatalogItems.filter(item => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
                    homeCatalogHasMore = homeCatalogFilterResultOffset < homeCatalogFilterResultItems.length;
                    renderHomeCatalogGrid();
                    if (!homeCatalogHasMore) button.remove();
                    else { button.disabled = false; button.innerHTML = '<i class="fas fa-plus"></i> Продовжити'; }
                    return;
                }
                const nextPage = homeCatalogPage + 1;
                const nextItems = await fetchHomeCatalogPage(nextPage);
                const existing = new Set(homeCatalogItems.map(item => item.url));
                homeCatalogItems.push(...nextItems.filter(item => item.url && !existing.has(item.url)));
                homeCatalogPage = nextPage;
                if (homeCatalogMode === 'novel') homeCatalogTotal = Math.max(homeCatalogTotal, homeCatalogItems.length + (nextItems.hasNextPage !== false ? 60 : 0));
                if (homeCatalogMode === 'manga') homeCatalogAvailableTotal = homeCatalogItems.filter(item => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
                renderHomeCatalogGrid();
                homeCatalogHasMore = nextItems.hasNextPage !== undefined
                    ? Boolean(nextItems.hasNextPage)
                    : homeCatalogMode === 'manga'
                        ? homeCatalogHasMore
                        : Boolean(nextItems.length) && (!homeCatalogTotal || homeCatalogItems.length < homeCatalogTotal);
                if (!homeCatalogHasMore) button.remove();
                else { button.disabled = false; button.innerHTML = '<i class="fas fa-plus"></i> Продовжити'; }
            } catch (error) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-rotate-right"></i> Спробувати ще';
                showToast('Не вдалося завантажити наступну сторінку каталогу');
            } finally { homeCatalogLoading = false; }
        }
        export function syncHomeCatalogMoreButton() {
            // The home catalog is intentionally continuation-free for anime,
            // manga, and novels. Remove any stale button from older cached markup.
            document.getElementById('homeCatalogMoreBtn')?.remove();
        }
        window.loadHomeCatalogMore = loadHomeCatalogMore;

        export async function loadAndDisplayGenreSections() {
            const requestId = ++homeSectionsRequestId;
            const catalogRequestId = ++homeCatalogRequestId;
            const container = document.getElementById('genreSectionsContainer');
            if (!container) return;
            container.style.display = 'flex';
            homeCatalogPage = 1;
            homeCatalogItems = [];
            homeCatalogTotal = 0;
            homeCatalogAvailableTotal = 0;
            homeCatalogHasMore = true;
            homeCatalogFilterResultItems = null;
            homeCatalogFilterResultOffset = 0;
            homeCatalogLoading = false;

            // Paint the catalog shell before the source request resolves. This
            // keeps the RanobeLib and Honey Manga tabs usable even when Hikka's
            // corsproxy request is slow or unavailable.
            container.innerHTML = buildHomeCatalogSectionHtml([]);
            const initialGrid = container.querySelector('#homeCatalogGrid');
            if (initialGrid) initialGrid.innerHTML = '<div class="loader home-catalog-loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження каталогу...</div>';
            bindHomeCatalogCards(container);
            bindHomeCatalogMenu(container);
            syncHomeCatalogGenreControl(container);
            syncHomeCatalogMoreButton();

            try {
                const catalogItems = await fetchHomeCatalogPageSafe(1).catch(error => {
                    console.error('Помилка завантаження каталогу:', error);
                    homeCatalogTotal = 0;
                    throw error;
                });
                if (requestId !== homeSectionsRequestId) return;
                homeCatalogItems = catalogItems.filter(item => item?.url);
                if (homeCatalogMode === 'manga') homeCatalogAvailableTotal = homeCatalogItems.filter(item => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
                syncHomeCatalogGenreControl(container);
                renderHomeCatalogGrid();
                syncHomeCatalogMoreButton();
                if (homeCatalogMode === 'novel') {
                    fetchRanobeCatalogTotal(homeCatalogQuery).then(total => {
                        if (requestId !== homeSectionsRequestId || !total) return;
                        homeCatalogTotal = total;
                        renderHomeCatalogGrid();
                    }).catch(error => console.warn('RanobeLib total count unavailable:', error));
                }


            } catch (err) {
                console.error('Помилка завантаження головної сторінки:', err);
                const grid = container.querySelector('#homeCatalogGrid');
                if (grid) {
                    grid.innerHTML = `<div class="home-catalog-empty">Не вдалося завантажити каталог. <button class="btn-outline" type="button" id="homeCatalogRetryBtn">Спробувати ще</button></div>`;
                    grid.querySelector('#homeCatalogRetryBtn')?.addEventListener('click', () => reloadHomeCatalog());
                }
                homeCatalogHasMore = false;
                syncHomeCatalogMoreButton();
            }
        }

        export function statusLabelUa(status) {
            const map = { ongoing: 'Онгоінг', released: 'Вийшло', finished: 'Завершено', completed: 'Завершено', anons: 'Анонс' };
            if (!status) return '';
            return map[status] || (status.charAt(0).toUpperCase() + status.slice(1));
        }

        export function buildAnimeCarouselSectionHtml(sectionId, name, items, variant) {
            if (!items || items.length === 0) return '';
            const isWide = variant === 'wide';
            const cardsHtml = items.map(a => {
                const poster = a.images?.jpg?.large_image_url || ANIME_CARD_PLACEHOLDER;
                const title = a.title || 'Без назви';
                if (!isWide) {
                    const type = '';
                    return `
                            <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}">
                              <div class="anime-poster">
                                <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='${ANIME_CARD_PLACEHOLDER}'">
                                <span class="anime-card-type" data-role="type" ${type ? '' : 'hidden'}>${type}</span>
                              </div>
                              <div class="anime-title-under">${title}</div>
                            </div>
                          `;
                }
                const badges = [];
                if (a.typeLabel) badges.push(`<span class="wide-card__badge">${a.typeLabel}</span>`);
                const statusText = statusLabelUa(a.status);
                if (statusText) badges.push(`<span class="wide-card__badge wide-card__badge--status">${statusText}</span>`);
                if (a.epLabel) badges.push(`<span class="wide-card__badge wide-card__badge--ep">${a.epLabel}</span>`);
                const progressHtml = (a.progress != null)
                    ? `<div class="wide-card__progress"><div class="wide-card__progress-fill" style="width:${Math.min(a.progress, 100)}%"></div></div>`
                    : '';
                return `
                            <div class="wide-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}">
                              <div class="wide-card__frame">
                                <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='${ANIME_CARD_PLACEHOLDER}'">
                                ${badges.length ? `<div class="wide-card__badges">${badges.join('')}</div>` : ''}
                                <div class="wide-card__play"><i class="fas fa-play"></i></div>
                                ${progressHtml}
                                <div class="wide-card__title">${title}</div>
                              </div>
                            </div>
                          `;
            }).join('');
            return `
                    <div class="genre-section" id="${sectionId}">
                      <div class="genre-title">
                        <span class="genre-name">${name}</span>
                      </div>
                      <div class="genre-carousel-wrapper">
                        <button class="carousel-btn carousel-btn-left" data-target="${sectionId}" aria-label="Вліво"><i class="fas fa-chevron-left"></i></button>
                        <div class="genre-carousel${isWide ? ' genre-carousel--wide' : ''}" id="${sectionId}-carousel">
                          ${cardsHtml}
                        </div>
                        <button class="carousel-btn carousel-btn-right" data-target="${sectionId}" aria-label="Вправо"><i class="fas fa-chevron-right"></i></button>
                      </div>
                    </div>
                  `;
        }

        export function buildPopularVerticalSectionHtml(items) {
            if (!items || items.length === 0) return '';
            const top = items.slice(0, 10);
            const cardsHtml = top.map((a, idx) => {
                const poster = a.images?.jpg?.large_image_url || ANIME_CARD_PLACEHOLDER;
                const title = a.title || 'Без назви';
                return `
                    <div class="popular-card popular-card--compact" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${idx*0.03}s">
                      <div class="popular-card__poster-wrap">
                        <div class="popular-card__poster">
                          <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add(\'img--loaded\')" onerror="this.src=\'${ANIME_CARD_PLACEHOLDER}\'">
                        </div>
                        <div class="popular-card__rank">${idx + 1}</div>
                      </div>
                      <div class="popular-card__title">${title}</div>
                    </div>
                  `;
            }).join('');
            return `
                    <div class="genre-section" id="genre-popular">
                      <div class="genre-title genre-title--row">
                        <span class="genre-name">Популярні</span>
                        <button class="genre-title-link" id="homePopularShowAllBtn" type="button">Показати всі</button>
                      </div>
                      <div class="popular-list popular-list--home">
                        ${cardsHtml}
                      </div>
                    </div>
                  `;
        }

        export function buildHistoryCarouselSectionHtml() {
            const history = Storage.getHistory() || [];
            if (!history.length) return '';
            const seen = new Set();
            const items = [];
            for (const h of history) {
                const key = h.animeId || h.url;
                if (!key || seen.has(key)) continue;
                seen.add(key);
                let epLabel = '';
                if (h.episode) epLabel = h.season ? `С${h.season} · Е${h.episode}` : `Е${h.episode}`;
                items.push({
                    url: h.url,
                    title: h.title,
                    images: { jpg: { large_image_url: h.poster || '' } },
                    epLabel,
                    progress: typeof h.progress === 'number' ? h.progress : null
                });
                if (items.length >= 20) break;
            }
            if (!items.length) return '';
            return buildAnimeCarouselSectionHtml('history-watched', 'Ви дивилися', items, 'wide');
        }


        export async function openScheduleItemInPlayer(title, el) {
            if (!title) return;
            const englishTitle = el?.dataset?.titleEn || '';
            const scheduleSlug = el?.dataset?.slug || '';
            if (el && el.classList.contains('schedule-item--loading')) return; // вже вантажиться
            if (el) el.classList.add('schedule-item--loading');
            try {
                let results = await searchHikka(title, 1);
                if ((!results || !results.length) && englishTitle && englishTitle !== title) results = await searchHikka(englishTitle, 1);
                if (results && results.length) {
                    openPlayerPage(results[0].url);
                } else if (scheduleSlug) {
                    // AnimeOn і Hikka часто використовують той самий ID/slug — не втрачаємо тайтл через різницю назв.
                    searchHikka(scheduleSlug || title, 1).then(found => found[0] && openPlayerPage(found[0].url));
                } else {
                    showToast(`Не знайшли «${title}» — спробуйте пошук вручну`);
                    searchPageState.query = title;
                    searchPageState.page = 1;
                    Router.goTo('search');
                }
            } catch (err) {
                showToast('Помилка пошуку: ' + err.message);
            } finally {
                if (el) el.classList.remove('schedule-item--loading');
            }
        }

        // ====================================================================
        //  СТОРІНКА ПОШУКУ
        // ====================================================================
        export let searchPageState = { query: '', page: 1, list: [], loading: false, hasNextPage: false, total: 0 };

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
                let searchPageDebounce;
                input.addEventListener('input', () => {
                    const q = input.value.trim();
                    if (clearBtn) {
                        if (q.length > 0) clearBtn.classList.add('visible');
                        else clearBtn.classList.remove('visible');
                    }
                    clearTimeout(searchPageDebounce);
                    if (q.length >= 2) {
                        searchPageDebounce = setTimeout(() => {
                            searchPageState.query = q;
                            searchPageState.page = 1;
                            performSearchPage();
                        }, 350);
                    } else if (q.length === 0) {
                        searchPageState.query = '';
                        searchPageState.list = [];
                        searchPageState.hasNextPage = false;
                        searchPageState.total = 0;
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
                        searchPageState.hasNextPage = false;
                        searchPageState.total = 0;
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
            DailyStats.increment('searchesToday', 1);
            searchPageState.loading = true;
            results.innerHTML = '<div class="loader" style="grid-column:1/-1;"><i class="fas fa-spinner fa-pulse"></i> Пошук...</div>';
            pagination.innerHTML = '';
            try {
                const list = await searchHikka(query, searchPageState.page);
                searchPageState.list = list;
                searchPageState.hasNextPage = list.hasNextPage !== undefined ? Boolean(list.hasNextPage) : list.length >= 28;
                searchPageState.total = Number(list.total || list.pagination?.total || 0);
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
                    return `
                <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${idx*0.03}s">
                  <div class="anime-poster">
                    <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='data:image/svg+xml,...'">
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
                const nextDisabled = searchPageState.hasNextPage ? '' : 'disabled';
                pagination.innerHTML = `
              <button class="btn-outline" onclick="changeSearchPage(${searchPageState.page-1})" ${prevDisabled}><i class="fas fa-chevron-left"></i> Назад</button>
              <span class="page-indicator">Сторінка ${searchPageState.page}${searchPageState.total ? ` · ${searchPageState.total}` : ''}</span>
              <button class="btn-outline" onclick="changeSearchPage(${searchPageState.page+1})" ${nextDisabled}>Вперед <i class="fas fa-chevron-right"></i></button>
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
            if (p < 1 || (p > searchPageState.page && searchPageState.hasNextPage === false)) return;
            searchPageState.page = p;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            performSearchPage();
        };

        // ====================================================================
        //  СТОРІНКА НАЛАШТУВАНЬ
        // ====================================================================
        // Стан сторінки Налаштувань — яка вкладка активна, чи відкрито прев'ю
        export async function uploadToCloudinary(file, maxW, maxH, quality) {
            // Compress image locally, returns a Blob
            const compressedBlob = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        let w = img.width, hh = img.height;
                        if (w > maxW) { hh = hh * (maxW / w); w = maxW; }
                        if (hh > maxH) { w = w * (maxH / hh); hh = maxH; }
                        canvas.width = Math.round(w);
                        canvas.height = Math.round(hh);
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        // toBlob is async and returns Blob, not dataURL
                        canvas.toBlob(blob => {
                            if (blob) resolve(blob);
                            else reject(new Error('Canvas toBlob failed'));
                        }, 'image/jpeg', quality);
                    };
                    img.onerror = () => reject(new Error('Image load failed'));
                    img.src = ev.target.result;
                };
                reader.onerror = () => reject(new Error('FileReader failed'));
                reader.readAsDataURL(file);
            });

            // Upload Blob to Cloudinary
            const formData = new FormData();
            formData.append('file', compressedBlob, 'upload.jpg');
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
            const resp = await fetch(uploadUrl, { method: 'POST', body: formData, mode: 'cors', credentials: 'omit' });
            if (!resp.ok) {
                const errText = await resp.text().catch(() => '');
                throw new Error('Cloudinary upload failed: ' + resp.status + ' ' + errText.substring(0,100));
            }
            const data = await resp.json();
            if (!data.secure_url) throw new Error('Cloudinary: no secure_url in response');
            /* console.log removed */
            return data.secure_url;
        }

        // Checks if a URL points to a GIF (by extension or query param).
        export function isGifUrl(url) {
            if (!url || typeof url !== 'string') return false;
            const lower = url.toLowerCase();
            return lower.endsWith('.gif') || lower.includes('.gif?') || lower.includes('.gif/');
        }

        // Applies 'is-gif' class to an <img> inside a given container if the src is a GIF.
        export function applyGifClass(container, imgSelector) {
            if (!container) return;
            const img = container.querySelector(imgSelector || 'img');
            if (img && img.src && isGifUrl(img.src)) {
                img.classList.add('is-gif');
            }
        }

        // Uploads a file/blob to Cloudinary AS-IS, no canvas resize/compression.
        // Used for GIFs so the animation survives (canvas would flatten it to 1 frame).
        export async function uploadRawToCloudinary(fileOrBlob, filename, resourceType = 'image') {
            const formData = new FormData();
            formData.append('file', fileOrBlob, filename || (resourceType === 'video' ? 'upload.mp4' : 'upload.gif'));
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
            const resp = await fetch(uploadUrl, { method: 'POST', body: formData, mode: 'cors', credentials: 'omit' });
            if (!resp.ok) {
                const errText = await resp.text().catch(() => '');
                throw new Error('Cloudinary upload failed: ' + resp.status + ' ' + errText.substring(0, 180));
            }
            const data = await resp.json();
            if (!data.secure_url) throw new Error('Cloudinary: no secure_url in response');
            return data.secure_url;
        }

        const CLOUDINARY_IMAGE_FILE_LIMIT = 10 * 1024 * 1024;
        const LARGE_GIF_CAPTURE_MS = 12000;

        // A free Cloudinary environment accepts images/GIFs only up to 10 MB, while
        // video uploads have a much larger limit. Capture an oversized animated GIF
        // as a browser video without drawing it to a still-image canvas. The GIF's
        // frames continue to advance while MediaRecorder records the canvas stream.
        export async function convertLargeGifToVideo(file) {
            if (!file || file.size <= CLOUDINARY_IMAGE_FILE_LIMIT) return file;
            if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
                throw new Error('GIF понад 10 МБ потребує браузер із підтримкою відеозапису');
            }

            const objectUrl = URL.createObjectURL(file);
            try {
                const image = new Image();
                image.src = objectUrl;
                await new Promise((resolve, reject) => {
                    image.onload = resolve;
                    image.onerror = () => reject(new Error('Не вдалося прочитати GIF для конвертації'));
                });

                const maxDimension = 1280;
                const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(2, Math.round((image.naturalWidth || 2) * scale));
                canvas.height = Math.max(2, Math.round((image.naturalHeight || 2) * scale));
                const context = canvas.getContext('2d', { alpha: false });
                if (!context) throw new Error('Браузер не підтримує підготовку GIF-відео');

                const mimeType = [
                    'video/webm;codecs=vp9',
                    'video/webm;codecs=vp8',
                    'video/webm',
                    'video/mp4'
                ].find((type) => MediaRecorder.isTypeSupported(type));
                if (!mimeType) throw new Error('Браузер не підтримує формат відео для великого GIF');

                const stream = canvas.captureStream(30);
                const chunks = [];
                const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
                const recordingFinished = new Promise((resolve, reject) => {
                    recorder.ondataavailable = (event) => {
                        if (event.data && event.data.size) chunks.push(event.data);
                    };
                    recorder.onerror = () => reject(new Error('Не вдалося записати великий GIF як відео'));
                    recorder.onstop = () => resolve();
                });

                const drawFrame = () => {
                    context.drawImage(image, 0, 0, canvas.width, canvas.height);
                };
                const frameTimer = window.setInterval(drawFrame, 1000 / 30);
                drawFrame();
                recorder.start(250);
                await new Promise((resolve) => window.setTimeout(resolve, LARGE_GIF_CAPTURE_MS));
                window.clearInterval(frameTimer);
                recorder.stop();
                await recordingFinished;
                stream.getTracks().forEach((track) => track.stop());

                const outputType = mimeType.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
                const outputExtension = outputType === 'video/mp4' ? 'mp4' : 'webm';
                const outputBlob = new Blob(chunks, { type: outputType });
                if (!outputBlob.size) throw new Error('Великий GIF не вдалося перетворити у відео');
                return new File([outputBlob], String(file.name || 'upload.gif').replace(/\.gif$/i, `.${outputExtension}`), { type: outputType });
            } finally {
                URL.revokeObjectURL(objectUrl);
            }
        }

        export async function uploadGifToCloudinary(file, filename = 'profile.gif') {
            if (!file || file.size <= CLOUDINARY_IMAGE_FILE_LIMIT) {
                return uploadRawToCloudinary(file, filename, 'image');
            }
            const videoFile = await convertLargeGifToVideo(file);
            return uploadRawToCloudinary(videoFile, videoFile.name || filename.replace(/\.gif$/i, '.webm'), 'video');
        }

        export async function uploadVideoToCloudinary(file, filename) {
            return uploadRawToCloudinary(file, filename || 'profile-video.mp4', 'video');
        }

        export function isVideoFile(file) {
            return !!file && (String(file.type || '').startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name || ''));
        }

        export function isVideoUrl(url) {
            return !!url && (/\/video\/upload\//i.test(url) || /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(url));
        }

        export function profileMediaTransformStyle(settings) {
            if (!settings || typeof settings !== 'object') return '';
            const numberInRange = (value, fallback, min, max) => {
                const n = Number(value);
                return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
            };
            const zoom = numberInRange(settings.zoom, 1, 1, 3);
            const x = numberInRange(settings.x, 0, -100, 100);
            const y = numberInRange(settings.y, 0, -100, 100);
            const mirrorX = settings.mirrorX ? -1 : 1;
            const mirrorY = settings.mirrorY ? -1 : 1;
            return `transform:translate(${x}%, ${y}%) scale(${(zoom * mirrorX).toFixed(4)}, ${(zoom * mirrorY).toFixed(4)});transform-origin:center center;`;
        }

        function animatedMediaSources(url) {
            if (!url || typeof url !== 'string') return { mp4: '', webm: '', original: url || '' };
            const cleanUrl = url.split('#')[0];
            const query = url.slice(cleanUrl.length);
            const extensionMatch = cleanUrl.match(/\.(gif|webm|mp4|mov|m4v|ogv)$/i);
            if (!extensionMatch) return { mp4: '', webm: '', original: url };
            const baseUrl = cleanUrl.slice(0, -extensionMatch[0].length);
            const extension = extensionMatch[1].toLowerCase();
            const mp4 = `${baseUrl}.mp4${query}`;
            const webm = `${baseUrl}.webm${query}`;
            return {
                mp4: extension === 'mp4' ? url : mp4,
                webm: extension === 'webm' ? url : webm,
                original: url
            };
        }

        export function profileMediaMarkup(url, className, alt, settings) {
            if (!url) return '';
            const safeUrl = escapeHtml(url);
            const style = escapeHtml(profileMediaTransformStyle(settings));
            const styleAttr = style ? ` style="${style}"` : '';
            const animated = isVideoUrl(url) || isGifUrl(url);
            if (animated) {
                const sources = animatedMediaSources(url);
                const safeMp4 = escapeHtml(sources.mp4);
                const safeWebm = escapeHtml(sources.webm);
                const safeOriginal = escapeHtml(sources.original);
                const animatedClass = `${className || ''}${className ? ' ' : ''}is-animated-media`;
                const sourceMarkup = `${safeMp4 ? `<source src="${safeMp4}" type="video/mp4">` : ''}${safeWebm && safeWebm !== safeMp4 ? `<source src="${safeWebm}" type="video/webm">` : ''}`;
                return `<video class="${animatedClass}"${styleAttr} autoplay muted loop playsinline webkit-playsinline="true" preload="auto" aria-label="${escapeHtml(alt || '')}">${sourceMarkup}<img src="${safeOriginal}" alt="${escapeHtml(alt || '')}"></video>`;
            }
            return `<img class="${className}" src="${safeUrl}"${styleAttr} alt="${escapeHtml(alt || '')}" loading="lazy">`;
        }

        // Uploads an already-cropped Blob (from the image editor canvas) to Cloudinary.
        export async function uploadBlobToCloudinary(blob, filename) {
            return uploadRawToCloudinary(blob, filename || 'upload.jpg');
        }

        // ====================================================================
        //  IMAGE EDITOR — fullscreen crop/position tool for avatar & banner
        //  (Telegram/Instagram-style for avatar; YouTube-style device safe-zone
        //  guide for banner). Animated media keeps its original frames and stores
        //  only the crop/zoom transform settings.
        // ====================================================================
        export function _imgeditClamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

        export function openImageEditor(file, mode, onSaved, initialBannerFormat = 'narrow') {
            // mode: 'avatar' (1:1 circle) or 'banner' (narrow/wide profile banner)
            const normalizedBannerFormat = mode === 'banner' && initialBannerFormat === 'wide' ? 'wide' : 'narrow';
            const objectUrl = URL.createObjectURL(file);
            const isVideo = isVideoFile(file);
            const isGif = !isVideo && (file.type === 'image/gif' || /\.gif$/i.test(file.name || ''));
            const isAnimated = isVideo || isGif;
            const isPng = !isAnimated && (file.type === 'image/png' || String(file.name || '').toLowerCase().endsWith('.png'));
            const previousBodyOverflow = document.body.style.overflow;
            const overlay = document.createElement('div');
            overlay.className = `imgedit-overlay${mode === 'banner' ? ' imgedit-banner-overlay' : ' imgedit-avatar-overlay'}`;
            document.body.style.overflow = 'hidden';
            overlay.innerHTML = `
                <div class="imgedit-topbar">
                    <button class="imgedit-back" id="imgeditBack" title="Скасувати">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <button class="imgedit-save" id="imgeditSave">Зберегти</button>
                </div>
                <div class="imgedit-stage" id="imgeditStage">
                    ${isVideo ? `<video class="imgedit-img" id="imgeditImg" src="${objectUrl}" muted autoplay loop playsinline preload="metadata"></video>` : `<img class="imgedit-img${isGif ? ' imgedit-animated-gif' : ''}" id="imgeditImg" src="${objectUrl}" alt="">`}
                    <div class="imgedit-frame" id="imgeditFrame"></div>
                    <div id="imgeditGuides"></div>
                </div>
                ${mode === 'banner' ? `<div class="imgedit-format-row" role="group" aria-label="Формат банера">
                    <button class="imgedit-format-btn${normalizedBannerFormat === 'narrow' ? ' active' : ''}" id="imgeditNarrow" aria-pressed="${normalizedBannerFormat === 'narrow'}">Вузький</button>
                    <button class="imgedit-format-btn${normalizedBannerFormat === 'wide' ? ' active' : ''}" id="imgeditWide" aria-pressed="${normalizedBannerFormat === 'wide'}">Широкий</button>
                </div>` : ''}
                <div class="imgedit-bottombar">
                    <div class="imgedit-tools-row">
                        <button class="imgedit-tool-btn" id="imgeditCenterBtn" title="По центру">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
                        </button>
                        <button class="imgedit-tool-btn" id="imgeditMirrorHBtn" title="Віддзеркалити по горизонталі">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v18"/><path d="M8 6l-3 3 3 3"/><path d="M16 6l3 3-3 3"/><rect x="3" y="15" width="18" height="6" rx="1" opacity="0.3"/></svg>
                        </button>
                        <button class="imgedit-tool-btn" id="imgeditMirrorVBtn" title="Віддзеркалити по вертикалі">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h18"/><path d="M6 8l3-3 3 3"/><path d="M6 16l3 3 3-3"/><rect x="15" y="3" width="6" height="18" rx="1" opacity="0.3"/></svg>
                        </button>
                    </div>
                    <div class="imgedit-zoom-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15" y2="15"/><line x1="7" y1="10" x2="13" y2="10"/></svg>
                        <input type="range" class="imgedit-zoom-slider" id="imgeditZoom" min="100" max="300" value="100">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15" y2="15"/><line x1="10" y1="7" x2="10" y2="13"/></svg>
                    </div>
                    ${mode === 'banner' ? `<div class="imgedit-caption">Виберіть формат банера. Вузький показує банер тонкою смугою, широкий — вищим і з більшою видимою областю.</div>` : `<div class="imgedit-caption">Перемістіть і масштабуйте ${isVideo ? 'відео' : (isGif ? 'GIF' : 'фото')}, щоб обрати область для аватарки.</div>`}
                </div>`;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('open'));

            const stage = overlay.querySelector('#imgeditStage');
            const mediaEl = overlay.querySelector('#imgeditImg');
            const frameEl = overlay.querySelector('#imgeditFrame');
            const guidesEl = overlay.querySelector('#imgeditGuides');
            const zoomSlider = overlay.querySelector('#imgeditZoom');
            const saveBtn = overlay.querySelector('#imgeditSave');
            const backBtn = overlay.querySelector('#imgeditBack');
            const centerBtn = overlay.querySelector('#imgeditCenterBtn');
            const mirrorHBtn = overlay.querySelector('#imgeditMirrorHBtn');
            const mirrorVBtn = overlay.querySelector('#imgeditMirrorVBtn');
            const narrowBtn = overlay.querySelector('#imgeditNarrow');
            const wideBtn = overlay.querySelector('#imgeditWide');

            let frameW, frameH, frameX, frameY;
            let natW = 0, natH = 0;
            let baseScale = 1, scale = 1, minScale = 1;
            let tx = 0, ty = 0;
            let mirrorX = false, mirrorY = false;
            let bannerFormat = normalizedBannerFormat;
            let dragging = false, dragStartX = 0, dragStartY = 0, startTx = 0, startTy = 0;

            function layoutFrame() {
                const stageRect = stage.getBoundingClientRect();
                const zoomRatio = minScale > 0 ? scale / minScale : 1;
                if (mode === 'avatar') {
                    const size = Math.min(stageRect.width, stageRect.height) * 0.72;
                    frameW = size; frameH = size;
                } else {
                    frameW = stageRect.width * 0.92;
                    const formatRatio = bannerFormat === 'wide' ? (9 / 16) : 0.24;
                    frameH = Math.min(stageRect.height * (bannerFormat === 'wide' ? 0.82 : 0.55), frameW * formatRatio);
                }
                frameX = (stageRect.width - frameW) / 2;
                frameY = (stageRect.height - frameH) / 2;
                frameEl.style.width = frameW + 'px';
                frameEl.style.height = frameH + 'px';
                frameEl.style.left = frameX + 'px';
                frameEl.style.top = frameY + 'px';
                frameEl.classList.toggle('circle', mode === 'avatar');

                if (natW && natH && minScale > 0) {
                    minScale = Math.max(frameW / natW, frameH / natH);
                    scale = minScale * Math.max(1, zoomRatio);
                }

                guidesEl.innerHTML = '';
            }

            function clampPan() {
                const w = natW * scale, h = natH * scale;
                const minTx = frameX + frameW - w, maxTx = frameX;
                const minTy = frameY + frameH - h, maxTy = frameY;
                tx = _imgeditClamp(tx, Math.min(minTx, maxTx), Math.max(minTx, maxTx));
                ty = _imgeditClamp(ty, Math.min(minTy, maxTy), Math.max(minTy, maxTy));
            }

            function applyTransform() {
                const scaledW = natW * scale;
                const scaledH = natH * scale;
                const scaleX = mirrorX ? -1 : 1;
                const scaleY = mirrorY ? -1 : 1;
                // The editor image uses transform-origin: 0 0. Shift the origin
                // by the rendered dimensions before applying a negative scale,
                // otherwise iOS moves the mirrored media outside the stage.
                const renderTx = mirrorX ? tx + scaledW : tx;
                const renderTy = mirrorY ? ty + scaledH : ty;
                mediaEl.style.transform = `translate(${renderTx}px, ${renderTy}px) scale(${scale * scaleX}, ${scale * scaleY})`;
            }

            function centerImage() {
                const w = natW * scale, h = natH * scale;
                tx = frameX + (frameW - w) / 2;
                ty = frameY + (frameH - h) / 2;
                clampPan();
                applyTransform();
            }

            const handleMediaReady = () => {
                natW = isVideo ? mediaEl.videoWidth : mediaEl.naturalWidth;
                natH = isVideo ? mediaEl.videoHeight : mediaEl.naturalHeight;
                layoutFrame();
                baseScale = Math.max(frameW / natW, frameH / natH);
                minScale = baseScale;
                scale = baseScale;
                mediaEl.style.width = natW + 'px';
                mediaEl.style.height = natH + 'px';
                zoomSlider.value = 100;
                centerImage();
            };
            if (isVideo) {
                mediaEl.addEventListener('loadedmetadata', handleMediaReady, { once: true });
                if (mediaEl.readyState >= 1) handleMediaReady();
            } else mediaEl.onload = handleMediaReady;

            stage.addEventListener('pointerdown', (e) => {
                if (e.target.closest('.imgedit-tool-btn') || e.target === zoomSlider) return;
                dragging = true;
                dragStartX = e.clientX; dragStartY = e.clientY;
                startTx = tx; startTy = ty;
                stage.setPointerCapture(e.pointerId);
            });
            stage.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                tx = startTx + (e.clientX - dragStartX);
                ty = startTy + (e.clientY - dragStartY);
                clampPan();
                applyTransform();
            });
            ['pointerup', 'pointercancel'].forEach(ev => stage.addEventListener(ev, () => { dragging = false; }));

            stage.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.08 : 0.08;
                const newScale = _imgeditClamp(scale + delta * scale, minScale, minScale * 3);
                scale = newScale;
                zoomSlider.value = Math.round((scale / minScale) * 100);
                clampPan();
                applyTransform();
            }, { passive: false });

            zoomSlider.addEventListener('input', () => {
                scale = minScale * (parseFloat(zoomSlider.value) / 100);
                clampPan();
                applyTransform();
            });

            if (mode === 'banner') {
                const setBannerFormat = (format) => {
                    bannerFormat = format === 'wide' ? 'wide' : 'narrow';
                    narrowBtn?.classList.toggle('active', bannerFormat === 'narrow');
                    wideBtn?.classList.toggle('active', bannerFormat === 'wide');
                    narrowBtn?.setAttribute('aria-pressed', String(bannerFormat === 'narrow'));
                    wideBtn?.setAttribute('aria-pressed', String(bannerFormat === 'wide'));
                    layoutFrame();
                    if (natW && natH) centerImage();
                };
                narrowBtn?.addEventListener('click', () => setBannerFormat('narrow'));
                wideBtn?.addEventListener('click', () => setBannerFormat('wide'));
            }

            // Центрування
            centerBtn.addEventListener('click', () => centerImage());

            // Віддзеркалення по горизонталі
            mirrorHBtn.addEventListener('click', () => {
                mirrorX = !mirrorX;
                mirrorHBtn.classList.toggle('active', mirrorX);
                applyTransform();
            });

            // Віддзеркалення по вертикалі
            mirrorVBtn.addEventListener('click', () => {
                mirrorY = !mirrorY;
                mirrorVBtn.classList.toggle('active', mirrorY);
                applyTransform();
            });

            function closeEditor() {
                overlay.classList.remove('open');
                window.removeEventListener('resize', layoutFrame);
                setTimeout(() => {
                    overlay.remove();
                    URL.revokeObjectURL(objectUrl);
                    document.body.style.overflow = previousBodyOverflow;
                }, 200);
            }
            backBtn.addEventListener('click', closeEditor);

            saveBtn.addEventListener('click', () => {
                saveBtn.disabled = true;
                saveBtn.textContent = '...';
                try {
                    if (isAnimated) {
                        const centeredTx = frameX + (frameW - natW * scale) / 2;
                        const centeredTy = frameY + (frameH - natH * scale) / 2;
                        const zoom = _imgeditClamp(scale / Math.max(minScale, 0.0001), 1, 3);
                        closeEditor();
                        onSaved({
                            zoom: Number(zoom.toFixed(4)),
                            x: Number((((tx - centeredTx) / Math.max(frameW, 1)) * 100).toFixed(4)),
                            y: Number((((ty - centeredTy) / Math.max(frameH, 1)) * 100).toFixed(4)),
                            mirrorX: !!mirrorX,
                            mirrorY: !!mirrorY,
                            bannerFormat: mode === 'banner' ? bannerFormat : undefined
                        });
                        return;
                    }
                    const outScale = mode === 'avatar' ? (480 / frameW) : (Math.max(1, 1200 / frameW));
                    const outW = Math.round(frameW * outScale);
                    const outH = Math.round(frameH * outScale);
                    const canvas = document.createElement('canvas');
                    canvas.width = outW; canvas.height = outH;
                    const ctx = canvas.getContext('2d');
                    const sx = (frameX - tx) / scale;
                    const sy = (frameY - ty) / scale;
                    const sW = frameW / scale;
                    const sH = frameH / scale;

                    // Mirror the already-selected crop exactly once. The old
                    // implementation inverted both source and destination for
                    // vertical flips, which cancelled the mirror on iOS.
                    ctx.save();
                    if (mirrorX) {
                        ctx.translate(outW, 0);
                        ctx.scale(-1, 1);
                    }
                    if (mirrorY) {
                        ctx.translate(0, outH);
                        ctx.scale(1, -1);
                    }
                    ctx.drawImage(mediaEl, sx, sy, sW, sH, 0, 0, outW, outH);
                    ctx.restore();

                    // PNG зберігаємо з прозорістю, решта — JPEG
                    const format = isPng ? 'image/png' : 'image/jpeg';
                    const quality = isPng ? undefined : 0.88;
                    canvas.toBlob(blob => {
                        if (!blob) { showToast('Помилка обробки зображення'); saveBtn.disabled = false; saveBtn.textContent = 'Зберегти'; return; }
                        closeEditor();
                        onSaved(blob, { bannerFormat: mode === 'banner' ? bannerFormat : undefined });
                    }, format, quality);
                } catch (err) {
                    console.error('Image editor save failed:', err);
                    showToast('Помилка кадрування');
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Зберегти';
                }
            });

            window.addEventListener('resize', () => {
                layoutFrame();
                if (natW && natH) {
                    centerImage();
                }
            });
        }

        export async function editExistingProfileImage(url, mode) {
            if (!url) return;
            showToast('Підготовка редактора зображення...');
            try {
                const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
                if (!response.ok) throw new Error('Не вдалося завантажити зображення');
                const blob = await response.blob();
                const type = blob.type || 'image/jpeg';
                const extension = type === 'image/png' ? 'png' : 'jpg';
                const file = new File([blob], `${mode}.${extension}`, { type });
                const currentProfile = getProfile();
                openImageEditor(file, mode, async (croppedBlob, editorState) => {
                    try {
                        showToast(mode === 'avatar' ? 'Збереження аватарки...' : 'Збереження банера...');
                        const imageUrl = await uploadBlobToCloudinary(croppedBlob, `${mode}.${extension}`);
                        const profile = getProfile();
                        if (mode === 'avatar') {
                            profile.avatar = imageUrl;
                            profile.avatarVideo = '';
                            profile.avatarVideoSettings = null;
                        } else {
                            profile.banner = imageUrl;
                            profile.bannerVideo = '';
                            profile.bannerVideoSettings = null;
                            profile.bannerFormat = editorState?.bannerFormat === 'wide' ? 'wide' : (profile.bannerFormat === 'wide' ? 'wide' : 'narrow');
                        }
                        saveProfile(profile);
                        if (Router.currentRoute === 'profile') renderProfilePage();
                        if (Router.currentRoute === 'settings') renderSettingsPage();
                        showToast(mode === 'avatar' ? 'Аватарку оновлено' : 'Банер оновлено');
                    } catch (err) {
                        console.error('Edited profile image upload error:', err);
                        showToast('Не вдалося зберегти відредаговане зображення');
                    }
                }, mode === 'banner' ? currentProfile.bannerFormat : 'narrow');
            } catch (err) {
                console.error('Existing profile image editor error:', err);
                showToast('Не вдалося відкрити редактор зображення');
            }
        }

        export async function editExistingProfileVideo(url, mode) {
            if (!url) return;
            showToast(isGifUrl(url) ? 'Підготовка редактора GIF...' : 'Підготовка редактора відео...');
            try {
                const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
                if (!response.ok) throw new Error('Не вдалося завантажити відео');
                const blob = await response.blob();
                const isGif = String(blob.type || '').toLowerCase() === 'image/gif' || isGifUrl(url);
                const file = new File([blob], `${mode}.${isGif ? 'gif' : 'mp4'}`, { type: isGif ? 'image/gif' : (blob.type || 'video/mp4') });
                const currentProfile = getProfile();
                openImageEditor(file, mode, (settings) => {
                    const profile = getProfile();
                    const videoKey = mode === 'avatar' ? 'avatarVideo' : 'bannerVideo';
                    const imageKey = mode === 'avatar' ? 'avatar' : 'banner';
                    if (isGif && !profile[videoKey] && profile[imageKey] === url) {
                        profile[videoKey] = url;
                        profile[imageKey] = '';
                    }
                    profile[mode === 'avatar' ? 'avatarVideoSettings' : 'bannerVideoSettings'] = settings;
                    if (mode === 'banner') profile.bannerFormat = settings?.bannerFormat === 'wide' ? 'wide' : (currentProfile.bannerFormat === 'wide' ? 'wide' : 'narrow');
                    saveProfile(profile);
                    if (Router.currentRoute === 'profile') renderProfilePage();
                    if (Router.currentRoute === 'settings') renderSettingsPage();
                    showToast(isGif ? (mode === 'avatar' ? 'GIF-аватарку оновлено' : 'GIF-банер оновлено') : (mode === 'avatar' ? 'Відео-аватарку оновлено' : 'Відео-банер оновлено'));
                }, mode === 'banner' ? currentProfile.bannerFormat : 'narrow');
            } catch (err) {
                console.error('Existing profile video editor error:', err);
                showToast('Не вдалося відкрити редактор відео');
            }
        }

        export function compressImage(file, maxW, maxH, quality, callback) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let w = img.width, hh = img.height;
                    if (w > maxW) { hh = hh * (maxW / w); w = maxW; }
                    if (hh > maxH) { w = w * (maxH / hh); hh = maxH; }
                    canvas.width = Math.round(w);
                    canvas.height = Math.round(hh);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    let result = canvas.toDataURL('image/jpeg', quality);
                    if (result.length > 500000) result = canvas.toDataURL('image/jpeg', 0.4);
                    if (result.length > 500000) result = canvas.toDataURL('image/jpeg', 0.2);
                    callback(result);
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }

        export function renderAuthPage() {
            const container = document.getElementById('profilePageContainer');
            if (!container) return;
            container.innerHTML = `
            <div class="auth-card">
              <div class="mark"></div>
              <h1 id="authTitle">З поверненням</h1>
              <p class="sub" id="authSub">Увійдіть, щоб продовжити роботу з акаунтом.</p>

              <div class="switcher" id="authSwitcher">
                <div class="switcher-thumb"></div>
                <button type="button" class="active" data-mode="login">Вхід</button>
                <button type="button" data-mode="register">Реєстрація</button>
              </div>

              <button class="telegram-btn" type="button" id="authTelegramBtn">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.4 3.4-3.1 16.2c-.2 1.1-.8 1.4-1.7.9l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.7-7.9c.4-.4-.1-.6-.6-.2L6.2 13.9l-4.6-1.4c-1-.3-1-1 .2-1.5L19.7 3c.8-.3 1.9.2 1.7.4Z"/></svg>
                <span class="auth-telegram-label">Увійти через Telegram</span>
              </button>

              <button class="google-btn" type="button" id="authGoogleBtn">
                <svg viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.7 0-14.3 4.3-17.7 10.2z"/>
                  <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5.2c-2 1.5-4.5 2.3-7.1 2.3-5.3 0-9.6-3.6-11.2-8.4l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.1 5.2C40.8 36.4 43.5 30.7 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
                </svg>
                Продовжити через Google
              </button>

              <div class="divider">або через email</div>

              <div class="panel active" id="authPanel-login">
                <form id="authLoginForm" onsubmit="return false;">
                  <div class="field">
                    <label for="loginEmail">Email</label>
                    <input id="loginEmail" type="email" placeholder="you@example.com" required autocomplete="email">
                  </div>
                  <div class="field">
                    <label for="loginPass">Пароль</label>
                    <input id="loginPass" type="password" placeholder="••••••••" required autocomplete="current-password">
                  </div>
                  <div class="row-between">
                    <label class="remember"><input type="checkbox" id="loginRemember">Запам'ятати мене</label>
                    <a href="#" onclick="showToast('Скидання пароля — звʼяжіться з підтримкою');return false;">Забули пароль?</a>
                  </div>
                  <div class="auth-error" id="authError"></div>
                  <button class="submit-btn" type="submit" id="authLoginSubmit">Увійти</button>
                </form>
              </div>

              <div class="panel" id="authPanel-register">
                <form id="authRegisterForm" onsubmit="return false;">
                  <div class="field">
                    <label for="regName">Ім'я</label>
                    <input id="regName" type="text" placeholder="Ваше ім'я" required autocomplete="name">
                  </div>
                  <div class="field">
                    <label for="regEmail">Email</label>
                    <input id="regEmail" type="email" placeholder="you@example.com" required autocomplete="email">
                  </div>
                  <div class="field">
                    <label for="regPass">Пароль</label>
                    <input id="regPass" type="password" placeholder="Мінімум 6 символів" required autocomplete="new-password" minlength="6">
                  </div>
                  <div class="auth-error" id="authErrorReg"></div>
                  <button class="submit-btn" type="submit" id="authRegisterSubmit">Створити акаунт</button>
                </form>
              </div>

              <button class="guest-btn" type="button" id="authGuestBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21a8 8 0 0 0-16 0"/>
                  <circle cx="12" cy="8" r="4.5"/>
                </svg>
                Продовжити як гість
              </button>

              <p class="foot-note" id="authFootNote">
                Ще немає акаунта? <button type="button" id="authFootToggle">Зареєструватися</button>
              </p>
            </div>
          `;

            const switcher = document.getElementById('authSwitcher');
            const btnLogin = switcher.querySelector('[data-mode="login"]');
            const btnRegister = switcher.querySelector('[data-mode="register"]');
            const panelLogin = document.getElementById('authPanel-login');
            const panelRegister = document.getElementById('authPanel-register');
            const title = document.getElementById('authTitle');
            const sub = document.getElementById('authSub');
            const footNote = document.getElementById('authFootNote');
            const footToggle = document.getElementById('authFootToggle');
            const telegramBtn = document.getElementById('authTelegramBtn');
            const telegramLabel = telegramBtn?.querySelector('.auth-telegram-label');

            function setAuthMode(mode) {
                btnLogin.classList.toggle('active', mode === 'login');
                btnRegister.classList.toggle('active', mode === 'register');
                switcher.classList.toggle('mode-register', mode === 'register');
                panelLogin.classList.toggle('active', mode === 'login');
                panelRegister.classList.toggle('active', mode === 'register');
                if (telegramLabel) telegramLabel.textContent = mode === 'login' ? 'Увійти через Telegram' : 'Зареєструватися через Telegram';
                if (mode === 'login') {
                    title.textContent = 'З поверненням';
                    sub.textContent = 'Увійдіть, щоб продовжити роботу з акаунтом.';
                    footNote.innerHTML =
                        'Ще немає акаунта? <button type="button" id="authFootToggle">Зареєструватися</button>';
                } else {
                    title.textContent = 'Створити акаунт';
                    sub.textContent = 'Зареєструйтеся, щоб почати користуватися сервісом.';
                    footNote.innerHTML = 'Вже маєте акаунт? <button type="button" id="authFootToggle">Увійти</button>';
                }
                document.getElementById('authFootToggle')?.addEventListener('click', () => {
                    setAuthMode(mode === 'login' ? 'register' : 'login');
                });
                document.getElementById('authError').textContent = '';
                document.getElementById('authErrorReg').textContent = '';
            }

            btnLogin.addEventListener('click', () => setAuthMode('login'));
            btnRegister.addEventListener('click', () => setAuthMode('register'));
            footToggle.addEventListener('click', () => setAuthMode('register'));
            if (document.getElementById('authFootToggle')) {
                document.getElementById('authFootToggle').addEventListener('click', () => setAuthMode('register'));
            }

            document.getElementById('authLoginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value.trim();
                const pass = document.getElementById('loginPass').value;
                const errorEl = document.getElementById('authError');
                const submitBtn = document.getElementById('authLoginSubmit');
                errorEl.textContent = '';
                if (!email || !pass) { errorEl.textContent = 'Будь ласка, заповніть усі поля.'; return; }
                submitBtn.disabled = true;
                submitBtn.textContent = 'Вхід...';
                const result = await Auth.login(email, pass);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Увійти';
                if (!result.success) {
                    errorEl.textContent = result.error || 'Помилка входу';
                } else {
                    renderProfilePage();
                }
            });

            document.getElementById('authRegisterForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const name = document.getElementById('regName').value.trim();
                const email = document.getElementById('regEmail').value.trim();
                const pass = document.getElementById('regPass').value;
                const errorEl = document.getElementById('authErrorReg');
                const submitBtn = document.getElementById('authRegisterSubmit');
                errorEl.textContent = '';
                if (!name || !email || !pass) { errorEl.textContent = 'Будь ласка, заповніть усі поля.'; return; }
                if (pass.length < 6) { errorEl.textContent = 'Пароль має містити щонайменше 6 символів.'; return; }
                submitBtn.disabled = true;
                submitBtn.textContent = 'Створення...';
                const result = await Auth.register(email, pass, name);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Створити акаунт';
                if (!result.success) {
                    errorEl.textContent = result.error || 'Помилка реєстрації';
                } else {
                    renderProfilePage();
                }
            });

            document.getElementById('authTelegramBtn').addEventListener('click', async function() {
                const telegram = globalThis.Telegram?.WebApp;
                const errorEl = document.getElementById('authError');
                if (!telegram?.initData) {
                    errorEl.textContent = 'Відкрийте VakDab через кнопку Telegram Mini App у VakDabBot.';
                    return;
                }
                telegram.ready?.();
                this.disabled = true;
                this.textContent = 'Перевірка Telegram...';
                const result = await Auth.signInWithTelegram(telegram.initData);
                this.disabled = false;
                this.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.4 3.4-3.1 16.2c-.2 1.1-.8 1.4-1.7.9l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.7-7.9c.4-.4-.1-.6-.6-.2L6.2 13.9l-4.6-1.4c-1-.3-1 0 .2-1.5L19.7 3c.8-.3 1.9.2 1.7.4Z"/></svg><span class="auth-telegram-label">${document.querySelector('#authSwitcher [data-mode="register"].active') ? 'Зареєструватися через Telegram' : 'Увійти через Telegram'}</span>`;
                if (!result.success) errorEl.textContent = result.error || 'Помилка входу через Telegram';
                else renderProfilePage();
            });

            document.getElementById('authGoogleBtn').addEventListener('click', async function() {
                this.disabled = true;
                this.textContent = 'Завантаження...';
                const result = await Auth.signInWithGoogle();
                this.disabled = false;
                this.innerHTML = `
              <svg viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.7 0-14.3 4.3-17.7 10.2z"/>
                <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5.2c-2 1.5-4.5 2.3-7.1 2.3-5.3 0-9.6-3.6-11.2-8.4l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.1 5.2C40.8 36.4 43.5 30.7 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
              </svg>
              Продовжити через Google
            `;
                if (!result.success) {
                    document.getElementById('authError').textContent = result.error || 'Помилка Google входу';
                } else {
                    renderProfilePage();
                }
            });

            document.getElementById('authGuestBtn').addEventListener('click', () => {
                Auth.setGuest(true);
                showToast('Продовжуємо як гість');
                // Не використовуємо Router.goTo — хеш вже #profile і hashchange не спрацює
                // Викликаємо showProfile напряму, який перевірить isGuest() і покаже профіль
                Router.showProfile();
            });

            syncLeftdockActive();
        }

        // ====================================================================
        //  ПАНЕЛІ ПРОФІЛЮ
        // ====================================================================
        export function renderHistoryPanel(history) {
            if (!history || !history.length) {
                return `
              <div class="profile-empty">
                <i class="fas fa-history"></i>
                <p>Історія переглядів порожня</p>
              </div>
            `;
            }
            let html = `
            <div class="profile-panel-header">
              <span class="profile-panel-title">Історія перегляду</span>
              <span class="profile-panel-count">${history.length} серій</span>
            </div>
            <div class="profile-history-list">
          `;
            history.slice(0, 30).forEach(item => {
                const poster = item.poster || '';
                const rawTitle = item.title || 'Без назви';
            const title = rawTitle.length > 38 ? rawTitle.substring(0, 38) + '…' : rawTitle;
                const ep = item.episode || '?';
                const season = item.season || '';
                const time = item.timestamp ? new Date(item.timestamp).toLocaleDateString('uk-UA') : 'невідомо';
                const progress = item.progress || 0;
                let epLabel = `Серія ${ep}`;
                if (season) epLabel = `Сезон ${season}, ${epLabel}`;
                html += `
              <div class="profile-history-item" data-profile-url="${escapeHtml(item.url || '')}" role="button" tabindex="0">
                <div class="profile-thumb">
                  ${poster ? `<img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ''}
                  <span class="profile-thumb-placeholder" style="${poster?'display:none;':''}">
                    <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg>
                  </span>
                </div>
                <div class="profile-h-info">
                  <div class="profile-h-title">${escapeHtml(title)}</div>
                  <div class="profile-h-sub">
                    <span>${escapeHtml(epLabel)}</span>
                    <span class="dot"></span>
                    <span>${escapeHtml(time)}</span>
                  </div>
                </div>
                <div class="profile-h-progress">
                  <div class="profile-h-progress-fill" style="width:${Math.min(progress,100)}%"></div>
                </div>
              </div>
            `;
            });
            html += `</div>`;
            return html;
        }

        export function renderBookmarksPanel(bookmarks) {
            if (!bookmarks || !bookmarks.length) {
                return `
              <div class="profile-empty">
                <i class="fas fa-bookmark"></i>
                <p>Немає збережених закладок</p>
              </div>
            `;
            }
            let html = `
            <div class="profile-panel-header">
              <span class="profile-panel-title">Закладки</span>
              <span class="profile-panel-count">${bookmarks.length}</span>
            </div>
            <div class="profile-bookmark-grid">
          `;
            bookmarks.slice(0, 30).forEach(item => {
                const poster = item.poster || '';
                const rawTitle = item.title || 'Без назви';
            const title = rawTitle.length > 38 ? rawTitle.substring(0, 38) + '…' : rawTitle;
                const sub = item.episodes || '';
                html += `
              <div class="profile-bookmark-card" data-profile-url="${escapeHtml(item.url || '')}" role="button" tabindex="0">
                <div class="profile-bm-thumb">
                  ${poster ? `<img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ''}
                  <span class="profile-bm-thumb-ph" style="${poster?'display:none;':''}">
                    <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg>
                  </span>
                </div>
                <div class="profile-bm-info">
                  <div class="profile-bm-title">${escapeHtml(title)}</div>
                  <div class="profile-bm-sub">${escapeHtml(sub || 'Збережено')}</div>
                </div>
              </div>
            `;
            });
            html += `</div>`;
            return html;
        }

        export function renderAchievementsPanel(achievements, totalWatchTime, historyCount) {
            const safeAchievements = Array.isArray(achievements) ? achievements : [];
            const totalMinutes = Math.max(0, Math.floor(Number(totalWatchTime || 0) / 60));
            let html = `
            <div class="profile-watch-card">
              <div class="profile-wt-label">Загальний час перегляду аніме</div>
              <div class="profile-wt-value">${totalMinutes}<span class="profile-wt-unit">хв</span></div>
              <div class="profile-wt-sub">${Number(historyCount) || 0} серій переглянуто</div>
            </div>
            <div class="profile-panel-header">
              <span class="profile-panel-title">Досягнення</span>
              <span class="profile-panel-count">${safeAchievements.filter(a=>a && a.unlocked).length} / ${safeAchievements.length}</span>
            </div>
            <div class="profile-achievement-list">
          `;
            safeAchievements.forEach(a => {
                if (!a) return;
                const unlocked = Boolean(a.unlocked);
                const progress = Math.max(0, Math.min(Number(a.progress) || 0, 100));
                html += `
              <div class="profile-achievement ${unlocked?'':'locked'}">
                <div class="profile-ach-icon">${a.icon}</div>
                <div class="profile-ach-info">
                  <div class="profile-ach-name">${a.name}</div>
                  <div class="profile-ach-value">${a.description}</div>
                </div>
                <div class="profile-ach-badge">${unlocked ? 'Виконано' : (progress < 100 ? Math.round(progress)+'%' : 'Заблоковано')}</div>
              </div>
            `;
            });
            html += `</div>`;
            return html;
        }

        // ====================================================================
        //  РЕДАГУВАННЯ ПРОФІЛЮ
        // ====================================================================
        export function profileEditNick() {
            const nickEl = document.getElementById('profileNickText');
            if (!nickEl) return;
            const profile = getProfile();
            const current = getProfileDisplayName(profile);
            const input = document.createElement('input');
            input.type = 'text';
            input.value = current;
            input.style.cssText =
                'font-size:20px;font-weight:700;letter-spacing:-0.5px;color:var(--text);background:var(--tag-bg);border:1px solid var(--border);border-radius:8px;padding:2px 8px;outline:none;width:180px;font-family:inherit;';
            if (document.body.classList.contains('dark-mode')) {
                input.style.background = '#1a1a1a';
                input.style.color = '#f7f7f7';
                input.style.borderColor = '#333';
            }
            nickEl.replaceWith(input);
            input.focus();
            input.select();
            const save = () => {
                const val = input.value.trim() || current;
                const span = document.createElement('span');
                span.className = 'profile-nick';
                span.id = 'profileNickText';
                span.textContent = val;
                input.replaceWith(span);
                profile.realName = stripNicknamePrefix(val);
                span.textContent = getProfileDisplayName(profile);
                saveProfile(profile);
                if (Router.currentRoute === 'profile') renderProfilePage();
            };
            input.addEventListener('blur', save);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { input.blur(); }
                if (e.key === 'Escape') { input.value = current;
                    input.blur(); }
            });
        }

        export function profileEditBio() {
            const bioEl = document.getElementById('profileBioText');
            if (!bioEl) return;
            const current = bioEl.textContent;
            const textarea = document.createElement('textarea');
            textarea.value = current;
            textarea.style.cssText =
                'font-size:13px;line-height:1.6;color:var(--text-secondary);background:var(--tag-bg);border:1px solid var(--border);border-radius:8px;padding:6px 8px;outline:none;width:100%;font-family:inherit;resize:vertical;min-height:60px;';
            if (document.body.classList.contains('dark-mode')) {
                textarea.style.background = '#1a1a1a';
                textarea.style.color = '#cfcfcf';
                textarea.style.borderColor = '#333';
            }
            bioEl.replaceWith(textarea);
            textarea.focus();
            textarea.select();
            const save = () => {
                const val = textarea.value.trim() || current;
                const div = document.createElement('div');
                div.className = 'profile-bio';
                div.id = 'profileBioText';
                div.textContent = val;
                textarea.replaceWith(div);
                const profile = getProfile();
                profile.bio = val;
                saveProfile(profile);
                if (Router.currentRoute === 'profile') renderProfilePage();
            };
            textarea.addEventListener('blur', save);
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') { textarea.value = current;
                    textarea.blur(); }
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { textarea.blur(); }
            });
        }

        document.getElementById('avatarFileInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const isVideo = isVideoFile(file);
            const isGif = !isVideo && (file.type === 'image/gif' || /\.gif$/i.test(file.name || ''));
            const maxSize = isVideo ? 50 * 1024 * 1024 : (isGif ? 50 * 1024 * 1024 : 15 * 1024 * 1024);
            if (file.size > maxSize) { showToast(isVideo ? 'Відео занадто велике (максимум 50 МБ)' : (isGif ? 'GIF занадто великий (максимум 50 МБ) — вибери коротший' : 'Файл занадто великий (максимум 15 МБ)')); e.target.value = ''; return; }

            const doUpload = async (blobOrFile, raw, mediaType = 'image', mediaSettings = null) => {
                showToast(mediaType === 'video' ? 'Завантаження відео-аватарки...' : (mediaType === 'gif' && blobOrFile?.size > CLOUDINARY_IMAGE_FILE_LIMIT ? 'Перетворення великого GIF аватарки у відео...' : (mediaType === 'gif' ? 'Завантаження GIF-аватарки...' : 'Завантаження аватарки...')));
                try {
                    const imageUrl = mediaType === 'video'
                        ? await uploadVideoToCloudinary(blobOrFile, 'avatar.mp4')
                        : (mediaType === 'gif' ? await uploadGifToCloudinary(blobOrFile, 'avatar.gif') : (raw ? await uploadRawToCloudinary(blobOrFile, 'avatar.gif') : await uploadBlobToCloudinary(blobOrFile, 'avatar.jpg')));
                    const profile = getProfile();
                    if (mediaType === 'video' || mediaType === 'gif') { profile.avatarVideo = imageUrl; profile.avatar = ''; profile.avatarVideoSettings = mediaSettings || null; }
                    else { profile.avatar = imageUrl; profile.avatarVideo = ''; profile.avatarVideoSettings = null; }
                    saveProfile(profile);
                    if (Router.currentRoute === 'profile') renderProfilePage();
                    if (Router.currentRoute === 'settings') renderSettingsPage();
                    showToast('Аватарку оновлено');
                } catch (err) {
                    console.error('Avatar upload error:', err);
                    showToast('Помилка завантаження аватарки: ' + (err.message || 'невідома помилка'));
                }
            };

            if (isVideo) {
                openImageEditor(file, 'avatar', (settings) => doUpload(file, true, 'video', settings));
            } else if (isGif) {
                openImageEditor(file, 'avatar', (settings) => doUpload(file, true, 'gif', settings));
            } else {
                openImageEditor(file, 'avatar', (blob) => doUpload(blob, false));
            }
            e.target.value = '';
        });

        export async function removeFlatStickerBackground(blob, tolerance = 46) {
            const url = URL.createObjectURL(blob);
            try {
                const image = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = url;
                });
                const maxSide = 900;
                const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imageData.data;
                const w = canvas.width;
                const h = canvas.height;
                const sample = (x, y) => {
                    const i = (y * w + x) * 4;
                    return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
                };
                const corners = [sample(0, 0), sample(w - 1, 0), sample(0, h - 1), sample(w - 1, h - 1)];
                if (corners.some(c => c[3] < 20)) return blob;
                const average = corners.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]).map(v => v / corners.length);
                const cornerSpread = Math.max(...corners.map(c => Math.hypot(c[0] - average[0], c[1] - average[1], c[2] - average[2])));
                if (cornerSpread > tolerance * 1.5) return blob;
                const distance = (i) => Math.hypot(pixels[i] - average[0], pixels[i + 1] - average[1], pixels[i + 2] - average[2]);
                const visited = new Uint8Array(w * h);
                const queue = [];
                const enqueue = (x, y) => {
                    if (x < 0 || y < 0 || x >= w || y >= h) return;
                    const pos = y * w + x;
                    if (visited[pos]) return;
                    visited[pos] = 1;
                    queue.push(pos);
                };
                for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
                for (let y = 1; y < h - 1; y++) { enqueue(0, y); enqueue(w - 1, y); }
                for (let cursor = 0; cursor < queue.length; cursor++) {
                    const pos = queue[cursor];
                    const i = pos * 4;
                    if (distance(i) > tolerance || pixels[i + 3] < 20) continue;
                    const edge = Math.max(0, Math.min(1, (tolerance - distance(i)) / 18));
                    pixels[i + 3] = Math.round(pixels[i + 3] * edge);
                    const x = pos % w;
                    const y = Math.floor(pos / w);
                    enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1);
                }
                ctx.putImageData(imageData, 0, 0);
                return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            } finally {
                URL.revokeObjectURL(url);
            }
        }

        export let stickerBackgroundRemoverPromise = null;
        export async function removeStickerBackground(blob) {
            try {
                if (!stickerBackgroundRemoverPromise) {
                    stickerBackgroundRemoverPromise = import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm')
                        .then(module => module.default || module.removeBackground || module);
                }
                const removeBackground = await stickerBackgroundRemoverPromise;
                if (typeof removeBackground !== 'function') throw new Error('AI background remover недоступний');
                const config = {
                    model: 'isnet_fp16',
                    device: 'cpu',
                    output: { format: 'image/png', type: 'foreground' }
                };
                const statusMessages = [
                    'AI готує модель… це може зайняти до 1 хвилини',
                    'AI аналізує об’єкт…',
                    'AI вирізає фон…',
                    'AI створює прозорий PNG…'
                ];
                let statusIndex = 0;
                showToastProgress(statusMessages[statusIndex]);
                const statusTimer = setInterval(() => {
                    statusIndex = (statusIndex + 1) % statusMessages.length;
                    showToastProgress(statusMessages[statusIndex]);
                }, 3200);
                const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('AI-обробка перевищила 2 хвилини')), 120000));
                let result;
                try {
                    result = await Promise.race([removeBackground(blob, config), timeout]);
                } finally {
                    clearInterval(statusTimer);
                }
                if (!(result instanceof Blob) || result.size < 100) throw new Error('AI не повернув прозорий PNG');
                showToastProgress('AI фон видалено — зберігаю результат…');
                return result;
            } catch (error) {
                console.error('AI background removal failed:', error);
                stickerBackgroundRemoverPromise = null;
                throw error;
            }
        }

        document.getElementById('stickerFileInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            e.target.value = '';
            if (!file) return;
            const maxSize = 8 * 1024 * 1024;
            if (file.size > maxSize) { showToast('Файл занадто великий (максимум 8 МБ)'); return; }
            openImageEditor(file, 'avatar', async (blob) => {
                showToastProgress('AI готує видалення фону…');
                try {
                    const processedBlob = await removeStickerBackground(blob);
                    showToast('Завантаження наліпки...');
                    const imageUrl = await uploadBlobToCloudinary(processedBlob, 'sticker.png');
                    const cur = Storage.getStickers();
                    const stickerId = 'sng_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                    const stickerKey = 'img:' + stickerId;
                    cur.singles.unshift({ id: stickerId, image: imageUrl, favorite: false, addedAt: Date.now() });
                    if (!Array.isArray(cur.medals)) cur.medals = [];
                    if (!cur.medals.includes(stickerKey) && cur.medals.length < PROFILE_STICKER_SLOTS) cur.medals.push(stickerKey);
                    if (!cur.colors) cur.colors = {};
                    if (!cur.colors[stickerKey]) cur.colors[stickerKey] = '#7c8494';
                    Storage.setStickers(cur);
                    showToast(cur.medals.includes(stickerKey) ? 'Наліпку додано в профіль' : 'Наліпку додано');
                    if (window.stickersUI) window.stickersUI.step = null;
                    if (Router.currentRoute === 'stickers') window.renderStickersPage();
                    if (Router.currentRoute === 'profile') renderProfilePage();
                    if (Router.currentRoute === 'settings') renderSettingsPage();
                } catch (err) {
                    console.error('Sticker upload error:', err);
                    showToast('Помилка завантаження наліпки: ' + (err.message || 'невідома помилка'));
                }
            });
        });

        document.getElementById('bannerFileInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const isVideo = isVideoFile(file);
            const isGif = !isVideo && (file.type === 'image/gif' || /\.gif$/i.test(file.name || ''));
            const maxSize = isVideo ? 50 * 1024 * 1024 : (isGif ? 50 * 1024 * 1024 : 15 * 1024 * 1024);
            if (file.size > maxSize) { showToast(isVideo ? 'Відео занадто велике (максимум 50 МБ)' : (isGif ? 'GIF занадто великий (максимум 50 МБ) — вибери коротший' : 'Файл занадто великий (максимум 15 МБ)')); e.target.value = ''; return; }

            const doUpload = async (blobOrFile, raw, mediaType = 'image', mediaSettings = null, format = 'narrow') => {
                showToast(mediaType === 'video' ? 'Завантаження відео-банера...' : (mediaType === 'gif' && blobOrFile?.size > CLOUDINARY_IMAGE_FILE_LIMIT ? 'Перетворення великого GIF банера у відео...' : (mediaType === 'gif' ? 'Завантаження GIF-банера...' : 'Завантаження банера...')));
                try {
                    const imageUrl = mediaType === 'video'
                        ? await uploadVideoToCloudinary(blobOrFile, 'banner.mp4')
                        : (mediaType === 'gif' ? await uploadGifToCloudinary(blobOrFile, 'banner.gif') : (raw ? await uploadRawToCloudinary(blobOrFile, 'banner.gif') : await uploadBlobToCloudinary(blobOrFile, 'banner.jpg')));
                    const profile = getProfile();
                    if (mediaType === 'video' || mediaType === 'gif') { profile.bannerVideo = imageUrl; profile.banner = ''; profile.bannerVideoSettings = mediaSettings || null; }
                    else { profile.banner = imageUrl; profile.bannerVideo = ''; profile.bannerVideoSettings = null; }
                    profile.bannerFormat = mediaSettings?.bannerFormat === 'wide' || format === 'wide' ? 'wide' : 'narrow';
                    saveProfile(profile);
                    if (Router.currentRoute === 'profile') renderProfilePage();
                    if (Router.currentRoute === 'settings') renderSettingsPage();
                    showToast('Банер оновлено');
                } catch (err) {
                    console.error('Banner upload error:', err);
                    showToast('Помилка завантаження банера: ' + (err.message || 'невідома помилка'));
                }
            };

            const currentProfile = getProfile();
            if (isVideo) {
                openImageEditor(file, 'banner', (settings) => doUpload(file, true, 'video', settings, settings?.bannerFormat), currentProfile.bannerFormat || 'narrow');
            } else if (isGif) {
                openImageEditor(file, 'banner', (settings) => doUpload(file, true, 'gif', settings, settings?.bannerFormat), currentProfile.bannerFormat || 'narrow');
            } else {
                openImageEditor(file, 'banner', (blob, editorState) => doUpload(blob, false, 'image', null, editorState?.bannerFormat));
            }
            e.target.value = '';
        });

        // ====================================================================
        //  СТОРІНКА ЖАНРУ
        // ====================================================================
        export let genrePageState = { slug: '', name: '', page: 1, list: [], hasNextPage: false, total: 0 };

        export async function renderGenrePage(slug, name) {
            const container = document.getElementById('genrePageContainer');
            if (!container) return;
            genrePageState.slug = slug;
            genrePageState.name = name || slug;
            genrePageState.page = 1;
            genrePageState.hasNextPage = false;
            genrePageState.total = 0;
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
