import { HIKKA_API, GENRE_MAP, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../../config/constants.js?v=20260824-settings-redesign-v1';
import {
    Auth, Router, Storage, escapeHtml,
    loadGenrePageContent, renderProfilePage, renderSettingsPage,
    showToast, showToastProgress, syncLeftdockActive
} from '../../legacy/app-legacy.js?v=20260910-anime4k-v1';
import { getProfile, saveProfile, getProfileDisplayName, stripNicknamePrefix } from '../settings/settingsLegacy.js?v=20260824-settings-redesign-v1';
import { debugLog } from '../../utils/debug.js';
import { fetchTmdbCardInfo } from '../../services/tmdb.js?v=20260824-settings-redesign-v1';
import { fetchAnimeLite, fetchHikkaByCategory, fetchHikkaMain, fetchHikkaQuickFilter, fetchHikkaTop100, hikkaCatalog, hikkaItem, hikkaRequest, normalizeGenreList, normalizeSynopsisText, searchHikka } from '../../services/catalog/catalog.js?v=20260911-moonanime-fallback-v4';
import { getProxyUrl } from '../../utils/image.js';
import { hasHoneyPageResources, isHoneyComicItem, selectHoneyReaderChapter, sortHoneyChaptersForReading } from '../../services/api/manga.js?v=20260824-settings-redesign-v1';

        // Hikka may remain pending behind corsproxy for 25+ seconds. The catalog
        // shell must stay interactive so users can switch to Honey Manga
        // without waiting for the unrelated anime request.
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
            currentCategory = '',
            quickFilterParams = null;

        // Захист від того, що якийсь webview/CSS знову зробить body власним
        // скрол-контейнером замість документа (саме через це recycler колись
        // рахував window.scrollY===0 і spacer роздувався до сотень тисяч px).
        // Читаємо максимум з усіх можливих джерел позиції скролу і при
        // компенсації скролу штовхаємо всі можливі скрол-контейнери одразу —
        // той, що не є реальним скрол-контейнером, просто ігнорує запис.
        function getPageScrollY() {
            return Math.max(
                window.scrollY || 0,
                document.documentElement.scrollTop || 0,
                document.body.scrollTop || 0
            );
        }
        function scrollPageBy(dy) {
            if (!dy) return;
            // ОДИН запис у реальний скрол-контейнер, примусово миттєвий.
            // Раніше тут було window.scrollBy + documentElement.scrollTop —
            // це один і той самий документ-скрол, viewport з'їжджав на 2×dy,
            // а CSS scroll-behavior:smooth на html ще й анімував кожен
            // стрибок — через це при гортанні вгору користувач «пролітав»
            // повз відновлені картки (порожній екран) і все підгальмовувало.
            const doc = document.scrollingElement || document.documentElement;
            const prevBehavior = doc.style.scrollBehavior;
            doc.style.scrollBehavior = 'auto';
            try {
                doc.scrollTop = (doc.scrollTop || 0) + dy;
                // Фолбек для webview, де скрол-контейнером лишається сам body.
                if (doc === document.documentElement && document.body && document.body.scrollHeight > document.body.clientHeight + 1) {
                    document.body.scrollTop = (document.body.scrollTop || 0) + dy;
                }
            } finally {
                doc.style.scrollBehavior = prevBehavior;
            }
        }

        // Infinite scroll for the actually visible legacy animeContainer.
        const HOME_FEED_MAX_ITEMS = 960;
        let homeFeedItems = [];
        let homeFeedPage = 1;
        let homeFeedHasMore = true;
        let homeFeedLoading = false;
        let homeFeedRequestId = 0;
        let homeFeedObserver = null;
        let homeFeedRetryAt = 0;

        export const setCurrentTab = value => { currentTab = value; };
        export const setCurrentPage = value => { currentPage = value; };
        export const setCurrentSearchQuery = value => { currentSearchQuery = value; };
        export const setCurrentCategory = value => { currentCategory = value; };
        export const setQuickFilterParams = value => { quickFilterParams = value; };

        export async function fetchContent() {
            if (currentTab === 'top100') { return await fetchHikkaTop100(); }
            if (currentSearchQuery) { return await searchHikka(currentSearchQuery, currentPage); }
            if (quickFilterParams) {
                const { fetchHikkaQuickFilter } = await import('../../services/catalog/catalog.js?v=20260911-moonanime-fallback-v4');
                return await fetchHikkaQuickFilter(currentPage, quickFilterParams);
            }
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
            if (currentTab === 'main' && !currentSearchQuery && !currentCategory && !quickFilterParams) {
                homeFeedItems = [];
                homeFeedPage = 1;
                homeFeedHasMore = true;
                homeFeedRetryAt = 0;
                ++homeFeedRequestId;
                homeFeedObserver?.disconnect();
                homeFeedObserver = null;
                document.getElementById('homeAnimeFeedSentinel')?.remove();
                resetAnimeGridWindow();
            }
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
                const poster = cardPoster(a, '');
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

        function animeFeedCardHtml(a, idx) {
            const poster = escapeHtml(cardPoster(a, ''));
            const title = escapeHtml(a.title || 'Без назви');
            const type = escapeHtml(a.typeLabel || animeTypeLabel(a.type));
            return `<div class="anime-card" data-url="${escapeHtml(a.url || '')}" data-idx="${idx || 0}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${(idx || 0) * 0.03}s">
              <div class="anime-poster"><img src="${poster}" alt="${title}" loading="lazy" decoding="async" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.onerror=null;this.src='${ANIME_CARD_PLACEHOLDER}'"><span class="anime-card-type" data-role="type">${type}</span></div>
              <div class="anime-title-under">${title}</div>
            </div>`;
        }

        // ====================================================================
        //  ВІРТУАЛІЗАЦІЯ ГОЛОВНОГО КАТАЛОГУ (#animeContainer, infinite scroll)
        //  Це реальне джерело крашу на 15-20+ сторінках: без обмежень DOM
        //  накопичував сотні великих постерів → Safari вбивав вкладку (OOM),
        //  через що постери "зникали", а потім сторінка ставала білою.
        //  Тримаємо в DOM лише ~120 карток; старі рядки вивантажуються під
        //  spacer, і повертаються назад, якщо користувач гортає вгору.
        // ====================================================================
        const ANIME_GRID_MAX_RENDERED = 120;
        const ANIME_GRID_RESTORE_ROWS = 6;
        let animeGridSpacerObserver = null;

        function animeGridColumns(container) {
            const cols = window.getComputedStyle(container).gridTemplateColumns.split(' ').filter(Boolean).length;
            return Math.max(1, cols || 2);
        }

        function ensureAnimeGridSpacer(container) {
            let spacer = container.querySelector(':scope > .anime-grid-spacer');
            if (!spacer) {
                spacer = document.createElement('div');
                spacer.className = 'anime-grid-spacer';
                spacer.style.gridColumn = '1 / -1';
                spacer.style.height = '0px';
                container.prepend(spacer);
            }
            return spacer;
        }

        function observeAnimeGridSpacer(container, spacer) {
            if (typeof IntersectionObserver === 'undefined') return;
            animeGridSpacerObserver?.disconnect();
            animeGridSpacerObserver = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) restoreAnimeGridAbove(container);
            }, { rootMargin: '600px 0px 0px 0px', threshold: 0 });
            animeGridSpacerObserver.observe(spacer);
        }

        export function resetAnimeGridWindow() {
            animeGridSpacerObserver?.disconnect();
            animeGridSpacerObserver = null;
        }

        export function trimAnimeGridAbove(container) {
            if (!container || !container.classList.contains('anime-grid')) return;
            const cols = animeGridColumns(container);
            const cards = [...container.querySelectorAll(':scope > .anime-card[data-idx]')];
            if (cards.length <= ANIME_GRID_MAX_RENDERED) return;
            const overflow = cards.length - ANIME_GRID_MAX_RENDERED;
            const trimRows = Math.floor(overflow / cols);
            if (trimRows <= 0) return;
            const trimCount = trimRows * cols;
            const firstTrimCard = cards[0];
            const firstKeptCard = cards[trimCount];
            if (!firstKeptCard) return;
            const removedH = Math.max(0, firstKeptCard.getBoundingClientRect().top - firstTrimCard.getBoundingClientRect().top);
            const spacer = ensureAnimeGridSpacer(container);
            const spacerH = parseFloat(spacer.style.height) || 0;
            for (let i = 0; i < trimCount; i++) cards[i].remove();
            spacer.style.height = `${spacerH + removedH}px`;
            observeAnimeGridSpacer(container, spacer);
        }

        function restoreAnimeGridAbove(container) {
            const spacer = container.querySelector(':scope > .anime-grid-spacer');
            if (!spacer) return;
            const spacerH = parseFloat(spacer.style.height) || 0;
            if (spacerH <= 0) return;
            const cols = animeGridColumns(container);
            const cards = [...container.querySelectorAll(':scope > .anime-card[data-idx]')];
            const renderedFirst = cards.length ? Number(cards[0].dataset.idx) : homeFeedItems.length;
            const restoreCount = Math.min(renderedFirst, ANIME_GRID_RESTORE_ROWS * cols);
            if (restoreCount <= 0) return;
            const restoreFromIdx = renderedFirst - restoreCount;
            const insertItems = homeFeedItems.slice(restoreFromIdx, renderedFirst);
            if (!insertItems.length) return;
            const beforeTop = spacer.getBoundingClientRect().top;
            const html = insertItems.map((item, i) => animeFeedCardHtml(item, restoreFromIdx + i)).join('');
            spacer.insertAdjacentHTML('afterend', html);
            requestAnimationFrame(() => {
                const nextKeptCard = container.querySelector(`.anime-card[data-idx="${renderedFirst}"]`);
                const insertedH = nextKeptCard ? Math.max(0, nextKeptCard.getBoundingClientRect().top - beforeTop) : 0;
                spacer.style.height = `${Math.max(0, spacerH - insertedH)}px`;
                if (insertedH > 0) scrollPageBy(insertedH);
                bindAnimeFeedCards(container);
                observeAnimeCardsForTmdb(container);
                observeAnimeGridSpacer(container, spacer);
            });
        }

        function bindAnimeFeedCards(root) {
            root?.querySelectorAll('.anime-card:not([data-feed-bound])').forEach(card => {
                card.dataset.feedBound = '1';
                card.addEventListener('click', () => openPlayerPage(card.dataset.url));
                card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPlayerPage(card.dataset.url); } });
            });
        }

        function ensureAnimeFeedObserver() {
            const container = document.getElementById('animeContainer');
            if (!container || currentTab !== 'main' || currentSearchQuery || currentCategory || quickFilterParams) return;
            let sentinel = document.getElementById('homeAnimeFeedSentinel');
            if (!sentinel) {
                sentinel = document.createElement('div');
                sentinel.id = 'homeAnimeFeedSentinel';
                sentinel.className = 'home-anime-feed-sentinel';
                sentinel.innerHTML = '<span class="home-anime-feed-loader" hidden><i class="fas fa-spinner fa-pulse"></i> Завантажуємо ще...</span>';
                container.after(sentinel);
            }
            sentinel.hidden = !homeFeedHasMore || homeFeedItems.length >= HOME_FEED_MAX_ITEMS;
            if (homeFeedObserver) homeFeedObserver.disconnect();
            if (sentinel.hidden || typeof IntersectionObserver === 'undefined') return;
            homeFeedObserver = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) void loadMoreHomeAnime();
            }, { rootMargin: '900px 0px', threshold: 0 });
            homeFeedObserver.observe(sentinel);
        }

        async function loadMoreHomeAnime() {
            if (homeFeedLoading || !homeFeedHasMore || Date.now() < homeFeedRetryAt || homeFeedItems.length >= HOME_FEED_MAX_ITEMS) return;
            if (Router.currentRoute !== 'main' || currentTab !== 'main' || currentSearchQuery || currentCategory || quickFilterParams) return;
            const requestId = homeFeedRequestId;
            const container = document.getElementById('animeContainer');
            const sentinel = document.getElementById('homeAnimeFeedSentinel');
            const loader = sentinel?.querySelector('.home-anime-feed-loader');
            homeFeedLoading = true;
            if (loader) loader.hidden = false;
            try {
                const nextPage = homeFeedPage + 1;
                const nextItems = await withHomeCatalogTimeout(fetchHikkaMain(nextPage), HOME_CATALOG_ANIME_TIMEOUT_MS);
                if (requestId !== homeFeedRequestId || Router.currentRoute !== 'main') return;
                const existing = new Set(homeFeedItems.map(item => item.url));
                const additions = nextItems.filter(item => item?.url && !existing.has(item.url));
                if (!additions.length) homeFeedHasMore = false;
                homeFeedItems.push(...additions);
                homeFeedPage = nextPage;
                homeFeedHasMore = homeFeedHasMore && nextItems.hasNextPage !== false && nextItems.length > 0;
                registerAnimeCardData(additions);
                if (container && additions.length) {
                    container.insertAdjacentHTML('beforeend', additions.map((item, index) => animeFeedCardHtml(item, homeFeedItems.length - additions.length + index)).join(''));
                    bindAnimeFeedCards(container);
                    observeAnimeCardsForTmdb(container);
                    trimAnimeGridAbove(container);
                }
            } catch (error) {
                homeFeedRetryAt = Date.now() + 5000;
                console.warn('Homepage infinite scroll failed:', error);
            } finally {
                homeFeedLoading = false;
                if (loader) loader.hidden = true;
                ensureAnimeFeedObserver();
            }
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
            container.innerHTML = list.map(animeFeedCardHtml).join('');
            bindAnimeFeedCards(container);
            renderPagination();
            if (currentTab === 'main' && !currentSearchQuery && !currentCategory && !quickFilterParams) {
                homeFeedItems = [...list];
                homeFeedPage = currentPage;
                homeFeedHasMore = list.hasNextPage !== false && list.length > 0;
                document.getElementById('paginationRow')?.replaceChildren();
                ensureAnimeFeedObserver();
            }
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
        // Нескінченна лєнта головного каталогу: догрузка сторінок при скролі.
        export const HOME_CATALOG_FEED_MAX_ITEMS = 960; // захист DOM від необмеженого росту
        let homeCatalogFeedObserver = null;
        let homeCatalogFeedBusy = false;
        let homeCatalogFeedCooldownUntil = 0;
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
            { key: 'manga', label: 'Манґа', icon: 'fa-palette' }
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

        // Honey Manga is the only manga source. Hikka remains the source for anime.
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
                type: 'manga',
                typeLabel: sourceType || 'Манґа',
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
            
            // Check local storage
            try {
                const stored = localStorage.getItem(`vakdab_manga_reader_${cacheKey}`);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed && parsed.readerUrl) {
                        honeyReaderCache.set(cacheKey, parsed);
                        return { ...item, ...parsed };
                    }
                }
            } catch { /* ignore */ }

            if (honeyReaderPendingCache.has(cacheKey)) {
                const pendingReader = await honeyReaderPendingCache.get(cacheKey);
                return { ...item, ...pendingReader };
            }
            const pendingReader = (async () => {
                try {
                    const payload = await fetchHoneyJson('/v2/chapter/cursor-list', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ page: 1, pageSize: 100, mangaId: String(mangaId), sortOrder: 'DESC' })
                    });
                    const chapters = Array.isArray(payload?.data) ? payload.data : [];
                    const readingOrder = sortHoneyChaptersForReading(chapters);
                    const publicFirst = [
                        ...readingOrder.filter(entry => entry && entry.isMonetized !== true),
                        ...readingOrder.filter(entry => entry && entry.isMonetized === true)
                    ].filter(entry => Boolean(entry?.id)).slice(0, 12);
                    
                    let chapter = null;
                    // Probe candidate chapters in parallel batches of 4 for speed
                    for (let i = 0; i < publicFirst.length; i += 4) {
                        const batch = publicFirst.slice(i, i + 4);
                        const results = await Promise.allSettled(
                            batch.map(cand => fetchHoneyJson(`/v2/chapter/frames/${encodeURIComponent(cand.id)}/${encodeURIComponent(mangaId)}`)
                                .then(frames => ({ candidate: cand, hasFrames: hasHoneyPageResources(frames) }))
                            )
                        );
                        for (const res of results) {
                            if (res.status === 'fulfilled' && res.value.hasFrames) {
                                chapter = res.value.candidate;
                                break;
                            }
                        }
                        if (chapter) break;
                    }

                    chapter ||= selectHoneyReaderChapter(chapters);
                    const result = chapter?.id ? {
                        readerUrl: `${HONEY_WEB}/read/${chapter.id}/${mangaId}`,
                        honeyChapterId: chapter.id,
                        readerTitle: item.title || 'Манґа',
                        readerSource: 'honey-manga.com.ua'
                    } : { readerUrl: '', honeyChapterId: '' };

                    if (result.readerUrl) {
                        try {
                            localStorage.setItem(`vakdab_manga_reader_${cacheKey}`, JSON.stringify(result));
                        } catch { /* ignore */ }
                    }
                    return result;
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
            if (homeCatalogGenres.size) {
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

        export async function fetchHomeCatalogPage(page) {
            if (homeCatalogMode === 'manga') return fetchHoneyCatalogPage(page);
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
            if (homeCatalogGenres.size) {
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
            const total = isFilteredManga
                ? (homeCatalogFilterIndexReady && homeCatalogFilterResultItems ? homeCatalogFilterResultItems.length : visibleCount)
                : (homeCatalogTotal || visibleCount);
            if (homeCatalogMode === 'manga') {
                const available = homeCatalogAvailableTotal || homeCatalogItems.filter(item => item?.readerAvailable || item?.readerUrl).length;
                const suffix = isFilteredManga && !homeCatalogFilterIndexReady ? '' : ` із ${formatHomeCatalogNumber(total)}`;
                return `Доступно для читання: ${formatHomeCatalogNumber(available)}${suffix} манґи`;
            }
            if (homeCatalogMode === 'anime' && isFilteredAnime) return `Показано ${formatHomeCatalogNumber(visibleCount)} з ${formatHomeCatalogNumber(homeCatalogTotal || total)} результатів`;
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
            showToast('Додано до обраного');
            return true;
        }

        export function homeCatalogCardHtml(a) {
            const poster = cardPoster(a);
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
                <div class="home-catalog-feed-sentinel" id="homeCatalogFeedSentinel" aria-hidden="true" hidden><div class="loader home-catalog-loader" id="homeCatalogFeedLoader" hidden><i class="fas fa-spinner fa-pulse"></i> Завантажуємо ще...</div></div>
                <div class="home-catalog-pagination" id="homeCatalogPagination" hidden aria-label="Навігація сторінками каталогу">
                    <button type="button" class="home-catalog-page-btn" data-catalog-page="prev"><i class="fas fa-chevron-left"></i><span>Назад</span></button>
                    <span class="home-catalog-page-label" data-catalog-page-label>Сторінка 1</span>
                    <button type="button" class="home-catalog-page-btn" data-catalog-page="next"><span>Далі</span><i class="fas fa-chevron-right"></i></button>
                </div>
            </section>`;
        }

        function prefetchHomeCatalogReaderUrls(root) {
            if (!root || homeCatalogMode !== 'manga') return;
            const cards = [...root.querySelectorAll('.home-catalog-card[data-honey-id]:not([data-reader-url])')];
            if (!cards.length) return;
            let cursor = 0;
            const worker = async () => {
                while (cursor < cards.length) {
                    const card = cards[cursor++];
                    if (card.dataset.readerUrl) continue;
                    try {
                        const honeyId = card.dataset.honeyId;
                        const item = homeCatalogItems.find(entry => String(entry.honeyId || entry.honeyTitleId) === String(honeyId))
                            || { honeyId, honeyTitleId: honeyId, title: card.dataset.readerTitle, chapters: 1 };
                        const resolved = await resolveHoneyReader({ ...item, honeyTitleId: honeyId, chapters: Math.max(1, Number(item.chapters || 1)) });
                        if (resolved?.readerUrl && card.isConnected && homeCatalogMode === 'manga') card.dataset.readerUrl = resolved.readerUrl;
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
            ensureHomeCatalogFeedObserver();
        }

        export function openHomeCatalogFilters(root = document) {
            document.querySelector('#homeCatalogFilterDialog')?.remove();
            const initialGenres = catalogFilterGenres(homeCatalogItems);
            const dialog = document.createElement('div');
            dialog.id = 'homeCatalogFilterDialog';
            dialog.className = 'home-catalog-filter-dialog';
            const genreMarkup = genres => genres.length
                ? genres.map(genre => `<label><input type="checkbox" value="${escapeHtml(genre)}"${homeCatalogGenres.has(normalizeHoneyMatch(genre)) ? ' checked' : ''}><span>${escapeHtml(genre)}</span></label>`).join('')
                : `<small>Жанри для цього каталогу ще не надані джерелом.</small>`;
            const selected = (value, expected) => value === expected ? ' selected' : '';
            const modeFilterMarkup = homeCatalogMode === 'anime' ? `<label>Статус<select id="homeFilterStatus"><option value="all">Усі статуси</option><option value="ongoing"${selected(homeCatalogStatus, 'ongoing')}>Онґоїнг</option><option value="finished"${selected(homeCatalogStatus, 'finished')}>Завершені</option></select></label><label>Формат<select id="homeFilterType"><option value="all">Усі формати</option><option value="tv"${selected(homeCatalogType, 'tv')}>Серіал</option><option value="movie"${selected(homeCatalogType, 'movie')}>Фільм</option><option value="ova"${selected(homeCatalogType, 'ova')}>OVA / ONA</option></select></label><div class="home-catalog-filter-dialog__row"><label>Рік від<input id="homeFilterYearMin" type="number" min="1960" max="2030" value="${escapeHtml(homeCatalogYearMin)}" placeholder="від"></label><label>Рік до<input id="homeFilterYearMax" type="number" min="1960" max="2030" value="${escapeHtml(homeCatalogYearMax)}" placeholder="до"></label></div><label>Мінімальна оцінка<input id="homeFilterScoreMin" type="number" min="0" max="10" step="0.1" value="${escapeHtml(homeCatalogScoreMin)}" placeholder="0–10"></label>` : homeCatalogMode === 'manga' ? `<label>Доступність<select id="homeFilterAvailability"><option value="all">Усі тайтли</option><option value="available"${selected(homeCatalogAvailability, 'available')}>Є що читати</option></select></label><label>Вікова категорія<select id="homeFilterAge"><option value="all">Усі вікові категорії</option>${HOME_MANGA_AGE_OPTIONS.filter(x => x.key !== 'all').map(x => `<option value="${x.key}"${selected(homeCatalogAge, x.key)}>${x.label}</option>`).join('')}</select></label>` : '';
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
                // a late Hikka response could overwrite a freshly selected manga tab.
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

        function homeCatalogHasActiveFilters() {
            if (homeCatalogQuery) return true;
            if (homeCatalogGenre !== 'all' || homeCatalogAge !== 'all' || homeCatalogStatus !== 'all' || homeCatalogAvailability !== 'all') return true;
            if (homeCatalogMode === 'anime' && (homeCatalogType !== 'all' || homeCatalogYearMin || homeCatalogYearMax || homeCatalogScoreMin)) return true;
            // Сортування «за назвою» потребує повного перерендеру — сторінки приходять з сервера впорядковані за оцінкою/датою.
            if (homeCatalogSort === 'title') return true;
            return false;
        }

        // Ядро догрузки наступної порції каталогу (без залежності від кнопки «Продовжити»).
        async function loadHomeCatalogNextPage() {
            if (homeCatalogLoading) return 0;
            homeCatalogLoading = true;
            const before = homeCatalogItems.length;
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
                    return homeCatalogItems.length - before;
                }
                if (homeCatalogFilterResultItems) {
                    homeCatalogFilterResultOffset = Math.min(homeCatalogFilterResultOffset + 24, homeCatalogFilterResultItems.length);
                    homeCatalogItems = homeCatalogFilterResultItems.slice(0, homeCatalogFilterResultOffset);
                    homeCatalogAvailableTotal = homeCatalogItems.filter(item => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
                    homeCatalogHasMore = homeCatalogFilterResultOffset < homeCatalogFilterResultItems.length;
                    renderHomeCatalogGrid();
                    return homeCatalogItems.length - before;
                }
                const nextPage = homeCatalogPage + 1;
                const nextItems = await fetchHomeCatalogPage(nextPage);
                const existing = new Set(homeCatalogItems.map(item => item.url));
                const additions = nextItems.filter(item => item?.url && !existing.has(item.url));
                homeCatalogItems.push(...additions);
                homeCatalogPage = nextPage;
                if (homeCatalogMode === 'manga') homeCatalogAvailableTotal = homeCatalogItems.filter(item => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
                homeCatalogHasMore = nextItems.hasNextPage !== undefined
                    ? Boolean(nextItems.hasNextPage)
                    : homeCatalogMode === 'manga'
                        ? homeCatalogHasMore
                        : Boolean(nextItems.length) && (!homeCatalogTotal || homeCatalogItems.length < homeCatalogTotal);
                if (homeCatalogHasActiveFilters()) {
                    renderHomeCatalogGrid();
                } else {
                    appendHomeCatalogFeedCards(additions);
                }
                return additions.length;
            } finally {
                homeCatalogLoading = false;
            }
        }

        // Додаємо тільки нові картки замість перерендеру всієї сітки — так лєнта не лагає.
        function appendHomeCatalogFeedCards(newItems) {
            const grid = document.getElementById('homeCatalogGrid');
            if (!grid || !newItems.length) { syncHomeCatalogFeedUi(); return; }
            grid.insertAdjacentHTML('beforeend', newItems.map(homeCatalogCardHtml).join(''));
            bindHomeCatalogCards(grid);
            syncHomeCatalogFeedUi();
        }

        function syncHomeCatalogFeedUi() {
            const visibleCount = homeCatalogMode === 'manga'
                ? (homeCatalogFilterResultItems ? homeCatalogItems.length : filterMangaCatalogItems(homeCatalogItems).length)
                : getHomeCatalogVisibleItems().length;
            const text = homeCatalogCountText(visibleCount);
            document.getElementById('homeCatalogCount')?.replaceChildren(document.createTextNode(text));
            document.getElementById('homeCatalogResultsLabel')?.replaceChildren(document.createTextNode(text));
            const number = document.getElementById('homeCatalogResultNumber');
            if (number) number.textContent = formatHomeCatalogNumber(homeCatalogTotal || visibleCount);
            syncHomeCatalogPagination();
        }

        export function ensureHomeCatalogFeedObserver() {
            const sentinel = document.getElementById('homeCatalogFeedSentinel');
            if (!sentinel) return;
            if (homeCatalogFeedObserver) { homeCatalogFeedObserver.disconnect(); homeCatalogFeedObserver = null; }
            const reachedCap = homeCatalogItems.length >= HOME_CATALOG_FEED_MAX_ITEMS;
            sentinel.hidden = !homeCatalogHasMore || reachedCap;
            if (!homeCatalogHasMore || reachedCap || Date.now() < homeCatalogFeedCooldownUntil) return;
            if (typeof IntersectionObserver === 'undefined') return;
            homeCatalogFeedObserver = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) void loadHomeCatalogFeedBatch();
            }, { rootMargin: '900px 0px 0px 0px', threshold: 0 });
            homeCatalogFeedObserver.observe(sentinel);
        }

        export async function loadHomeCatalogFeedBatch() {
            if (homeCatalogFeedBusy || homeCatalogLoading || !homeCatalogHasMore) return;
            if (Router.currentRoute !== 'main') return;
            if (homeCatalogItems.length >= HOME_CATALOG_FEED_MAX_ITEMS) return;
            homeCatalogFeedBusy = true;
            const loader = document.getElementById('homeCatalogFeedLoader');
            if (loader) loader.hidden = false;
            try {
                await loadHomeCatalogNextPage();
                homeCatalogFeedCooldownUntil = 0;
            } catch (error) {
                // Пауза перед автоповтором, щоб сезонна помилка мережі не зациклилась.
                homeCatalogFeedCooldownUntil = Date.now() + 4000;
                showToast('Не вдалося завантажити ще аніме');
            } finally {
                homeCatalogFeedBusy = false;
                if (loader) loader.hidden = true;
                ensureHomeCatalogFeedObserver();
                if (homeCatalogFeedCooldownUntil && Date.now() < homeCatalogFeedCooldownUntil) {
                    setTimeout(ensureHomeCatalogFeedObserver, 4200);
                }
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
            // Do not carry the previous anime page total (usually 24) into manga.
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
            // The home catalog is intentionally continuation-free for anime
            // and manga. Remove any stale button from older cached markup.
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
            // keeps the Honey Manga tab usable even when Hikka's
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
                const poster = cardPoster(a);
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

        export function buildPopularVerticalCardsHtml(items, indexOffset = 0) {
            return items.map((a, idx) => {
                const index = indexOffset + idx;
                const poster = cardPoster(a);
                const delay = indexOffset > 0 ? 0 : idx * 0.03;
                const title = a.title || 'Без назви';
                const synopsis = (a.synopsis || '').trim();
                const description = synopsis
                    ? synopsis.length > 130 ? `${synopsis.slice(0, 130)}…` : synopsis
                    : 'Опис відсутній.';
                return `
                    <div class="popular-card" data-url="${a.url}" data-idx="${index}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${delay}s">
                      <div class="popular-card__poster-wrap">
                        <div class="popular-card__poster">
                          <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add(\'img--loaded\')" onerror="this.src=\'${ANIME_CARD_PLACEHOLDER}\'">
                        </div>
                      </div>
                      <div class="popular-card__title">${title}</div>
                      <div class="popular-card__desc">${description}</div>
                      <div class="popular-card__episodes" aria-label="Кількість серій">${homeRecommendationEpisodesMap.get(a.url) || 'Серій: …'}</div>
                    </div>
                  `;
            }).join('');
        }

        // Легкі постери для карток: medium достатньо для розмірів картки і в ~5 разів легший за large.
        function cardPoster(a, fallback = ANIME_CARD_PLACEHOLDER) {
            return a?.images?.jpg?.medium_image_url || a?.images?.jpg?.large_image_url || fallback;
        }

        export function buildPopularVerticalSectionHtml(items) {
            if (!items || items.length === 0) return '';
            const cardsHtml = buildPopularVerticalCardsHtml(items);
            return `
                    <div class="genre-section" id="genre-popular">
                      <div class="popular-list popular-list--home">
                        ${cardsHtml}
                      </div>
                    </div>
                  `;
        }

        export let homeRecommendationItems = [];
        export let homeRecommendationPage = 1;
        export let homeRecommendationHasMore = false;
        export let homeRecommendationLoading = false;
        export let homeRecommendationScrollBound = false;
        export let homeRecommendationRequestId = 0;
        export let homeRecommendationFilterParams = null;
        export let homeRecommendationSearchQuery = '';
        let homeRecommendationObserver = null;

        export function setHomeRecommendationFilter(params = null) {
            homeRecommendationFilterParams = params
                ? { ...params, genres: Array.isArray(params.genres) ? [...params.genres] : [] }
                : null;
        }

        // Пошук просто в блоці рекомендацій на головній (без переходу на
        // окрему сторінку пошуку) — вводиш назву в мердж-барі і одразу
        // бачиш відповідні тайтли у тому ж круглому блоці карток.
        export function setHomeRecommendationSearchQuery(query = '') {
            homeRecommendationSearchQuery = String(query || '').trim();
        }

        function homeRecommendationTitle() {
            const params = homeRecommendationFilterParams;
            if (!params) return 'Обрано для тебе';
            const genreNames = (params.genres || [])
                .map(slug => Object.entries(GENRE_MAP).find(([, value]) => value === slug)?.[0])
                .filter(Boolean);
            if (genreNames.length) return `Аніме · ${genreNames.join(', ')}`;
            if (params.status === 'ongoing') return 'Онґоїнг · аніме';
            if (params.yearMin && params.yearMax) return `Аніме · ${params.yearMin}–${params.yearMax}`;
            return 'Аніме за фільтрами';
        }

        export function handleHomeRecommendationScroll() {
            if (!homeRecommendationHasMore || homeRecommendationLoading) return;
            const remaining = document.documentElement.scrollHeight - (getPageScrollY() + window.innerHeight);
            if (remaining < Math.max(700, window.innerHeight * 1.25)) void loadMoreHomeRecommendations();
        }

        function ensureHomeRecommendationObserver() {
            const container = document.getElementById('homeRecommendationsContainer');
            if (!container) return;
            let sentinel = container.querySelector('#homeRecommendationFeedSentinel');
            if (!sentinel) {
                sentinel = document.createElement('div');
                sentinel.id = 'homeRecommendationFeedSentinel';
                sentinel.className = 'home-recommendation-feed-sentinel';
                sentinel.innerHTML = '<span class="home-recommendation-feed-loader" hidden><i class="fas fa-spinner fa-pulse"></i> Завантажуємо ще...</span>';
                container.append(sentinel);
            }
            sentinel.hidden = !homeRecommendationHasMore;
            homeRecommendationObserver?.disconnect();
            if (sentinel.hidden || typeof IntersectionObserver === 'undefined') return;
            homeRecommendationObserver = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) void loadMoreHomeRecommendations();
            }, { rootMargin: '1000px 0px 0px 0px', threshold: 0 });
            homeRecommendationObserver.observe(sentinel);
        }

        export function bindHomeRecommendationCards(cards) {
            cards.forEach(card => {
                if (card.dataset.bound === '1') return;
                card.dataset.bound = '1';
                card.addEventListener('click', () => openPlayerPage(card.dataset.url));
                card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPlayerPage(card.dataset.url); } });
            });
        }

        // ====================================================================
        //  ЛЄНТА РЕКОМЕНДАЦІЙ (мобільна вертикальна + десктопна сітка)
        //  Раніше тут була "віртуалізація" з видаленням карток за межами
        //  viewport і компенсацією скролу spacer'ом — вона тричі підряд
        //  ламалась (постери зникали, скрол "борюкався" з користувачем при
        //  гортанні вгору) через неминучі похибки в розрахунку висоти щойно
        //  вставлених карток. Картки НЕ видаляються з DOM: перф вже
        //  забезпечує CSS `content-visibility: auto` на .popular-card
        //  (браузер сам не рахує layout/paint для карток поза екраном) —
        //  цього достатньо і без ризикованої ручної компенсації скролу.
        //  Єдина робота, що лишається тут — підвантажувати кількість серій
        //  для карток біля viewport.
        // ====================================================================
        let recyclerRafPending = false;
        let recyclerScrollBound = false;
        const homeRecommendationEpisodesMap = new Map();

        function homeFeedList() {
            return document.querySelector('#homeRecommendationsContainer .popular-list--home');
        }

        const homeEpisodesInFlight = new Set();
        let homeEpisodesLastRun = 0;

        // Підгружаємо кількість серій лише для карток, які реально у/біля
        // viewport (раніше вантажились тільки перші 8, решта назавжди
        // лишались «Серій: …»). Кеш у homeRecommendationEpisodesMap, тому
        // повторна поява картки (напр. після ре-фільтрації) показує серії одразу.
        function hydrateHomeFeedEpisodes(list) {
            if (!list) return;
            const viewTop = getPageScrollY();
            const viewBottom = viewTop + window.innerHeight;
            let queued = 0;
            for (const card of list.querySelectorAll(':scope > .popular-card')) {
                const epEl = card.querySelector('.popular-card__episodes');
                if (!epEl) continue;
                const url = card.dataset.url;
                const cached = url && homeRecommendationEpisodesMap.get(url);
                if (cached) {
                    if (epEl.textContent !== cached) epEl.textContent = cached;
                    continue;
                }
                if (!url || homeEpisodesInFlight.has(url)) continue;
                if (epEl.textContent && !epEl.textContent.includes('…')) continue;
                const rect = card.getBoundingClientRect();
                const cardTopDoc = rect.top + viewTop;
                if (cardTopDoc > viewBottom + 400 || cardTopDoc + rect.height < viewTop - 200) continue;
                homeEpisodesInFlight.add(url);
                queued++;
                fetchAnimeLite(url)
                    .then(detail => {
                        homeRecommendationEpisodesMap.set(url, detail?.episodes != null ? `Серій: ${detail.episodes}` : 'Серій: –');
                    })
                    .catch(() => { homeRecommendationEpisodesMap.set(url, 'Серій: –'); })
                    .finally(() => {
                        homeEpisodesInFlight.delete(url);
                        const text = homeRecommendationEpisodesMap.get(url) || 'Серій: –';
                        list.querySelectorAll(`.popular-card[data-url="${CSS.escape(url)}"] .popular-card__episodes`).forEach(el => { el.textContent = text; });
                    });
                if (queued >= 6) break;
            }
        }

        export function resetHomeFeedRecycler() {
            homeEpisodesLastRun = 0;
        }

        export function syncHomeFeedWindow() {
            if (Router.currentRoute !== 'main') return;
            const list = homeFeedList();
            if (!list) return;
            const now = Date.now();
            if (now - homeEpisodesLastRun > 300) {
                homeEpisodesLastRun = now;
                hydrateHomeFeedEpisodes(list);
            }
        }

        function scheduleHomeFeedSync() {
            if (recyclerRafPending) return;
            recyclerRafPending = true;
            requestAnimationFrame(() => { recyclerRafPending = false; syncHomeFeedWindow(); });
        }

        export function bindHomeFeedRecycler() {
            if (recyclerScrollBound) return;
            recyclerScrollBound = true;
            window.addEventListener('scroll', scheduleHomeFeedSync, { passive: true });
            window.addEventListener('resize', scheduleHomeFeedSync, { passive: true });
        }

        export async function loadHomeRecommendations(options = {}) {
            const container = document.getElementById('homeRecommendationsContainer');
            const forceReload = options?.reload === true;
            if (!container || (homeRecommendationLoading && !forceReload)) return;
            const requestId = ++homeRecommendationRequestId;
            homeRecommendationLoading = true;
            container.dataset.loading = 'true';
            container.innerHTML = '<div class="loader home-recommendations-loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження рекомендацій...</div>';
            try {
                const items = homeRecommendationSearchQuery
                    ? await searchHikka(homeRecommendationSearchQuery, 1)
                    : homeRecommendationFilterParams
                        ? await fetchHikkaQuickFilter(1, homeRecommendationFilterParams)
                        : await hikkaCatalog('anime', 1, { sort: ['score:desc', 'scored_by:desc'], only_translated: true });
                if (requestId !== homeRecommendationRequestId || Router.currentRoute !== 'main') return;
                if (!items?.length) throw new Error('Порожній список рекомендацій');
                homeRecommendationItems = [...items];
                homeRecommendationPage = 1;
                homeRecommendationHasMore = items.hasNextPage !== false && items.length > 0;
                container.innerHTML = buildPopularVerticalSectionHtml(homeRecommendationItems);
                container.style.display = 'block';
                bindHomeRecommendationCards([...container.querySelectorAll('.popular-card')]);
                resetHomeFeedRecycler();
                syncHomeFeedWindow();
                bindHomeFeedRecycler();
                ensureHomeRecommendationObserver();
                loadHomeRecommendationDetails(items, 0, requestId);
                container.querySelector('#homePopularShowAllBtn')?.addEventListener('click', () => { window.location.hash = 'catalog'; });
                // IntersectionObserver covers modern browsers without a per-scroll
                // layout read. Keep the legacy scroll fallback only where needed.
                if (!homeRecommendationScrollBound && typeof IntersectionObserver === 'undefined') {
                    window.addEventListener('scroll', handleHomeRecommendationScroll, { passive: true });
                    homeRecommendationScrollBound = true;
                }
            } catch (error) {
                if (requestId !== homeRecommendationRequestId || Router.currentRoute !== 'main') return;
                console.warn('[home recommendations] failed:', error);
                container.innerHTML = homeRecommendationSearchQuery
                    ? `<div class="home-recommendations-empty">За запитом «${escapeHtml(homeRecommendationSearchQuery)}» нічого не знайдено.</div>`
                    : homeRecommendationFilterParams
                        ? '<div class="home-recommendations-empty">За цим фільтром нічого не знайдено.</div>'
                        : '<div class="home-recommendations-empty">Рекомендації тимчасово недоступні.</div>';
            } finally {
                if (requestId !== homeRecommendationRequestId) return;
                homeRecommendationLoading = false;
                container.dataset.loading = 'false';
            }
        }

        export async function loadMoreHomeRecommendations() {
            const container = document.getElementById('homeRecommendationsContainer');
            if (!container || homeRecommendationLoading || !homeRecommendationHasMore) return;
            homeRecommendationLoading = true;
            const sentinel = container.querySelector('#homeRecommendationFeedSentinel');
            const loader = sentinel?.querySelector('.home-recommendation-feed-loader');
            if (loader) loader.hidden = false;
            try {
                const nextPage = homeRecommendationPage + 1;
                const nextItems = homeRecommendationSearchQuery
                    ? await searchHikka(homeRecommendationSearchQuery, nextPage)
                    : homeRecommendationFilterParams
                        ? await fetchHikkaQuickFilter(nextPage, homeRecommendationFilterParams)
                        : await hikkaCatalog('anime', nextPage, { sort: ['score:desc', 'scored_by:desc'], only_translated: true });
                const existing = new Set(homeRecommendationItems.map(item => item.url));
                const uniqueItems = nextItems.filter(item => item?.url && !existing.has(item.url));
                const offset = homeRecommendationItems.length;
                homeRecommendationItems.push(...uniqueItems);
                homeRecommendationPage = nextPage;
                homeRecommendationHasMore = nextItems.hasNextPage !== false && uniqueItems.length > 0;
                const list = container.querySelector('.popular-list--home');
                if (list) list.insertAdjacentHTML('beforeend', buildPopularVerticalCardsHtml(uniqueItems, offset));
                bindHomeRecommendationCards([...container.querySelectorAll('.popular-card')]);
                loadHomeRecommendationDetails(uniqueItems, offset, homeRecommendationRequestId);
                requestAnimationFrame(() => { scheduleHomeFeedSync(); handleHomeRecommendationScroll(); });
            } catch (error) {
                console.warn('[home recommendations more] failed:', error);
            } finally {
                homeRecommendationLoading = false;
                if (loader) loader.hidden = true;
                ensureHomeRecommendationObserver();
            }
        }

        export async function loadHomeRecommendationDetails(list, indexOffset = 0, requestId = homeRecommendationRequestId) {
            const container = document.getElementById('homeRecommendationsContainer');
            // Episode counts are secondary metadata. Hydrate only the first viewport-ish
            // batch so opening the homepage does not create one API request per card.
            const detailItems = list.slice(0, 8);
            let cursor = 0;
            async function worker() {
                while (cursor < detailItems.length) {
                    if (requestId !== homeRecommendationRequestId || Router.currentRoute !== 'main') return;
                    const index = cursor++;
                    const card = container?.querySelector(`.popular-card[data-idx="${indexOffset + index}"]`);
                    if (!card) continue;
                    const episodes = card.querySelector('.popular-card__episodes');
                    try {
                        const detail = await fetchAnimeLite(detailItems[index].url);
                        if (requestId !== homeRecommendationRequestId || Router.currentRoute !== 'main') return;
                        const epText = detail?.episodes != null ? `Серій: ${detail.episodes}` : 'Серій: –';
                        homeRecommendationEpisodesMap.set(detailItems[index].url, epText);
                        if (episodes) episodes.textContent = epText;
                    } catch (error) {
                        if (requestId !== homeRecommendationRequestId || Router.currentRoute !== 'main') return;
                        homeRecommendationEpisodesMap.set(detailItems[index].url, 'Серій: –');
                        if (episodes) episodes.textContent = 'Серій: –';
                    }
                }
            }
            await Promise.all(Array.from({ length: Math.min(2, detailItems.length) }, worker));
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
        export {
            searchPageState,
            renderSearchPage,
            performSearchPage
        } from '../search/searchPage.js';


        export {
            renderAuthPage,
            renderHistoryPanel,
            renderBookmarksPanel,
            profileEditNick,
            profileEditBio,
            initProfileFileInputs
        } from '../profile/profileModals.js';

        export {
            uploadToCloudinary,
            isGifUrl,
            applyGifClass,
            uploadRawToCloudinary,
            convertLargeGifToVideo,
            uploadGifToCloudinary,
            uploadVideoToCloudinary,
            isVideoFile,
            isVideoUrl,
            profileMediaTransformStyle,
            profileMediaMarkup,
            uploadBlobToCloudinary,
            _imgeditClamp,
            openImageEditor,
            editExistingProfileImage,
            editExistingProfileVideo,
            compressImage,
            removeFlatStickerBackground,
            stickerBackgroundRemoverPromise,
            removeStickerBackground
        } from '../../utils/mediaUpload.js';

        // ====================================================================
        //  СТОРІНКА ЖАНРУ
        // ====================================================================
        export { genrePageState, renderGenrePage } from '../genre/genrePage.js';
