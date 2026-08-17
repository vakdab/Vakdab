import { HIKKA_API, GENRE_MAP, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../config/constants.js';
import {
    Auth, DailyStats, Router, Storage, escapeHtml, fetchTmdbCardInfo,
    loadGenrePageContent, renderProfilePage, renderSettingsPage,
    showToast, showToastProgress, syncLeftdockActive
} from './app-legacy.js';
import { getProfile, saveProfile } from './settings.js';
import { fetchAnimeLite, fetchHikkaByCategory, fetchHikkaMain, fetchHikkaTop100, hikkaItem, hikkaRequest, normalizeGenreList, normalizeSynopsisText, searchHikka } from './catalog.js';

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
        export let homeCatalogTotal = 0;
        export let homeCatalogMode = 'anime';
        export let homeCatalogQuery = '';
        export let homeCatalogSort = 'score';
        export let homeCatalogView = 'grid';
        export let homeCatalogPreset = 'all';
        export let homeCatalogGenre = 'all';
        export const HOME_MANGA_AGE_OPTIONS = [
            { key: 'all', label: 'Усі' },
            { key: 'adult', label: 'Для дорослих' },
            { key: 'teen', label: 'Для підлітків' },
            { key: 'children', label: 'Для дітей' }
        ];
        export const honeyCatalogPageCache = new Map();

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
            if (homeCatalogQuery) body.query = homeCatalogQuery;
            if (homeCatalogSort === 'score') body.sort = ['score:desc', 'scored_by:desc'];
            if (homeCatalogSort === 'newest') body.sort = ['start_date:desc'];
            if (homeCatalogSort === 'title') body.sort = ['title_ua:asc'];
            return body;
        }

        // Honey Manga є єдиним джерелом каталогу, постерів і читання манґи. Hikka використовується для аніме та ранобе.
        export const HONEY_API = 'https://data.api.honey-manga.com.ua';
        export const HONEY_SEARCH_API = 'https://search.api.honey-manga.com.ua';
        export const HONEY_WEB = 'https://honey-manga.com.ua';
        export const HONEY_IMAGE = 'https://hmvolumestorage.b-cdn.net/public-resources';
        export const honeySearchCache = new Map();
        export const honeyReaderCache = new Map();
        export let honeyAvailabilityMap = null;
        export let honeyAvailabilityMapPromise = null;
        export const HONEY_CATALOG_READABLE_FALLBACK = 2054;
        export let honeyCatalogReadableTotal = 0;
        export let honeyCatalogReadableTotalPromise = null;

        export async function loadHoneyAvailabilityMap() {
            if (honeyAvailabilityMap) return honeyAvailabilityMap;
            if (!honeyAvailabilityMapPromise) {
                const mapUrl = new URL('src/data/manga-honey-map.json?map-v2', document.baseURI).href;
                honeyAvailabilityMapPromise = fetch(mapUrl, { cache: 'no-cache' })
                    .then(response => response.ok ? response.json() : null)
                    .then(payload => {
                        honeyAvailabilityMap = payload || { byHikka: {}, byHoney: {}, available: 0, honeyAvailable: 0 };
                        // Legacy map is keyed by Hikka IDs; native Honey cards use Honey title IDs.
                        // Build the reverse index so native catalog items receive their reader URL.
                        if (!honeyAvailabilityMap.byHoney || !Object.keys(honeyAvailabilityMap.byHoney).length) {
                            honeyAvailabilityMap.byHoney = Object.values(honeyAvailabilityMap.byHikka || {})
                                .filter(item => item?.id)
                                .reduce((index, item) => { index[String(item.id)] = item; return index; }, {});
                        }
                        honeyAvailabilityMap.honeyAvailable = Number(honeyAvailabilityMap.honeyAvailable || honeyAvailabilityMap.available || Object.keys(honeyAvailabilityMap.byHoney).length);
                        return honeyAvailabilityMap;
                    })
                    .catch(error => { console.warn('Honey availability map failed:', error); honeyAvailabilityMap = { byHikka: {}, byHoney: {}, available: 0, honeyAvailable: 0 }; return honeyAvailabilityMap; });
            }
            return honeyAvailabilityMapPromise;
        }

        export async function loadHoneyCatalogReadableTotal() {
            if (honeyCatalogReadableTotal) return honeyCatalogReadableTotal;
            if (!honeyCatalogReadableTotalPromise) {
                honeyCatalogReadableTotalPromise = (async () => {
                    const pageSize = 200;
                    const totalPages = Math.max(1, Math.ceil((homeCatalogTotal || 2152) / pageSize));
                    let nextPage = 1;
                    const worker = async () => {
                        let count = 0;
                        while (nextPage <= totalPages) {
                            const page = nextPage++;
                            const payload = await fetchHoneyJson('/v2/manga/cursor-list', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ page, pageSize, sort: { sortBy: 'lastUpdated', sortOrder: 'DESC' }, filters: [] })
                            });
                            const data = Array.isArray(payload?.data) ? payload.data : [];
                            count += data.filter(item => Number(item?.chapters) > 0).length;
                            if (data.length < pageSize) nextPage = totalPages + 1;
                        }
                        return count;
                    };
                    const counts = await Promise.all(Array.from({ length: Math.min(4, totalPages) }, worker));
                    honeyCatalogReadableTotal = counts.reduce((sum, count) => sum + count, 0);
                    const label = document.getElementById('homeCatalogResultsLabel');
                    if (label && homeCatalogMode === 'manga') label.textContent = homeCatalogCountText(homeCatalogItems.length);
                    return honeyCatalogReadableTotal;
                })().catch(error => { console.warn('Honey catalog availability total failed:', error); honeyCatalogReadableTotalPromise = null; return 0; });
            }
            return honeyCatalogReadableTotalPromise;
        }
        export function normalizeHoneyMatch(value = '') {
            return String(value || '').toLocaleLowerCase('uk-UA').normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '').replace(/[’'`]/g, '')
                .replace(/[^a-z0-9а-яіїєґ]+/gi, ' ').trim();
        }

        export async function fetchHoneyJson(path, options = {}, baseUrl = HONEY_API) {
            const url = `${baseUrl}${path}`;
            const response = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-cache', ...options });
            if (!response.ok) throw new Error(`Honey Manga API: HTTP ${response.status}`);
            return response.json();
        }

        export function honeyNamesMatch(left, right) {
            const a = normalizeHoneyMatch(left);
            const b = normalizeHoneyMatch(right);
            if (!a || !b) return false;
            if (a === b) return true;
            const shorter = a.split(/\s+/).filter(token => token.length >= 2);
            const longer = b.split(/\s+/);
            return shorter.length >= 2 && shorter.every(token => longer.includes(token));
        }

        export async function searchHoneyTitles(query) {
            const normalized = normalizeHoneyMatch(query);
            if (!normalized) return [];
            if (honeySearchCache.has(normalized)) return honeySearchCache.get(normalized);
            const promise = fetchHoneyJson(`/v2/manga/pattern?query=${encodeURIComponent(query)}`, {}, HONEY_SEARCH_API)
                .then(payload => Array.isArray(payload) ? payload : [])
                .catch(error => { console.warn('Honey Manga title search failed:', error); return []; });
            honeySearchCache.set(normalized, promise);
            return promise;
        }

        export async function resolveHoneyReader(item) {
            if (!item || homeCatalogMode !== 'manga') return item;
            const map = await loadHoneyAvailabilityMap();
            const mapped = map?.byHikka?.[String(item.mal_id)] || map?.byHikka?.[String(item.slug)] || map?.byHoney?.[String(item.honeyTitleId || item.honeyId || '')];
            if (mapped?.id && mapped?.chapterId) {
                const readerUrl = `${HONEY_WEB}/read/${mapped.chapterId}/${mapped.id}`;
                return { ...item, readerUrl, honeyTitleId: mapped.id, honeyChapterId: mapped.chapterId };
            }
            const rawKeys = [item.title, item.originalTitle, item.title_en, item.title_ja].filter(Boolean);
            const keys = rawKeys.map(normalizeHoneyMatch).filter(Boolean);
            if (!keys.length) return item;
            const cacheKey = keys.join('|');
            if (honeyReaderCache.has(cacheKey)) return { ...item, readerUrl: honeyReaderCache.get(cacheKey) };
            const directHoneyId = item.honeyTitleId || item.honeyId || '';
            if (directHoneyId && Number(item.chapters) > 0) {
                try {
                    const payload = await fetchHoneyJson('/v2/chapter/cursor-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mangaId: directHoneyId, page: 1, pageSize: 100, sort: { sortBy: 'chapterNum', sortOrder: 'ASC' } }) });
                    const chapters = (Array.isArray(payload?.data) ? payload.data : []).filter(chapter => chapter?.id);
                    const first = chapters[chapters.length - 1] || chapters[0];
                    if (first) {
                        const readerUrl = `${HONEY_WEB}/read/${first.id}/${directHoneyId}`;
                        honeyReaderCache.set(cacheKey, readerUrl);
                        return { ...item, readerUrl, honeyTitleId: directHoneyId, honeyChapterId: first.id };
                    }
                } catch (error) { console.warn('Honey Manga direct chapter lookup failed:', error); }
            }
            const resultSets = [];
            for (const query of rawKeys.slice(0, 3)) {
                const results = await searchHoneyTitles(query);
                resultSets.push(...results);
                const exact = results.find(title => [title.title, title.lowTitle, title.alternativeTitle, ...(title.titleTags || [])]
                    .some(candidate => keys.some(key => honeyNamesMatch(key, candidate))));
                if (exact) break;
            }
            const unique = [...new Map(resultSets.filter(title => title?.id).map(title => [title.id, title])).values()];
            const exactMatch = unique.find(title => [title.title, title.lowTitle, title.alternativeTitle, ...(title.titleTags || [])]
                .some(candidate => keys.includes(normalizeHoneyMatch(candidate))));
            const match = exactMatch || unique.find(title => [title.title, title.lowTitle, title.alternativeTitle, ...(title.titleTags || [])]
                .some(candidate => keys.some(key => honeyNamesMatch(key, candidate))));
            if (!match?.id) { honeyReaderCache.set(cacheKey, ''); return item; }
            try {
                const payload = await fetchHoneyJson('/v2/chapter/cursor-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mangaId: match.id, page: 1, pageSize: 100, sort: { sortBy: 'chapterNum', sortOrder: 'ASC' } }) });
                const chapters = (Array.isArray(payload?.data) ? payload.data : []).filter(chapter => chapter?.id);
                const first = chapters[chapters.length - 1] || chapters[0];
                if (!first) { honeyReaderCache.set(cacheKey, ''); return item; }
                const readerUrl = `${HONEY_WEB}/read/${first.id}/${match.id}`;
                honeyReaderCache.set(cacheKey, readerUrl);
                return { ...item, readerUrl, honeyTitleId: match.id };
            } catch (error) { console.warn('Honey Manga chapter lookup failed:', error); return item; }
        }

        export async function attachHoneyReaders(items) {
            if (homeCatalogMode !== 'manga') return items;
            await loadHoneyAvailabilityMap();
            // Do not block the catalog on one chapter request per card. Resolve the reader lazily on click.
            return items.map(item => ({ ...item, readerAvailable: Boolean(item.readerUrl) || Number(item.chapters) > 0 }));
        }

        export function getHoneyGenreOptions(items = homeCatalogItems) {
            const values = new Map();
            items.forEach(item => (item?.genres || []).forEach(genre => {
                const value = String(genre?.name || genre || '').trim();
                if (value) values.set(normalizeHoneyMatch(value), value);
            }));
            return [...values.values()].sort((a, b) => a.localeCompare(b, 'uk'));
        }

        export function honeyAgeCategory(item) {
            const words = normalizeHoneyMatch([...(item?.genres || []), ...(item?.tags || [])].join(' '));
            if (item?.adult && String(item.adult).toUpperCase() !== 'NONE' || item?.isAdultCover || /(18|adult|ерот|еччі|гарем|порн|для дорослих|хентай)/i.test(words)) return 'adult';
            if (/(кодомо|для дітей|дитяч|сімейн|казк|дошкіль)/i.test(words)) return 'children';
            return 'teen';
        }
        export function homeCatalogGenreHtml() {
            if (homeCatalogMode !== 'manga') return '';
            return `<label class="home-catalog-age-filter"><span class="home-catalog-age-filter__label">Вікова категорія</span><span class="home-catalog-age-filter__control"><select id="homeCatalogGenre" aria-label="Вікова категорія">${HOME_MANGA_AGE_OPTIONS.map(option => `<option value="${option.key}"${homeCatalogGenre === option.key ? ' selected' : ''}>${option.label}</option>`).join('')}</select><i class="fas fa-chevron-down" aria-hidden="true"></i></span></label>`;
        }

        export function syncHomeCatalogGenreControl(root = document) {
            const presets = root.querySelector('#homeCatalogPresets');
            const existing = root.querySelector('#homeCatalogGenre')?.closest('.home-catalog-age-filter');
            if (existing) existing.remove();
            if (homeCatalogMode === 'manga' && presets) {
                presets.insertAdjacentHTML('afterend', homeCatalogGenreHtml());
                root.querySelector('#homeCatalogGenre')?.addEventListener('change', event => {
                    homeCatalogGenre = event.target.value || 'all';
                    renderHomeCatalogGrid();
                });
            }
        }

        export function honeyCatalogItem(item) {
            const posterId = item?.posterUrl || item?.posterId || '';
            const poster = posterId ? `${HONEY_IMAGE}/${posterId}?optimizer=image&width=296` : ANIME_CARD_PLACEHOLDER;
            const mapped = honeyAvailabilityMap?.byHoney?.[item.id] || null;
            const chapterId = mapped?.chapterId || '';
            return {
                honeyId: item.id,
                mal_id: `honey-${item.id}`,
                slug: item.id,
                title: item.title || item.lowTitle || 'Без назви',
                originalTitle: item.alternativeTitle || item.title || '',
                url: `${HONEY_WEB}/manga/${item.id}`,
                readerUrl: chapterId ? `${HONEY_WEB}/read/${chapterId}/${item.id}` : '',
                honeyTitleId: item.id,
                honeyChapterId: chapterId,
                chapters: Number(item.chapters || 0),
                images: { jpg: { large_image_url: poster, image_url: poster } },
                genres: normalizeGenreList(item.genresAndTags || item.genres || []),
                tags: normalizeGenreList(item.tags || []),
                adult: item.adult || 'NONE',
                isAdultCover: Boolean(item.isAdultCover),
                type: 'manga',
                typeLabel: item.type || 'Манґа',
                status: item.titleStatus || '',
                synopsis: normalizeSynopsisText(item.description || ''),
                score: Number(item.rate || item.rateScore || 0),
                year: item.lastUpdated ? String(item.lastUpdated).slice(0, 4) : '',
                from: 'honey'
            };
        }

        export async function fetchHoneyCatalogPage(page) {
            const cacheKey = `${homeCatalogQuery || '__all__'}:${page}`;
            if (honeyCatalogPageCache.has(cacheKey)) {
                const cached = honeyCatalogPageCache.get(cacheKey);
                homeCatalogTotal = cached.total;
                return cached.items.map(item => ({ ...item, images: { ...item.images, jpg: { ...item.images.jpg } }, genres: [...(item.genres || [])] }));
            }
            const mapPromise = loadHoneyAvailabilityMap();
            if (homeCatalogQuery) {
                const results = await searchHoneyTitles(homeCatalogQuery);
                await mapPromise;
                const items = results.map(honeyCatalogItem);
                homeCatalogTotal = results.length;
                honeyCatalogPageCache.set(cacheKey, { total: homeCatalogTotal, items });
                return items;
            }
            const payload = await fetchHoneyJson('/v2/manga/cursor-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ page: Math.max(1, page), pageSize: 24, sort: { sortBy: 'lastUpdated', sortOrder: 'DESC' }, filters: [] })
            });
            await mapPromise;
            homeCatalogTotal = Number(payload?.counter || payload?.total || payload?.data?.length || 0);
            loadHoneyCatalogReadableTotal();
            const items = (Array.isArray(payload?.data) ? payload.data : []).map(honeyCatalogItem);
            const enrichedItems = await attachHoneyReaders(items);
            honeyCatalogPageCache.set(cacheKey, { total: homeCatalogTotal, items: enrichedItems });
            return enrichedItems;
        }

        export async function fetchHomeCatalogPage(page) {
            if (homeCatalogMode === 'manga') return fetchHoneyCatalogPage(page);
            const endpoint = homeCatalogMode === 'novel' ? 'novel' : 'anime';
            const apiUrl = `${HIKKA_API}/${endpoint}?page=${Math.max(1, page)}&size=24`;
            const response = await hikkaRequest(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(homeCatalogRequestBody()) });
            if (!response.ok) throw new Error(`Hikka API: HTTP ${response.status}`);
            const data = await response.json();
            homeCatalogTotal = Number(data.pagination?.total || data.total || data.count || 0);
            const items = (data.list || []).map(item => hikkaItem(item, endpoint));
            return items;
        }

        export function getHomeCatalogVisibleItems() {
            const items = [...homeCatalogItems];
            let filtered = items;
            if (homeCatalogMode === 'anime' && homeCatalogPreset !== 'all') {
                filtered = filtered.filter(item => homeCatalogPreset === 'finished'
                    ? ['finished', 'released', 'completed'].includes(item.status)
                    : item.status === homeCatalogPreset);
            }
            if (homeCatalogMode === 'manga' && homeCatalogGenre !== 'all') {
                filtered = filtered.filter(item => honeyAgeCategory(item) === homeCatalogGenre);
            }
            return filtered.sort((a, b) => {
                const availability = Number(Boolean(b.readerUrl)) - Number(Boolean(a.readerUrl));
                if (availability) return availability;
                if (homeCatalogSort === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'uk');
                if (homeCatalogSort === 'newest') return Number(b.year || 0) - Number(a.year || 0);
                return (Number(b.score || b.native_score || 0) - Number(a.score || a.native_score || 0));
            });
        }

        export function formatHomeCatalogNumber(value) {
            return new Intl.NumberFormat('uk-UA').format(Number(value) || 0).replace(/\u00a0/g, ' ');
        }

        export function homeCatalogCountText(visibleCount) {
            const total = homeCatalogTotal || visibleCount;
            if (homeCatalogMode === 'manga') {
                const available = homeCatalogMode === 'manga'
                    ? Math.max(
                        Number(honeyCatalogReadableTotal || 0),
                        Number(honeyAvailabilityMap?.honeyAvailable || honeyAvailabilityMap?.available || 0),
                        HONEY_CATALOG_READABLE_FALLBACK
                    )
                    : homeCatalogItems.filter(item => item?.readerUrl).length;
                return `Доступно для читання: ${formatHomeCatalogNumber(available)} із ${formatHomeCatalogNumber(total)} манґи`;
            }
            return `Знайдено ${formatHomeCatalogNumber(total)} результатів`;
        }

        export function homeCatalogCardHtml(a) {
            const poster = a.images?.jpg?.large_image_url || ANIME_CARD_PLACEHOLDER;
            const title = a.title || 'Без назви';
            const type = a.typeLabel || animeTypeLabel(a.type);
            const status = statusLabelUa(a.status);
            const meta = [type, a.year, status].filter(Boolean).join(' · ');
            return `<article class="home-catalog-card${a.readerUrl || a.readerAvailable ? ' home-catalog-card--reader' : ''}" data-url="${escapeHtml(String(a.url || ''))}"${a.readerUrl ? ` data-reader-url="${escapeHtml(a.readerUrl)}"` : ''}${a.readerAvailable && !a.readerUrl ? ` data-reader-pending="1" data-honey-id="${escapeHtml(String(a.honeyId || a.honeyTitleId || ''))}"` : ''} tabindex="0" role="button" aria-label="${escapeHtml(title)}">
                <div class="home-catalog-card__poster">
                    <img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy" onload="this.classList.add('img--loaded')" onerror="this.onerror=null;this.src='${ANIME_CARD_PLACEHOLDER}'">
                    ${status ? `<span class="home-catalog-card__status">${escapeHtml(status)}</span>` : ''}
                    <span class="home-catalog-card__play"><i class="fas fa-play"></i></span>
                </div>
                <div class="home-catalog-card__title">${escapeHtml(title)}</div>
                <div class="home-catalog-card__meta">${escapeHtml(meta || 'Аніме')}</div>
            </article>`;
        }

        export function bindHomeCatalogCards(root) {
            root?.querySelectorAll('.home-catalog-card:not([data-bound])').forEach(card => {
                card.dataset.bound = '1';
                const open = async () => {
                    if (!card.dataset.url) return;
                    if (card.dataset.readerUrl) {
                        Router.goTo('manga', { url: card.dataset.readerUrl });
                        return;
                    }
                    if (homeCatalogMode === 'manga' && card.dataset.readerPending && card.dataset.honeyId) {
                        card.setAttribute('aria-busy', 'true');
                        try {
                            const item = homeCatalogItems.find(entry => String(entry.honeyId || entry.honeyTitleId) === String(card.dataset.honeyId)) || { honeyId: card.dataset.honeyId, honeyTitleId: card.dataset.honeyId, title: card.getAttribute('aria-label'), chapters: 1 };
                            const resolved = await resolveHoneyReader({ ...item, honeyTitleId: card.dataset.honeyId, chapters: Math.max(1, Number(item.chapters || 1)) });
                            if (resolved.readerUrl) { Router.goTo('manga', { url: resolved.readerUrl }); return; }
                        } finally { card.removeAttribute('aria-busy'); }
                        showToast('Розділи цього тайтлу ще не готові');
                        return;
                    }
                    if (homeCatalogMode !== 'anime') { showToast('Для цього тайтлу ще не підключено джерело читання'); return; }
                    openPlayerPage(card.dataset.url);
                };
                card.addEventListener('click', open);
                card.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
                });
            });
        }

        export function buildHomeCatalogSectionHtml(items) {
            const activeMode = HOME_CATALOG_MODES.find(mode => mode.key === homeCatalogMode) || HOME_CATALOG_MODES[0];
            const visibleItems = getHomeCatalogVisibleItems();
            return `<section class="home-catalog-section" id="homeCatalogSection">
                <div class="home-catalog-heading">
                    <div><h2>Каталог ${escapeHtml(activeMode.label.toLowerCase())}</h2></div>
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
                    <div class="home-catalog-quick-actions" role="group" aria-label="Швидкі дії каталогу">
                        <button class="home-catalog-filter-btn home-catalog-schedule-btn" id="homeCatalogScheduleBtn" type="button"><i class="fas fa-calendar-days"></i><span>Розклад виходу</span></button>
                        <button class="home-catalog-filter-btn" id="homeCatalogFilterBtn" type="button"><i class="fas fa-filter"></i><span>Фільтри</span></button>
                    </div>
                </div>
                <div class="home-catalog-presets" id="homeCatalogPresets">${HOME_CATALOG_PRESETS.map(preset => `<button type="button" class="home-catalog-preset${preset.key === homeCatalogPreset ? ' active' : ''}" data-catalog-preset="${preset.key}">${preset.label}</button>`).join('')}</div>
                ${homeCatalogGenreHtml()}
                <div class="home-catalog-results-label" id="homeCatalogResultsLabel">${homeCatalogCountText(visibleItems.length)}</div>
                <div class="home-catalog-grid${homeCatalogView === 'list' ? ' is-list' : ''}" id="homeCatalogGrid">${visibleItems.length ? visibleItems.map(homeCatalogCardHtml).join('') : '<div class="home-catalog-empty">Каталог тимчасово недоступний.</div>'}</div>
                <button class="home-catalog-more" id="homeCatalogMoreBtn" type="button"><i class="fas fa-plus"></i> Продовжити</button>
            </section>`;
        }

        export function renderHomeCatalogGrid() {
            const grid = document.getElementById('homeCatalogGrid');
            const count = document.getElementById('homeCatalogCount');
            const number = document.getElementById('homeCatalogResultNumber');
            if (!grid) return;
            const visibleItems = getHomeCatalogVisibleItems();
            grid.classList.toggle('is-list', homeCatalogView === 'list');
            grid.innerHTML = visibleItems.length ? visibleItems.map(homeCatalogCardHtml).join('') : '<div class="home-catalog-empty">Нічого не знайдено за цими параметрами.</div>';
            bindHomeCatalogCards(grid);
            if (count) count.textContent = homeCatalogCountText(visibleItems.length);
            const label = document.getElementById('homeCatalogResultsLabel');
            if (label) label.textContent = homeCatalogCountText(visibleItems.length);
            if (number) number.textContent = formatHomeCatalogNumber(homeCatalogTotal || visibleItems.length);
        }

        export function bindHomeCatalogMenu(root) {
            const tabs = root.querySelectorAll('[data-catalog-mode]');
            tabs.forEach(tab => tab.addEventListener('click', async () => {
                if (tab.dataset.catalogMode === homeCatalogMode || homeCatalogLoading) return;
                homeCatalogMode = tab.dataset.catalogMode;
                homeCatalogQuery = '';
                homeCatalogPreset = 'all';
                homeCatalogGenre = 'all';
                await reloadHomeCatalog();
            }));
            root.querySelector('#homeCatalogSort')?.addEventListener('change', async event => {
                homeCatalogSort = event.target.value;
                await reloadHomeCatalog();
            });
            root.querySelectorAll('[data-catalog-view]').forEach(button => button.addEventListener('click', () => {
                homeCatalogView = button.dataset.catalogView;
                root.querySelectorAll('[data-catalog-view]').forEach(item => item.classList.toggle('active', item === button));
                renderHomeCatalogGrid();
            }));
            root.querySelectorAll('[data-catalog-preset]').forEach(button => button.addEventListener('click', async () => {
                homeCatalogPreset = button.dataset.catalogPreset;
                root.querySelectorAll('[data-catalog-preset]').forEach(item => item.classList.toggle('active', item === button));
                renderHomeCatalogGrid();
            }));
            let searchTimer = null;
            root.querySelector('#homeCatalogSearch')?.addEventListener('input', event => {
                clearTimeout(searchTimer);
                homeCatalogQuery = event.target.value.trim();
                searchTimer = setTimeout(() => reloadHomeCatalog(), 450);
            });
            root.querySelector('#homeCatalogScheduleBtn')?.addEventListener('click', () => {
                Router.goTo('schedule');
            });
            root.querySelector('#homeCatalogFilterBtn')?.addEventListener('click', () => {
                Router.goTo('genres');
                showToast('Розширені фільтри відкрито');
            });
        }

        export function updateHomeCatalogModeLabels() {
            const mode = HOME_CATALOG_MODES.find(item => item.key === homeCatalogMode) || HOME_CATALOG_MODES[0];
            const title = document.querySelector('#homeCatalogSection h2');
            const search = document.getElementById('homeCatalogSearch');
            if (title) title.textContent = `Каталог ${mode.label.toLowerCase()}`;
            if (search) search.placeholder = `Введіть назву ${mode.label.toLowerCase()}...`;
            document.querySelectorAll('[data-catalog-mode]').forEach(tab => tab.classList.toggle('active', tab.dataset.catalogMode === homeCatalogMode));
        }

        export async function reloadHomeCatalog() {
            const grid = document.getElementById('homeCatalogGrid');
            if (!grid || homeCatalogLoading) return;
            const requestId = ++homeCatalogRequestId;
            updateHomeCatalogModeLabels();
            homeCatalogLoading = true;
            homeCatalogPage = 1;
            grid.innerHTML = '<div class="loader home-catalog-loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>';
            try {
                const nextItems = await fetchHomeCatalogPage(1);
                if (requestId !== homeCatalogRequestId) return;
                homeCatalogItems = nextItems;
                syncHomeCatalogGenreControl();
                renderHomeCatalogGrid();
                const button = document.getElementById('homeCatalogMoreBtn');
                if (button) { button.disabled = false; button.innerHTML = '<i class="fas fa-plus"></i> Продовжити'; }
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
                const nextPage = homeCatalogPage + 1;
                const nextItems = await fetchHomeCatalogPage(nextPage);
                const existing = new Set(homeCatalogItems.map(item => item.url));
                homeCatalogItems.push(...nextItems.filter(item => item.url && !existing.has(item.url)));
                homeCatalogPage = nextPage;
                renderHomeCatalogGrid();
                if (!nextItems.length || nextItems.length < 24) button.remove();
                else { button.disabled = false; button.innerHTML = '<i class="fas fa-plus"></i> Продовжити'; }
            } catch (error) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-rotate-right"></i> Спробувати ще';
                showToast('Не вдалося завантажити наступну сторінку каталогу');
            } finally { homeCatalogLoading = false; }
        }
        window.loadHomeCatalogMore = loadHomeCatalogMore;

        export async function loadAndDisplayGenreSections() {
            const requestId = ++homeSectionsRequestId;
            const container = document.getElementById('genreSectionsContainer');
            if (!container) return;
            container.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження каталогу...</div>';
            container.style.display = 'flex';
            homeCatalogPage = 1;
            homeCatalogItems = [];
            homeCatalogLoading = false;

            try {
                const catalogItems = await fetchHomeCatalogPage(1).catch(error => {
                    console.error('Помилка завантаження каталогу:', error);
                    homeCatalogTotal = 0;
                    return [];
                });
                if (requestId !== homeSectionsRequestId) return;
                homeCatalogItems = catalogItems.filter(item => item?.url);
                const html = buildHomeCatalogSectionHtml(homeCatalogItems);
                container.innerHTML = html;
                bindHomeCatalogCards(container);
                bindHomeCatalogMenu(container);
                document.getElementById('homeCatalogMoreBtn')?.addEventListener('click', loadHomeCatalogMore);


            } catch (err) {
                console.error('Помилка завантаження головної сторінки:', err);
                container.innerHTML = `<div class="loader"><i class="fas fa-exclamation-triangle"></i> Помилка: ${escapeHtml(err.message || 'невідома помилка')}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadAndDisplayGenreSections()">Спробувати знову</button></div>`;
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
        export let searchPageState = { query: '', page: 1, list: [], loading: false };

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
            DailyStats.increment('searchesToday', 1);
            searchPageState.loading = true;
            results.innerHTML = '<div class="loader" style="grid-column:1/-1;"><i class="fas fa-spinner fa-pulse"></i> Пошук...</div>';
            pagination.innerHTML = '';
            try {
                const list = await searchHikka(query, searchPageState.page);
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
                throw new Error('Cloudinary upload failed: ' + resp.status + ' ' + errText.substring(0, 100));
            }
            const data = await resp.json();
            if (!data.secure_url) throw new Error('Cloudinary: no secure_url in response');
            return data.secure_url;
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

        export function profileMediaMarkup(url, className, alt, settings) {
            if (!url) return '';
            const safeUrl = escapeHtml(url);
            const style = escapeHtml(profileMediaTransformStyle(settings));
            const styleAttr = style ? ` style="${style}"` : '';
            if (isVideoUrl(url)) {
                return `<video class="${className}" src="${safeUrl}"${styleAttr} autoplay muted loop playsinline preload="metadata" aria-label="${escapeHtml(alt || '')}"></video>`;
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
        //  guide for banner). GIFs bypass this entirely to keep animation.
        // ====================================================================
        export function _imgeditClamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

        export function openImageEditor(file, mode, onSaved) {
            // mode: 'avatar' (1:1 circle) or 'banner' (wide rect w/ device guide)
            const objectUrl = URL.createObjectURL(file);
            const isVideo = isVideoFile(file);
            const isPng = !isVideo && (file.type === 'image/png' || String(file.name || '').toLowerCase().endsWith('.png'));
            const previousBodyOverflow = document.body.style.overflow;
            const overlay = document.createElement('div');
            overlay.className = 'imgedit-overlay';
            document.body.style.overflow = 'hidden';
            overlay.innerHTML = `
                <div class="imgedit-topbar">
                    <button class="imgedit-back" id="imgeditBack" title="Скасувати">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <button class="imgedit-save" id="imgeditSave">Зберегти</button>
                </div>
                <div class="imgedit-stage" id="imgeditStage">
                    ${isVideo ? `<video class="imgedit-img" id="imgeditImg" src="${objectUrl}" muted autoplay loop playsinline preload="metadata"></video>` : `<img class="imgedit-img" id="imgeditImg" src="${objectUrl}" alt="">`}
                    <div class="imgedit-frame" id="imgeditFrame"></div>
                    <div id="imgeditGuides"></div>
                </div>
                <div class="imgedit-bottombar">
                    ${mode === 'banner' ? `<div class="imgedit-caption">Банер профілю виглядатиме по-різному залежно від пристрою. Найбільшим він буде на комп'ютері, менший — на телефоні. Тримайте важливе ближче до центру, щоб воно не обрізалось.</div>` : `<div class="imgedit-caption">Перемістіть і масштабуйте ${isVideo ? 'відео' : 'фото'}, щоб обрати область для аватарки.</div>`}
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
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15" y2="15"/><line x1="10" y1="7" x2="10" y2="13"/><line x1="7" y1="10" x2="13" y2="10"/></svg>
                    </div>
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

            let frameW, frameH, frameX, frameY;
            let natW = 0, natH = 0;
            let baseScale = 1, scale = 1, minScale = 1;
            let tx = 0, ty = 0;
            let mirrorX = false, mirrorY = false;
            let dragging = false, dragStartX = 0, dragStartY = 0, startTx = 0, startTy = 0;

            function layoutFrame() {
                const stageRect = stage.getBoundingClientRect();
                const zoomRatio = minScale > 0 ? scale / minScale : 1;
                if (mode === 'avatar') {
                    const size = Math.min(stageRect.width, stageRect.height) * 0.72;
                    frameW = size; frameH = size;
                } else {
                    frameW = stageRect.width * 0.92;
                    frameH = Math.min(stageRect.height * 0.62, frameW * 0.24);
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

                if (mode === 'banner') {
                    const bands = [
                        { wRatio: 1.0, label: 'Телевізор' },
                        { wRatio: 0.72, label: "Комп'ютер" },
                        { wRatio: 0.46, label: 'Усі пристрої' }
                    ];
                    guidesEl.innerHTML = bands.map((b, i) => {
                        const w = frameW * b.wRatio;
                        const x = frameX + (frameW - w) / 2;
                        return `<div class="imgedit-grid-line" style="left:${x}px; top:${frameY}px; width:1px; height:${frameH}px;"></div>
                                <div class="imgedit-grid-line" style="left:${x + w}px; top:${frameY}px; width:1px; height:${frameH}px;"></div>
                                <div class="imgedit-grid-chip" style="left:${x + 4}px; top:${frameY + 4 + i * 16}px;">${b.label}</div>`;
                    }).join('');
                } else {
                    guidesEl.innerHTML = '';
                }
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
                    if (isVideo) {
                        const centeredTx = frameX + (frameW - natW * scale) / 2;
                        const centeredTy = frameY + (frameH - natH * scale) / 2;
                        const zoom = _imgeditClamp(scale / Math.max(minScale, 0.0001), 1, 3);
                        closeEditor();
                        onSaved({
                            zoom: Number(zoom.toFixed(4)),
                            x: Number((((tx - centeredTx) / Math.max(frameW, 1)) * 100).toFixed(4)),
                            y: Number((((ty - centeredTy) / Math.max(frameH, 1)) * 100).toFixed(4)),
                            mirrorX: !!mirrorX,
                            mirrorY: !!mirrorY
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
                        onSaved(blob);
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
                openImageEditor(file, mode, async (croppedBlob) => {
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
                        }
                        saveProfile(profile);
                        if (Router.currentRoute === 'profile') renderProfilePage();
                        if (Router.currentRoute === 'settings') renderSettingsPage();
                        showToast(mode === 'avatar' ? 'Аватарку оновлено' : 'Банер оновлено');
                    } catch (err) {
                        console.error('Edited profile image upload error:', err);
                        showToast('Не вдалося зберегти відредаговане зображення');
                    }
                });
            } catch (err) {
                console.error('Existing profile image editor error:', err);
                showToast('Не вдалося відкрити редактор зображення');
            }
        }

        export async function editExistingProfileVideo(url, mode) {
            if (!url) return;
            showToast('Підготовка редактора відео...');
            try {
                const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
                if (!response.ok) throw new Error('Не вдалося завантажити відео');
                const blob = await response.blob();
                const file = new File([blob], `${mode}.mp4`, { type: blob.type || 'video/mp4' });
                openImageEditor(file, mode, (settings) => {
                    const profile = getProfile();
                    profile[mode === 'avatar' ? 'avatarVideoSettings' : 'bannerVideoSettings'] = settings;
                    saveProfile(profile);
                    if (Router.currentRoute === 'profile') renderProfilePage();
                    if (Router.currentRoute === 'settings') renderSettingsPage();
                    showToast(mode === 'avatar' ? 'Відео-аватарку оновлено' : 'Відео-банер оновлено');
                });
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

            function setAuthMode(mode) {
                btnLogin.classList.toggle('active', mode === 'login');
                btnRegister.classList.toggle('active', mode === 'register');
                switcher.classList.toggle('mode-register', mode === 'register');
                panelLogin.classList.toggle('active', mode === 'login');
                panelRegister.classList.toggle('active', mode === 'register');
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
            const current = nickEl.textContent;
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
                const profile = getProfile();
                profile.nickname = val;
                saveProfile(profile);
                const meta = document.querySelector('.profile-meta');
                if (meta) {
                    const first = meta.querySelector('span:first-child');
                    if (first) first.textContent = '@' + val.toLowerCase().replace(/\s/g, '_');
                }
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
            const isGif = !isVideo && file.type === 'image/gif';
            const maxSize = isVideo ? 50 * 1024 * 1024 : (isGif ? 10 * 1024 * 1024 : 15 * 1024 * 1024);
            if (file.size > maxSize) { showToast(isVideo ? 'Відео занадто велике (максимум 50 МБ)' : (isGif ? 'GIF занадто великий (максимум 10 МБ) — стисни його або вибери коротший' : 'Файл занадто великий (максимум 15 МБ)')); e.target.value = ''; return; }

            const doUpload = async (blobOrFile, raw, mediaType = 'image', mediaSettings = null) => {
                showToast(mediaType === 'video' ? 'Завантаження відео-аватарки...' : (isGif ? 'Завантаження GIF-аватарки...' : 'Завантаження аватарки...'));
                try {
                    const imageUrl = mediaType === 'video' ? await uploadVideoToCloudinary(blobOrFile, 'avatar.mp4') : (raw ? await uploadRawToCloudinary(blobOrFile, 'avatar.gif') : await uploadBlobToCloudinary(blobOrFile, 'avatar.jpg'));
                    const profile = getProfile();
                    if (mediaType === 'video') { profile.avatarVideo = imageUrl; profile.avatar = ''; profile.avatarVideoSettings = mediaSettings || null; }
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
                // GIFs skip the cropper — canvas cropping would flatten the animation to 1 frame.
                showToast('GIF без кадрування — щоб зберегти анімацію');
                await doUpload(file, true);
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
            const isGif = !isVideo && file.type === 'image/gif';
            const maxSize = isVideo ? 50 * 1024 * 1024 : (isGif ? 10 * 1024 * 1024 : 15 * 1024 * 1024);
            if (file.size > maxSize) { showToast(isVideo ? 'Відео занадто велике (максимум 50 МБ)' : (isGif ? 'GIF занадто великий (максимум 10 МБ) — стисни його або вибери коротший' : 'Файл занадто великий (максимум 15 МБ)')); e.target.value = ''; return; }

            const doUpload = async (blobOrFile, raw, mediaType = 'image', mediaSettings = null) => {
                showToast(mediaType === 'video' ? 'Завантаження відео-банера...' : (isGif ? 'Завантаження GIF-банера...' : 'Завантаження банера...'));
                try {
                    const imageUrl = mediaType === 'video' ? await uploadVideoToCloudinary(blobOrFile, 'banner.mp4') : (raw ? await uploadRawToCloudinary(blobOrFile, 'banner.gif') : await uploadBlobToCloudinary(blobOrFile, 'banner.jpg'));
                    const profile = getProfile();
                    if (mediaType === 'video') { profile.bannerVideo = imageUrl; profile.banner = ''; profile.bannerVideoSettings = mediaSettings || null; }
                    else { profile.banner = imageUrl; profile.bannerVideo = ''; profile.bannerVideoSettings = null; }
                    saveProfile(profile);
                    if (Router.currentRoute === 'profile') renderProfilePage();
                    if (Router.currentRoute === 'settings') renderSettingsPage();
                    showToast('Банер оновлено');
                } catch (err) {
                    console.error('Banner upload error:', err);
                    showToast('Помилка завантаження банера: ' + (err.message || 'невідома помилка'));
                }
            };

            if (isVideo) {
                openImageEditor(file, 'banner', (settings) => doUpload(file, true, 'video', settings));
            } else if (isGif) {
                showToast('GIF без кадрування — щоб зберегти анімацію');
                await doUpload(file, true);
            } else {
                openImageEditor(file, 'banner', (blob) => doUpload(blob, false));
            }
            e.target.value = '';
        });

        // ====================================================================
        //  СТОРІНКА ЖАНРУ
        // ====================================================================
        export let genrePageState = { slug: '', name: '', page: 1, list: [] };

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
                    Router.goTo('genre', { slug, name });
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
