function withHomeCatalogTimeout(promise, timeoutMs = HOME_CATALOG_ANIME_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Hikka catalog timeout"));
    }, timeoutMs);
    Promise.resolve(promise).then((value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }, (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}
async function fetchHomeCatalogPageSafe(page = 1) {
  const request = fetchHomeCatalogPage(page);
  return homeCatalogMode === "anime" ? withHomeCatalogTimeout(request) : request;
}
function getPageScrollY() {
  return Math.max(
    window.scrollY || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0
  );
}
function scrollPageBy(dy) {
  if (!dy) return;
  const doc2 = document.scrollingElement || document.documentElement;
  const prevBehavior = doc2.style.scrollBehavior;
  doc2.style.scrollBehavior = "auto";
  try {
    doc2.scrollTop = (doc2.scrollTop || 0) + dy;
    if (doc2 === document.documentElement && document.body && document.body.scrollHeight > document.body.clientHeight + 1) {
      document.body.scrollTop = (document.body.scrollTop || 0) + dy;
    }
  } finally {
    doc2.style.scrollBehavior = prevBehavior;
  }
}
async function fetchContent() {
  if (currentTab === "top100") {
    return await fetchHikkaTop100();
  }
  if (currentSearchQuery) {
    return await searchHikka(currentSearchQuery, currentPage);
  }
  if (quickFilterParams) {
    const { fetchHikkaQuickFilter: fetchHikkaQuickFilter2 } = await Promise.resolve().then(() => (init_catalog(), catalog_exports));
    return await fetchHikkaQuickFilter2(currentPage, quickFilterParams);
  }
  if (currentCategory) {
    return await fetchHikkaByCategory(currentCategory, currentPage);
  }
  return await fetchHikkaMain(currentPage);
}
function showSkeleton() {
  const container = document.getElementById("animeContainer");
  if (!container) return;
  if (currentTab === "top100") {
    container.classList.add("popular-list");
    container.classList.remove("anime-grid");
    container.style.display = "";
    container.innerHTML = renderPopularCardSkeleton(6);
    return;
  }
  container.classList.remove("popular-list");
  container.classList.add("anime-grid");
  container.style.display = "grid";
  container.innerHTML = renderAnimeCardSkeleton(8);
}
async function loadContent() {
  const container = document.getElementById("animeContainer");
  if (!container) return;
  if (Router.currentRoute !== "main") return;
  document.getElementById("genreSectionsContainer").style.display = "none";
  document.getElementById("animeContainer").style.display = "grid";
  document.getElementById("profilePageContainer").classList.remove("active");
  document.getElementById("profilePageContainer").style.display = "none";
  document.getElementById("genrePageContainer").classList.remove("active");
  document.getElementById("genrePageContainer").style.display = "none";
  document.getElementById("searchPageContainer").classList.remove("active");
  document.getElementById("searchPageContainer").style.display = "none";
  document.getElementById("settingsPageContainer").classList.remove("active");
  document.getElementById("settingsPageContainer").style.display = "none";
  if (currentTab === "main" && !currentSearchQuery && !currentCategory && !quickFilterParams) {
    homeFeedItems = [];
    homeFeedPage = 1;
    homeFeedHasMore = true;
    homeFeedRetryAt = 0;
    ++homeFeedRequestId;
    homeFeedObserver?.disconnect();
    homeFeedObserver = null;
    document.getElementById("homeAnimeFeedSentinel")?.remove();
    resetAnimeGridWindow();
  }
  showSkeleton();
  try {
    const list = await fetchContent();
    renderCards(list);
  } catch (err) {
    container.innerHTML = `<div class="loader"><i class="fas fa-exclamation-triangle"></i> \u041F\u043E\u043C\u0438\u043B\u043A\u0430: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadContent()">\u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438 \u0437\u043D\u043E\u0432\u0443</button></div>`;
  }
}
function renderPopularCards(list) {
  const container = document.getElementById("animeContainer");
  container.classList.add("popular-list");
  container.classList.remove("anime-grid");
  container.style.display = "";
  const gen = ++popularRenderGen;
  container.innerHTML = list.map((a, idx) => {
    const poster = cardPoster(a, "");
    const title = a.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
    const shortSynopsis = (a.synopsis || "").trim();
    const descHtml = shortSynopsis ? `<div class="popular-card__desc">${escapeHtml2(shortSynopsis.length > 130 ? shortSynopsis.slice(0, 130) + "\u2026" : shortSynopsis)}</div>` : `<div class="popular-card__desc popular-card__desc--empty"></div>`;
    return `
            <div class="popular-card" data-url="${a.url}" data-idx="${idx}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${idx * 0.03}s">
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
  }).join("");
  container.querySelectorAll(".popular-card").forEach((card) => {
    card.addEventListener("click", () => openPlayerPage(card.dataset.url));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") openPlayerPage(card.dataset.url);
    });
  });
  renderPagination();
  loadPopularCardDetails(list, gen);
}
async function loadPopularCardDetails(list, gen) {
  const container = document.getElementById("animeContainer");
  const CONCURRENCY = 4;
  let cursor = 0;
  async function worker() {
    while (cursor < list.length) {
      const i = cursor++;
      const item = list[i];
      if (gen !== popularRenderGen) return;
      const card = container?.querySelector(`.popular-card[data-idx="${i}"]`);
      if (!card) continue;
      const badge = card.querySelector(".popular-card__rank");
      const descEl = card.querySelector(".popular-card__desc");
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 9e3));
        const detail = await Promise.race([fetchAnimeLite(item.url), timeoutPromise]);
        if (gen !== popularRenderGen) return;
        if (badge) {
          badge.classList.remove("popular-card__rank--loading");
          badge.textContent = detail.episodes != null ? detail.episodes : "\u2013";
        }
        if (descEl && detail.synopsis) {
          descEl.classList.remove("popular-card__desc--empty");
          descEl.textContent = detail.synopsis.length > 130 ? detail.synopsis.slice(0, 130) + "\u2026" : detail.synopsis;
        } else if (descEl && !descEl.textContent.trim()) {
          descEl.textContent = "\u041E\u043F\u0438\u0441 \u0432\u0456\u0434\u0441\u0443\u0442\u043D\u0456\u0439.";
        }
      } catch (e) {
        if (gen !== popularRenderGen) return;
        if (badge) {
          badge.classList.remove("popular-card__rank--loading");
          badge.textContent = "\u2013";
        }
        if (descEl && !descEl.textContent.trim()) {
          descEl.textContent = "\u041E\u043F\u0438\u0441 \u0432\u0456\u0434\u0441\u0443\u0442\u043D\u0456\u0439.";
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, worker));
}
function registerAnimeCardData(list) {
  (list || []).forEach((a) => {
    if (a && a.url) animeCardDataMap.set(a.url, a);
  });
}
function queueTmdbEnrich(card) {
  if (!card || card.dataset.tmdbEnriched) return;
  card.dataset.tmdbEnriched = "pending";
  tmdbEnrichQueue.push(card);
  pumpTmdbEnrichQueue();
}
function pumpTmdbEnrichQueue() {
  while (tmdbEnrichActive < TMDB_ENRICH_CONCURRENCY && tmdbEnrichQueue.length) {
    const card = tmdbEnrichQueue.shift();
    tmdbEnrichActive++;
    runTmdbEnrichJob(card).finally(() => {
      tmdbEnrichActive--;
      pumpTmdbEnrichQueue();
    });
  }
}
async function runTmdbEnrichJob(card) {
  const item = animeCardDataMap.get(card.dataset.url);
  if (!item) {
    card.dataset.tmdbEnriched = "failed";
    return;
  }
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 6e3));
    const info = await Promise.race([fetchTmdbCardInfo(item), timeoutPromise]);
    if (!document.body.contains(card)) return;
    const image = card.querySelector("img");
    const verifiedImage = card.classList.contains("wide-card") ? info?.frame || info?.poster : info?.poster;
    if (image && verifiedImage) {
      image.src = verifiedImage;
      image.dataset.tmdbArtwork = "true";
      image.classList.add("img--loaded");
    }
    const typeBadge = card.querySelector('[data-role="type"]');
    if (typeBadge && item.typeLabel) {
      typeBadge.textContent = item.typeLabel;
      typeBadge.hidden = false;
    }
    card.dataset.tmdbType = info?.type || "";
    card.dataset.tmdbEnriched = "done";
  } catch (e) {
    console.error("TMDB card enrichment failed", { url: card?.dataset?.url, error: e });
    card.dataset.tmdbEnriched = "failed";
  }
}
function getAnimeCardObserver() {
  if (animeCardObserver) return animeCardObserver;
  animeCardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animeCardObserver.unobserve(entry.target);
      queueTmdbEnrich(entry.target);
    });
  }, { root: null, rootMargin: "250px", threshold: 0.01 });
  return animeCardObserver;
}
function observeAnimeCardsForTmdb(container) {
  if (!container || Router.currentRoute !== "main" || typeof IntersectionObserver === "undefined") return;
  const observer = getAnimeCardObserver();
  container.querySelectorAll(".anime-card, .wide-card").forEach((card) => observer.observe(card));
}
function animeFeedCardHtml(a, idx) {
  const poster = escapeHtml2(cardPoster(a, ""));
  const title = escapeHtml2(a.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438");
  const type = escapeHtml2(a.typeLabel || animeTypeLabel(a.type));
  return `<div class="anime-card" data-url="${escapeHtml2(a.url || "")}" data-idx="${idx || 0}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${(idx || 0) * 0.03}s">
              <div class="anime-poster"><img src="${poster}" alt="${title}" loading="lazy" decoding="async" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.onerror=null;this.src='${ANIME_CARD_PLACEHOLDER}'"><span class="anime-card-type" data-role="type">${type}</span></div>
              <div class="anime-title-under">${title}</div>
            </div>`;
}
function animeGridColumns(container) {
  const cols = window.getComputedStyle(container).gridTemplateColumns.split(" ").filter(Boolean).length;
  return Math.max(1, cols || 2);
}
function ensureAnimeGridSpacer(container) {
  let spacer = container.querySelector(":scope > .anime-grid-spacer");
  if (!spacer) {
    spacer = document.createElement("div");
    spacer.className = "anime-grid-spacer";
    spacer.style.gridColumn = "1 / -1";
    spacer.style.height = "0px";
    container.prepend(spacer);
  }
  return spacer;
}
function observeAnimeGridSpacer(container, spacer) {
  if (typeof IntersectionObserver === "undefined") return;
  animeGridSpacerObserver?.disconnect();
  animeGridSpacerObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) restoreAnimeGridAbove(container);
  }, { rootMargin: "600px 0px 0px 0px", threshold: 0 });
  animeGridSpacerObserver.observe(spacer);
}
function resetAnimeGridWindow() {
  animeGridSpacerObserver?.disconnect();
  animeGridSpacerObserver = null;
}
function trimAnimeGridAbove(container) {
  if (!container || !container.classList.contains("anime-grid")) return;
  const cols = animeGridColumns(container);
  const cards = [...container.querySelectorAll(":scope > .anime-card[data-idx]")];
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
  const spacer = container.querySelector(":scope > .anime-grid-spacer");
  if (!spacer) return;
  const spacerH = parseFloat(spacer.style.height) || 0;
  if (spacerH <= 0) return;
  const cols = animeGridColumns(container);
  const cards = [...container.querySelectorAll(":scope > .anime-card[data-idx]")];
  const renderedFirst = cards.length ? Number(cards[0].dataset.idx) : homeFeedItems.length;
  const restoreCount = Math.min(renderedFirst, ANIME_GRID_RESTORE_ROWS * cols);
  if (restoreCount <= 0) return;
  const restoreFromIdx = renderedFirst - restoreCount;
  const insertItems = homeFeedItems.slice(restoreFromIdx, renderedFirst);
  if (!insertItems.length) return;
  const beforeTop = spacer.getBoundingClientRect().top;
  const html = insertItems.map((item, i) => animeFeedCardHtml(item, restoreFromIdx + i)).join("");
  spacer.insertAdjacentHTML("afterend", html);
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
  root?.querySelectorAll(".anime-card:not([data-feed-bound])").forEach((card) => {
    card.dataset.feedBound = "1";
    card.addEventListener("click", () => openPlayerPage(card.dataset.url));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPlayerPage(card.dataset.url);
      }
    });
  });
}
function ensureAnimeFeedObserver() {
  const container = document.getElementById("animeContainer");
  if (!container || currentTab !== "main" || currentSearchQuery || currentCategory || quickFilterParams) return;
  let sentinel = document.getElementById("homeAnimeFeedSentinel");
  if (!sentinel) {
    sentinel = document.createElement("div");
    sentinel.id = "homeAnimeFeedSentinel";
    sentinel.className = "home-anime-feed-sentinel";
    sentinel.innerHTML = '<span class="home-anime-feed-loader" hidden><i class="fas fa-spinner fa-pulse"></i> \u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0443\u0454\u043C\u043E \u0449\u0435...</span>';
    container.after(sentinel);
  }
  sentinel.hidden = !homeFeedHasMore || homeFeedItems.length >= HOME_FEED_MAX_ITEMS;
  if (homeFeedObserver) homeFeedObserver.disconnect();
  if (sentinel.hidden || typeof IntersectionObserver === "undefined") return;
  homeFeedObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) void loadMoreHomeAnime();
  }, { rootMargin: "900px 0px", threshold: 0 });
  homeFeedObserver.observe(sentinel);
}
async function loadMoreHomeAnime() {
  if (homeFeedLoading || !homeFeedHasMore || Date.now() < homeFeedRetryAt || homeFeedItems.length >= HOME_FEED_MAX_ITEMS) return;
  if (Router.currentRoute !== "main" || currentTab !== "main" || currentSearchQuery || currentCategory || quickFilterParams) return;
  const requestId = homeFeedRequestId;
  const container = document.getElementById("animeContainer");
  const sentinel = document.getElementById("homeAnimeFeedSentinel");
  const loader = sentinel?.querySelector(".home-anime-feed-loader");
  homeFeedLoading = true;
  if (loader) loader.hidden = false;
  try {
    const nextPage = homeFeedPage + 1;
    const nextItems = await withHomeCatalogTimeout(fetchHikkaMain(nextPage), HOME_CATALOG_ANIME_TIMEOUT_MS);
    if (requestId !== homeFeedRequestId || Router.currentRoute !== "main") return;
    const existing = new Set(homeFeedItems.map((item) => item.url));
    const additions = nextItems.filter((item) => item?.url && !existing.has(item.url));
    if (!additions.length) homeFeedHasMore = false;
    homeFeedItems.push(...additions);
    homeFeedPage = nextPage;
    homeFeedHasMore = homeFeedHasMore && nextItems.hasNextPage !== false && nextItems.length > 0;
    registerAnimeCardData(additions);
    if (container && additions.length) {
      container.insertAdjacentHTML("beforeend", additions.map((item, index) => animeFeedCardHtml(item, homeFeedItems.length - additions.length + index)).join(""));
      bindAnimeFeedCards(container);
      observeAnimeCardsForTmdb(container);
      trimAnimeGridAbove(container);
    }
  } catch (error) {
    homeFeedRetryAt = Date.now() + 5e3;
    console.warn("Homepage infinite scroll failed:", error);
  } finally {
    homeFeedLoading = false;
    if (loader) loader.hidden = true;
    ensureAnimeFeedObserver();
  }
}
function renderCards(list) {
  const container = document.getElementById("animeContainer");
  if (!container) return;
  if (!list.length) {
    container.classList.remove("popular-list");
    container.classList.add("anime-grid");
    container.style.display = "grid";
    container.innerHTML = `
              <div class="loader" style="grid-column:1/-1;text-align:center;">
                <i class="fas fa-search" style="font-size:2.5rem;display:block;margin-bottom:0.8rem;color:var(--text-muted);"></i>
                <p style="font-size:1rem;margin-bottom:0.5rem;">\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E</p>
                <p style="font-size:0.8rem;color:var(--text-muted);">\u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0437\u043C\u0456\u043D\u0438\u0442\u0438 \u043F\u043E\u0448\u0443\u043A\u043E\u0432\u0438\u0439 \u0437\u0430\u043F\u0438\u0442 \u0430\u0431\u043E \u0444\u0456\u043B\u044C\u0442\u0440\u0438</p>
              </div>`;
    document.getElementById("paginationRow").innerHTML = "";
    return;
  }
  if (currentTab === "top100") {
    renderPopularCards(list);
    return;
  }
  container.classList.remove("popular-list");
  container.classList.add("anime-grid");
  container.style.display = "grid";
  registerAnimeCardData(list);
  container.innerHTML = list.map(animeFeedCardHtml).join("");
  bindAnimeFeedCards(container);
  renderPagination();
  if (currentTab === "main" && !currentSearchQuery && !currentCategory && !quickFilterParams) {
    homeFeedItems = [...list];
    homeFeedPage = currentPage;
    homeFeedHasMore = list.hasNextPage !== false && list.length > 0;
    document.getElementById("paginationRow")?.replaceChildren();
    ensureAnimeFeedObserver();
  }
  observeAnimeCardsForTmdb(container);
}
function renderPagination() {
  const row = document.getElementById("paginationRow");
  if (!row) return;
  const prevDisabled = currentPage <= 1 ? "disabled" : "";
  row.innerHTML = `
            <button class="btn-outline" onclick="changePage(${currentPage - 1})" ${prevDisabled}><i class="fas fa-chevron-left"></i> \u041D\u0430\u0437\u0430\u0434</button>
            <span class="page-indicator">\u0421\u0442\u043E\u0440\u0456\u043D\u043A\u0430 ${currentPage}</span>
            <button class="btn-outline" onclick="changePage(${currentPage + 1})">\u0412\u043F\u0435\u0440\u0435\u0434 <i class="fas fa-chevron-right"></i></button>
          `;
}
function showTop100() {
  currentTab = "top100";
  currentPage = 1;
  currentSearchQuery = "";
  currentCategory = "";
  document.querySelectorAll(".action-pill").forEach((p) => p.classList.remove("active-pill"));
  document.getElementById("top100Btn")?.classList.add("active-pill");
  if (Router.currentRoute === "main") loadContent();
  syncLeftdockActive();
  showToast("\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u0456 \u0430\u043D\u0456\u043C\u0435");
}
function openRandomAnime() {
  fetchHikkaTop100().then((list) => list[0] && openPlayerPage(list[0].url)).catch(() => showToast("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u043A\u0430\u0442\u0430\u043B\u043E\u0433"));
  showToast("\u0412\u0438\u043F\u0430\u0434\u043A\u043E\u0432\u0435 \u0430\u043D\u0456\u043C\u0435");
}
async function preloadHomepageTmdbGroups(groups, limit2 = 6) {
  const visible = groups.flatMap((group) => (group || []).slice(0, limit2));
  let cursor = 0;
  const worker = async () => {
    while (cursor < visible.length) {
      const item = visible[cursor++];
      try {
        const info = await fetchTmdbCardInfo(item);
        if (info?.type) item.tmdbType = info.type;
      } catch (e) {
        console.error("Homepage TMDB preload failed", { title: item?.title, error: e });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, visible.length) }, worker));
}
function homeCatalogRequestBody() {
  const body = {};
  if (homeCatalogMode === "anime") body.only_translated = true;
  if (homeCatalogQuery) body.query = homeCatalogQuery;
  if (homeCatalogSort === "score" || homeCatalogSort === "rating") body.sort = ["score:desc", "scored_by:desc"];
  else if (homeCatalogSort === "newest" || homeCatalogSort === "year") body.sort = ["start_date:desc"];
  else if (homeCatalogSort === "title" || homeCatalogSort === "alpha") body.sort = ["title_ua:asc"];
  if (homeCatalogMode === "anime" && homeCatalogType && homeCatalogType !== "all") {
    body.media_type = [homeCatalogType];
  }
  if (homeCatalogMode === "anime") {
    if (homeCatalogGenres.size > 0) {
      body.genres = [...homeCatalogGenres].map((slugOrName) => {
        const found = Object.entries(GENRE_MAP2).find(([name, slug]) => slug === slugOrName || normalizeHoneyMatch(name) === slugOrName);
        return found ? found[1] : slugOrName;
      });
    } else if (homeCatalogGenre !== "all") {
      const genreSlug = String(homeCatalogGenre || "").trim();
      if (genreSlug.startsWith("format:")) body.media_type = [genreSlug.slice(7)];
      else if (genreSlug) body.genres = [genreSlug];
    }
  }
  if (homeCatalogMode === "anime" && homeCatalogAge !== "all") {
    body.rating = homeCatalogAge === "adult" ? ["rx", "r_plus"] : homeCatalogAge === "teen" ? ["r", "pg_13"] : ["g", "pg"];
  }
  return body;
}
function honeyCatalogFilters({ adult = homeCatalogAdult } = {}) {
  return [{ filterBy: "adult", filterValue: ["18+"], filterOperator: adult ? "IN" : "NOT_IN" }];
}
async function loadHoneyAvailabilityMap() {
  if (!honeyAvailabilityMap) honeyAvailabilityMap = { byHikka: {}, byHoney: {}, available: 0, honeyAvailable: 0 };
  return honeyAvailabilityMap;
}
async function fetchHoneyJson(path, options = {}, baseUrl = HONEY_API2) {
  const url = `${baseUrl}${path}`;
  const cacheKey = `${baseUrl}:${path}:${options.method || "GET"}:${options.body || ""}`;
  if (honeyMangaApiCache.has(cacheKey)) return honeyMangaApiCache.get(cacheKey);
  const request = (async () => {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await fetch(url, { mode: "cors", credentials: "omit", cache: "no-store", ...options });
        if (response.ok) return response.json();
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt === maxAttempts - 1) throw new Error(`honey-manga.com.ua API: HTTP ${response.status}`);
        const retryAfter = Number(response.headers.get("Retry-After"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1e3, 8e3) : 700 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (error) {
        if (attempt === maxAttempts - 1 || /HTTP (?!429|5\d\d)/.test(String(error?.message || ""))) throw error;
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
      }
    }
    throw new Error("honey-manga.com.ua API: \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u0456 \u0441\u043F\u0440\u043E\u0431\u0438 \u0432\u0438\u0447\u0435\u0440\u043F\u0430\u043D\u043E");
  })().catch((error) => {
    honeyMangaApiCache.delete(cacheKey);
    throw error;
  });
  honeyMangaApiCache.set(cacheKey, request);
  return request;
}
function normalizeHoneyMatch(value = "") {
  return String(value || "").toLocaleLowerCase("uk-UA").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[’'\x60]/g, "").replace(/[^a-z0-9а-яіїєґ]+/gi, " ").trim();
}
function honeyNamesMatch(left, right) {
  const a = normalizeHoneyMatch(left);
  const b = normalizeHoneyMatch(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const leftTokens = a.split(/\s+/).filter((token) => token.length >= 2);
  const rightTokens = b.split(/\s+/);
  return leftTokens.length >= 2 && leftTokens.every((token) => rightTokens.includes(token));
}
async function searchHoneyTitles(query2) {
  const normalized = normalizeHoneyMatch(query2);
  if (!normalized) return [];
  if (honeySearchCache.has(normalized)) return honeySearchCache.get(normalized);
  const promise = fetchHoneyJson(`${HONEY_SEARCH_PATTERN}${encodeURIComponent(query2)}`, {}, HONEY_SEARCH_API).then((payload) => Array.isArray(payload) ? payload : []).catch((error) => {
    console.warn("Honey Manga title search failed:", error);
    return [];
  });
  honeySearchCache.set(normalized, promise);
  return promise;
}
function honeyCatalogItem(item) {
  const posterId = item?.posterUrl || item?.posterId || "";
  const poster = posterId ? `${HONEY_IMAGE}/${posterId}?optimizer=image&width=296` : ANIME_CARD_PLACEHOLDER;
  const mangaId = String(item?.id || "");
  const chapterCount = Number(item?.chapters || 0);
  const adult = String(item?.adult || "NONE");
  const comic = isHoneyComicItem(item);
  const sourceType = String(item?.type || item?.contentType || item?.kind || "").trim();
  return {
    honeyId: mangaId,
    mal_id: `honey-${mangaId}`,
    slug: mangaId,
    title: item?.title || item?.lowTitle || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438",
    originalTitle: item?.alternativeTitle || item?.title || "",
    url: mangaId ? `${HONEY_WEB2}/book/${mangaId}` : HONEY_WEB2,
    readerUrl: "",
    readerAvailable: comic && chapterCount > 0,
    honeyTitleId: mangaId,
    honeyChapterId: "",
    chapters: chapterCount,
    images: { jpg: { large_image_url: poster, image_url: poster } },
    genres: normalizeGenreList(item?.genresAndTags || item?.genres || []),
    tags: normalizeGenreList(item?.tags || []),
    ageRating: adult === "NONE" ? "" : adult,
    adult,
    isAdultCover: Boolean(item?.isAdultCover),
    type: "manga",
    typeLabel: sourceType || "\u041C\u0430\u043D\u0491\u0430",
    honeySourceType: sourceType,
    status: item?.titleStatus || "",
    synopsis: normalizeSynopsisText(item?.description || ""),
    score: Number(item?.rate || item?.rateScore || 0),
    year: item?.lastUpdated ? String(item.lastUpdated).slice(0, 4) : "",
    lastUpdated: item?.lastUpdated || "",
    from: "honey-manga.com.ua"
  };
}
function honeyPromoTextMatches(value = "") {
  const haystack = normalizeHoneyMatch(value);
  return Boolean(haystack) && HONEY_PROMO_MARKERS.some((marker) => haystack.includes(normalizeHoneyMatch(marker)));
}
function honeyPromoPosterMatches(item = {}) {
  const posterValues = [
    item?.posterId,
    item?.posterUrl,
    item?.images?.jpg?.large_image_url,
    item?.images?.jpg?.image_url
  ].filter(Boolean).map((value) => String(value).trim());
  return posterValues.some((value) => HONEY_PROMO_POSTER_IDS.has(value) || [...HONEY_PROMO_POSTER_IDS].some((posterId) => value.includes(posterId)));
}
function isHoneyPromoItemRaw(item = {}) {
  const posterId = String(item?.posterUrl || item?.posterId || "").trim();
  return HONEY_PROMO_POSTER_IDS.has(posterId) || honeyPromoPosterMatches(item) || honeyPromoTextMatches([
    item?.title,
    item?.lowTitle,
    item?.alternativeTitle,
    item?.description,
    item?.slug,
    item?.posterUrl,
    item?.posterId
  ].filter(Boolean).join(" "));
}
function isHoneyPromoItem(item = {}) {
  return honeyPromoPosterMatches(item) || honeyPromoTextMatches([
    item?.title,
    item?.lowTitle,
    item?.alternativeTitle,
    item?.description,
    item?.synopsis,
    item?.slug,
    item?.posterUrl,
    item?.posterId
  ].filter(Boolean).join(" "));
}
function isAdultHoneyManga(item) {
  return /^18\+/.test(String(item?.adult || item?.ageRating || "").trim()) || item?.isAdultCover === true;
}
async function resolveHoneyReader(item) {
  if (!item) return item;
  const mangaId = item.honeyId || item.honeyTitleId;
  if (!mangaId || Number(item.chapters || 0) <= 0) return item;
  const cacheKey = String(mangaId);
  if (honeyReaderCache.has(cacheKey)) return { ...item, ...honeyReaderCache.get(cacheKey) };
  try {
    const stored = localStorage.getItem(`vakdab_manga_reader_${cacheKey}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.readerUrl) {
        honeyReaderCache.set(cacheKey, parsed);
        return { ...item, ...parsed };
      }
    }
  } catch {
  }
  if (honeyReaderPendingCache.has(cacheKey)) {
    const pendingReader2 = await honeyReaderPendingCache.get(cacheKey);
    return { ...item, ...pendingReader2 };
  }
  const pendingReader = (async () => {
    try {
      const payload = await fetchHoneyJson("/v2/chapter/cursor-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 1, pageSize: 100, mangaId: String(mangaId), sortOrder: "DESC" })
      });
      const chapters = Array.isArray(payload?.data) ? payload.data : [];
      const readingOrder = sortHoneyChaptersForReading(chapters);
      const publicFirst = [
        ...readingOrder.filter((entry) => entry && entry.isMonetized !== true),
        ...readingOrder.filter((entry) => entry && entry.isMonetized === true)
      ].filter((entry) => Boolean(entry?.id)).slice(0, 12);
      let chapter = null;
      for (let i = 0; i < publicFirst.length; i += 4) {
        const batch = publicFirst.slice(i, i + 4);
        const results = await Promise.allSettled(
          batch.map(
            (cand) => fetchHoneyJson(`/v2/chapter/frames/${encodeURIComponent(cand.id)}/${encodeURIComponent(mangaId)}`).then((frames) => ({ candidate: cand, hasFrames: hasHoneyPageResources(frames) }))
          )
        );
        for (const res of results) {
          if (res.status === "fulfilled" && res.value.hasFrames) {
            chapter = res.value.candidate;
            break;
          }
        }
        if (chapter) break;
      }
      chapter || (chapter = selectHoneyReaderChapter(chapters));
      const result = chapter?.id ? {
        readerUrl: `${HONEY_WEB2}/read/${chapter.id}/${mangaId}`,
        honeyChapterId: chapter.id,
        readerTitle: item.title || "\u041C\u0430\u043D\u0491\u0430",
        readerSource: "honey-manga.com.ua"
      } : { readerUrl: "", honeyChapterId: "" };
      if (result.readerUrl) {
        try {
          localStorage.setItem(`vakdab_manga_reader_${cacheKey}`, JSON.stringify(result));
        } catch {
        }
      }
      return result;
    } catch (error) {
      console.warn("Honey Manga chapter lookup failed:", error);
      return { readerUrl: "", honeyChapterId: "" };
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
async function attachHoneyReaders(items) {
  if (homeCatalogMode !== "manga") return items;
  await loadHoneyAvailabilityMap();
  return items.map((item) => ({ ...item, readerAvailable: Boolean(item.readerUrl) || Number(item.chapters) > 0 }));
}
function honeyAgeCategory(item) {
  const age = String(item?.ageRating || item?.adult || "").trim().toLowerCase();
  if (/^18\+/.test(age) || item?.isAdultCover === true) return "adult";
  if (/^(0|6|12)\+/.test(age)) return "children";
  if (/^(14|16)\+/.test(age)) return "teen";
  const words = normalizeHoneyMatch([...item?.genres || [], ...item?.tags || []].join(" "));
  if (/(18|adult|ерот|еччі|гарем|порн|для дорослих|хентай)/i.test(words)) return "adult";
  if (/(кодомо|для дітей|дитяч|сімейн|казк|дошкіль)/i.test(words)) return "children";
  return "teen";
}
function catalogAgeCategory(item) {
  if (homeCatalogMode === "manga") return honeyAgeCategory(item);
  const raw = Array.isArray(item?.rating) ? item.rating.join(" ") : String(item?.rating || item?.ageRating || item?.age_rating || "");
  const age = normalizeHoneyMatch(raw);
  if (item?.isAdult === true || item?.adult === true || /rx|r plus|r\+|18|adult|hentai|ecchi/.test(age)) return "adult";
  if (/r|pg 13|pg13|13|14|15|16|teen/.test(age)) return "teen";
  if (/g|pg|0|6|12|children|kids|family|all ages/.test(age)) return "children";
  return "teen";
}
function getHoneyGenreOptions(items = homeCatalogItems) {
  const values = /* @__PURE__ */ new Map();
  items.forEach((item) => (item?.genres || []).forEach((genre) => {
    const value = String(typeof genre === "object" ? genre.name || genre.name_ua || "" : genre).trim();
    if (value) values.set(normalizeHoneyMatch(value), value);
  }));
  return [...values.values()].sort((a, b) => a.localeCompare(b, "uk"));
}
function homeCatalogGenreHtml() {
  const genres = Object.entries(GENRE_MAP2).map(([name, slug]) => ({ name, slug })).sort((a, b) => a.name.localeCompare(b.name, "uk"));
  const allActive = homeCatalogGenre === "all";
  const allCard = `<button class="home-catalog-genre-card${allActive ? " active" : ""}" type="button" data-catalog-genre="all" aria-pressed="${allActive ? "true" : "false"}" role="listitem"><span class="home-catalog-genre-card__icon home-catalog-genre-card__icon--all">\u0423\u0441\u0456</span><span class="home-catalog-genre-card__name">\u0423\u0441\u0456 \u0436\u0430\u043D\u0440\u0438</span></button>`;
  const cards = genres.map(({ name, slug }) => {
    const active = homeCatalogGenre === slug;
    const letter = name.trim().charAt(0).toUpperCase();
    return `<button class="home-catalog-genre-card${active ? " active" : ""}" type="button" data-catalog-genre="${escapeHtml2(slug)}" aria-pressed="${active ? "true" : "false"}" role="listitem"><span class="home-catalog-genre-card__icon">${escapeHtml2(letter)}</span><span class="home-catalog-genre-card__name">${escapeHtml2(name)}</span></button>`;
  }).join("");
  return allCard + cards;
}
function homeCatalogGenreMatches(item, selectedGenre) {
  const selected = normalizeHoneyMatch(selectedGenre);
  if (!selected || selected === "all") return true;
  if (selected.startsWith("format ")) return normalizeHoneyMatch(item?.type || item?.media_type) === selected.slice(7);
  const mappedName = Object.entries(GENRE_MAP2).find(([, slug]) => normalizeHoneyMatch(slug) === selected)?.[0] || "";
  const candidates = [selected, normalizeHoneyMatch(mappedName)].filter(Boolean);
  return (item?.genres || []).some((genre) => {
    const source = typeof genre === "object" ? genre : { name_ua: genre };
    const values = [
      ...Array.isArray(item?.genreSlugs) ? item.genreSlugs : [],
      source?.slug,
      source?.name_ua,
      source?.name,
      genre
    ].map((value) => normalizeHoneyMatch(value)).filter(Boolean);
    return candidates.some((candidate) => values.some((value) => value === candidate || value.includes(candidate) || candidate.includes(value)));
  });
}
function syncHomeCatalogGenreControl(root = document) {
  const host = root.querySelector("#homeCatalogGenreRailHost");
  if (!host) return;
  host.innerHTML = homeCatalogGenreHtml();
  host.querySelectorAll("[data-catalog-genre]").forEach((button) => button.addEventListener("click", async () => {
    if (homeCatalogLoading) return;
    const nextGenre = button.dataset.catalogGenre || "all";
    if (nextGenre === homeCatalogGenre) return;
    homeCatalogGenre = nextGenre;
    homeCatalogPage = 1;
    homeCatalogFilterResultItems = null;
    homeCatalogFilterResultOffset = 0;
    host.setAttribute("aria-busy", "true");
    try {
      await reloadHomeCatalog();
    } finally {
      host.setAttribute("aria-busy", "false");
    }
  }));
}
async function loadHoneyMangaFullCatalog() {
  const filterAdult = homeCatalogAdult;
  const promiseKey = filterAdult ? "adult" : "public";
  if (honeyMangaFullCatalogPromises.has(promiseKey)) return honeyMangaFullCatalogPromises.get(promiseKey);
  const requestPromise = (async () => {
    const pageSize = 200;
    const makeRequest = (page) => fetchHoneyJson("/v2/manga/cursor-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, pageSize, sort: { sortBy: "lastUpdated", sortOrder: "DESC" }, filters: honeyCatalogFilters({ adult: filterAdult }) })
    });
    const firstPayload = await makeRequest(1);
    const total = Number(firstPayload?.counter || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const allItems = (Array.isArray(firstPayload?.data) ? firstPayload.data : []).filter((item) => !isHoneyPromoItemRaw(item)).map(honeyCatalogItem).filter((item) => !isHoneyPromoItem(item)).filter(isHoneyComicItem);
    let nextPage = 2;
    const worker = async () => {
      while (true) {
        const page = nextPage++;
        if (page > totalPages) return;
        const payload = await makeRequest(page);
        allItems.push(...(Array.isArray(payload?.data) ? payload.data : []).filter((item) => !isHoneyPromoItemRaw(item)).map(honeyCatalogItem).filter((item) => !isHoneyPromoItem(item)).filter(isHoneyComicItem));
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, Math.max(0, totalPages - 1)) }, worker));
    const unique = [...new Map(allItems.filter((item) => item.honeyId).map((item) => [item.honeyId, item])).values()];
    homeCatalogAvailableTotal = unique.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
    honeyCatalogPageCache.set(`honey-full:${filterAdult ? "adult" : "public"}`, { total: unique.length, items: unique, complete: true });
    debugLog("catalog", "honey-manga-full-index", { requestedPages: totalPages, receivedItems: allItems.length, uniqueItems: unique.length, total });
    return unique;
  })().catch((error) => {
    honeyMangaFullCatalogPromises.delete(promiseKey);
    throw error;
  });
  honeyMangaFullCatalogPromises.set(promiseKey, requestPromise);
  return requestPromise;
}
async function fetchHoneyCatalogPage(page = 1) {
  const mode = homeCatalogAdult ? "adult" : "public";
  const query2 = normalizeHoneyMatch(homeCatalogQuery) || "__all__";
  const cacheKey = `honey-manga:${mode}:${query2}:${page}`;
  const cached = honeyCatalogPageCache.get(cacheKey);
  if (cached) {
    homeCatalogTotal = cached.total;
    homeCatalogHasMore = cached.hasMore;
    return cached.items;
  }
  if (homeCatalogQuery) {
    const searched = await searchHoneyTitles(homeCatalogQuery);
    let items2 = searched.filter((item) => !isHoneyPromoItemRaw(item)).map(honeyCatalogItem).filter((item) => !isHoneyPromoItem(item)).filter(isHoneyComicItem);
    items2 = items2.filter((item) => homeCatalogAdult ? isAdultHoneyManga(item) : !isAdultHoneyManga(item));
    homeCatalogTotal = items2.length;
    homeCatalogHasMore = false;
    items2 = await attachHoneyReaders(items2);
    Object.defineProperties(items2, { total: { value: homeCatalogTotal, enumerable: false }, hasNextPage: { value: false, enumerable: false } });
    honeyCatalogPageCache.set(cacheKey, { total: homeCatalogTotal, items: items2, hasMore: false });
    return items2;
  }
  const pageSize = 28;
  const payload = await fetchHoneyJson("/v2/manga/cursor-list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page, pageSize, sort: { sortBy: "lastUpdated", sortOrder: "DESC" }, filters: honeyCatalogFilters({ adult: homeCatalogAdult }) })
  });
  homeCatalogTotal = Number(payload?.counter || 0);
  homeCatalogHasMore = Boolean(payload?.cursorNext?.page);
  let items = (Array.isArray(payload?.data) ? payload.data : []).filter((item) => !isHoneyPromoItemRaw(item)).map(honeyCatalogItem).filter((item) => !isHoneyPromoItem(item)).filter(isHoneyComicItem);
  items = await attachHoneyReaders(items);
  Object.defineProperties(items, { total: { value: homeCatalogTotal, enumerable: false }, hasNextPage: { value: homeCatalogHasMore, enumerable: false } });
  honeyCatalogPageCache.set(cacheKey, { total: homeCatalogTotal, items, hasMore: homeCatalogHasMore });
  debugLog("catalog", "honey-manga-page", { requestedPage: page, requestedLimit: pageSize, receivedItems: items.length, total: homeCatalogTotal, hasNextPage: homeCatalogHasMore });
  return items;
}
function filterMangaCatalogItems(items) {
  let filtered = [...items].filter((item) => !isHoneyPromoItem(item));
  const query2 = normalizeHoneyMatch(homeCatalogQuery);
  if (query2) filtered = filtered.filter((item) => normalizeHoneyMatch(item.title).includes(query2));
  if (homeCatalogAvailability === "available") filtered = filtered.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0);
  if (homeCatalogAdult || homeCatalogAge === "adult") filtered = filtered.filter((item) => honeyAgeCategory(item) === "adult");
  else if (homeCatalogAge !== "all") filtered = filtered.filter((item) => honeyAgeCategory(item) === homeCatalogAge);
  if (homeCatalogGenres.size) {
    filtered = filtered.filter((item) => (item.genres || []).some((genre) => homeCatalogGenres.has(normalizeHoneyMatch(typeof genre === "object" ? genre.name || genre.name_ua : genre))));
  }
  return filtered.sort((a, b) => {
    if (homeCatalogSort === "title") return String(a.title || "").localeCompare(String(b.title || ""), "uk");
    if (homeCatalogSort === "newest") return Number(b.year || 0) - Number(a.year || 0);
    return Number(b.score || 0) - Number(a.score || 0);
  });
}
async function fetchHomeCatalogPage(page) {
  if (homeCatalogMode === "manga") return fetchHoneyCatalogPage(page);
  const endpoint = "anime";
  const requestBody = homeCatalogRequestBody();
  if (homeCatalogMode === "anime" && homeCatalogAdult) requestBody.rating = ["rx"];
  const items = await hikkaCatalog(endpoint, page, requestBody);
  homeCatalogTotal = Number(items.total || items.pagination?.total || 0);
  homeCatalogHasMore = items.hasNextPage !== void 0 ? Boolean(items.hasNextPage) : items.length >= 28;
  return items;
}
function getHomeCatalogVisibleItems() {
  if (homeCatalogMode === "manga") {
    if (homeCatalogFilterResultItems) return [...homeCatalogItems];
    return filterMangaCatalogItems(homeCatalogItems);
  }
  const items = [...homeCatalogItems];
  let filtered = items;
  if (homeCatalogGenre !== "all") filtered = filtered.filter((item) => homeCatalogGenreMatches(item, homeCatalogGenre));
  if ((homeCatalogMode === "anime" || homeCatalogMode === "manga") && homeCatalogAge !== "all") filtered = filtered.filter((item) => catalogAgeCategory(item) === homeCatalogAge);
  if (homeCatalogStatus !== "all") {
    filtered = filtered.filter((item) => {
      const status = String(item.status || item.state || "").toLowerCase();
      return homeCatalogStatus === "ongoing" ? /ongoing|онго|publishing|active/.test(status) : /finished|completed|released|заверш/.test(status);
    });
  }
  if (homeCatalogAvailability === "available") filtered = filtered.filter((item) => item.readerAvailable || item.readerUrl);
  if (homeCatalogMode === "anime" && homeCatalogType !== "all") filtered = filtered.filter((item) => String(item.type || "").toLowerCase() === homeCatalogType);
  if (homeCatalogMode === "anime" && homeCatalogYearMin) filtered = filtered.filter((item) => Number(item.year || item.start_year || 0) >= Number(homeCatalogYearMin));
  if (homeCatalogMode === "anime" && homeCatalogYearMax) filtered = filtered.filter((item) => Number(item.year || item.start_year || 0) <= Number(homeCatalogYearMax));
  if (homeCatalogMode === "anime" && homeCatalogScoreMin) filtered = filtered.filter((item) => Number(item.score || item.native_score || 0) >= Number(homeCatalogScoreMin));
  if (homeCatalogGenres.size) {
    filtered = filtered.filter((item) => (item.genres || []).some((genre) => homeCatalogGenres.has(normalizeHoneyMatch(typeof genre === "object" ? genre.name || genre.name_ua : genre))));
  }
  return filtered.sort((a, b) => {
    const availability = Number(Boolean(b.readerAvailable || b.readerUrl)) - Number(Boolean(a.readerAvailable || a.readerUrl));
    if (availability) return availability;
    if (homeCatalogSort === "title") return String(a.title || "").localeCompare(String(b.title || ""), "uk");
    if (homeCatalogSort === "newest") return Number(b.year || 0) - Number(a.year || 0);
    return Number(b.score || b.native_score || 0) - Number(a.score || a.native_score || 0);
  });
}
function formatHomeCatalogNumber(value) {
  return new Intl.NumberFormat("uk-UA").format(Number(value) || 0).replace(/\u00a0/g, " ");
}
function homeCatalogPageSize() {
  return 28;
}
function homeCatalogPageCount() {
  const total = homeCatalogFilterResultItems?.length || homeCatalogTotal;
  return total ? Math.max(1, Math.ceil(total / homeCatalogPageSize())) : 0;
}
function syncHomeCatalogPagination() {
  const pagination = document.getElementById("homeCatalogPagination");
  if (!pagination) return;
  const pageCount = homeCatalogPageCount();
  const previous = pagination.querySelector('[data-catalog-page="prev"]');
  const next = pagination.querySelector('[data-catalog-page="next"]');
  const label = pagination.querySelector("[data-catalog-page-label]");
  const canNext = pageCount ? homeCatalogPage < pageCount : homeCatalogHasMore;
  pagination.hidden = !pageCount && homeCatalogPage <= 1 && !homeCatalogHasMore;
  if (previous) previous.disabled = homeCatalogPage <= 1 || homeCatalogLoading;
  if (next) next.disabled = !canNext || homeCatalogLoading;
  if (label) label.textContent = pageCount ? `\u0421\u0442\u043E\u0440\u0456\u043D\u043A\u0430 ${formatHomeCatalogNumber(homeCatalogPage)} \u0456\u0437 ${formatHomeCatalogNumber(pageCount)}` : `\u0421\u0442\u043E\u0440\u0456\u043D\u043A\u0430 ${formatHomeCatalogNumber(homeCatalogPage)}`;
}
function homeCatalogCountText(visibleCount) {
  const isFilteredManga = homeCatalogMode === "manga" && (homeCatalogAdult || homeCatalogAge !== "all" || homeCatalogFilterResultItems !== null);
  const isFilteredAnime = homeCatalogMode === "anime" && (homeCatalogGenre !== "all" || homeCatalogAge !== "all" || homeCatalogStatus !== "all" || homeCatalogType !== "all" || homeCatalogYearMin || homeCatalogYearMax || homeCatalogScoreMin);
  const total = isFilteredManga ? homeCatalogFilterIndexReady && homeCatalogFilterResultItems ? homeCatalogFilterResultItems.length : visibleCount : homeCatalogTotal || visibleCount;
  if (homeCatalogMode === "manga") {
    const available = homeCatalogAvailableTotal || homeCatalogItems.filter((item) => item?.readerAvailable || item?.readerUrl).length;
    const suffix = isFilteredManga && !homeCatalogFilterIndexReady ? "" : ` \u0456\u0437 ${formatHomeCatalogNumber(total)}`;
    return `\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0434\u043B\u044F \u0447\u0438\u0442\u0430\u043D\u043D\u044F: ${formatHomeCatalogNumber(available)}${suffix} \u043C\u0430\u043D\u0491\u0438`;
  }
  if (homeCatalogMode === "anime" && isFilteredAnime) return `\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u043E ${formatHomeCatalogNumber(visibleCount)} \u0437 ${formatHomeCatalogNumber(homeCatalogTotal || total)} \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0456\u0432`;
  return `\u0417\u043D\u0430\u0439\u0434\u0435\u043D\u043E ${formatHomeCatalogNumber(total)} \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0456\u0432`;
}
function isCatalogUrlBookmarked(url) {
  if (!url) return false;
  return Storage.getBookmarks().some((b) => b?.url === url);
}
function toggleCatalogBookmark(url, title, poster) {
  if (!url) return false;
  const bookmarks = Storage.getBookmarks();
  const idx = bookmarks.findIndex((b) => b?.url === url);
  if (idx >= 0) {
    bookmarks.splice(idx, 1);
    Storage.setBookmarks(bookmarks);
    showToast("\u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E \u0437 \u043E\u0431\u0440\u0430\u043D\u043E\u0433\u043E");
    return false;
  }
  bookmarks.push({ url, title: title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438", poster: poster || "", addedAt: Date.now() });
  Storage.setBookmarks(bookmarks);
  showToast("\u0414\u043E\u0434\u0430\u043D\u043E \u0434\u043E \u043E\u0431\u0440\u0430\u043D\u043E\u0433\u043E");
  return true;
}
function homeCatalogCardHtml(a, index = 0) {
  const poster = cardPoster(a);
  const title = a.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
  const type = a.typeLabel || animeTypeLabel(a.type);
  const status = homeCatalogMode === "manga" ? a.ageRating || (homeCatalogAdult ? "18+" : "") : statusLabelUa(a.status);
  const meta = [type, a.year, status].filter(Boolean).join(" \xB7 ");
  const honeyId = a.honeyId || a.honeyTitleId || (homeCatalogMode === "manga" ? String(a.url || "").split("/").filter(Boolean).pop() : "");
  const isMangaCard = homeCatalogMode === "manga" && Boolean(honeyId);
  const readerCard = isMangaCard || homeCatalogMode === "manga" && Boolean(a.readerUrl || a.readerAvailable);
  const url = String(a.url || "");
  const score = Number(a.score || a.native_score || 0);
  const ratingHtml = score > 0 ? `<span class="home-catalog-card__rating"><i class="fas fa-star"></i>${score.toFixed(1)}</span>` : "";
  const bookmarked = isCatalogUrlBookmarked(url);
  const loading = index < 6 ? "eager" : "lazy";
  return `<article class="home-catalog-card${readerCard ? " home-catalog-card--reader" : ""}" data-catalog-mode="${homeCatalogMode}" data-url="${escapeHtml2(url)}"${readerCard && a.readerUrl ? ` data-reader-url="${escapeHtml2(a.readerUrl)}"` : ""}${isMangaCard && !a.readerUrl ? ` data-reader-pending="1" data-honey-id="${escapeHtml2(String(honeyId))}"` : ""} data-reader-title="${escapeHtml2(title)}" tabindex="0" role="button" aria-label="${escapeHtml2(title)}">
                <div class="home-catalog-card__poster">
                    <img src="${escapeHtml2(poster)}" alt="${escapeHtml2(title)}" loading="${loading}" decoding="async" onload="this.classList.add('img--loaded')" onerror="this.onerror=null;this.src='${ANIME_CARD_PLACEHOLDER}'">
                    ${status ? `<span class="home-catalog-card__status">${escapeHtml2(status)}</span>` : ""}
                    ${ratingHtml}
                </div>
                <div class="home-catalog-card__title">${escapeHtml2(title)}</div>
                <div class="home-catalog-card__meta">${escapeHtml2(meta || (homeCatalogMode === "manga" ? "\u041C\u0430\u043D\u0491\u0430" : "\u0410\u043D\u0456\u043C\u0435"))}</div>
            </article>`;
}
function bindHomeCatalogCards(root) {
  root?.querySelectorAll(".home-catalog-card:not([data-bound])").forEach((card) => {
    card.dataset.bound = "1";
    if (!card.dataset.readerTitle) card.dataset.readerTitle = card.getAttribute("aria-label") || "";
    const open = async () => {
      if (!card.dataset.url || card.dataset.opening === "1") return;
      const cardTitle = card.dataset.readerTitle || card.getAttribute("aria-label") || "\u041C\u0430\u043D\u0491\u0430";
      if (card.dataset.catalogMode === "manga" && card.dataset.readerUrl) {
        Router.goTo("manga", { url: card.dataset.readerUrl, title: cardTitle });
        return;
      }
      if (card.dataset.catalogMode === "manga" && card.dataset.honeyId) {
        card.dataset.opening = "1";
        card.setAttribute("aria-busy", "true");
        try {
          const item = homeCatalogItems.find((entry) => String(entry.honeyId || entry.honeyTitleId) === String(card.dataset.honeyId)) || { honeyId: card.dataset.honeyId, honeyTitleId: card.dataset.honeyId, title: cardTitle, chapters: 1 };
          const resolved = await resolveHoneyReader({ ...item, honeyTitleId: card.dataset.honeyId, chapters: Math.max(1, Number(item.chapters || 1)) });
          if (resolved.readerUrl) {
            card.dataset.readerUrl = resolved.readerUrl;
            Router.goTo("manga", { url: resolved.readerUrl, title: cardTitle });
            return;
          }
        } finally {
          card.removeAttribute("aria-busy");
          delete card.dataset.opening;
        }
        showToast("\u0420\u043E\u0437\u0434\u0456\u043B\u0438 \u0446\u044C\u043E\u0433\u043E \u0442\u0430\u0439\u0442\u043B\u0443 \u0449\u0435 \u043D\u0435 \u0433\u043E\u0442\u043E\u0432\u0456");
        return;
      }
      if (card.dataset.catalogMode !== "anime") {
        showToast("\u0420\u043E\u0437\u0434\u0456\u043B\u0438 \u0446\u044C\u043E\u0433\u043E \u0442\u0430\u0439\u0442\u043B\u0443 \u0449\u0435 \u043D\u0435 \u0433\u043E\u0442\u043E\u0432\u0456");
        return;
      }
      openPlayerPage(card.dataset.url);
    };
    const isFavTarget = (event) => Boolean(event.target.closest?.(".home-catalog-card__fav"));
    let pointerStart = null;
    let pointerMoved = false;
    let suppressClickUntil = 0;
    const activateCard = (event) => {
      if (isFavTarget(event)) return;
      if (event.type === "click" && (pointerMoved || Date.now() < suppressClickUntil)) {
        event.preventDefault();
        event.stopPropagation();
        pointerMoved = false;
        return;
      }
      open();
    };
    card.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" || isFavTarget(event)) return;
      pointerStart = { x: event.clientX, y: event.clientY };
      pointerMoved = false;
    }, { passive: true });
    card.addEventListener("pointermove", (event) => {
      if (!pointerStart || event.pointerType === "mouse") return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      if (Math.hypot(dx, dy) > 10) {
        pointerMoved = true;
        suppressClickUntil = Date.now() + 500;
      }
    }, { passive: true });
    card.addEventListener("pointerup", () => {
      pointerStart = null;
    }, { passive: true });
    card.addEventListener("pointercancel", () => {
      pointerStart = null;
      pointerMoved = true;
      suppressClickUntil = Date.now() + 500;
    }, { passive: true });
    card.addEventListener("click", activateCard);
    card.addEventListener("keydown", (event) => {
      if (isFavTarget(event)) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
    const favBtn = card.querySelector(".home-catalog-card__fav");
    favBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const posterImg = card.querySelector(".home-catalog-card__poster img");
      const title = card.dataset.readerTitle || card.getAttribute("aria-label") || "";
      const active = toggleCatalogBookmark(card.dataset.url, title, posterImg?.src || "");
      favBtn.classList.toggle("is-active", active);
      favBtn.setAttribute("aria-pressed", String(active));
      favBtn.setAttribute("aria-label", active ? "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0437 \u043E\u0431\u0440\u0430\u043D\u043E\u0433\u043E" : "\u0414\u043E\u0434\u0430\u0442\u0438 \u0432 \u043E\u0431\u0440\u0430\u043D\u0435");
    });
  });
}
function getActiveCatalogYearKey() {
  if (homeCatalogStatus === "ongoing") return "ongoing";
  if (!homeCatalogYearMin && !homeCatalogYearMax) return "";
  for (const [key, [min, max]] of Object.entries(CATALOG_YEAR_RANGES)) {
    if (Number(homeCatalogYearMin) === min && Number(homeCatalogYearMax) === max) return key;
  }
  return "";
}
function buildHomeCatalogQuickFilterHtml() {
  const isManga = homeCatalogMode === "manga";
  const activeYear = getActiveCatalogYearKey();
  const activeSort = homeCatalogSort === "title" || homeCatalogSort === "alpha" ? "alpha" : homeCatalogSort === "newest" || homeCatalogSort === "year" ? "newest" : "rating";
  const activeType = homeCatalogType && homeCatalogType !== "all" ? homeCatalogType : "";
  const hasActiveQuery = Boolean(homeCatalogQuery);
  const placeholder = isManga ? "\u041F\u043E\u0448\u0443\u043A \u043C\u0430\u043D\u0491\u0438..." : "\u041F\u043E\u0448\u0443\u043A \u0430\u043D\u0456\u043C\u0435...";
  const animeGenresMarkup = Object.entries(GENRE_MAP2).map(([name, slug]) => {
    const isChecked = homeCatalogGenres.has(normalizeHoneyMatch(name)) || homeCatalogGenres.has(normalizeHoneyMatch(slug));
    return `<label class="hqf-option">
                        <input type="checkbox" data-catalog-genre="${escapeHtml2(slug)}" data-catalog-genre-name="${escapeHtml2(name)}"${isChecked ? " checked" : ""} />
                        <span class="hqf-option-bullet"></span>
                        <span>${escapeHtml2(name)}</span>
                    </label>`;
  }).join("");
  const typeMarkup = CATALOG_TYPE_OPTIONS.map((opt) => `
                <label class="hqf-option">
                    <input type="radio" name="catalog_type" value="${opt.key}" data-catalog-type="${opt.key}"${activeType === opt.key ? " checked" : ""} />
                    <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                    <span>${opt.label}</span>
                </label>
            `).join("");
  const yearMarkup = CATALOG_YEAR_OPTIONS.map((opt) => `
                <label class="hqf-option">
                    <input type="radio" name="catalog_year" value="${opt.key}" data-catalog-year="${opt.key}"${activeYear === opt.key ? " checked" : ""} />
                    <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                    <span>${opt.label}</span>
                </label>
            `).join("");
  const sortMarkup = CATALOG_SORT_OPTIONS.map((opt) => `
                <label class="hqf-option">
                    <input type="radio" name="catalog_sort" value="${opt.key}" data-catalog-sort="${opt.key}"${activeSort === opt.key ? " checked" : ""} />
                    <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                    <span>${opt.label}</span>
                </label>
            `).join("");
  const mangaGenresMarkup = CATALOG_MANGA_GENRES.map((genre) => {
    const isChecked = homeCatalogGenres.has(normalizeHoneyMatch(genre));
    return `<label class="hqf-option">
                    <input type="checkbox" data-catalog-manga-genre="${escapeHtml2(genre)}"${isChecked ? " checked" : ""} />
                    <span class="hqf-option-bullet"></span>
                    <span>${escapeHtml2(genre)}</span>
                </label>`;
  }).join("");
  const mangaAvailMarkup = CATALOG_MANGA_AVAILABILITY_OPTIONS.map((opt) => `
                <label class="hqf-option">
                    <input type="radio" name="catalog_manga_avail" value="${opt.key}" data-catalog-manga-avail="${opt.key}"${(homeCatalogAvailability || "all") === opt.key ? " checked" : ""} />
                    <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                    <span>${opt.label}</span>
                </label>
            `).join("");
  const mangaAgeMarkup = CATALOG_MANGA_AGE_OPTIONS.map((opt) => `
                <label class="hqf-option">
                    <input type="radio" name="catalog_manga_age" value="${opt.key}" data-catalog-manga-age="${opt.key}"${(homeCatalogAge || "all") === opt.key ? " checked" : ""} />
                    <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                    <span>${opt.label}</span>
                </label>
            `).join("");
  const mangaSortMarkup = CATALOG_SORT_OPTIONS.map((opt) => `
                <label class="hqf-option">
                    <input type="radio" name="catalog_manga_sort" value="${opt.key}" data-catalog-manga-sort="${opt.key}"${activeSort === opt.key ? " checked" : ""} />
                    <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                    <span>${opt.label}</span>
                </label>
            `).join("");
  const isOpen = homeCatalogFilterOpen;
  return `
            <div class="home-quick-filter${isOpen ? " is-open" : ""}" id="homeCatalogQuickFilter">
                <div class="hqf-mode-tabs" role="tablist" aria-label="\u0412\u0438\u0431\u0456\u0440 \u0440\u043E\u0437\u0434\u0456\u043B\u0443">
                    <button type="button" class="hqf-mode-tab${!isManga ? " active" : ""}" data-catalog-mode="anime" role="tab" aria-selected="${!isManga}">
                        <i class="fas fa-photo-film" aria-hidden="true"></i>
                        <span>\u0410\u043D\u0456\u043C\u0435</span>
                    </button>
                    <button type="button" class="hqf-mode-tab${isManga ? " active" : ""}" data-catalog-mode="manga" role="tab" aria-selected="${isManga}">
                        <i class="fas fa-book-open" aria-hidden="true"></i>
                        <span>\u041C\u0430\u043D\u0491\u0430</span>
                    </button>
                </div>

                <div class="hqf-toolbar hqf-toolbar--merged">
                    <div class="hqf-merged-bar" id="homeCatalogMergedBar">
                        <i class="fas fa-search hqf-search-glass" aria-hidden="true"></i>
                        <input type="text" inputmode="search" id="homeCatalogSearchInput" class="hqf-search-input" placeholder="${placeholder}" value="${escapeHtml2(homeCatalogQuery)}" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search" aria-label="${placeholder}">
                        <button type="button" class="hqf-search-clear" id="homeCatalogSearchClear" aria-label="\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u043F\u043E\u0448\u0443\u043A"${homeCatalogQuery ? "" : " hidden"}>
                            <i class="fas fa-xmark" aria-hidden="true"></i>
                        </button>
                        <span class="hqf-merged-divider" aria-hidden="true"></span>
                        <button class="hqf-categories-toggle${isOpen ? " open" : ""}" id="homeCatalogCategoriesToggle" type="button" aria-label="\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u0457 \u0442\u0430 \u0444\u0456\u043B\u044C\u0442\u0440\u0438" aria-expanded="${isOpen ? "true" : "false"}">
                            <i class="fas fa-sliders" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>

                <div class="hqf-panel${isOpen ? " open" : ""}" id="homeCatalogFilterPanel" role="region" aria-label="\u0424\u0456\u043B\u044C\u0442\u0440\u0438">
                    <div class="hqf-panel-inner">
                        ${!isManga ? `
                        <div class="hqf-col">
                            <div class="hqf-col-title">\u0416\u0430\u043D\u0440</div>
                            <div class="hqf-option-list" id="homeCatalogGenreList">
                                ${animeGenresMarkup}
                            </div>
                        </div>
                        <div class="hqf-col">
                            <div class="hqf-col-title">\u0422\u0438\u043F</div>
                            <div class="hqf-option-list">
                                ${typeMarkup}
                            </div>
                            <div class="hqf-col-title hqf-col-title--spaced">\u0420\u0456\u043A \u0432\u0438\u0445\u043E\u0434\u0443</div>
                            <div class="hqf-option-list">
                                ${yearMarkup}
                            </div>
                            <div class="hqf-col-title hqf-col-title--spaced">\u0421\u043E\u0440\u0442\u0443\u0432\u0430\u043D\u043D\u044F</div>
                            <div class="hqf-option-list">
                                ${sortMarkup}
                            </div>
                        </div>
                        ` : `
                        <div class="hqf-col">
                            <div class="hqf-col-title">\u0416\u0430\u043D\u0440 \u043C\u0430\u043D\u0491\u0438</div>
                            <div class="hqf-option-list" id="homeCatalogMangaGenreList">
                                ${mangaGenresMarkup}
                            </div>
                        </div>
                        <div class="hqf-col">
                            <div class="hqf-col-title">\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u0456\u0441\u0442\u044C</div>
                            <div class="hqf-option-list">
                                ${mangaAvailMarkup}
                            </div>
                            <div class="hqf-col-title hqf-col-title--spaced">\u0412\u0456\u043A\u043E\u0432\u0430 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u044F</div>
                            <div class="hqf-option-list">
                                ${mangaAgeMarkup}
                            </div>
                            <div class="hqf-col-title hqf-col-title--spaced">\u0421\u043E\u0440\u0442\u0443\u0432\u0430\u043D\u043D\u044F</div>
                            <div class="hqf-option-list">
                                ${mangaSortMarkup}
                            </div>
                        </div>
                        `}
                    </div>
                    <div class="hqf-panel-footer">
                        <button type="button" class="hqf-reset-btn" id="homeCatalogFilterReset">
                            <i class="fas fa-rotate-left"></i><span>\u0421\u043A\u0438\u043D\u0443\u0442\u0438</span>
                        </button>
                        <button type="button" class="hqf-ok-btn" id="homeCatalogFilterClose">
                            \u0413\u043E\u0442\u043E\u0432\u043E
                        </button>
                    </div>
                </div>
            </div>`;
}
function buildHomeCatalogSectionHtml(items) {
  const visibleItems = getHomeCatalogVisibleItems();
  return `<section class="home-catalog-section" id="homeCatalogSection">
                ${buildHomeCatalogQuickFilterHtml()}
                <div class="home-catalog-header-row">
                    <div class="home-catalog-results-label" id="homeCatalogResultsLabel">${homeCatalogCountText(visibleItems.length)}</div>
                    <div class="home-catalog-view-toggle" role="group" aria-label="\u0412\u0438\u0433\u043B\u044F\u0434 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443">
                        <button type="button" class="home-catalog-view${homeCatalogView === "grid" ? " active" : ""}" data-catalog-view="grid" aria-label="\u0421\u0456\u0442\u043A\u0430"><i class="fas fa-grip"></i></button>
                        <button type="button" class="home-catalog-view${homeCatalogView === "list" ? " active" : ""}" data-catalog-view="list" aria-label="\u0421\u043F\u0438\u0441\u043E\u043A"><i class="fas fa-list"></i></button>
                    </div>
                </div>
                <div class="home-catalog-grid${homeCatalogView === "list" ? " is-list" : " is-swipe"}" id="homeCatalogGrid">${visibleItems.length ? visibleItems.map((item, index) => homeCatalogCardHtml(item, index)).join("") : '<div class="home-catalog-empty">\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u0442\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439.</div>'}</div>
                <div class="home-catalog-pagination" id="homeCatalogPagination" hidden aria-label="\u041D\u0430\u0432\u0456\u0433\u0430\u0446\u0456\u044F \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0430\u043C\u0438 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443">
                    <button type="button" class="home-catalog-page-btn" data-catalog-page="prev"><i class="fas fa-chevron-left"></i><span>\u041D\u0430\u0437\u0430\u0434</span></button>
                    <span class="home-catalog-page-label" data-catalog-page-label>\u0421\u0442\u043E\u0440\u0456\u043D\u043A\u0430 1</span>
                    <button type="button" class="home-catalog-page-btn" data-catalog-page="next"><span>\u0414\u0430\u043B\u0456</span><i class="fas fa-chevron-right"></i></button>
                </div>
            </section>`;
}
function renderHomeCatalogGrid() {
  const grid = document.getElementById("homeCatalogGrid");
  const count = document.getElementById("homeCatalogCount");
  const number = document.getElementById("homeCatalogResultNumber");
  if (!grid) return;
  const visibleItems = getHomeCatalogVisibleItems();
  grid.classList.toggle("is-list", homeCatalogView === "list");
  grid.classList.toggle("is-swipe", homeCatalogView === "grid");
  grid.innerHTML = visibleItems.length ? visibleItems.map((item, index) => homeCatalogCardHtml(item, index)).join("") : '<div class="home-catalog-empty">\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0437\u0430 \u0446\u0438\u043C\u0438 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u0430\u043C\u0438.</div>';
  bindHomeCatalogCards(grid);
  if (!homeCatalogHasMore) {
    document.getElementById("homeCatalogMoreBtn")?.remove();
  }
  if (count) count.textContent = homeCatalogCountText(visibleItems.length);
  const label = document.getElementById("homeCatalogResultsLabel");
  if (label) label.textContent = homeCatalogCountText(visibleItems.length);
  if (number) number.textContent = formatHomeCatalogNumber(homeCatalogTotal || visibleItems.length);
  syncHomeCatalogPagination();
  ensureHomeCatalogFeedObserver();
}
function syncHomeCatalogModeControls() {
}
function bindHomeCatalogMenu(root) {
  const tabs = root.querySelectorAll("[data-catalog-mode]");
  tabs.forEach((tab) => tab.addEventListener("click", async () => {
    const nextMode = tab.dataset.catalogMode;
    if (nextMode === homeCatalogMode) return;
    homeSectionsRequestId++;
    homeCatalogMode = nextMode;
    homeCatalogAdult = false;
    homeCatalogAge = "all";
    homeCatalogOrigin = "all";
    homeCatalogQuery = "";
    homeCatalogPreset = "all";
    homeCatalogGenre = "all";
    homeCatalogStatus = "all";
    homeCatalogAvailability = "all";
    homeCatalogGenres = /* @__PURE__ */ new Set();
    homeCatalogFilterResultItems = null;
    homeCatalogFilterResultOffset = 0;
    homeCatalogType = "all";
    homeCatalogYearMin = "";
    homeCatalogYearMax = "";
    homeCatalogScoreMin = "";
    homeCatalogPage = 1;
    const container = document.getElementById("genreSectionsContainer");
    if (container) {
      container.innerHTML = buildHomeCatalogSectionHtml([]);
      bindHomeCatalogCards(container);
      bindHomeCatalogMenu(container);
    }
    await reloadHomeCatalog();
  }));
  const toggle = root.querySelector("#homeCatalogCategoriesToggle");
  const panel = root.querySelector("#homeCatalogFilterPanel");
  const qfContainer = root.querySelector("#homeCatalogQuickFilter");
  toggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    homeCatalogFilterOpen = !homeCatalogFilterOpen;
    toggle.classList.toggle("open", homeCatalogFilterOpen);
    toggle.setAttribute("aria-expanded", String(homeCatalogFilterOpen));
    panel?.classList.toggle("open", homeCatalogFilterOpen);
    qfContainer?.classList.toggle("is-open", homeCatalogFilterOpen);
  });
  panel?.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  root.querySelector("#homeCatalogFilterClose")?.addEventListener("click", (e) => {
    e.stopPropagation();
    homeCatalogFilterOpen = false;
    toggle?.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
    panel?.classList.remove("open");
    qfContainer?.classList.remove("is-open");
  });
  const onDocClick = (e) => {
    if (!homeCatalogFilterOpen) return;
    const quickFilter = document.getElementById("homeCatalogQuickFilter");
    if (quickFilter && !quickFilter.contains(e.target)) {
      homeCatalogFilterOpen = false;
      toggle?.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
      panel?.classList.remove("open");
      qfContainer?.classList.remove("is-open");
    }
  };
  document.removeEventListener("click", onDocClick);
  document.addEventListener("click", onDocClick);
  root.querySelector("#homeCatalogFilterReset")?.addEventListener("click", async () => {
    homeCatalogStatus = "all";
    homeCatalogAvailability = "all";
    homeCatalogAge = "all";
    homeCatalogOrigin = "all";
    homeCatalogAdult = false;
    homeCatalogType = "all";
    homeCatalogYearMin = "";
    homeCatalogYearMax = "";
    homeCatalogScoreMin = "";
    homeCatalogSort = "score";
    homeCatalogGenres = /* @__PURE__ */ new Set();
    homeCatalogQuery = "";
    homeCatalogFilterResultItems = null;
    homeCatalogFilterResultOffset = 0;
    homeCatalogPage = 1;
    const container = document.getElementById("genreSectionsContainer");
    if (container) {
      container.innerHTML = buildHomeCatalogSectionHtml([]);
      bindHomeCatalogCards(container);
      bindHomeCatalogMenu(container);
    }
    await reloadHomeCatalog();
  });
  const searchInput = root.querySelector("#homeCatalogSearchInput");
  const searchClear = root.querySelector("#homeCatalogSearchClear");
  const mergedBar = root.querySelector("#homeCatalogMergedBar");
  let searchTimer = null;
  searchInput?.addEventListener("input", (event) => {
    clearTimeout(searchTimer);
    homeCatalogQuery = event.target.value.trim();
    if (searchClear) searchClear.hidden = !homeCatalogQuery;
    searchTimer = setTimeout(async () => {
      homeCatalogPage = 1;
      homeCatalogFilterResultItems = null;
      homeCatalogFilterResultOffset = 0;
      await reloadHomeCatalog();
    }, 400);
  });
  searchClear?.addEventListener("click", async () => {
    if (!searchInput) return;
    searchInput.value = "";
    homeCatalogQuery = "";
    searchClear.hidden = true;
    homeCatalogPage = 1;
    homeCatalogFilterResultItems = null;
    homeCatalogFilterResultOffset = 0;
    await reloadHomeCatalog();
    searchInput.focus();
  });
  root.querySelectorAll("[data-catalog-genre]").forEach((cb) => {
    cb.addEventListener("change", async () => {
      const slug = cb.dataset.catalogGenre;
      const name = cb.dataset.catalogGenreName;
      const key = normalizeHoneyMatch(name || slug);
      if (cb.checked) {
        homeCatalogGenres.add(key);
      } else {
        homeCatalogGenres.delete(key);
      }
      homeCatalogPage = 1;
      await reloadHomeCatalog();
    });
  });
  root.querySelectorAll("[data-catalog-manga-genre]").forEach((cb) => {
    cb.addEventListener("change", async () => {
      const genre = cb.dataset.catalogMangaGenre;
      const key = normalizeHoneyMatch(genre);
      if (cb.checked) {
        homeCatalogGenres.add(key);
      } else {
        homeCatalogGenres.delete(key);
      }
      homeCatalogPage = 1;
      homeCatalogFilterResultItems = null;
      homeCatalogFilterResultOffset = 0;
      await reloadHomeCatalog();
    });
  });
  root.querySelectorAll("[data-catalog-type]").forEach((radio) => {
    radio.addEventListener("change", async () => {
      if (!radio.checked) return;
      homeCatalogType = radio.dataset.catalogType || "all";
      homeCatalogPage = 1;
      await reloadHomeCatalog();
    });
  });
  root.querySelectorAll("[data-catalog-year]").forEach((radio) => {
    radio.addEventListener("change", async () => {
      if (!radio.checked) return;
      const yearKey = radio.dataset.catalogYear;
      if (yearKey === "ongoing") {
        homeCatalogStatus = "ongoing";
        homeCatalogYearMin = "";
        homeCatalogYearMax = "";
      } else if (CATALOG_YEAR_RANGES[yearKey]) {
        const [min, max] = CATALOG_YEAR_RANGES[yearKey];
        homeCatalogYearMin = String(min);
        homeCatalogYearMax = String(max);
        homeCatalogStatus = "all";
      } else {
        homeCatalogYearMin = "";
        homeCatalogYearMax = "";
        homeCatalogStatus = "all";
      }
      homeCatalogPage = 1;
      await reloadHomeCatalog();
    });
  });
  root.querySelectorAll("[data-catalog-sort]").forEach((radio) => {
    radio.addEventListener("change", async () => {
      if (!radio.checked) return;
      homeCatalogSort = radio.dataset.catalogSort === "alpha" ? "title" : radio.dataset.catalogSort;
      homeCatalogPage = 1;
      await reloadHomeCatalog();
    });
  });
  root.querySelectorAll("[data-catalog-manga-avail]").forEach((radio) => {
    radio.addEventListener("change", async () => {
      if (!radio.checked) return;
      homeCatalogAvailability = radio.dataset.catalogMangaAvail || "all";
      homeCatalogPage = 1;
      homeCatalogFilterResultItems = null;
      homeCatalogFilterResultOffset = 0;
      await reloadHomeCatalog();
    });
  });
  root.querySelectorAll("[data-catalog-manga-age]").forEach((radio) => {
    radio.addEventListener("change", async () => {
      if (!radio.checked) return;
      homeCatalogAge = radio.dataset.catalogMangaAge || "all";
      homeCatalogAdult = homeCatalogAge === "adult";
      homeCatalogPage = 1;
      homeCatalogFilterResultItems = null;
      homeCatalogFilterResultOffset = 0;
      await reloadHomeCatalog();
    });
  });
  root.querySelectorAll("[data-catalog-manga-sort]").forEach((radio) => {
    radio.addEventListener("change", async () => {
      if (!radio.checked) return;
      homeCatalogSort = radio.dataset.catalogMangaSort === "alpha" ? "title" : radio.dataset.catalogMangaSort;
      homeCatalogPage = 1;
      homeCatalogFilterResultItems = null;
      homeCatalogFilterResultOffset = 0;
      await reloadHomeCatalog();
    });
  });
  root.querySelectorAll("[data-catalog-view]").forEach((button) => button.addEventListener("click", () => {
    homeCatalogView = button.dataset.catalogView;
    root.querySelectorAll("[data-catalog-view]").forEach((item) => item.classList.toggle("active", item === button));
    renderHomeCatalogGrid();
  }));
  root.querySelectorAll("[data-catalog-page]").forEach((button) => button.addEventListener("click", () => {
    const delta = button.dataset.catalogPage === "prev" ? -1 : 1;
    void loadHomeCatalogPage(homeCatalogPage + delta);
  }));
}
function updateHomeCatalogModeLabels() {
  const mode = HOME_CATALOG_MODES.find((item) => item.key === homeCatalogMode) || HOME_CATALOG_MODES[0];
  const title = document.querySelector("#homeCatalogSection h2");
  const search = document.getElementById("homeCatalogSearch");
  if (title) title.textContent = homeCatalogAdult ? "18+ \u043C\u0430\u043D\u0491\u0430" : `\u041A\u0430\u0442\u0430\u043B\u043E\u0433 ${mode.label.toLowerCase()}`;
  if (search) search.placeholder = `\u0412\u0432\u0435\u0434\u0456\u0442\u044C \u043D\u0430\u0437\u0432\u0443 ${homeCatalogAdult ? "\u043C\u0430\u043D\u0491\u0438" : mode.label.toLowerCase()}...`;
  document.querySelectorAll("[data-catalog-mode]").forEach((tab) => tab.classList.toggle("active", tab.dataset.catalogMode === homeCatalogMode));
  const adultButton = document.getElementById("homeCatalogAdultBtn");
  if (adultButton) {
    adultButton.hidden = homeCatalogMode !== "manga";
    adultButton.classList.toggle("active", homeCatalogAdult && homeCatalogMode === "manga");
    adultButton.setAttribute("aria-pressed", String(homeCatalogAdult && homeCatalogMode === "manga"));
  }
}
async function loadHomeCatalogPage(targetPage = 1) {
  if (homeCatalogLoading) return;
  const grid = document.getElementById("homeCatalogGrid");
  if (!grid) return;
  const page = Math.max(1, Number(targetPage) || 1);
  const pageSize = homeCatalogPageSize();
  const knownPages = homeCatalogPageCount();
  if (knownPages && page > knownPages) return;
  homeCatalogLoading = true;
  syncHomeCatalogPagination();
  grid.innerHTML = renderAnimeCardSkeleton(12);
  try {
    if (homeCatalogFilterResultItems) {
      const start = (page - 1) * pageSize;
      homeCatalogItems = homeCatalogFilterResultItems.slice(start, start + pageSize);
      homeCatalogFilterResultOffset = Math.min(start + pageSize, homeCatalogFilterResultItems.length);
      homeCatalogPage = page;
      homeCatalogHasMore = homeCatalogFilterResultOffset < homeCatalogFilterResultItems.length;
    } else {
      const items = await fetchHomeCatalogPageSafe(page);
      homeCatalogItems = (Array.isArray(items) ? items : []).filter((item) => item?.url);
      homeCatalogPage = page;
      homeCatalogHasMore = items?.hasNextPage !== void 0 ? Boolean(items.hasNextPage) : Boolean(homeCatalogHasMore);
    }
    if (homeCatalogMode === "manga") {
      homeCatalogAvailableTotal = homeCatalogItems.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
    }
    syncHomeCatalogGenreControl();
    renderHomeCatalogGrid();
    document.getElementById("homeCatalogGrid")?.scrollTo({ left: 0, behavior: "instant" });
    document.getElementById("homeCatalogSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    grid.innerHTML = '<div class="home-catalog-empty">\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0443. \u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437.</div>';
    showToast("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0443 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443");
  } finally {
    homeCatalogLoading = false;
    syncHomeCatalogPagination();
  }
}
function homeCatalogHasActiveFilters() {
  if (homeCatalogQuery) return true;
  if (homeCatalogGenre !== "all" || homeCatalogAge !== "all" || homeCatalogStatus !== "all" || homeCatalogAvailability !== "all") return true;
  if (homeCatalogMode === "anime" && (homeCatalogType !== "all" || homeCatalogYearMin || homeCatalogYearMax || homeCatalogScoreMin)) return true;
  if (homeCatalogSort === "title") return true;
  return false;
}
async function loadHomeCatalogNextPage() {
  if (homeCatalogLoading) return 0;
  homeCatalogLoading = true;
  const before = homeCatalogItems.length;
  try {
    const hasMangaFilters = homeCatalogMode === "manga" && (homeCatalogAge !== "all" || homeCatalogAdult || homeCatalogAvailability !== "all" || homeCatalogGenres.size > 0 || homeCatalogSort === "title" || homeCatalogSort === "alpha");
    if (hasMangaFilters && !homeCatalogFilterResultItems) {
      const fullCatalog = await loadHoneyMangaFullCatalog();
      homeCatalogFilterResultItems = filterMangaCatalogItems(fullCatalog);
      homeCatalogFilterIndexReady = true;
      homeCatalogFilterResultOffset = Math.min(homeCatalogItems.length || homeCatalogPageSize(), homeCatalogFilterResultItems.length);
      homeCatalogItems = homeCatalogFilterResultItems.slice(0, homeCatalogFilterResultOffset);
      homeCatalogTotal = homeCatalogFilterResultItems.length;
      homeCatalogAvailableTotal = homeCatalogItems.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
      homeCatalogHasMore = homeCatalogFilterResultOffset < homeCatalogFilterResultItems.length;
      renderHomeCatalogGrid();
      return homeCatalogItems.length - before;
    }
    if (homeCatalogFilterResultItems) {
      homeCatalogFilterResultOffset = Math.min(homeCatalogFilterResultOffset + 24, homeCatalogFilterResultItems.length);
      homeCatalogItems = homeCatalogFilterResultItems.slice(0, homeCatalogFilterResultOffset);
      homeCatalogAvailableTotal = homeCatalogItems.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
      homeCatalogHasMore = homeCatalogFilterResultOffset < homeCatalogFilterResultItems.length;
      renderHomeCatalogGrid();
      return homeCatalogItems.length - before;
    }
    const nextPage = homeCatalogPage + 1;
    const nextItems = await fetchHomeCatalogPage(nextPage);
    const existing = new Set(homeCatalogItems.map((item) => item.url));
    const additions = nextItems.filter((item) => item?.url && !existing.has(item.url));
    homeCatalogItems.push(...additions);
    homeCatalogPage = nextPage;
    if (homeCatalogMode === "manga") homeCatalogAvailableTotal = homeCatalogItems.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
    homeCatalogHasMore = nextItems.hasNextPage !== void 0 ? Boolean(nextItems.hasNextPage) : homeCatalogMode === "manga" ? homeCatalogHasMore : Boolean(nextItems.length) && (!homeCatalogTotal || homeCatalogItems.length < homeCatalogTotal);
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
function appendHomeCatalogFeedCards(newItems) {
  const grid = document.getElementById("homeCatalogGrid");
  if (!grid || !newItems.length) {
    syncHomeCatalogFeedUi();
    return;
  }
  grid.insertAdjacentHTML("beforeend", newItems.map((item, index) => homeCatalogCardHtml(item, index)).join(""));
  bindHomeCatalogCards(grid);
  syncHomeCatalogFeedUi();
}
function syncHomeCatalogFeedUi() {
  const visibleCount = homeCatalogMode === "manga" ? homeCatalogFilterResultItems ? homeCatalogItems.length : filterMangaCatalogItems(homeCatalogItems).length : getHomeCatalogVisibleItems().length;
  const text = homeCatalogCountText(visibleCount);
  document.getElementById("homeCatalogCount")?.replaceChildren(document.createTextNode(text));
  document.getElementById("homeCatalogResultsLabel")?.replaceChildren(document.createTextNode(text));
  const number = document.getElementById("homeCatalogResultNumber");
  if (number) number.textContent = formatHomeCatalogNumber(homeCatalogTotal || visibleCount);
  syncHomeCatalogPagination();
}
function ensureHomeCatalogFeedObserver() {
  const sentinel = document.getElementById("homeCatalogFeedSentinel");
  if (!sentinel) return;
  if (homeCatalogFeedObserver) {
    homeCatalogFeedObserver.disconnect();
    homeCatalogFeedObserver = null;
  }
  if (homeCatalogMode === "manga") {
    sentinel.hidden = true;
    return;
  }
  const reachedCap = homeCatalogItems.length >= HOME_CATALOG_FEED_MAX_ITEMS;
  sentinel.hidden = !homeCatalogHasMore || reachedCap || homeCatalogFeedError;
  const retry = sentinel.querySelector("[data-catalog-feed-retry]");
  if (retry) retry.hidden = !homeCatalogFeedError;
  if (!homeCatalogHasMore || reachedCap || homeCatalogFeedError || Date.now() < homeCatalogFeedCooldownUntil) return;
  if (typeof IntersectionObserver === "undefined") return;
  homeCatalogFeedObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) void loadHomeCatalogFeedBatch();
  }, { rootMargin: "900px 0px 0px 0px", threshold: 0 });
  homeCatalogFeedObserver.observe(sentinel);
}
async function loadHomeCatalogFeedBatch() {
  if (homeCatalogMode === "manga") return;
  if (homeCatalogFeedBusy || homeCatalogLoading || !homeCatalogHasMore) return;
  if (Router.currentRoute !== "main") return;
  if (homeCatalogItems.length >= HOME_CATALOG_FEED_MAX_ITEMS) return;
  homeCatalogFeedBusy = true;
  homeCatalogFeedError = false;
  const loader = document.getElementById("homeCatalogFeedLoader");
  if (loader) loader.hidden = false;
  try {
    await loadHomeCatalogNextPage();
    homeCatalogFeedCooldownUntil = 0;
  } catch (error) {
    homeCatalogFeedError = true;
    homeCatalogFeedCooldownUntil = 0;
    const retry = document.querySelector("[data-catalog-feed-retry]");
    if (retry) retry.hidden = false;
    showToast("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0449\u0435 \u0430\u043D\u0456\u043C\u0435");
  } finally {
    homeCatalogFeedBusy = false;
    if (loader) loader.hidden = true;
    ensureHomeCatalogFeedObserver();
  }
}
async function reloadHomeCatalog() {
  const grid = document.getElementById("homeCatalogGrid");
  if (!grid) return;
  const requestId = ++homeCatalogRequestId;
  updateHomeCatalogModeLabels();
  syncHomeCatalogModeControls();
  homeCatalogLoading = true;
  homeCatalogFilterResultItems = null;
  homeCatalogFilterResultOffset = 0;
  homeCatalogFilterIndexReady = false;
  homeCatalogPage = 1;
  homeCatalogTotal = 0;
  homeCatalogAvailableTotal = 0;
  homeCatalogHasMore = true;
  homeCatalogFeedError = false;
  homeCatalogFeedCooldownUntil = 0;
  document.getElementById("homeCatalogCount")?.replaceChildren(document.createTextNode("\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F..."));
  document.getElementById("homeCatalogResultsLabel")?.replaceChildren(document.createTextNode("\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F..."));
  grid.innerHTML = renderAnimeCardSkeleton(12);
  try {
    let nextItems;
    const hasMangaFilters = homeCatalogMode === "manga" && (homeCatalogAge !== "all" || homeCatalogAdult || homeCatalogAvailability !== "all" || homeCatalogGenres.size > 0 || homeCatalogSort === "title" || homeCatalogSort === "alpha");
    if (hasMangaFilters) {
      const firstItems = await fetchHomeCatalogPage(1);
      nextItems = filterMangaCatalogItems(firstItems);
      homeCatalogPage = 1;
      homeCatalogHasMore = true;
      loadHoneyMangaFullCatalog().then((fullCatalog) => {
        if (requestId !== homeCatalogRequestId || homeCatalogMode !== "manga") return;
        homeCatalogFilterResultItems = filterMangaCatalogItems(fullCatalog);
        homeCatalogFilterIndexReady = true;
        homeCatalogFilterResultOffset = Math.min(homeCatalogPageSize(), homeCatalogFilterResultItems.length);
        homeCatalogItems = homeCatalogFilterResultItems.slice(0, homeCatalogFilterResultOffset);
        homeCatalogTotal = homeCatalogFilterResultItems.length;
        homeCatalogAvailableTotal = homeCatalogItems.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
        homeCatalogHasMore = homeCatalogFilterResultOffset < homeCatalogFilterResultItems.length;
        renderHomeCatalogGrid();
        syncHomeCatalogMoreButton();
      }).catch(() => {
      });
    } else {
      nextItems = await fetchHomeCatalogPageSafe(1);
    }
    if (requestId !== homeCatalogRequestId) return;
    homeCatalogItems = nextItems;
    if (homeCatalogMode === "manga") homeCatalogAvailableTotal = homeCatalogItems.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
    syncHomeCatalogGenreControl();
    renderHomeCatalogGrid();
    syncHomeCatalogMoreButton();
  } catch (error) {
    if (requestId !== homeCatalogRequestId) return;
    grid.innerHTML = `<div class="home-catalog-empty">\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u043A\u0430\u0442\u0430\u043B\u043E\u0433. \u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437.</div>`;
    showToast("\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443");
  } finally {
    if (requestId === homeCatalogRequestId) homeCatalogLoading = false;
  }
}
async function loadHomeCatalogMore() {
  if (homeCatalogLoading) return;
  const button = document.getElementById("homeCatalogMoreBtn");
  if (!button) return;
  homeCatalogLoading = true;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> \u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F...';
  try {
    if (homeCatalogMode === "manga" && homeCatalogAge !== "all" && !homeCatalogFilterResultItems) {
      const fullCatalog = await loadHoneyMangaFullCatalog();
      homeCatalogFilterResultItems = filterMangaCatalogItems(fullCatalog);
      homeCatalogFilterIndexReady = true;
      homeCatalogFilterResultOffset = Math.min(homeCatalogItems.length || homeCatalogPageSize(), homeCatalogFilterResultItems.length);
      homeCatalogItems = homeCatalogFilterResultItems.slice(0, homeCatalogFilterResultOffset);
      homeCatalogTotal = homeCatalogFilterResultItems.length;
      homeCatalogAvailableTotal = homeCatalogItems.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
      homeCatalogHasMore = homeCatalogFilterResultOffset < homeCatalogFilterResultItems.length;
      renderHomeCatalogGrid();
      if (!homeCatalogHasMore) button.remove();
      else {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-plus"></i> \u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438';
      }
      return;
    }
    if (homeCatalogFilterResultItems) {
      homeCatalogFilterResultOffset = Math.min(homeCatalogFilterResultOffset + 24, homeCatalogFilterResultItems.length);
      homeCatalogItems = homeCatalogFilterResultItems.slice(0, homeCatalogFilterResultOffset);
      homeCatalogAvailableTotal = homeCatalogItems.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
      homeCatalogHasMore = homeCatalogFilterResultOffset < homeCatalogFilterResultItems.length;
      renderHomeCatalogGrid();
      if (!homeCatalogHasMore) button.remove();
      else {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-plus"></i> \u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438';
      }
      return;
    }
    const nextPage = homeCatalogPage + 1;
    const nextItems = await fetchHomeCatalogPage(nextPage);
    const existing = new Set(homeCatalogItems.map((item) => item.url));
    homeCatalogItems.push(...nextItems.filter((item) => item.url && !existing.has(item.url)));
    homeCatalogPage = nextPage;
    if (homeCatalogMode === "manga") homeCatalogAvailableTotal = homeCatalogItems.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
    renderHomeCatalogGrid();
    homeCatalogHasMore = nextItems.hasNextPage !== void 0 ? Boolean(nextItems.hasNextPage) : homeCatalogMode === "manga" ? homeCatalogHasMore : Boolean(nextItems.length) && (!homeCatalogTotal || homeCatalogItems.length < homeCatalogTotal);
    if (!homeCatalogHasMore) button.remove();
    else {
      button.disabled = false;
      button.innerHTML = '<i class="fas fa-plus"></i> \u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438';
    }
  } catch (error) {
    button.disabled = false;
    button.innerHTML = '<i class="fas fa-rotate-right"></i> \u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438 \u0449\u0435';
    showToast("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u043D\u0430\u0441\u0442\u0443\u043F\u043D\u0443 \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0443 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443");
  } finally {
    homeCatalogLoading = false;
  }
}
function syncHomeCatalogMoreButton() {
  document.getElementById("homeCatalogMoreBtn")?.remove();
}
async function loadAndDisplayGenreSections() {
  const requestId = ++homeSectionsRequestId;
  const catalogRequestId = ++homeCatalogRequestId;
  const container = document.getElementById("genreSectionsContainer");
  if (!container) return;
  container.style.display = "flex";
  homeCatalogPage = 1;
  homeCatalogItems = [];
  homeCatalogTotal = 0;
  homeCatalogAvailableTotal = 0;
  homeCatalogHasMore = true;
  homeCatalogFilterResultItems = null;
  homeCatalogFilterResultOffset = 0;
  homeCatalogLoading = false;
  container.innerHTML = buildHomeCatalogSectionHtml([]);
  const initialGrid = container.querySelector("#homeCatalogGrid");
  if (initialGrid) initialGrid.innerHTML = renderAnimeCardSkeleton(12);
  bindHomeCatalogCards(container);
  bindHomeCatalogMenu(container);
  syncHomeCatalogGenreControl(container);
  syncHomeCatalogMoreButton();
  try {
    const catalogItems = await fetchHomeCatalogPageSafe(1).catch((error) => {
      console.error("\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443:", error);
      homeCatalogTotal = 0;
      throw error;
    });
    if (requestId !== homeSectionsRequestId) return;
    homeCatalogItems = catalogItems.filter((item) => item?.url);
    if (homeCatalogMode === "manga") homeCatalogAvailableTotal = homeCatalogItems.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
    syncHomeCatalogGenreControl(container);
    renderHomeCatalogGrid();
    syncHomeCatalogMoreButton();
  } catch (err) {
    console.error("\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0433\u043E\u043B\u043E\u0432\u043D\u043E\u0457 \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0438:", err);
    const grid = container.querySelector("#homeCatalogGrid");
    if (grid) {
      grid.innerHTML = `<div class="home-catalog-empty">\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u043A\u0430\u0442\u0430\u043B\u043E\u0433. <button class="btn-outline" type="button" id="homeCatalogRetryBtn">\u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438 \u0449\u0435</button></div>`;
      grid.querySelector("#homeCatalogRetryBtn")?.addEventListener("click", () => reloadHomeCatalog());
    }
    homeCatalogHasMore = false;
    syncHomeCatalogMoreButton();
  }
}
function statusLabelUa(status) {
  const map = { ongoing: "\u041E\u043D\u0433\u043E\u0456\u043D\u0433", released: "\u0412\u0438\u0439\u0448\u043B\u043E", finished: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E", completed: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E", anons: "\u0410\u043D\u043E\u043D\u0441" };
  if (!status) return "";
  return map[status] || status.charAt(0).toUpperCase() + status.slice(1);
}
function buildAnimeCarouselSectionHtml(sectionId, name, items, variant) {
  if (!items || items.length === 0) return "";
  const isWide = variant === "wide";
  const cardsHtml = items.map((a) => {
    const poster = cardPoster(a);
    const title = a.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
    if (!isWide) {
      const type = "";
      return `
                            <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}">
                              <div class="anime-poster">
                                <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='${ANIME_CARD_PLACEHOLDER}'">
                                <span class="anime-card-type" data-role="type" ${type ? "" : "hidden"}>${type}</span>
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
    const progressHtml = a.progress != null ? `<div class="wide-card__progress"><div class="wide-card__progress-fill" style="width:${Math.min(a.progress, 100)}%"></div></div>` : "";
    return `
                            <div class="wide-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}">
                              <div class="wide-card__frame">
                                <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='${ANIME_CARD_PLACEHOLDER}'">
                                ${badges.length ? `<div class="wide-card__badges">${badges.join("")}</div>` : ""}
                                <div class="wide-card__play"><i class="fas fa-play"></i></div>
                                ${progressHtml}
                                <div class="wide-card__title">${title}</div>
                              </div>
                            </div>
                          `;
  }).join("");
  return `
                    <div class="genre-section" id="${sectionId}">
                      <div class="genre-title">
                        <span class="genre-name">${name}</span>
                      </div>
                      <div class="genre-carousel-wrapper">
                        <button class="carousel-btn carousel-btn-left" data-target="${sectionId}" aria-label="\u0412\u043B\u0456\u0432\u043E"><i class="fas fa-chevron-left"></i></button>
                        <div class="genre-carousel${isWide ? " genre-carousel--wide" : ""}" id="${sectionId}-carousel">
                          ${cardsHtml}
                        </div>
                        <button class="carousel-btn carousel-btn-right" data-target="${sectionId}" aria-label="\u0412\u043F\u0440\u0430\u0432\u043E"><i class="fas fa-chevron-right"></i></button>
                      </div>
                    </div>
                  `;
}
function buildPopularVerticalCardsHtml(items, indexOffset = 0) {
  return items.map((a, idx) => {
    const index = indexOffset + idx;
    const poster = cardPoster(a);
    const delay = indexOffset > 0 ? 0 : idx * 0.03;
    const title = a.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
    const synopsis = (a.synopsis || a.description || "").trim();
    const description = synopsis ? synopsis.length > 130 ? `${synopsis.slice(0, 130)}\u2026` : synopsis : "\u041E\u043F\u0438\u0441 \u0432\u0456\u0434\u0441\u0443\u0442\u043D\u0456\u0439.";
    const isManga = homeRecommendationMode === "manga" || Boolean(a.honeyId || a.honeyTitleId);
    const honeyId = a.honeyId || a.honeyTitleId || (isManga ? String(a.url || "").split("/").filter(Boolean).pop() : "");
    const episodesLabel = isManga ? Number(a.chapters || 0) > 0 ? `\u0413\u043B\u0430\u0432: ${a.chapters}` : "\u041C\u0430\u043D\u0491\u0430" : homeRecommendationEpisodesMap.get(a.url) || "\u0421\u0435\u0440\u0456\u0439: \u2026";
    return `
                    <div class="popular-card${isManga ? " popular-card--manga" : ""}" data-url="${escapeHtml2(a.url || "")}" data-idx="${index}"${honeyId ? ` data-honey-id="${escapeHtml2(String(honeyId))}"` : ""}${a.readerUrl ? ` data-reader-url="${escapeHtml2(a.readerUrl)}"` : ""} data-reader-title="${escapeHtml2(title)}" tabindex="0" role="button" aria-label="${escapeHtml2(title)}" style="animation-delay:${delay}s">
                      <div class="popular-card__poster-wrap">
                        <div class="popular-card__poster">
                          <img src="${escapeHtml2(poster)}" alt="${escapeHtml2(title)}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='${ANIME_CARD_PLACEHOLDER}'">
                        </div>
                      </div>
                      <div class="popular-card__title">${escapeHtml2(title)}</div>
                      <div class="popular-card__desc">${escapeHtml2(description)}</div>
                      <div class="popular-card__episodes" aria-label="${isManga ? "\u041A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C \u0433\u043B\u0430\u0432" : "\u041A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C \u0441\u0435\u0440\u0456\u0439"}">${escapeHtml2(episodesLabel)}</div>
                    </div>
                  `;
  }).join("");
}
function cardPoster(a, fallback = ANIME_CARD_PLACEHOLDER) {
  return a?.images?.jpg?.medium_image_url || a?.images?.jpg?.large_image_url || a?.poster || a?.image || fallback;
}
function buildPopularVerticalSectionHtml(items) {
  if (!items || items.length === 0) return "";
  const cardsHtml = buildPopularVerticalCardsHtml(items);
  return `
                    <div class="genre-section" id="genre-popular">
                      <div class="popular-list popular-list--home">
                        ${cardsHtml}
                      </div>
                    </div>
                  `;
}
function setHomeRecommendationMode(mode = "anime") {
  homeRecommendationMode = mode === "manga" ? "manga" : "anime";
}
function setHomeRecommendationFilter(params = null) {
  homeRecommendationFilterParams = params ? { ...params, genres: Array.isArray(params.genres) ? [...params.genres] : [] } : null;
}
function setHomeRecommendationSearchQuery(query2 = "") {
  homeRecommendationSearchQuery = String(query2 || "").trim();
}
function handleHomeRecommendationScroll() {
  if (!homeRecommendationHasMore || homeRecommendationLoading) return;
  const remaining = document.documentElement.scrollHeight - (getPageScrollY() + window.innerHeight);
  if (remaining < Math.max(700, window.innerHeight * 1.25)) void loadMoreHomeRecommendations();
}
function ensureHomeRecommendationObserver() {
  const container = document.getElementById("homeRecommendationsContainer");
  if (!container) return;
  let sentinel = container.querySelector("#homeRecommendationFeedSentinel");
  if (!sentinel) {
    sentinel = document.createElement("div");
    sentinel.id = "homeRecommendationFeedSentinel";
    sentinel.className = "home-recommendation-feed-sentinel";
    sentinel.innerHTML = '<span class="home-recommendation-feed-loader" hidden><i class="fas fa-spinner fa-pulse"></i> \u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0443\u0454\u043C\u043E \u0449\u0435...</span>';
    container.append(sentinel);
  }
  sentinel.querySelector("[data-more-manga]")?.remove();
  sentinel.hidden = !homeRecommendationHasMore;
  homeRecommendationObserver?.disconnect();
  if (sentinel.hidden || typeof IntersectionObserver === "undefined") return;
  homeRecommendationObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) void loadMoreHomeRecommendations();
  }, { rootMargin: "1000px 0px 0px 0px", threshold: 0 });
  homeRecommendationObserver.observe(sentinel);
}
function bindHomeRecommendationCards(cards) {
  cards.forEach((card) => {
    if (card.dataset.bound === "1") return;
    card.dataset.bound = "1";
    const clickHandler = async () => {
      const honeyId = card.dataset.honeyId;
      const cardTitle = card.dataset.readerTitle || card.getAttribute("aria-label") || "\u041C\u0430\u043D\u0491\u0430";
      if (card.dataset.readerUrl) {
        Router.goTo("manga", { url: card.dataset.readerUrl, title: cardTitle });
        return;
      }
      if (honeyId) {
        card.dataset.opening = "1";
        card.setAttribute("aria-busy", "true");
        try {
          const item = homeRecommendationItems.find((entry) => String(entry.honeyId || entry.honeyTitleId) === String(honeyId)) || { honeyId, honeyTitleId: honeyId, title: cardTitle, chapters: 1 };
          const resolved = await resolveHoneyReader({ ...item, honeyTitleId: honeyId, chapters: Math.max(1, Number(item.chapters || 1)) });
          if (resolved?.readerUrl) {
            card.dataset.readerUrl = resolved.readerUrl;
            Router.goTo("manga", { url: resolved.readerUrl, title: cardTitle });
            return;
          }
        } catch {
        } finally {
          delete card.dataset.opening;
          card.removeAttribute("aria-busy");
        }
      }
      if (card.dataset.url) {
        if (card.dataset.honeyId) {
          Router.goTo("manga", { url: card.dataset.url, title: cardTitle });
        } else {
          openPlayerPage(card.dataset.url);
        }
      }
    };
    card.addEventListener("click", clickHandler);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        clickHandler();
      }
    });
  });
}
function homeFeedList() {
  return document.querySelector("#homeRecommendationsContainer .popular-list--home");
}
function hydrateHomeFeedEpisodes(list) {
  if (!list || homeRecommendationMode === "manga") return;
  const viewTop = getPageScrollY();
  const viewBottom = viewTop + window.innerHeight;
  let queued = 0;
  for (const card of list.querySelectorAll(":scope > .popular-card")) {
    const epEl = card.querySelector(".popular-card__episodes");
    if (!epEl) continue;
    const url = card.dataset.url;
    const cached = url && homeRecommendationEpisodesMap.get(url);
    if (cached) {
      if (epEl.textContent !== cached) epEl.textContent = cached;
      continue;
    }
    if (!url || homeEpisodesInFlight.has(url)) continue;
    if (epEl.textContent && !epEl.textContent.includes("\u2026")) continue;
    const rect = card.getBoundingClientRect();
    const cardTopDoc = rect.top + viewTop;
    if (cardTopDoc > viewBottom + 400 || cardTopDoc + rect.height < viewTop - 200) continue;
    homeEpisodesInFlight.add(url);
    queued++;
    fetchAnimeLite(url).then((detail) => {
      homeRecommendationEpisodesMap.set(url, detail?.episodes != null ? `\u0421\u0435\u0440\u0456\u0439: ${detail.episodes}` : "\u0421\u0435\u0440\u0456\u0439: \u2013");
    }).catch(() => {
      homeRecommendationEpisodesMap.set(url, "\u0421\u0435\u0440\u0456\u0439: \u2013");
    }).finally(() => {
      homeEpisodesInFlight.delete(url);
      const text = homeRecommendationEpisodesMap.get(url) || "\u0421\u0435\u0440\u0456\u0439: \u2013";
      list.querySelectorAll(`.popular-card[data-url="${CSS.escape(url)}"] .popular-card__episodes`).forEach((el) => {
        el.textContent = text;
      });
    });
    if (queued >= 6) break;
  }
}
function resetHomeFeedRecycler() {
  homeEpisodesLastRun = 0;
}
function syncHomeFeedWindow() {
  if (Router.currentRoute !== "main") return;
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
  requestAnimationFrame(() => {
    recyclerRafPending = false;
    syncHomeFeedWindow();
  });
}
function bindHomeFeedRecycler() {
  if (recyclerScrollBound) return;
  recyclerScrollBound = true;
  window.addEventListener("scroll", scheduleHomeFeedSync, { passive: true });
  window.addEventListener("resize", scheduleHomeFeedSync, { passive: true });
}
async function loadHomeRecommendations(options = {}) {
  const container = document.getElementById("homeRecommendationsContainer");
  const forceReload = options?.reload === true;
  if (!container || homeRecommendationLoading && !forceReload) return;
  const requestId = ++homeRecommendationRequestId;
  homeRecommendationFilteredItems = null;
  homeRecommendationLoading = true;
  container.dataset.loading = "true";
  container.innerHTML = renderPopularCardSkeleton(6);
  try {
    let items;
    if (homeRecommendationMode === "manga") {
      if (homeRecommendationSearchQuery) {
        const searched = await searchHoneyTitles(homeRecommendationSearchQuery);
        items = searched.filter((item) => !isHoneyPromoItemRaw(item)).map(honeyCatalogItem).filter((item) => !isHoneyPromoItem(item)).filter(isHoneyComicItem).filter((item) => !isAdultHoneyManga(item));
      } else if (homeRecommendationFilterParams) {
        const filterAdult = homeRecommendationFilterParams.age === "adult";
        const fullCatalog = await loadHoneyMangaFullCatalog(filterAdult);
        items = fullCatalog.filter((item) => {
          if (homeRecommendationFilterParams.genres?.length) {
            const itemGenres = (item.genres || []).map((g) => normalizeHoneyMatch(typeof g === "object" ? g.name || g.name_ua : g));
            const matchesGenre = homeRecommendationFilterParams.genres.some((fg) => itemGenres.includes(normalizeHoneyMatch(fg)));
            if (!matchesGenre) return false;
          }
          if (homeRecommendationFilterParams.availability === "available") {
            if (!item.readerAvailable && !item.readerUrl && Number(item.chapters || 0) <= 0) return false;
          }
          if (homeRecommendationFilterParams.age && homeRecommendationFilterParams.age !== "all") {
            if (homeRecommendationFilterParams.age === "adult" && honeyAgeCategory(item) !== "adult") return false;
            if (homeRecommendationFilterParams.age === "teen" && honeyAgeCategory(item) !== "teen") return false;
            if (homeRecommendationFilterParams.age === "children" && honeyAgeCategory(item) !== "children") return false;
          }
          return true;
        });
        if (homeRecommendationFilterParams.sort === "alpha") {
          items.sort((a, b) => (a.title || "").localeCompare(b.title || "", "uk"));
        }
      } else {
        items = await fetchHoneyCatalogPage(1);
      }
    } else {
      items = homeRecommendationSearchQuery ? await searchHikka(homeRecommendationSearchQuery, 1) : homeRecommendationFilterParams ? await fetchHikkaQuickFilter(1, homeRecommendationFilterParams) : await hikkaCatalog("anime", 1, { sort: ["score:desc", "scored_by:desc"], only_translated: true });
    }
    if (requestId !== homeRecommendationRequestId || Router.currentRoute !== "main") return;
    if (!items?.length) throw new Error("\u041F\u043E\u0440\u043E\u0436\u043D\u0456\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0456\u0439");
    if (homeRecommendationMode === "manga" && (homeRecommendationSearchQuery || homeRecommendationFilterParams)) {
      homeRecommendationFilteredItems = items;
      items = items.slice(0, 28);
    }
    homeRecommendationItems = [...items];
    homeRecommendationPage = 1;
    homeRecommendationHasMore = homeRecommendationMode === "manga" ? homeRecommendationFilteredItems ? homeRecommendationFilteredItems.length > items.length : Boolean(items.hasNextPage) : items.hasNextPage !== false && items.length > 0;
    container.innerHTML = buildPopularVerticalSectionHtml(homeRecommendationItems);
    container.style.display = "block";
    bindHomeRecommendationCards([...container.querySelectorAll(".popular-card")]);
    resetHomeFeedRecycler();
    syncHomeFeedWindow();
    bindHomeFeedRecycler();
    ensureHomeRecommendationObserver();
    loadHomeRecommendationDetails(items, 0, requestId);
    container.querySelector("#homePopularShowAllBtn")?.addEventListener("click", () => {
      window.location.hash = "catalog";
    });
    if (!homeRecommendationScrollBound && typeof IntersectionObserver === "undefined") {
      window.addEventListener("scroll", handleHomeRecommendationScroll, { passive: true });
      homeRecommendationScrollBound = true;
    }
  } catch (error) {
    if (requestId !== homeRecommendationRequestId || Router.currentRoute !== "main") return;
    console.warn("[home recommendations] failed:", error);
    container.innerHTML = homeRecommendationSearchQuery ? `<div class="home-recommendations-empty">\u0417\u0430 \u0437\u0430\u043F\u0438\u0442\u043E\u043C \xAB${escapeHtml2(homeRecommendationSearchQuery)}\xBB \u043D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E.</div>` : homeRecommendationFilterParams ? '<div class="home-recommendations-empty">\u0417\u0430 \u0446\u0438\u043C \u0444\u0456\u043B\u044C\u0442\u0440\u043E\u043C \u043D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E.</div>' : '<div class="home-recommendations-empty">\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0456\u0457 \u0442\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0456.</div>';
  } finally {
    if (requestId !== homeRecommendationRequestId) return;
    homeRecommendationLoading = false;
    container.dataset.loading = "false";
  }
}
async function loadMoreHomeRecommendations() {
  const container = document.getElementById("homeRecommendationsContainer");
  if (!container || homeRecommendationLoading || !homeRecommendationHasMore) return;
  homeRecommendationLoading = true;
  const sentinel = container.querySelector("#homeRecommendationFeedSentinel");
  const loader = sentinel?.querySelector(".home-recommendation-feed-loader");
  if (loader) loader.hidden = false;
  try {
    const nextPage = homeRecommendationPage + 1;
    let nextItems;
    if (homeRecommendationMode === "manga") {
      nextItems = homeRecommendationFilteredItems ? homeRecommendationFilteredItems.slice(homeRecommendationItems.length, homeRecommendationItems.length + 28) : await fetchHoneyCatalogPage(nextPage);
    } else {
      nextItems = homeRecommendationSearchQuery ? await searchHikka(homeRecommendationSearchQuery, nextPage) : homeRecommendationFilterParams ? await fetchHikkaQuickFilter(nextPage, homeRecommendationFilterParams) : await hikkaCatalog("anime", nextPage, { sort: ["score:desc", "scored_by:desc"], only_translated: true });
    }
    const keyFn = (item) => homeRecommendationMode === "manga" ? item.honeyId || item.url : item.url;
    const existing = new Set(homeRecommendationItems.map(keyFn));
    const uniqueItems = nextItems.filter((item) => keyFn(item) && !existing.has(keyFn(item)));
    const offset = homeRecommendationItems.length;
    homeRecommendationItems.push(...uniqueItems);
    homeRecommendationPage = nextPage;
    homeRecommendationHasMore = homeRecommendationMode === "manga" ? homeRecommendationFilteredItems ? homeRecommendationItems.length < homeRecommendationFilteredItems.length : Boolean(nextItems.hasNextPage) && uniqueItems.length > 0 : nextItems.hasNextPage !== false && uniqueItems.length > 0;
    const list = container.querySelector(".popular-list--home");
    if (list) list.insertAdjacentHTML("beforeend", buildPopularVerticalCardsHtml(uniqueItems, offset));
    bindHomeRecommendationCards([...container.querySelectorAll(".popular-card")]);
    loadHomeRecommendationDetails(uniqueItems, offset, homeRecommendationRequestId);
    requestAnimationFrame(() => {
      scheduleHomeFeedSync();
      handleHomeRecommendationScroll();
    });
  } catch (error) {
    console.warn("[home recommendations more] failed:", error);
  } finally {
    homeRecommendationLoading = false;
    if (loader) loader.hidden = true;
    ensureHomeRecommendationObserver();
  }
}
async function loadHomeRecommendationDetails(list, indexOffset = 0, requestId = homeRecommendationRequestId) {
  const container = document.getElementById("homeRecommendationsContainer");
  const detailItems = list.slice(0, 8);
  let cursor = 0;
  if (homeRecommendationMode === "manga") return;
  async function worker() {
    while (cursor < detailItems.length) {
      if (requestId !== homeRecommendationRequestId || Router.currentRoute !== "main") return;
      const index = cursor++;
      const card = container?.querySelector(`.popular-card[data-idx="${indexOffset + index}"]`);
      if (!card) continue;
      const episodes = card.querySelector(".popular-card__episodes");
      try {
        const detail = await fetchAnimeLite(detailItems[index].url);
        if (requestId !== homeRecommendationRequestId || Router.currentRoute !== "main") return;
        const epText = detail?.episodes != null ? `\u0421\u0435\u0440\u0456\u0439: ${detail.episodes}` : "\u0421\u0435\u0440\u0456\u0439: \u2013";
        homeRecommendationEpisodesMap.set(detailItems[index].url, epText);
        if (episodes) episodes.textContent = epText;
      } catch (error) {
        if (requestId !== homeRecommendationRequestId || Router.currentRoute !== "main") return;
        homeRecommendationEpisodesMap.set(detailItems[index].url, "\u0421\u0435\u0440\u0456\u0439: \u2013");
        if (episodes) episodes.textContent = "\u0421\u0435\u0440\u0456\u0439: \u2013";
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, detailItems.length) }, worker));
}
function buildHistoryCarouselSectionHtml() {
  const history2 = Storage.getHistory() || [];
  if (!history2.length) return "";
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  for (const h of history2) {
    const key = h.animeId || h.url;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    let epLabel = "";
    if (h.episode) epLabel = h.season ? `\u0421${h.season} \xB7 \u0415${h.episode}` : `\u0415${h.episode}`;
    items.push({
      url: h.url,
      title: h.title,
      images: { jpg: { large_image_url: h.poster || "" } },
      epLabel,
      progress: typeof h.progress === "number" ? h.progress : null
    });
    if (items.length >= 20) break;
  }
  if (!items.length) return "";
  return buildAnimeCarouselSectionHtml("history-watched", "\u0412\u0438 \u0434\u0438\u0432\u0438\u043B\u0438\u0441\u044F", items, "wide");
}
async function openScheduleItemInPlayer(title, el) {
  if (!title) return;
  const englishTitle = el?.dataset?.titleEn || "";
  const scheduleSlug = el?.dataset?.slug || "";
  if (el && el.classList.contains("schedule-item--loading")) return;
  if (el) el.classList.add("schedule-item--loading");
  try {
    let results = await searchHikka(title, 1);
    if ((!results || !results.length) && englishTitle && englishTitle !== title) results = await searchHikka(englishTitle, 1);
    if (results && results.length) {
      openPlayerPage(results[0].url);
    } else if (scheduleSlug) {
      searchHikka(scheduleSlug || title, 1).then((found) => found[0] && openPlayerPage(found[0].url));
    } else {
      showToast(`\u041D\u0435 \u0437\u043D\u0430\u0439\u0448\u043B\u0438 \xAB${title}\xBB \u2014 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0448\u0443\u043A \u0432\u0440\u0443\u0447\u043D\u0443`);
      searchPageState.query = title;
      searchPageState.page = 1;
      Router.goTo("search");
    }
  } catch (err) {
    showToast("\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u043F\u043E\u0448\u0443\u043A\u0443: " + err.message);
  } finally {
    if (el) el.classList.remove("schedule-item--loading");
  }
}
var HOME_CATALOG_ANIME_TIMEOUT_MS, currentTab, currentPage, currentSearchQuery, currentCategory, quickFilterParams, HOME_FEED_MAX_ITEMS, homeFeedItems, homeFeedPage, homeFeedHasMore, homeFeedLoading, homeFeedRequestId, homeFeedObserver, homeFeedRetryAt, setCurrentTab, setCurrentPage, setCurrentSearchQuery, setCurrentCategory, setQuickFilterParams, popularRenderGen, ANIME_CARD_PLACEHOLDER, animeCardDataMap, TMDB_ENRICH_CONCURRENCY, tmdbEnrichActive, tmdbEnrichQueue, animeCardObserver, ANIME_GRID_MAX_RENDERED, ANIME_GRID_RESTORE_ROWS, animeGridSpacerObserver, genreList, homeSectionsRequestId, homeCatalogRequestId, homeCatalogPage, homeCatalogItems, homeCatalogLoading, HOME_CATALOG_FEED_MAX_ITEMS, homeCatalogFeedObserver, homeCatalogFeedBusy, homeCatalogFeedCooldownUntil, homeCatalogFeedError, homeCatalogTotal, homeCatalogAvailableTotal, homeCatalogHasMore, homeCatalogMode, homeCatalogQuery, homeCatalogSort, homeCatalogView, homeCatalogPreset, homeCatalogGenre, homeCatalogAdult, homeCatalogStatus, homeCatalogAvailability, homeCatalogAge, homeCatalogOrigin, homeCatalogGenres, homeCatalogType, homeCatalogYearMin, homeCatalogYearMax, homeCatalogScoreMin, homeCatalogFilterResultItems, homeCatalogFilterResultOffset, homeCatalogFilterIndexReady, HOME_MANGA_AGE_OPTIONS, honeyCatalogPageCache, honeyMangaApiCache, honeyMangaFullCatalogPromises, HOME_CATALOG_MODES, HOME_CATALOG_PRESETS, HONEY_API2, HONEY_SEARCH_API, HONEY_WEB2, HONEY_IMAGE, HONEY_SEARCH_PATTERN, honeySearchCache, honeyReaderCache, honeyReaderPendingCache, honeyAvailabilityMap, honeyAvailabilityMapPromise, HONEY_PROMO_MARKERS, HONEY_PROMO_POSTER_IDS, homeCatalogFilterOpen, CATALOG_YEAR_OPTIONS, CATALOG_YEAR_RANGES, CATALOG_TYPE_OPTIONS, CATALOG_SORT_OPTIONS, CATALOG_MANGA_GENRES, CATALOG_MANGA_AVAILABILITY_OPTIONS, CATALOG_MANGA_AGE_OPTIONS, homeRecommendationMode, homeRecommendationItems, homeRecommendationFilteredItems, homeRecommendationPage, homeRecommendationHasMore, homeRecommendationLoading, homeRecommendationScrollBound, homeRecommendationRequestId, homeRecommendationFilterParams, homeRecommendationSearchQuery, homeRecommendationObserver, recyclerRafPending, recyclerScrollBound, homeRecommendationEpisodesMap, homeEpisodesInFlight, homeEpisodesLastRun;
var init_homeLegacy = __esm({
  "src/js/pages/home/homeLegacy.js?v=20260926-comment-send-v1"() {
    init_constants2();
    init_app_legacy();
    init_settingsLegacy();
    init_debug();
    init_tmdb();
    init_catalog();
    init_image();
    init_manga();
    init_skeleton();
    init_searchPage();
    init_profileModals();
    init_mediaUpload();
    init_genrePage();
    HOME_CATALOG_ANIME_TIMEOUT_MS = 12e3;
    currentTab = "main";
    currentPage = 1;
    currentSearchQuery = "";
    currentCategory = "";
    quickFilterParams = null;
    HOME_FEED_MAX_ITEMS = 960;
    homeFeedItems = [];
    homeFeedPage = 1;
    homeFeedHasMore = true;
    homeFeedLoading = false;
    homeFeedRequestId = 0;
    homeFeedObserver = null;
    homeFeedRetryAt = 0;
    setCurrentTab = (value) => {
      currentTab = value;
    };
    setCurrentPage = (value) => {
      currentPage = value;
    };
    setCurrentSearchQuery = (value) => {
      currentSearchQuery = value;
    };
    setCurrentCategory = (value) => {
      currentCategory = value;
    };
    setQuickFilterParams = (value) => {
      quickFilterParams = value;
    };
    popularRenderGen = 0;
    ANIME_CARD_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><rect width="300" height="420" fill="#2a2a2a"/><text x="150" y="215" font-family="sans-serif" font-size="42" fill="#666" text-anchor="middle">?</text></svg>`
    );
    animeCardDataMap = /* @__PURE__ */ new Map();
    TMDB_ENRICH_CONCURRENCY = 3;
    tmdbEnrichActive = 0;
    tmdbEnrichQueue = [];
    animeCardObserver = null;
    ANIME_GRID_MAX_RENDERED = 120;
    ANIME_GRID_RESTORE_ROWS = 6;
    animeGridSpacerObserver = null;
    window.changePage = (p) => {
      if (p < 1) return;
      currentPage = p;
      window.scrollTo({ top: 0, behavior: "smooth" });
      loadContent();
    };
    genreList = Object.entries(GENRE_MAP2).map(([name, slug]) => ({ name, slug }));
    homeSectionsRequestId = 0;
    homeCatalogRequestId = 0;
    homeCatalogPage = 1;
    homeCatalogItems = [];
    homeCatalogLoading = false;
    HOME_CATALOG_FEED_MAX_ITEMS = 960;
    homeCatalogFeedObserver = null;
    homeCatalogFeedBusy = false;
    homeCatalogFeedCooldownUntil = 0;
    homeCatalogFeedError = false;
    homeCatalogTotal = 0;
    homeCatalogAvailableTotal = 0;
    homeCatalogHasMore = true;
    homeCatalogMode = "anime";
    homeCatalogQuery = "";
    homeCatalogSort = "score";
    homeCatalogView = "grid";
    homeCatalogPreset = "all";
    homeCatalogGenre = "all";
    homeCatalogAdult = false;
    homeCatalogStatus = "all";
    homeCatalogAvailability = "all";
    homeCatalogAge = "all";
    homeCatalogOrigin = "all";
    homeCatalogGenres = /* @__PURE__ */ new Set();
    homeCatalogType = "all";
    homeCatalogYearMin = "";
    homeCatalogYearMax = "";
    homeCatalogScoreMin = "";
    homeCatalogFilterResultItems = null;
    homeCatalogFilterResultOffset = 0;
    homeCatalogFilterIndexReady = false;
    HOME_MANGA_AGE_OPTIONS = [
      { key: "all", label: "\u0423\u0441\u0456" },
      { key: "adult", label: "\u0414\u043B\u044F \u0434\u043E\u0440\u043E\u0441\u043B\u0438\u0445" },
      { key: "teen", label: "\u0414\u043B\u044F \u043F\u0456\u0434\u043B\u0456\u0442\u043A\u0456\u0432" },
      { key: "children", label: "\u0414\u043B\u044F \u0434\u0456\u0442\u0435\u0439" }
    ];
    honeyCatalogPageCache = /* @__PURE__ */ new Map();
    honeyMangaApiCache = /* @__PURE__ */ new Map();
    honeyMangaFullCatalogPromises = /* @__PURE__ */ new Map();
    HOME_CATALOG_MODES = [
      { key: "anime", label: "\u0410\u043D\u0456\u043C\u0435", icon: "fa-photo-film" },
      { key: "manga", label: "\u041C\u0430\u043D\u0491\u0430", icon: "fa-palette" }
    ];
    HOME_CATALOG_PRESETS = [
      { key: "all", label: "\u0423\u0441\u0456" },
      { key: "finished", label: "\u041D\u0435\u0449\u043E\u0434\u0430\u0432\u043D\u043E \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0456" },
      { key: "ongoing", label: "\u041E\u043D\u0491\u043E\u0457\u043D\u0433" }
    ];
    HONEY_API2 = "https://data.api.honey-manga.com.ua";
    HONEY_SEARCH_API = "https://search.api.honey-manga.com.ua";
    HONEY_WEB2 = "https://honey-manga.com.ua";
    HONEY_IMAGE = "https://honeymangastorage-nocache.b-cdn.net/public-resources";
    HONEY_SEARCH_PATTERN = "/v2/manga/pattern?query=";
    honeySearchCache = /* @__PURE__ */ new Map();
    honeyReaderCache = /* @__PURE__ */ new Map();
    honeyReaderPendingCache = /* @__PURE__ */ new Map();
    honeyAvailabilityMap = null;
    honeyAvailabilityMapPromise = null;
    HONEY_PROMO_MARKERS = Object.freeze([
      "\u043D\u0430\u0448\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u043F\u043E\u043A\u0438\u0434\u0430\u0454",
      "group 17 october",
      "\u043D\u0435 \u0431\u0443\u0434\u0435\u043C\u043E \u043F\u0443\u0431\u043B\u0456\u043A\u0443\u0432\u0430\u0442\u0438\u0441\u044F",
      "\u0431\u0456\u043B\u044C\u0448\u0435 \u043D\u0435 \u043F\u0443\u0431\u043B\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F",
      "\u043F\u043E\u0432\u043D\u0438\u0439 \u043F\u0435\u0440\u0435\u043A\u043B\u0430\u0434 \u0432\u0436\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u043D\u0430 \u0456\u043D\u0448\u0438\u0445 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430\u0445",
      "\u043F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u044C \u043F\u0443\u0431\u043B\u0456\u043A\u0443\u0432\u0430\u0442\u0438\u0441\u044F \u043B\u0438\u0448\u0435 \u043D\u0430 \u0441\u0430\u0439\u0442\u0430\u0445",
      "\u043F\u0443\u0431\u043B\u0456\u043A\u0443\u0432\u0430\u0442\u0438\u0441\u044F \u043D\u0430 \u0446\u044C\u043E\u043C\u0443 \u0441\u0430\u0439\u0442\u0456",
      "\u043B\u0438\u0448\u0435 \u043D\u0430 \u0441\u0430\u0439\u0442\u0430\u0445",
      "\u0448\u0443\u043A\u0430\u0439\u0442\u0435 \u043D\u0430\u0441 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C",
      "\u0448\u0443\u043A\u0430\u0439\u0442\u0435 \u043D\u0430\u0441 \u0443 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C",
      "\u0441\u043B\u0456\u0434\u043A\u0443\u0432\u0430\u0442\u0438 \u0437\u0430 \u043E\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044F\u043C\u0438",
      "honey manga test",
      "\u0446\u0435 \u0442\u0435\u0441\u0442\u043E\u0432\u0438\u0439 \u043F\u0440\u043E\u0454\u043A\u0442 \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u0438\u0439 \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0446\u0456\u0454\u044E honey manga"
    ]);
    HONEY_PROMO_POSTER_IDS = /* @__PURE__ */ new Set([
      "3e0744af-b2df-4b30-88ff-b7eebac6040a",
      "6a651260-ba1f-4ddc-a329-f4816eedce66",
      "597ce558-0b8e-4770-bfd0-245e5f560253",
      "8500522d-977e-414a-bd54-a96b97724a6b",
      "5e2e6f20-30e0-4c3e-942c-67319481ec5f",
      "b2b40eb4-a98a-4012-9152-b476d56724e4",
      "76a4d92d-6009-42aa-b479-b42a57bcf880",
      "9c5e401f-e289-4933-9bad-d254e9452c8d",
      "defc7451-92f7-4f5e-b08e-622ffda621c9",
      "ea9d0b02-df08-419e-9fcc-e880b8046075",
      "ea7bfd2a-fbf4-48a4-b081-2e5b483e96df",
      "ac818eaf-a24b-43dc-9be9-f20686b10dc3",
      "f4047b8f-466f-458f-99dd-7b4cf716e643",
      "1e0749b9-a3ff-437d-b3e4-096c61f991d3",
      "745a8a95-02d0-4424-ab89-52bc768bdeb5",
      "68fcb44c-f5c6-4d0a-b204-90a768d5f3e4",
      "d47f4001-4623-4c24-949c-3614e1b6c9eb",
      "cf0aa010-9ca1-456a-b4c6-9635bf647681",
      "85847872-a303-41b5-9a37-4a010f048e84"
    ]);
    homeCatalogFilterOpen = false;
    CATALOG_YEAR_OPTIONS = [
      { key: "", label: "\u0411\u0443\u0434\u044C-\u044F\u043A\u0438\u0439" },
      { key: "ongoing", label: "\u041E\u043D\u0433\u043E\u0456\u043D\u0433" },
      { key: "2026", label: "2026" },
      { key: "2025", label: "2025" },
      { key: "2024", label: "2024" },
      { key: "2015-2023", label: "2015-2023" },
      { key: "2008-2014", label: "2008-2014" },
      { key: "2000-2007", label: "2000-2007" },
      { key: "before2000", label: "\u0434\u043E 2000" }
    ];
    CATALOG_YEAR_RANGES = {
      "2026": [2026, 2026],
      "2025": [2025, 2025],
      "2024": [2024, 2024],
      "2015-2023": [2015, 2023],
      "2008-2014": [2008, 2014],
      "2000-2007": [2e3, 2007],
      "before2000": [1970, 1999]
    };
    CATALOG_TYPE_OPTIONS = [
      { key: "", label: "\u0411\u0443\u0434\u044C-\u044F\u043A\u0438\u0439" },
      { key: "tv", label: "\u0421\u0435\u0440\u0456\u0430\u043B" },
      { key: "movie", label: "\u0424\u0456\u043B\u044C\u043C" },
      { key: "ova", label: "OVA" },
      { key: "ona", label: "ONA" },
      { key: "special", label: "\u0421\u043F\u0435\u0448\u043B" }
    ];
    CATALOG_SORT_OPTIONS = [
      { key: "rating", label: "\u0417\u0430 \u0440\u0435\u0439\u0442\u0438\u043D\u0433\u043E\u043C" },
      { key: "alpha", label: "\u0417\u0430 \u0430\u043B\u0444\u0430\u0432\u0456\u0442\u043E\u043C" },
      { key: "newest", label: "\u041D\u043E\u0432\u0456\u0448\u0456" }
    ];
    CATALOG_MANGA_GENRES = [
      "\u0420\u043E\u043C\u0430\u043D\u0442\u0438\u043A\u0430",
      "\u0424\u0435\u043D\u0442\u0435\u0437\u0456",
      "\u041A\u043E\u043C\u0435\u0434\u0456\u044F",
      "\u0414\u0440\u0430\u043C\u0430",
      "\u041F\u0440\u0438\u0433\u043E\u0434\u0438",
      "\u0411\u0443\u0434\u0435\u043D\u043D\u0456\u0441\u0442\u044C",
      "\u041C\u0456\u0441\u0442\u0438\u043A\u0430",
      "\u041F\u0441\u0438\u0445\u043E\u043B\u043E\u0433\u0456\u044F",
      "\u0421\u044C\u043E\u043D\u0435\u043D",
      "\u0421\u044C\u043E\u0434\u0437\u044C\u043E",
      "\u0416\u0430\u0445\u0438",
      "\u0414\u0435\u0442\u0435\u043A\u0442\u0438\u0432",
      "\u0424\u0430\u043D\u0442\u0430\u0441\u0442\u0438\u043A\u0430",
      "\u0411\u043E\u0439\u043E\u0432\u0438\u043A",
      "\u0406\u0441\u0435\u043A\u0430\u0439",
      "\u0428\u043A\u043E\u043B\u0430"
    ];
    CATALOG_MANGA_AVAILABILITY_OPTIONS = [
      { key: "all", label: "\u0423\u0441\u0456 \u0442\u0430\u0439\u0442\u043B\u0438" },
      { key: "available", label: "\u0404 \u0449\u043E \u0447\u0438\u0442\u0430\u0442\u0438" }
    ];
    CATALOG_MANGA_AGE_OPTIONS = [
      { key: "all", label: "\u0423\u0441\u0456" },
      { key: "general", label: "\u0414\u043B\u044F \u0432\u0441\u0456\u0445" },
      { key: "teen", label: "16+" },
      { key: "adult", label: "18+" }
    ];
    window.loadHomeCatalogMore = loadHomeCatalogMore;
    homeRecommendationMode = "anime";
    homeRecommendationItems = [];
    homeRecommendationFilteredItems = null;
    homeRecommendationPage = 1;
    homeRecommendationHasMore = false;
    homeRecommendationLoading = false;
    homeRecommendationScrollBound = false;
    homeRecommendationRequestId = 0;
    homeRecommendationFilterParams = null;
    homeRecommendationSearchQuery = "";
    homeRecommendationObserver = null;
    recyclerRafPending = false;
    recyclerScrollBound = false;
    homeRecommendationEpisodesMap = /* @__PURE__ */ new Map();
    homeEpisodesInFlight = /* @__PURE__ */ new Set();
    homeEpisodesLastRun = 0;
  }
});
