function withHomeCatalogTimeout2(promise, timeoutMs = HOME_CATALOG_ANIME_TIMEOUT_MS2) {
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
async function fetchHomeCatalogPageSafe2(page = 1) {
  const request = fetchHomeCatalogPage2(page);
  return homeCatalogMode2 === "anime" ? withHomeCatalogTimeout2(request) : request;
}
function scrollPageBy2(dy) {
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
async function fetchContent2() {
  if (currentTab2 === "top100") {
    return await fetchHikkaTop100();
  }
  if (currentSearchQuery2) {
    return await searchHikka(currentSearchQuery2, currentPage2);
  }
  if (quickFilterParams2) {
    const { fetchHikkaQuickFilter: fetchHikkaQuickFilter2 } = await Promise.resolve().then(() => (init_catalog(), catalog_exports));
    return await fetchHikkaQuickFilter2(currentPage2, quickFilterParams2);
  }
  if (currentCategory2) {
    return await fetchHikkaByCategory(currentCategory2, currentPage2);
  }
  return await fetchHikkaMain(currentPage2);
}
function showSkeleton2() {
  const container = document.getElementById("animeContainer");
  if (!container) return;
  if (currentTab2 === "top100") {
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
async function loadContent2() {
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
  if (currentTab2 === "main" && !currentSearchQuery2 && !currentCategory2 && !quickFilterParams2) {
    homeFeedItems2 = [];
    homeFeedPage2 = 1;
    homeFeedHasMore2 = true;
    homeFeedRetryAt2 = 0;
    ++homeFeedRequestId2;
    homeFeedObserver2?.disconnect();
    homeFeedObserver2 = null;
    document.getElementById("homeAnimeFeedSentinel")?.remove();
    resetAnimeGridWindow2();
  }
  showSkeleton2();
  try {
    const list = await fetchContent2();
    renderCards2(list);
  } catch (err) {
    container.innerHTML = `<div class="loader"><i class="fas fa-exclamation-triangle"></i> \u041F\u043E\u043C\u0438\u043B\u043A\u0430: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadContent()">\u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438 \u0437\u043D\u043E\u0432\u0443</button></div>`;
  }
}
function renderPopularCards2(list) {
  const container = document.getElementById("animeContainer");
  container.classList.add("popular-list");
  container.classList.remove("anime-grid");
  container.style.display = "";
  const gen = ++popularRenderGen2;
  container.innerHTML = list.map((a, idx) => {
    const poster = cardPoster2(a, "");
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
  renderPagination2();
  loadPopularCardDetails2(list, gen);
}
async function loadPopularCardDetails2(list, gen) {
  const container = document.getElementById("animeContainer");
  const CONCURRENCY = 4;
  let cursor = 0;
  async function worker() {
    while (cursor < list.length) {
      const i = cursor++;
      const item = list[i];
      if (gen !== popularRenderGen2) return;
      const card = container?.querySelector(`.popular-card[data-idx="${i}"]`);
      if (!card) continue;
      const badge = card.querySelector(".popular-card__rank");
      const descEl = card.querySelector(".popular-card__desc");
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 9e3));
        const detail = await Promise.race([fetchAnimeLite(item.url), timeoutPromise]);
        if (gen !== popularRenderGen2) return;
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
        if (gen !== popularRenderGen2) return;
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
function registerAnimeCardData2(list) {
  (list || []).forEach((a) => {
    if (a && a.url) animeCardDataMap2.set(a.url, a);
  });
}
function queueTmdbEnrich2(card) {
  if (!card || card.dataset.tmdbEnriched) return;
  card.dataset.tmdbEnriched = "pending";
  tmdbEnrichQueue2.push(card);
  pumpTmdbEnrichQueue2();
}
function pumpTmdbEnrichQueue2() {
  while (tmdbEnrichActive2 < TMDB_ENRICH_CONCURRENCY2 && tmdbEnrichQueue2.length) {
    const card = tmdbEnrichQueue2.shift();
    tmdbEnrichActive2++;
    runTmdbEnrichJob2(card).finally(() => {
      tmdbEnrichActive2--;
      pumpTmdbEnrichQueue2();
    });
  }
}
async function runTmdbEnrichJob2(card) {
  const item = animeCardDataMap2.get(card.dataset.url);
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
function getAnimeCardObserver2() {
  if (animeCardObserver2) return animeCardObserver2;
  animeCardObserver2 = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animeCardObserver2.unobserve(entry.target);
      queueTmdbEnrich2(entry.target);
    });
  }, { root: null, rootMargin: "250px", threshold: 0.01 });
  return animeCardObserver2;
}
function observeAnimeCardsForTmdb2(container) {
  if (!container || Router.currentRoute !== "main" || typeof IntersectionObserver === "undefined") return;
  const observer = getAnimeCardObserver2();
  container.querySelectorAll(".anime-card, .wide-card").forEach((card) => observer.observe(card));
}
function animeFeedCardHtml2(a, idx) {
  const poster = escapeHtml2(cardPoster2(a, ""));
  const title = escapeHtml2(a.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438");
  const type = escapeHtml2(a.typeLabel || animeTypeLabel(a.type));
  return `<div class="anime-card" data-url="${escapeHtml2(a.url || "")}" data-idx="${idx || 0}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${(idx || 0) * 0.03}s">
              <div class="anime-poster"><img src="${poster}" alt="${title}" loading="lazy" decoding="async" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.onerror=null;this.src='${ANIME_CARD_PLACEHOLDER2}'"><span class="anime-card-type" data-role="type">${type}</span></div>
              <div class="anime-title-under">${title}</div>
            </div>`;
}
function animeGridColumns2(container) {
  const cols = window.getComputedStyle(container).gridTemplateColumns.split(" ").filter(Boolean).length;
  return Math.max(1, cols || 2);
}
function ensureAnimeGridSpacer2(container) {
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
function observeAnimeGridSpacer2(container, spacer) {
  if (typeof IntersectionObserver === "undefined") return;
  animeGridSpacerObserver2?.disconnect();
  animeGridSpacerObserver2 = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) restoreAnimeGridAbove2(container);
  }, { rootMargin: "600px 0px 0px 0px", threshold: 0 });
  animeGridSpacerObserver2.observe(spacer);
}
function resetAnimeGridWindow2() {
  animeGridSpacerObserver2?.disconnect();
  animeGridSpacerObserver2 = null;
}
function trimAnimeGridAbove2(container) {
  if (!container || !container.classList.contains("anime-grid")) return;
  const cols = animeGridColumns2(container);
  const cards = [...container.querySelectorAll(":scope > .anime-card[data-idx]")];
  if (cards.length <= ANIME_GRID_MAX_RENDERED2) return;
  const overflow = cards.length - ANIME_GRID_MAX_RENDERED2;
  const trimRows = Math.floor(overflow / cols);
  if (trimRows <= 0) return;
  const trimCount = trimRows * cols;
  const firstTrimCard = cards[0];
  const firstKeptCard = cards[trimCount];
  if (!firstKeptCard) return;
  const removedH = Math.max(0, firstKeptCard.getBoundingClientRect().top - firstTrimCard.getBoundingClientRect().top);
  const spacer = ensureAnimeGridSpacer2(container);
  const spacerH = parseFloat(spacer.style.height) || 0;
  for (let i = 0; i < trimCount; i++) cards[i].remove();
  spacer.style.height = `${spacerH + removedH}px`;
  observeAnimeGridSpacer2(container, spacer);
}
function restoreAnimeGridAbove2(container) {
  const spacer = container.querySelector(":scope > .anime-grid-spacer");
  if (!spacer) return;
  const spacerH = parseFloat(spacer.style.height) || 0;
  if (spacerH <= 0) return;
  const cols = animeGridColumns2(container);
  const cards = [...container.querySelectorAll(":scope > .anime-card[data-idx]")];
  const renderedFirst = cards.length ? Number(cards[0].dataset.idx) : homeFeedItems2.length;
  const restoreCount = Math.min(renderedFirst, ANIME_GRID_RESTORE_ROWS2 * cols);
  if (restoreCount <= 0) return;
  const restoreFromIdx = renderedFirst - restoreCount;
  const insertItems = homeFeedItems2.slice(restoreFromIdx, renderedFirst);
  if (!insertItems.length) return;
  const beforeTop = spacer.getBoundingClientRect().top;
  const html = insertItems.map((item, i) => animeFeedCardHtml2(item, restoreFromIdx + i)).join("");
  spacer.insertAdjacentHTML("afterend", html);
  requestAnimationFrame(() => {
    const nextKeptCard = container.querySelector(`.anime-card[data-idx="${renderedFirst}"]`);
    const insertedH = nextKeptCard ? Math.max(0, nextKeptCard.getBoundingClientRect().top - beforeTop) : 0;
    spacer.style.height = `${Math.max(0, spacerH - insertedH)}px`;
    if (insertedH > 0) scrollPageBy2(insertedH);
    bindAnimeFeedCards2(container);
    observeAnimeCardsForTmdb2(container);
    observeAnimeGridSpacer2(container, spacer);
  });
}
function bindAnimeFeedCards2(root) {
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
function ensureAnimeFeedObserver2() {
  const container = document.getElementById("animeContainer");
  if (!container || currentTab2 !== "main" || currentSearchQuery2 || currentCategory2 || quickFilterParams2) return;
  let sentinel = document.getElementById("homeAnimeFeedSentinel");
  if (!sentinel) {
    sentinel = document.createElement("div");
    sentinel.id = "homeAnimeFeedSentinel";
    sentinel.className = "home-anime-feed-sentinel";
    sentinel.innerHTML = '<span class="home-anime-feed-loader" hidden><i class="fas fa-spinner fa-pulse"></i> \u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0443\u0454\u043C\u043E \u0449\u0435...</span>';
    container.after(sentinel);
  }
  sentinel.hidden = !homeFeedHasMore2 || homeFeedItems2.length >= HOME_FEED_MAX_ITEMS2;
  if (homeFeedObserver2) homeFeedObserver2.disconnect();
  if (sentinel.hidden || typeof IntersectionObserver === "undefined") return;
  homeFeedObserver2 = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) void loadMoreHomeAnime2();
  }, { rootMargin: "900px 0px", threshold: 0 });
  homeFeedObserver2.observe(sentinel);
}
async function loadMoreHomeAnime2() {
  if (homeFeedLoading2 || !homeFeedHasMore2 || Date.now() < homeFeedRetryAt2 || homeFeedItems2.length >= HOME_FEED_MAX_ITEMS2) return;
  if (Router.currentRoute !== "main" || currentTab2 !== "main" || currentSearchQuery2 || currentCategory2 || quickFilterParams2) return;
  const requestId = homeFeedRequestId2;
  const container = document.getElementById("animeContainer");
  const sentinel = document.getElementById("homeAnimeFeedSentinel");
  const loader = sentinel?.querySelector(".home-anime-feed-loader");
  homeFeedLoading2 = true;
  if (loader) loader.hidden = false;
  try {
    const nextPage = homeFeedPage2 + 1;
    const nextItems = await withHomeCatalogTimeout2(fetchHikkaMain(nextPage), HOME_CATALOG_ANIME_TIMEOUT_MS2);
    if (requestId !== homeFeedRequestId2 || Router.currentRoute !== "main") return;
    const existing = new Set(homeFeedItems2.map((item) => item.url));
    const additions = nextItems.filter((item) => item?.url && !existing.has(item.url));
    if (!additions.length) homeFeedHasMore2 = false;
    homeFeedItems2.push(...additions);
    homeFeedPage2 = nextPage;
    homeFeedHasMore2 = homeFeedHasMore2 && nextItems.hasNextPage !== false && nextItems.length > 0;
    registerAnimeCardData2(additions);
    if (container && additions.length) {
      container.insertAdjacentHTML("beforeend", additions.map((item, index) => animeFeedCardHtml2(item, homeFeedItems2.length - additions.length + index)).join(""));
      bindAnimeFeedCards2(container);
      observeAnimeCardsForTmdb2(container);
      trimAnimeGridAbove2(container);
    }
  } catch (error) {
    homeFeedRetryAt2 = Date.now() + 5e3;
    console.warn("Homepage infinite scroll failed:", error);
  } finally {
    homeFeedLoading2 = false;
    if (loader) loader.hidden = true;
    ensureAnimeFeedObserver2();
  }
}
function renderCards2(list) {
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
  if (currentTab2 === "top100") {
    renderPopularCards2(list);
    return;
  }
  container.classList.remove("popular-list");
  container.classList.add("anime-grid");
  container.style.display = "grid";
  registerAnimeCardData2(list);
  container.innerHTML = list.map(animeFeedCardHtml2).join("");
  bindAnimeFeedCards2(container);
  renderPagination2();
  if (currentTab2 === "main" && !currentSearchQuery2 && !currentCategory2 && !quickFilterParams2) {
    homeFeedItems2 = [...list];
    homeFeedPage2 = currentPage2;
    homeFeedHasMore2 = list.hasNextPage !== false && list.length > 0;
    document.getElementById("paginationRow")?.replaceChildren();
    ensureAnimeFeedObserver2();
  }
  observeAnimeCardsForTmdb2(container);
}
function renderPagination2() {
  const row = document.getElementById("paginationRow");
  if (!row) return;
  const prevDisabled = currentPage2 <= 1 ? "disabled" : "";
  row.innerHTML = `
            <button class="btn-outline" onclick="changePage(${currentPage2 - 1})" ${prevDisabled}><i class="fas fa-chevron-left"></i> \u041D\u0430\u0437\u0430\u0434</button>
            <span class="page-indicator">\u0421\u0442\u043E\u0440\u0456\u043D\u043A\u0430 ${currentPage2}</span>
            <button class="btn-outline" onclick="changePage(${currentPage2 + 1})">\u0412\u043F\u0435\u0440\u0435\u0434 <i class="fas fa-chevron-right"></i></button>
          `;
}
function showTop1002() {
  currentTab2 = "top100";
  currentPage2 = 1;
  currentSearchQuery2 = "";
  currentCategory2 = "";
  document.querySelectorAll(".action-pill").forEach((p) => p.classList.remove("active-pill"));
  document.getElementById("top100Btn")?.classList.add("active-pill");
  if (Router.currentRoute === "main") loadContent2();
  syncLeftdockActive();
  showToast("\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u0456 \u0430\u043D\u0456\u043C\u0435");
}
function openRandomAnime2() {
  fetchHikkaTop100().then((list) => list[0] && openPlayerPage(list[0].url)).catch(() => showToast("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u043A\u0430\u0442\u0430\u043B\u043E\u0433"));
  showToast("\u0412\u0438\u043F\u0430\u0434\u043A\u043E\u0432\u0435 \u0430\u043D\u0456\u043C\u0435");
}
function homeCatalogRequestBody2() {
  const body = {};
  if (homeCatalogMode2 === "anime") body.only_translated = true;
  if (homeCatalogQuery2) body.query = homeCatalogQuery2;
  if (homeCatalogSort2 === "score" || homeCatalogSort2 === "rating") body.sort = ["score:desc", "scored_by:desc"];
  else if (homeCatalogSort2 === "newest" || homeCatalogSort2 === "year") body.sort = ["start_date:desc"];
  else if (homeCatalogSort2 === "title" || homeCatalogSort2 === "alpha") body.sort = ["title_ua:asc"];
  if (homeCatalogMode2 === "anime" && homeCatalogType2 && homeCatalogType2 !== "all") {
    body.media_type = [homeCatalogType2];
  }
  if (homeCatalogMode2 === "anime") {
    if (homeCatalogGenres2.size > 0) {
      body.genres = [...homeCatalogGenres2].map((slugOrName) => {
        const found = Object.entries(GENRE_MAP2).find(([name, slug]) => slug === slugOrName || normalizeHoneyMatch2(name) === slugOrName);
        return found ? found[1] : slugOrName;
      });
    } else if (homeCatalogGenre2 !== "all") {
      const genreSlug = String(homeCatalogGenre2 || "").trim();
      if (genreSlug.startsWith("format:")) body.media_type = [genreSlug.slice(7)];
      else if (genreSlug) body.genres = [genreSlug];
    }
  }
  if (homeCatalogMode2 === "anime" && homeCatalogAge2 !== "all") {
    body.rating = homeCatalogAge2 === "adult" ? ["rx", "r_plus"] : homeCatalogAge2 === "teen" ? ["r", "pg_13"] : ["g", "pg"];
  }
  return body;
}
function honeyCatalogFilters2({ adult = homeCatalogAdult2 } = {}) {
  return [{ filterBy: "adult", filterValue: ["18+"], filterOperator: adult ? "IN" : "NOT_IN" }];
}
async function loadHoneyAvailabilityMap2() {
  if (!honeyAvailabilityMap2) honeyAvailabilityMap2 = { byHikka: {}, byHoney: {}, available: 0, honeyAvailable: 0 };
  return honeyAvailabilityMap2;
}
async function fetchHoneyJson2(path, options = {}, baseUrl = HONEY_API3) {
  const url = `${baseUrl}${path}`;
  const cacheKey = `${baseUrl}:${path}:${options.method || "GET"}:${options.body || ""}`;
  if (honeyMangaApiCache2.has(cacheKey)) return honeyMangaApiCache2.get(cacheKey);
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
    honeyMangaApiCache2.delete(cacheKey);
    throw error;
  });
  honeyMangaApiCache2.set(cacheKey, request);
  return request;
}
function normalizeHoneyMatch2(value = "") {
  return String(value || "").toLocaleLowerCase("uk-UA").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[’'\x60]/g, "").replace(/[^a-z0-9а-яіїєґ]+/gi, " ").trim();
}
async function searchHoneyTitles2(query2) {
  const normalized = normalizeHoneyMatch2(query2);
  if (!normalized) return [];
  if (honeySearchCache2.has(normalized)) return honeySearchCache2.get(normalized);
  const promise = fetchHoneyJson2(`${HONEY_SEARCH_PATTERN2}${encodeURIComponent(query2)}`, {}, HONEY_SEARCH_API2).then((payload) => Array.isArray(payload) ? payload : []).catch((error) => {
    console.warn("Honey Manga title search failed:", error);
    return [];
  });
  honeySearchCache2.set(normalized, promise);
  return promise;
}
function honeyCatalogItem2(item) {
  const posterId = item?.posterUrl || item?.posterId || "";
  const poster = posterId ? `${HONEY_IMAGE2}/${posterId}?optimizer=image&width=296` : ANIME_CARD_PLACEHOLDER2;
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
    url: mangaId ? `${HONEY_WEB3}/book/${mangaId}` : HONEY_WEB3,
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
function honeyPromoTextMatches2(value = "") {
  const haystack = normalizeHoneyMatch2(value);
  return Boolean(haystack) && HONEY_PROMO_MARKERS2.some((marker) => haystack.includes(normalizeHoneyMatch2(marker)));
}
function honeyPromoPosterMatches2(item = {}) {
  const posterValues = [
    item?.posterId,
    item?.posterUrl,
    item?.images?.jpg?.large_image_url,
    item?.images?.jpg?.image_url
  ].filter(Boolean).map((value) => String(value).trim());
  return posterValues.some((value) => HONEY_PROMO_POSTER_IDS2.has(value) || [...HONEY_PROMO_POSTER_IDS2].some((posterId) => value.includes(posterId)));
}
function isHoneyPromoItemRaw2(item = {}) {
  const posterId = String(item?.posterUrl || item?.posterId || "").trim();
  return HONEY_PROMO_POSTER_IDS2.has(posterId) || honeyPromoPosterMatches2(item) || honeyPromoTextMatches2([
    item?.title,
    item?.lowTitle,
    item?.alternativeTitle,
    item?.description,
    item?.slug,
    item?.posterUrl,
    item?.posterId
  ].filter(Boolean).join(" "));
}
function isHoneyPromoItem2(item = {}) {
  return honeyPromoPosterMatches2(item) || honeyPromoTextMatches2([
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
function isAdultHoneyManga2(item) {
  return /^18\+/.test(String(item?.adult || item?.ageRating || "").trim()) || item?.isAdultCover === true;
}
async function resolveHoneyReader2(item) {
  if (!item) return item;
  const mangaId = item.honeyId || item.honeyTitleId;
  if (!mangaId || Number(item.chapters || 0) <= 0) return item;
  const cacheKey = String(mangaId);
  if (honeyReaderCache2.has(cacheKey)) return { ...item, ...honeyReaderCache2.get(cacheKey) };
  try {
    const stored = localStorage.getItem(`vakdab_manga_reader_${cacheKey}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.readerUrl) {
        honeyReaderCache2.set(cacheKey, parsed);
        return { ...item, ...parsed };
      }
    }
  } catch {
  }
  if (honeyReaderPendingCache2.has(cacheKey)) {
    const pendingReader2 = await honeyReaderPendingCache2.get(cacheKey);
    return { ...item, ...pendingReader2 };
  }
  const pendingReader = (async () => {
    try {
      const payload = await fetchHoneyJson2("/v2/chapter/cursor-list", {
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
            (cand) => fetchHoneyJson2(`/v2/chapter/frames/${encodeURIComponent(cand.id)}/${encodeURIComponent(mangaId)}`).then((frames) => ({ candidate: cand, hasFrames: hasHoneyPageResources(frames) }))
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
        readerUrl: `${HONEY_WEB3}/read/${chapter.id}/${mangaId}`,
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
  honeyReaderPendingCache2.set(cacheKey, pendingReader);
  try {
    const reader = await pendingReader;
    honeyReaderCache2.set(cacheKey, reader);
    return { ...item, ...reader };
  } finally {
    honeyReaderPendingCache2.delete(cacheKey);
  }
}
async function attachHoneyReaders2(items) {
  if (homeCatalogMode2 !== "manga") return items;
  await loadHoneyAvailabilityMap2();
  return items.map((item) => ({ ...item, readerAvailable: Boolean(item.readerUrl) || Number(item.chapters) > 0 }));
}
function honeyAgeCategory2(item) {
  const age = String(item?.ageRating || item?.adult || "").trim().toLowerCase();
  if (/^18\+/.test(age) || item?.isAdultCover === true) return "adult";
  if (/^(0|6|12)\+/.test(age)) return "children";
  if (/^(14|16)\+/.test(age)) return "teen";
  const words = normalizeHoneyMatch2([...item?.genres || [], ...item?.tags || []].join(" "));
  if (/(18|adult|ерот|еччі|гарем|порн|для дорослих|хентай)/i.test(words)) return "adult";
  if (/(кодомо|для дітей|дитяч|сімейн|казк|дошкіль)/i.test(words)) return "children";
  return "teen";
}
function catalogAgeCategory2(item) {
  if (homeCatalogMode2 === "manga") return honeyAgeCategory2(item);
  const raw = Array.isArray(item?.rating) ? item.rating.join(" ") : String(item?.rating || item?.ageRating || item?.age_rating || "");
  const age = normalizeHoneyMatch2(raw);
  if (item?.isAdult === true || item?.adult === true || /rx|r plus|r\+|18|adult|hentai|ecchi/.test(age)) return "adult";
  if (/r|pg 13|pg13|13|14|15|16|teen/.test(age)) return "teen";
  if (/g|pg|0|6|12|children|kids|family|all ages/.test(age)) return "children";
  return "teen";
}
function homeCatalogGenreHtml2() {
  const genres = Object.entries(GENRE_MAP2).map(([name, slug]) => ({ name, slug })).sort((a, b) => a.name.localeCompare(b.name, "uk"));
  const allActive = homeCatalogGenre2 === "all";
  const allCard = `<button class="home-catalog-genre-card${allActive ? " active" : ""}" type="button" data-catalog-genre="all" aria-pressed="${allActive ? "true" : "false"}" role="listitem"><span class="home-catalog-genre-card__icon home-catalog-genre-card__icon--all">\u0423\u0441\u0456</span><span class="home-catalog-genre-card__name">\u0423\u0441\u0456 \u0436\u0430\u043D\u0440\u0438</span></button>`;
  const cards = genres.map(({ name, slug }) => {
    const active = homeCatalogGenre2 === slug;
    const letter = name.trim().charAt(0).toUpperCase();
    return `<button class="home-catalog-genre-card${active ? " active" : ""}" type="button" data-catalog-genre="${escapeHtml2(slug)}" aria-pressed="${active ? "true" : "false"}" role="listitem"><span class="home-catalog-genre-card__icon">${escapeHtml2(letter)}</span><span class="home-catalog-genre-card__name">${escapeHtml2(name)}</span></button>`;
  }).join("");
  return allCard + cards;
}
function homeCatalogGenreMatches2(item, selectedGenre) {
  const selected = normalizeHoneyMatch2(selectedGenre);
  if (!selected || selected === "all") return true;
  if (selected.startsWith("format ")) return normalizeHoneyMatch2(item?.type || item?.media_type) === selected.slice(7);
  const mappedName = Object.entries(GENRE_MAP2).find(([, slug]) => normalizeHoneyMatch2(slug) === selected)?.[0] || "";
  const candidates = [selected, normalizeHoneyMatch2(mappedName)].filter(Boolean);
  return (item?.genres || []).some((genre) => {
    const source = typeof genre === "object" ? genre : { name_ua: genre };
    const values = [
      ...Array.isArray(item?.genreSlugs) ? item.genreSlugs : [],
      source?.slug,
      source?.name_ua,
      source?.name,
      genre
    ].map((value) => normalizeHoneyMatch2(value)).filter(Boolean);
    return candidates.some((candidate) => values.some((value) => value === candidate || value.includes(candidate) || candidate.includes(value)));
  });
}
function syncHomeCatalogGenreControl2(root = document) {
  const host = root.querySelector("#homeCatalogGenreRailHost");
  if (!host) return;
  host.innerHTML = homeCatalogGenreHtml2();
  host.querySelectorAll("[data-catalog-genre]").forEach((button) => button.addEventListener("click", async () => {
    if (homeCatalogLoading2) return;
    const nextGenre = button.dataset.catalogGenre || "all";
    if (nextGenre === homeCatalogGenre2) return;
    homeCatalogGenre2 = nextGenre;
    homeCatalogPage2 = 1;
    homeCatalogFilterResultItems2 = null;
    homeCatalogFilterResultOffset2 = 0;
    host.setAttribute("aria-busy", "true");
    try {
      await reloadHomeCatalog2();
    } finally {
      host.setAttribute("aria-busy", "false");
    }
  }));
}
async function loadHoneyMangaFullCatalog2() {
  const filterAdult = homeCatalogAdult2;
  const promiseKey = filterAdult ? "adult" : "public";
  if (honeyMangaFullCatalogPromises2.has(promiseKey)) return honeyMangaFullCatalogPromises2.get(promiseKey);
  const requestPromise = (async () => {
    const pageSize = 200;
    const makeRequest = (page) => fetchHoneyJson2("/v2/manga/cursor-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, pageSize, sort: { sortBy: "lastUpdated", sortOrder: "DESC" }, filters: honeyCatalogFilters2({ adult: filterAdult }) })
    });
    const firstPayload = await makeRequest(1);
    const total = Number(firstPayload?.counter || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const allItems = (Array.isArray(firstPayload?.data) ? firstPayload.data : []).filter((item) => !isHoneyPromoItemRaw2(item)).map(honeyCatalogItem2).filter((item) => !isHoneyPromoItem2(item)).filter(isHoneyComicItem);
    let nextPage = 2;
    const worker = async () => {
      while (true) {
        const page = nextPage++;
        if (page > totalPages) return;
        const payload = await makeRequest(page);
        allItems.push(...(Array.isArray(payload?.data) ? payload.data : []).filter((item) => !isHoneyPromoItemRaw2(item)).map(honeyCatalogItem2).filter((item) => !isHoneyPromoItem2(item)).filter(isHoneyComicItem));
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, Math.max(0, totalPages - 1)) }, worker));
    const unique = [...new Map(allItems.filter((item) => item.honeyId).map((item) => [item.honeyId, item])).values()];
    homeCatalogAvailableTotal2 = unique.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
    honeyCatalogPageCache2.set(`honey-full:${filterAdult ? "adult" : "public"}`, { total: unique.length, items: unique, complete: true });
    debugLog("catalog", "honey-manga-full-index", { requestedPages: totalPages, receivedItems: allItems.length, uniqueItems: unique.length, total });
    return unique;
  })().catch((error) => {
    honeyMangaFullCatalogPromises2.delete(promiseKey);
    throw error;
  });
  honeyMangaFullCatalogPromises2.set(promiseKey, requestPromise);
  return requestPromise;
}
async function fetchHoneyCatalogPage2(page = 1) {
  const mode = homeCatalogAdult2 ? "adult" : "public";
  const query2 = normalizeHoneyMatch2(homeCatalogQuery2) || "__all__";
  const cacheKey = `honey-manga:${mode}:${query2}:${page}`;
  const cached = honeyCatalogPageCache2.get(cacheKey);
  if (cached) {
    homeCatalogTotal2 = cached.total;
    homeCatalogHasMore2 = cached.hasMore;
    return cached.items;
  }
  if (homeCatalogQuery2) {
    const searched = await searchHoneyTitles2(homeCatalogQuery2);
    let items2 = searched.filter((item) => !isHoneyPromoItemRaw2(item)).map(honeyCatalogItem2).filter((item) => !isHoneyPromoItem2(item)).filter(isHoneyComicItem);
    items2 = items2.filter((item) => homeCatalogAdult2 ? isAdultHoneyManga2(item) : !isAdultHoneyManga2(item));
    homeCatalogTotal2 = items2.length;
    homeCatalogHasMore2 = false;
    items2 = await attachHoneyReaders2(items2);
    Object.defineProperties(items2, { total: { value: homeCatalogTotal2, enumerable: false }, hasNextPage: { value: false, enumerable: false } });
    honeyCatalogPageCache2.set(cacheKey, { total: homeCatalogTotal2, items: items2, hasMore: false });
    return items2;
  }
  const pageSize = 28;
  const payload = await fetchHoneyJson2("/v2/manga/cursor-list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page, pageSize, sort: { sortBy: "lastUpdated", sortOrder: "DESC" }, filters: honeyCatalogFilters2({ adult: homeCatalogAdult2 }) })
  });
  homeCatalogTotal2 = Number(payload?.counter || 0);
  homeCatalogHasMore2 = Boolean(payload?.cursorNext?.page);
  let items = (Array.isArray(payload?.data) ? payload.data : []).filter((item) => !isHoneyPromoItemRaw2(item)).map(honeyCatalogItem2).filter((item) => !isHoneyPromoItem2(item)).filter(isHoneyComicItem);
  items = await attachHoneyReaders2(items);
  Object.defineProperties(items, { total: { value: homeCatalogTotal2, enumerable: false }, hasNextPage: { value: homeCatalogHasMore2, enumerable: false } });
  honeyCatalogPageCache2.set(cacheKey, { total: homeCatalogTotal2, items, hasMore: homeCatalogHasMore2 });
  debugLog("catalog", "honey-manga-page", { requestedPage: page, requestedLimit: pageSize, receivedItems: items.length, total: homeCatalogTotal2, hasNextPage: homeCatalogHasMore2 });
  return items;
}
function filterMangaCatalogItems2(items) {
  let filtered = [...items].filter((item) => !isHoneyPromoItem2(item));
  const query2 = normalizeHoneyMatch2(homeCatalogQuery2);
  if (query2) filtered = filtered.filter((item) => normalizeHoneyMatch2(item.title).includes(query2));
  if (homeCatalogAvailability2 === "available") filtered = filtered.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0);
  if (homeCatalogAdult2 || homeCatalogAge2 === "adult") filtered = filtered.filter((item) => honeyAgeCategory2(item) === "adult");
  else if (homeCatalogAge2 !== "all") filtered = filtered.filter((item) => honeyAgeCategory2(item) === homeCatalogAge2);
  if (homeCatalogGenres2.size) {
    filtered = filtered.filter((item) => (item.genres || []).some((genre) => homeCatalogGenres2.has(normalizeHoneyMatch2(typeof genre === "object" ? genre.name || genre.name_ua : genre))));
  }
  return filtered.sort((a, b) => {
    if (homeCatalogSort2 === "title") return String(a.title || "").localeCompare(String(b.title || ""), "uk");
    if (homeCatalogSort2 === "newest") return Number(b.year || 0) - Number(a.year || 0);
    return Number(b.score || 0) - Number(a.score || 0);
  });
}
async function fetchHomeCatalogPage2(page) {
  if (homeCatalogMode2 === "manga") return fetchHoneyCatalogPage2(page);
  const endpoint = "anime";
  const requestBody = homeCatalogRequestBody2();
  if (homeCatalogMode2 === "anime" && homeCatalogAdult2) requestBody.rating = ["rx"];
  const items = await hikkaCatalog(endpoint, page, requestBody);
  homeCatalogTotal2 = Number(items.total || items.pagination?.total || 0);
  homeCatalogHasMore2 = items.hasNextPage !== void 0 ? Boolean(items.hasNextPage) : items.length >= 28;
  return items;
}
function getHomeCatalogVisibleItems2() {
  if (homeCatalogMode2 === "manga") {
    if (homeCatalogFilterResultItems2) return [...homeCatalogItems2];
    return filterMangaCatalogItems2(homeCatalogItems2);
  }
  const items = [...homeCatalogItems2];
  let filtered = items;
  if (homeCatalogGenre2 !== "all") filtered = filtered.filter((item) => homeCatalogGenreMatches2(item, homeCatalogGenre2));
  if ((homeCatalogMode2 === "anime" || homeCatalogMode2 === "manga") && homeCatalogAge2 !== "all") filtered = filtered.filter((item) => catalogAgeCategory2(item) === homeCatalogAge2);
  if (homeCatalogStatus2 !== "all") {
    filtered = filtered.filter((item) => {
      const status = String(item.status || item.state || "").toLowerCase();
      return homeCatalogStatus2 === "ongoing" ? /ongoing|онго|publishing|active/.test(status) : /finished|completed|released|заверш/.test(status);
    });
  }
  if (homeCatalogAvailability2 === "available") filtered = filtered.filter((item) => item.readerAvailable || item.readerUrl);
  if (homeCatalogMode2 === "anime" && homeCatalogType2 !== "all") filtered = filtered.filter((item) => String(item.type || "").toLowerCase() === homeCatalogType2);
  if (homeCatalogMode2 === "anime" && homeCatalogYearMin2) filtered = filtered.filter((item) => Number(item.year || item.start_year || 0) >= Number(homeCatalogYearMin2));
  if (homeCatalogMode2 === "anime" && homeCatalogYearMax2) filtered = filtered.filter((item) => Number(item.year || item.start_year || 0) <= Number(homeCatalogYearMax2));
  if (homeCatalogMode2 === "anime" && homeCatalogScoreMin2) filtered = filtered.filter((item) => Number(item.score || item.native_score || 0) >= Number(homeCatalogScoreMin2));
  if (homeCatalogGenres2.size) {
    filtered = filtered.filter((item) => (item.genres || []).some((genre) => homeCatalogGenres2.has(normalizeHoneyMatch2(typeof genre === "object" ? genre.name || genre.name_ua : genre))));
  }
  return filtered.sort((a, b) => {
    const availability = Number(Boolean(b.readerAvailable || b.readerUrl)) - Number(Boolean(a.readerAvailable || a.readerUrl));
    if (availability) return availability;
    if (homeCatalogSort2 === "title") return String(a.title || "").localeCompare(String(b.title || ""), "uk");
    if (homeCatalogSort2 === "newest") return Number(b.year || 0) - Number(a.year || 0);
    return Number(b.score || b.native_score || 0) - Number(a.score || a.native_score || 0);
  });
}
function formatHomeCatalogNumber2(value) {
  return new Intl.NumberFormat("uk-UA").format(Number(value) || 0).replace(/\u00a0/g, " ");
}
function homeCatalogPageSize2() {
  return 28;
}
function homeCatalogPageCount2() {
  const total = homeCatalogFilterResultItems2?.length || homeCatalogTotal2;
  return total ? Math.max(1, Math.ceil(total / homeCatalogPageSize2())) : 0;
}
function syncHomeCatalogPagination2() {
  const pagination = document.getElementById("homeCatalogPagination");
  if (!pagination) return;
  const pageCount = homeCatalogPageCount2();
  const previous = pagination.querySelector('[data-catalog-page="prev"]');
  const next = pagination.querySelector('[data-catalog-page="next"]');
  const label = pagination.querySelector("[data-catalog-page-label]");
  const canNext = pageCount ? homeCatalogPage2 < pageCount : homeCatalogHasMore2;
  pagination.hidden = !pageCount && homeCatalogPage2 <= 1 && !homeCatalogHasMore2;
  if (previous) previous.disabled = homeCatalogPage2 <= 1 || homeCatalogLoading2;
  if (next) next.disabled = !canNext || homeCatalogLoading2;
  if (label) label.textContent = pageCount ? `\u0421\u0442\u043E\u0440\u0456\u043D\u043A\u0430 ${formatHomeCatalogNumber2(homeCatalogPage2)} \u0456\u0437 ${formatHomeCatalogNumber2(pageCount)}` : `\u0421\u0442\u043E\u0440\u0456\u043D\u043A\u0430 ${formatHomeCatalogNumber2(homeCatalogPage2)}`;
}
function homeCatalogCountText2(visibleCount) {
  const isFilteredManga = homeCatalogMode2 === "manga" && (homeCatalogAdult2 || homeCatalogAge2 !== "all" || homeCatalogFilterResultItems2 !== null);
  const isFilteredAnime = homeCatalogMode2 === "anime" && (homeCatalogGenre2 !== "all" || homeCatalogAge2 !== "all" || homeCatalogStatus2 !== "all" || homeCatalogType2 !== "all" || homeCatalogYearMin2 || homeCatalogYearMax2 || homeCatalogScoreMin2);
  const total = isFilteredManga ? homeCatalogFilterIndexReady2 && homeCatalogFilterResultItems2 ? homeCatalogFilterResultItems2.length : visibleCount : homeCatalogTotal2 || visibleCount;
  if (homeCatalogMode2 === "manga") {
    const available = homeCatalogAvailableTotal2 || homeCatalogItems2.filter((item) => item?.readerAvailable || item?.readerUrl).length;
    const suffix = isFilteredManga && !homeCatalogFilterIndexReady2 ? "" : ` \u0456\u0437 ${formatHomeCatalogNumber2(total)}`;
    return `\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0434\u043B\u044F \u0447\u0438\u0442\u0430\u043D\u043D\u044F: ${formatHomeCatalogNumber2(available)}${suffix} \u043C\u0430\u043D\u0491\u0438`;
  }
  if (homeCatalogMode2 === "anime" && isFilteredAnime) return `\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u043E ${formatHomeCatalogNumber2(visibleCount)} \u0437 ${formatHomeCatalogNumber2(homeCatalogTotal2 || total)} \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0456\u0432`;
  return `\u0417\u043D\u0430\u0439\u0434\u0435\u043D\u043E ${formatHomeCatalogNumber2(total)} \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0456\u0432`;
}
function isCatalogUrlBookmarked2(url) {
  if (!url) return false;
  return Storage.getBookmarks().some((b) => b?.url === url);
}
function toggleCatalogBookmark2(url, title, poster) {
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
function homeCatalogCardHtml2(a, index = 0) {
  const poster = cardPoster2(a);
  const title = a.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
  const type = a.typeLabel || animeTypeLabel(a.type);
  const status = homeCatalogMode2 === "manga" ? a.ageRating || (homeCatalogAdult2 ? "18+" : "") : statusLabelUa2(a.status);
  const meta = [type, a.year, status].filter(Boolean).join(" \xB7 ");
  const honeyId = a.honeyId || a.honeyTitleId || (homeCatalogMode2 === "manga" ? String(a.url || "").split("/").filter(Boolean).pop() : "");
  const isMangaCard = homeCatalogMode2 === "manga" && Boolean(honeyId);
  const readerCard = isMangaCard || homeCatalogMode2 === "manga" && Boolean(a.readerUrl || a.readerAvailable);
  const url = String(a.url || "");
  const score = Number(a.score || a.native_score || 0);
  const ratingHtml = score > 0 ? `<span class="home-catalog-card__rating"><i class="fas fa-star"></i>${score.toFixed(1)}</span>` : "";
  const bookmarked = isCatalogUrlBookmarked2(url);
  const loading = index < 6 ? "eager" : "lazy";
  return `<article class="home-catalog-card${readerCard ? " home-catalog-card--reader" : ""}" data-catalog-mode="${homeCatalogMode2}" data-url="${escapeHtml2(url)}"${readerCard && a.readerUrl ? ` data-reader-url="${escapeHtml2(a.readerUrl)}"` : ""}${isMangaCard && !a.readerUrl ? ` data-reader-pending="1" data-honey-id="${escapeHtml2(String(honeyId))}"` : ""} data-reader-title="${escapeHtml2(title)}" tabindex="0" role="button" aria-label="${escapeHtml2(title)}">
                <div class="home-catalog-card__poster">
                    <img src="${escapeHtml2(poster)}" alt="${escapeHtml2(title)}" loading="${loading}" decoding="async" onload="this.classList.add('img--loaded')" onerror="this.onerror=null;this.src='${ANIME_CARD_PLACEHOLDER2}'">
                    ${status ? `<span class="home-catalog-card__status">${escapeHtml2(status)}</span>` : ""}
                    ${ratingHtml}
                </div>
                <div class="home-catalog-card__title">${escapeHtml2(title)}</div>
                <div class="home-catalog-card__meta">${escapeHtml2(meta || (homeCatalogMode2 === "manga" ? "\u041C\u0430\u043D\u0491\u0430" : "\u0410\u043D\u0456\u043C\u0435"))}</div>
            </article>`;
}
function bindHomeCatalogCards2(root) {
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
          const item = homeCatalogItems2.find((entry) => String(entry.honeyId || entry.honeyTitleId) === String(card.dataset.honeyId)) || { honeyId: card.dataset.honeyId, honeyTitleId: card.dataset.honeyId, title: cardTitle, chapters: 1 };
          const resolved = await resolveHoneyReader2({ ...item, honeyTitleId: card.dataset.honeyId, chapters: Math.max(1, Number(item.chapters || 1)) });
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
      const active = toggleCatalogBookmark2(card.dataset.url, title, posterImg?.src || "");
      favBtn.classList.toggle("is-active", active);
      favBtn.setAttribute("aria-pressed", String(active));
      favBtn.setAttribute("aria-label", active ? "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0437 \u043E\u0431\u0440\u0430\u043D\u043E\u0433\u043E" : "\u0414\u043E\u0434\u0430\u0442\u0438 \u0432 \u043E\u0431\u0440\u0430\u043D\u0435");
    });
  });
}
function getActiveCatalogYearKey2() {
  if (homeCatalogStatus2 === "ongoing") return "ongoing";
  if (!homeCatalogYearMin2 && !homeCatalogYearMax2) return "";
  for (const [key, [min, max]] of Object.entries(CATALOG_YEAR_RANGES2)) {
    if (Number(homeCatalogYearMin2) === min && Number(homeCatalogYearMax2) === max) return key;
  }
  return "";
}
function buildHomeCatalogQuickFilterHtml2() {
  const isManga = homeCatalogMode2 === "manga";
  const activeYear = getActiveCatalogYearKey2();
  const activeSort = homeCatalogSort2 === "title" || homeCatalogSort2 === "alpha" ? "alpha" : homeCatalogSort2 === "newest" || homeCatalogSort2 === "year" ? "newest" : "rating";
  const activeType = homeCatalogType2 && homeCatalogType2 !== "all" ? homeCatalogType2 : "";
  const hasActiveQuery = Boolean(homeCatalogQuery2);
  const placeholder = isManga ? "\u041F\u043E\u0448\u0443\u043A \u043C\u0430\u043D\u0491\u0438..." : "\u041F\u043E\u0448\u0443\u043A \u0430\u043D\u0456\u043C\u0435...";
  const animeGenresMarkup = Object.entries(GENRE_MAP2).map(([name, slug]) => {
    const isChecked = homeCatalogGenres2.has(normalizeHoneyMatch2(name)) || homeCatalogGenres2.has(normalizeHoneyMatch2(slug));
    return `<label class="hqf-option">
                        <input type="checkbox" data-catalog-genre="${escapeHtml2(slug)}" data-catalog-genre-name="${escapeHtml2(name)}"${isChecked ? " checked" : ""} />
                        <span class="hqf-option-bullet"></span>
                        <span>${escapeHtml2(name)}</span>
                    </label>`;
  }).join("");
  const typeMarkup = CATALOG_TYPE_OPTIONS2.map((opt) => `
                <label class="hqf-option">
                    <input type="radio" name="catalog_type" value="${opt.key}" data-catalog-type="${opt.key}"${activeType === opt.key ? " checked" : ""} />
                    <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                    <span>${opt.label}</span>
                </label>
            `).join("");
  const yearMarkup = CATALOG_YEAR_OPTIONS2.map((opt) => `
                <label class="hqf-option">
                    <input type="radio" name="catalog_year" value="${opt.key}" data-catalog-year="${opt.key}"${activeYear === opt.key ? " checked" : ""} />
                    <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                    <span>${opt.label}</span>
                </label>
            `).join("");
  const sortMarkup = CATALOG_SORT_OPTIONS2.map((opt) => `
                <label class="hqf-option">
                    <input type="radio" name="catalog_sort" value="${opt.key}" data-catalog-sort="${opt.key}"${activeSort === opt.key ? " checked" : ""} />
                    <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                    <span>${opt.label}</span>
                </label>
            `).join("");
  const mangaGenresMarkup = CATALOG_MANGA_GENRES2.map((genre) => {
    const isChecked = homeCatalogGenres2.has(normalizeHoneyMatch2(genre));
    return `<label class="hqf-option">
                    <input type="checkbox" data-catalog-manga-genre="${escapeHtml2(genre)}"${isChecked ? " checked" : ""} />
                    <span class="hqf-option-bullet"></span>
                    <span>${escapeHtml2(genre)}</span>
                </label>`;
  }).join("");
  const mangaAvailMarkup = CATALOG_MANGA_AVAILABILITY_OPTIONS2.map((opt) => `
                <label class="hqf-option">
                    <input type="radio" name="catalog_manga_avail" value="${opt.key}" data-catalog-manga-avail="${opt.key}"${(homeCatalogAvailability2 || "all") === opt.key ? " checked" : ""} />
                    <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                    <span>${opt.label}</span>
                </label>
            `).join("");
  const mangaAgeMarkup = CATALOG_MANGA_AGE_OPTIONS2.map((opt) => `
                <label class="hqf-option">
                    <input type="radio" name="catalog_manga_age" value="${opt.key}" data-catalog-manga-age="${opt.key}"${(homeCatalogAge2 || "all") === opt.key ? " checked" : ""} />
                    <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                    <span>${opt.label}</span>
                </label>
            `).join("");
  const mangaSortMarkup = CATALOG_SORT_OPTIONS2.map((opt) => `
                <label class="hqf-option">
                    <input type="radio" name="catalog_manga_sort" value="${opt.key}" data-catalog-manga-sort="${opt.key}"${activeSort === opt.key ? " checked" : ""} />
                    <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                    <span>${opt.label}</span>
                </label>
            `).join("");
  const isOpen = homeCatalogFilterOpen2;
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
                        <input type="text" inputmode="search" id="homeCatalogSearchInput" class="hqf-search-input" placeholder="${placeholder}" value="${escapeHtml2(homeCatalogQuery2)}" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search" aria-label="${placeholder}">
                        <button type="button" class="hqf-search-clear" id="homeCatalogSearchClear" aria-label="\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u043F\u043E\u0448\u0443\u043A"${homeCatalogQuery2 ? "" : " hidden"}>
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
function buildHomeCatalogSectionHtml2(items) {
  const visibleItems = getHomeCatalogVisibleItems2();
  return `<section class="home-catalog-section" id="homeCatalogSection">
                ${buildHomeCatalogQuickFilterHtml2()}
                <div class="home-catalog-header-row">
                    <div class="home-catalog-results-label" id="homeCatalogResultsLabel">${homeCatalogCountText2(visibleItems.length)}</div>
                    <div class="home-catalog-view-toggle" role="group" aria-label="\u0412\u0438\u0433\u043B\u044F\u0434 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443">
                        <button type="button" class="home-catalog-view${homeCatalogView2 === "grid" ? " active" : ""}" data-catalog-view="grid" aria-label="\u0421\u0456\u0442\u043A\u0430"><i class="fas fa-grip"></i></button>
                        <button type="button" class="home-catalog-view${homeCatalogView2 === "list" ? " active" : ""}" data-catalog-view="list" aria-label="\u0421\u043F\u0438\u0441\u043E\u043A"><i class="fas fa-list"></i></button>
                    </div>
                </div>
                <div class="home-catalog-grid${homeCatalogView2 === "list" ? " is-list" : " is-swipe"}" id="homeCatalogGrid">${visibleItems.length ? visibleItems.map((item, index) => homeCatalogCardHtml2(item, index)).join("") : '<div class="home-catalog-empty">\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u0442\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439.</div>'}</div>
                <div class="home-catalog-pagination" id="homeCatalogPagination" hidden aria-label="\u041D\u0430\u0432\u0456\u0433\u0430\u0446\u0456\u044F \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0430\u043C\u0438 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443">
                    <button type="button" class="home-catalog-page-btn" data-catalog-page="prev"><i class="fas fa-chevron-left"></i><span>\u041D\u0430\u0437\u0430\u0434</span></button>
                    <span class="home-catalog-page-label" data-catalog-page-label>\u0421\u0442\u043E\u0440\u0456\u043D\u043A\u0430 1</span>
                    <button type="button" class="home-catalog-page-btn" data-catalog-page="next"><span>\u0414\u0430\u043B\u0456</span><i class="fas fa-chevron-right"></i></button>
                </div>
            </section>`;
}
function renderHomeCatalogGrid2() {
  const grid = document.getElementById("homeCatalogGrid");
  const count = document.getElementById("homeCatalogCount");
  const number = document.getElementById("homeCatalogResultNumber");
  if (!grid) return;
  const visibleItems = getHomeCatalogVisibleItems2();
  grid.classList.toggle("is-list", homeCatalogView2 === "list");
  grid.classList.toggle("is-swipe", homeCatalogView2 === "grid");
  grid.innerHTML = visibleItems.length ? visibleItems.map((item, index) => homeCatalogCardHtml2(item, index)).join("") : '<div class="home-catalog-empty">\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0437\u0430 \u0446\u0438\u043C\u0438 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u0430\u043C\u0438.</div>';
  bindHomeCatalogCards2(grid);
  if (!homeCatalogHasMore2) {
    document.getElementById("homeCatalogMoreBtn")?.remove();
  }
  if (count) count.textContent = homeCatalogCountText2(visibleItems.length);
  const label = document.getElementById("homeCatalogResultsLabel");
  if (label) label.textContent = homeCatalogCountText2(visibleItems.length);
  if (number) number.textContent = formatHomeCatalogNumber2(homeCatalogTotal2 || visibleItems.length);
  syncHomeCatalogPagination2();
  ensureHomeCatalogFeedObserver2();
}
function syncHomeCatalogModeControls2() {
}
function bindHomeCatalogMenu2(root) {
  const tabs = root.querySelectorAll("[data-catalog-mode]");
  tabs.forEach((tab) => tab.addEventListener("click", async () => {
    const nextMode = tab.dataset.catalogMode;
    if (nextMode === homeCatalogMode2) return;
    homeSectionsRequestId2++;
    homeCatalogMode2 = nextMode;
    homeCatalogAdult2 = false;
    homeCatalogAge2 = "all";
    homeCatalogOrigin2 = "all";
    homeCatalogQuery2 = "";
    homeCatalogPreset2 = "all";
    homeCatalogGenre2 = "all";
    homeCatalogStatus2 = "all";
    homeCatalogAvailability2 = "all";
    homeCatalogGenres2 = /* @__PURE__ */ new Set();
    homeCatalogFilterResultItems2 = null;
    homeCatalogFilterResultOffset2 = 0;
    homeCatalogType2 = "all";
    homeCatalogYearMin2 = "";
    homeCatalogYearMax2 = "";
    homeCatalogScoreMin2 = "";
    homeCatalogPage2 = 1;
    const container = document.getElementById("genreSectionsContainer");
    if (container) {
      container.innerHTML = buildHomeCatalogSectionHtml2([]);
      bindHomeCatalogCards2(container);
      bindHomeCatalogMenu2(container);
    }
    await reloadHomeCatalog2();
  }));
  const toggle = root.querySelector("#homeCatalogCategoriesToggle");
  const panel = root.querySelector("#homeCatalogFilterPanel");
  const qfContainer = root.querySelector("#homeCatalogQuickFilter");
  toggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    homeCatalogFilterOpen2 = !homeCatalogFilterOpen2;
    toggle.classList.toggle("open", homeCatalogFilterOpen2);
    toggle.setAttribute("aria-expanded", String(homeCatalogFilterOpen2));
    panel?.classList.toggle("open", homeCatalogFilterOpen2);
    qfContainer?.classList.toggle("is-open", homeCatalogFilterOpen2);
  });
  panel?.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  root.querySelector("#homeCatalogFilterClose")?.addEventListener("click", (e) => {
    e.stopPropagation();
    homeCatalogFilterOpen2 = false;
    toggle?.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
    panel?.classList.remove("open");
    qfContainer?.classList.remove("is-open");
  });
  const onDocClick = (e) => {
    if (!homeCatalogFilterOpen2) return;
    const quickFilter = document.getElementById("homeCatalogQuickFilter");
    if (quickFilter && !quickFilter.contains(e.target)) {
      homeCatalogFilterOpen2 = false;
      toggle?.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
      panel?.classList.remove("open");
      qfContainer?.classList.remove("is-open");
    }
  };
  document.removeEventListener("click", onDocClick);
  document.addEventListener("click", onDocClick);
  root.querySelector("#homeCatalogFilterReset")?.addEventListener("click", async () => {
    homeCatalogStatus2 = "all";
    homeCatalogAvailability2 = "all";
    homeCatalogAge2 = "all";
    homeCatalogOrigin2 = "all";
    homeCatalogAdult2 = false;
    homeCatalogType2 = "all";
    homeCatalogYearMin2 = "";
    homeCatalogYearMax2 = "";
    homeCatalogScoreMin2 = "";
    homeCatalogSort2 = "score";
    homeCatalogGenres2 = /* @__PURE__ */ new Set();
    homeCatalogQuery2 = "";
    homeCatalogFilterResultItems2 = null;
    homeCatalogFilterResultOffset2 = 0;
    homeCatalogPage2 = 1;
    const container = document.getElementById("genreSectionsContainer");
    if (container) {
      container.innerHTML = buildHomeCatalogSectionHtml2([]);
      bindHomeCatalogCards2(container);
      bindHomeCatalogMenu2(container);
    }
    await reloadHomeCatalog2();
  });
  const searchInput = root.querySelector("#homeCatalogSearchInput");
  const searchClear = root.querySelector("#homeCatalogSearchClear");
  const mergedBar = root.querySelector("#homeCatalogMergedBar");
  let searchTimer = null;
  searchInput?.addEventListener("input", (event) => {
    clearTimeout(searchTimer);
    homeCatalogQuery2 = event.target.value.trim();
    if (searchClear) searchClear.hidden = !homeCatalogQuery2;
    searchTimer = setTimeout(async () => {
      homeCatalogPage2 = 1;
      homeCatalogFilterResultItems2 = null;
      homeCatalogFilterResultOffset2 = 0;
      await reloadHomeCatalog2();
    }, 400);
  });
  searchClear?.addEventListener("click", async () => {
    if (!searchInput) return;
    searchInput.value = "";
    homeCatalogQuery2 = "";
    searchClear.hidden = true;
    homeCatalogPage2 = 1;
    homeCatalogFilterResultItems2 = null;
    homeCatalogFilterResultOffset2 = 0;
    await reloadHomeCatalog2();
    searchInput.focus();
  });
  root.querySelectorAll("[data-catalog-genre]").forEach((cb) => {
    cb.addEventListener("change", async () => {
      const slug = cb.dataset.catalogGenre;
      const name = cb.dataset.catalogGenreName;
      const key = normalizeHoneyMatch2(name || slug);
      if (cb.checked) {
        homeCatalogGenres2.add(key);
      } else {
        homeCatalogGenres2.delete(key);
      }
      homeCatalogPage2 = 1;
      await reloadHomeCatalog2();
    });
  });
  root.querySelectorAll("[data-catalog-manga-genre]").forEach((cb) => {
    cb.addEventListener("change", async () => {
      const genre = cb.dataset.catalogMangaGenre;
      const key = normalizeHoneyMatch2(genre);
      if (cb.checked) {
        homeCatalogGenres2.add(key);
      } else {
        homeCatalogGenres2.delete(key);
      }
      homeCatalogPage2 = 1;
      homeCatalogFilterResultItems2 = null;
      homeCatalogFilterResultOffset2 = 0;
      await reloadHomeCatalog2();
    });
  });
  root.querySelectorAll("[data-catalog-type]").forEach((radio) => {
    radio.addEventListener("change", async () => {
      if (!radio.checked) return;
      homeCatalogType2 = radio.dataset.catalogType || "all";
      homeCatalogPage2 = 1;
      await reloadHomeCatalog2();
    });
  });
  root.querySelectorAll("[data-catalog-year]").forEach((radio) => {
    radio.addEventListener("change", async () => {
      if (!radio.checked) return;
      const yearKey = radio.dataset.catalogYear;
      if (yearKey === "ongoing") {
        homeCatalogStatus2 = "ongoing";
        homeCatalogYearMin2 = "";
        homeCatalogYearMax2 = "";
      } else if (CATALOG_YEAR_RANGES2[yearKey]) {
        const [min, max] = CATALOG_YEAR_RANGES2[yearKey];
        homeCatalogYearMin2 = String(min);
        homeCatalogYearMax2 = String(max);
        homeCatalogStatus2 = "all";
      } else {
        homeCatalogYearMin2 = "";
        homeCatalogYearMax2 = "";
        homeCatalogStatus2 = "all";
      }
      homeCatalogPage2 = 1;
      await reloadHomeCatalog2();
    });
  });
  root.querySelectorAll("[data-catalog-sort]").forEach((radio) => {
    radio.addEventListener("change", async () => {
      if (!radio.checked) return;
      homeCatalogSort2 = radio.dataset.catalogSort === "alpha" ? "title" : radio.dataset.catalogSort;
      homeCatalogPage2 = 1;
      await reloadHomeCatalog2();
    });
  });
  root.querySelectorAll("[data-catalog-manga-avail]").forEach((radio) => {
    radio.addEventListener("change", async () => {
      if (!radio.checked) return;
      homeCatalogAvailability2 = radio.dataset.catalogMangaAvail || "all";
      homeCatalogPage2 = 1;
      homeCatalogFilterResultItems2 = null;
      homeCatalogFilterResultOffset2 = 0;
      await reloadHomeCatalog2();
    });
  });
  root.querySelectorAll("[data-catalog-manga-age]").forEach((radio) => {
    radio.addEventListener("change", async () => {
      if (!radio.checked) return;
      homeCatalogAge2 = radio.dataset.catalogMangaAge || "all";
      homeCatalogAdult2 = homeCatalogAge2 === "adult";
      homeCatalogPage2 = 1;
      homeCatalogFilterResultItems2 = null;
      homeCatalogFilterResultOffset2 = 0;
      await reloadHomeCatalog2();
    });
  });
  root.querySelectorAll("[data-catalog-manga-sort]").forEach((radio) => {
    radio.addEventListener("change", async () => {
      if (!radio.checked) return;
      homeCatalogSort2 = radio.dataset.catalogMangaSort === "alpha" ? "title" : radio.dataset.catalogMangaSort;
      homeCatalogPage2 = 1;
      homeCatalogFilterResultItems2 = null;
      homeCatalogFilterResultOffset2 = 0;
      await reloadHomeCatalog2();
    });
  });
  root.querySelectorAll("[data-catalog-view]").forEach((button) => button.addEventListener("click", () => {
    homeCatalogView2 = button.dataset.catalogView;
    root.querySelectorAll("[data-catalog-view]").forEach((item) => item.classList.toggle("active", item === button));
    renderHomeCatalogGrid2();
  }));
  root.querySelectorAll("[data-catalog-page]").forEach((button) => button.addEventListener("click", () => {
    const delta = button.dataset.catalogPage === "prev" ? -1 : 1;
    void loadHomeCatalogPage2(homeCatalogPage2 + delta);
  }));
}
function updateHomeCatalogModeLabels2() {
  const mode = HOME_CATALOG_MODES2.find((item) => item.key === homeCatalogMode2) || HOME_CATALOG_MODES2[0];
  const title = document.querySelector("#homeCatalogSection h2");
  const search = document.getElementById("homeCatalogSearch");
  if (title) title.textContent = homeCatalogAdult2 ? "18+ \u043C\u0430\u043D\u0491\u0430" : `\u041A\u0430\u0442\u0430\u043B\u043E\u0433 ${mode.label.toLowerCase()}`;
  if (search) search.placeholder = `\u0412\u0432\u0435\u0434\u0456\u0442\u044C \u043D\u0430\u0437\u0432\u0443 ${homeCatalogAdult2 ? "\u043C\u0430\u043D\u0491\u0438" : mode.label.toLowerCase()}...`;
  document.querySelectorAll("[data-catalog-mode]").forEach((tab) => tab.classList.toggle("active", tab.dataset.catalogMode === homeCatalogMode2));
  const adultButton = document.getElementById("homeCatalogAdultBtn");
  if (adultButton) {
    adultButton.hidden = homeCatalogMode2 !== "manga";
    adultButton.classList.toggle("active", homeCatalogAdult2 && homeCatalogMode2 === "manga");
    adultButton.setAttribute("aria-pressed", String(homeCatalogAdult2 && homeCatalogMode2 === "manga"));
  }
}
async function loadHomeCatalogPage2(targetPage = 1) {
  if (homeCatalogLoading2) return;
  const grid = document.getElementById("homeCatalogGrid");
  if (!grid) return;
  const page = Math.max(1, Number(targetPage) || 1);
  const pageSize = homeCatalogPageSize2();
  const knownPages = homeCatalogPageCount2();
  if (knownPages && page > knownPages) return;
  homeCatalogLoading2 = true;
  syncHomeCatalogPagination2();
  grid.innerHTML = renderAnimeCardSkeleton(12);
  try {
    if (homeCatalogFilterResultItems2) {
      const start = (page - 1) * pageSize;
      homeCatalogItems2 = homeCatalogFilterResultItems2.slice(start, start + pageSize);
      homeCatalogFilterResultOffset2 = Math.min(start + pageSize, homeCatalogFilterResultItems2.length);
      homeCatalogPage2 = page;
      homeCatalogHasMore2 = homeCatalogFilterResultOffset2 < homeCatalogFilterResultItems2.length;
    } else {
      const items = await fetchHomeCatalogPageSafe2(page);
      homeCatalogItems2 = (Array.isArray(items) ? items : []).filter((item) => item?.url);
      homeCatalogPage2 = page;
      homeCatalogHasMore2 = items?.hasNextPage !== void 0 ? Boolean(items.hasNextPage) : Boolean(homeCatalogHasMore2);
    }
    if (homeCatalogMode2 === "manga") {
      homeCatalogAvailableTotal2 = homeCatalogItems2.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
    }
    syncHomeCatalogGenreControl2();
    renderHomeCatalogGrid2();
    document.getElementById("homeCatalogGrid")?.scrollTo({ left: 0, behavior: "instant" });
    document.getElementById("homeCatalogSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    grid.innerHTML = '<div class="home-catalog-empty">\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0443. \u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437.</div>';
    showToast("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0443 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443");
  } finally {
    homeCatalogLoading2 = false;
    syncHomeCatalogPagination2();
  }
}
function homeCatalogHasActiveFilters2() {
  if (homeCatalogQuery2) return true;
  if (homeCatalogGenre2 !== "all" || homeCatalogAge2 !== "all" || homeCatalogStatus2 !== "all" || homeCatalogAvailability2 !== "all") return true;
  if (homeCatalogMode2 === "anime" && (homeCatalogType2 !== "all" || homeCatalogYearMin2 || homeCatalogYearMax2 || homeCatalogScoreMin2)) return true;
  if (homeCatalogSort2 === "title") return true;
  return false;
}
async function loadHomeCatalogNextPage2() {
  if (homeCatalogLoading2) return 0;
  homeCatalogLoading2 = true;
  const before = homeCatalogItems2.length;
  try {
    const hasMangaFilters = homeCatalogMode2 === "manga" && (homeCatalogAge2 !== "all" || homeCatalogAdult2 || homeCatalogAvailability2 !== "all" || homeCatalogGenres2.size > 0 || homeCatalogSort2 === "title" || homeCatalogSort2 === "alpha");
    if (hasMangaFilters && !homeCatalogFilterResultItems2) {
      const fullCatalog = await loadHoneyMangaFullCatalog2();
      homeCatalogFilterResultItems2 = filterMangaCatalogItems2(fullCatalog);
      homeCatalogFilterIndexReady2 = true;
      homeCatalogFilterResultOffset2 = Math.min(homeCatalogItems2.length || homeCatalogPageSize2(), homeCatalogFilterResultItems2.length);
      homeCatalogItems2 = homeCatalogFilterResultItems2.slice(0, homeCatalogFilterResultOffset2);
      homeCatalogTotal2 = homeCatalogFilterResultItems2.length;
      homeCatalogAvailableTotal2 = homeCatalogItems2.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
      homeCatalogHasMore2 = homeCatalogFilterResultOffset2 < homeCatalogFilterResultItems2.length;
      renderHomeCatalogGrid2();
      return homeCatalogItems2.length - before;
    }
    if (homeCatalogFilterResultItems2) {
      homeCatalogFilterResultOffset2 = Math.min(homeCatalogFilterResultOffset2 + 24, homeCatalogFilterResultItems2.length);
      homeCatalogItems2 = homeCatalogFilterResultItems2.slice(0, homeCatalogFilterResultOffset2);
      homeCatalogAvailableTotal2 = homeCatalogItems2.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
      homeCatalogHasMore2 = homeCatalogFilterResultOffset2 < homeCatalogFilterResultItems2.length;
      renderHomeCatalogGrid2();
      return homeCatalogItems2.length - before;
    }
    const nextPage = homeCatalogPage2 + 1;
    const nextItems = await fetchHomeCatalogPage2(nextPage);
    const existing = new Set(homeCatalogItems2.map((item) => item.url));
    const additions = nextItems.filter((item) => item?.url && !existing.has(item.url));
    homeCatalogItems2.push(...additions);
    homeCatalogPage2 = nextPage;
    if (homeCatalogMode2 === "manga") homeCatalogAvailableTotal2 = homeCatalogItems2.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
    homeCatalogHasMore2 = nextItems.hasNextPage !== void 0 ? Boolean(nextItems.hasNextPage) : homeCatalogMode2 === "manga" ? homeCatalogHasMore2 : Boolean(nextItems.length) && (!homeCatalogTotal2 || homeCatalogItems2.length < homeCatalogTotal2);
    if (homeCatalogHasActiveFilters2()) {
      renderHomeCatalogGrid2();
    } else {
      appendHomeCatalogFeedCards2(additions);
    }
    return additions.length;
  } finally {
    homeCatalogLoading2 = false;
  }
}
function appendHomeCatalogFeedCards2(newItems) {
  const grid = document.getElementById("homeCatalogGrid");
  if (!grid || !newItems.length) {
    syncHomeCatalogFeedUi2();
    return;
  }
  grid.insertAdjacentHTML("beforeend", newItems.map((item, index) => homeCatalogCardHtml2(item, index)).join(""));
  bindHomeCatalogCards2(grid);
  syncHomeCatalogFeedUi2();
}
function syncHomeCatalogFeedUi2() {
  const visibleCount = homeCatalogMode2 === "manga" ? homeCatalogFilterResultItems2 ? homeCatalogItems2.length : filterMangaCatalogItems2(homeCatalogItems2).length : getHomeCatalogVisibleItems2().length;
  const text = homeCatalogCountText2(visibleCount);
  document.getElementById("homeCatalogCount")?.replaceChildren(document.createTextNode(text));
  document.getElementById("homeCatalogResultsLabel")?.replaceChildren(document.createTextNode(text));
  const number = document.getElementById("homeCatalogResultNumber");
  if (number) number.textContent = formatHomeCatalogNumber2(homeCatalogTotal2 || visibleCount);
  syncHomeCatalogPagination2();
}
function ensureHomeCatalogFeedObserver2() {
  const sentinel = document.getElementById("homeCatalogFeedSentinel");
  if (!sentinel) return;
  if (homeCatalogFeedObserver2) {
    homeCatalogFeedObserver2.disconnect();
    homeCatalogFeedObserver2 = null;
  }
  if (homeCatalogMode2 === "manga") {
    sentinel.hidden = true;
    return;
  }
  const reachedCap = homeCatalogItems2.length >= HOME_CATALOG_FEED_MAX_ITEMS2;
  sentinel.hidden = !homeCatalogHasMore2 || reachedCap || homeCatalogFeedError2;
  const retry = sentinel.querySelector("[data-catalog-feed-retry]");
  if (retry) retry.hidden = !homeCatalogFeedError2;
  if (!homeCatalogHasMore2 || reachedCap || homeCatalogFeedError2 || Date.now() < homeCatalogFeedCooldownUntil2) return;
  if (typeof IntersectionObserver === "undefined") return;
  homeCatalogFeedObserver2 = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) void loadHomeCatalogFeedBatch2();
  }, { rootMargin: "900px 0px 0px 0px", threshold: 0 });
  homeCatalogFeedObserver2.observe(sentinel);
}
async function loadHomeCatalogFeedBatch2() {
  if (homeCatalogMode2 === "manga") return;
  if (homeCatalogFeedBusy2 || homeCatalogLoading2 || !homeCatalogHasMore2) return;
  if (Router.currentRoute !== "main") return;
  if (homeCatalogItems2.length >= HOME_CATALOG_FEED_MAX_ITEMS2) return;
  homeCatalogFeedBusy2 = true;
  homeCatalogFeedError2 = false;
  const loader = document.getElementById("homeCatalogFeedLoader");
  if (loader) loader.hidden = false;
  try {
    await loadHomeCatalogNextPage2();
    homeCatalogFeedCooldownUntil2 = 0;
  } catch (error) {
    homeCatalogFeedError2 = true;
    homeCatalogFeedCooldownUntil2 = 0;
    const retry = document.querySelector("[data-catalog-feed-retry]");
    if (retry) retry.hidden = false;
    showToast("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0449\u0435 \u0430\u043D\u0456\u043C\u0435");
  } finally {
    homeCatalogFeedBusy2 = false;
    if (loader) loader.hidden = true;
    ensureHomeCatalogFeedObserver2();
  }
}
async function reloadHomeCatalog2() {
  const grid = document.getElementById("homeCatalogGrid");
  if (!grid) return;
  const requestId = ++homeCatalogRequestId2;
  updateHomeCatalogModeLabels2();
  syncHomeCatalogModeControls2();
  homeCatalogLoading2 = true;
  homeCatalogFilterResultItems2 = null;
  homeCatalogFilterResultOffset2 = 0;
  homeCatalogFilterIndexReady2 = false;
  homeCatalogPage2 = 1;
  homeCatalogTotal2 = 0;
  homeCatalogAvailableTotal2 = 0;
  homeCatalogHasMore2 = true;
  homeCatalogFeedError2 = false;
  homeCatalogFeedCooldownUntil2 = 0;
  document.getElementById("homeCatalogCount")?.replaceChildren(document.createTextNode("\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F..."));
  document.getElementById("homeCatalogResultsLabel")?.replaceChildren(document.createTextNode("\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F..."));
  grid.innerHTML = renderAnimeCardSkeleton(12);
  try {
    let nextItems;
    const hasMangaFilters = homeCatalogMode2 === "manga" && (homeCatalogAge2 !== "all" || homeCatalogAdult2 || homeCatalogAvailability2 !== "all" || homeCatalogGenres2.size > 0 || homeCatalogSort2 === "title" || homeCatalogSort2 === "alpha");
    if (hasMangaFilters) {
      const firstItems = await fetchHomeCatalogPage2(1);
      nextItems = filterMangaCatalogItems2(firstItems);
      homeCatalogPage2 = 1;
      homeCatalogHasMore2 = true;
      loadHoneyMangaFullCatalog2().then((fullCatalog) => {
        if (requestId !== homeCatalogRequestId2 || homeCatalogMode2 !== "manga") return;
        homeCatalogFilterResultItems2 = filterMangaCatalogItems2(fullCatalog);
        homeCatalogFilterIndexReady2 = true;
        homeCatalogFilterResultOffset2 = Math.min(homeCatalogPageSize2(), homeCatalogFilterResultItems2.length);
        homeCatalogItems2 = homeCatalogFilterResultItems2.slice(0, homeCatalogFilterResultOffset2);
        homeCatalogTotal2 = homeCatalogFilterResultItems2.length;
        homeCatalogAvailableTotal2 = homeCatalogItems2.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
        homeCatalogHasMore2 = homeCatalogFilterResultOffset2 < homeCatalogFilterResultItems2.length;
        renderHomeCatalogGrid2();
        syncHomeCatalogMoreButton2();
      }).catch(() => {
      });
    } else {
      nextItems = await fetchHomeCatalogPageSafe2(1);
    }
    if (requestId !== homeCatalogRequestId2) return;
    homeCatalogItems2 = nextItems;
    if (homeCatalogMode2 === "manga") homeCatalogAvailableTotal2 = homeCatalogItems2.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
    syncHomeCatalogGenreControl2();
    renderHomeCatalogGrid2();
    syncHomeCatalogMoreButton2();
  } catch (error) {
    if (requestId !== homeCatalogRequestId2) return;
    grid.innerHTML = `<div class="home-catalog-empty">\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u043A\u0430\u0442\u0430\u043B\u043E\u0433. \u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437.</div>`;
    showToast("\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443");
  } finally {
    if (requestId === homeCatalogRequestId2) homeCatalogLoading2 = false;
  }
}
async function loadHomeCatalogMore2() {
  if (homeCatalogLoading2) return;
  const button = document.getElementById("homeCatalogMoreBtn");
  if (!button) return;
  homeCatalogLoading2 = true;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> \u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F...';
  try {
    if (homeCatalogMode2 === "manga" && homeCatalogAge2 !== "all" && !homeCatalogFilterResultItems2) {
      const fullCatalog = await loadHoneyMangaFullCatalog2();
      homeCatalogFilterResultItems2 = filterMangaCatalogItems2(fullCatalog);
      homeCatalogFilterIndexReady2 = true;
      homeCatalogFilterResultOffset2 = Math.min(homeCatalogItems2.length || homeCatalogPageSize2(), homeCatalogFilterResultItems2.length);
      homeCatalogItems2 = homeCatalogFilterResultItems2.slice(0, homeCatalogFilterResultOffset2);
      homeCatalogTotal2 = homeCatalogFilterResultItems2.length;
      homeCatalogAvailableTotal2 = homeCatalogItems2.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
      homeCatalogHasMore2 = homeCatalogFilterResultOffset2 < homeCatalogFilterResultItems2.length;
      renderHomeCatalogGrid2();
      if (!homeCatalogHasMore2) button.remove();
      else {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-plus"></i> \u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438';
      }
      return;
    }
    if (homeCatalogFilterResultItems2) {
      homeCatalogFilterResultOffset2 = Math.min(homeCatalogFilterResultOffset2 + 24, homeCatalogFilterResultItems2.length);
      homeCatalogItems2 = homeCatalogFilterResultItems2.slice(0, homeCatalogFilterResultOffset2);
      homeCatalogAvailableTotal2 = homeCatalogItems2.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
      homeCatalogHasMore2 = homeCatalogFilterResultOffset2 < homeCatalogFilterResultItems2.length;
      renderHomeCatalogGrid2();
      if (!homeCatalogHasMore2) button.remove();
      else {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-plus"></i> \u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438';
      }
      return;
    }
    const nextPage = homeCatalogPage2 + 1;
    const nextItems = await fetchHomeCatalogPage2(nextPage);
    const existing = new Set(homeCatalogItems2.map((item) => item.url));
    homeCatalogItems2.push(...nextItems.filter((item) => item.url && !existing.has(item.url)));
    homeCatalogPage2 = nextPage;
    if (homeCatalogMode2 === "manga") homeCatalogAvailableTotal2 = homeCatalogItems2.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
    renderHomeCatalogGrid2();
    homeCatalogHasMore2 = nextItems.hasNextPage !== void 0 ? Boolean(nextItems.hasNextPage) : homeCatalogMode2 === "manga" ? homeCatalogHasMore2 : Boolean(nextItems.length) && (!homeCatalogTotal2 || homeCatalogItems2.length < homeCatalogTotal2);
    if (!homeCatalogHasMore2) button.remove();
    else {
      button.disabled = false;
      button.innerHTML = '<i class="fas fa-plus"></i> \u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438';
    }
  } catch (error) {
    button.disabled = false;
    button.innerHTML = '<i class="fas fa-rotate-right"></i> \u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438 \u0449\u0435';
    showToast("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u043D\u0430\u0441\u0442\u0443\u043F\u043D\u0443 \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0443 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443");
  } finally {
    homeCatalogLoading2 = false;
  }
}
function syncHomeCatalogMoreButton2() {
  document.getElementById("homeCatalogMoreBtn")?.remove();
}
async function loadAndDisplayGenreSections2() {
  const requestId = ++homeSectionsRequestId2;
  const catalogRequestId = ++homeCatalogRequestId2;
  const container = document.getElementById("genreSectionsContainer");
  if (!container) return;
  container.style.display = "flex";
  homeCatalogPage2 = 1;
  homeCatalogItems2 = [];
  homeCatalogTotal2 = 0;
  homeCatalogAvailableTotal2 = 0;
  homeCatalogHasMore2 = true;
  homeCatalogFilterResultItems2 = null;
  homeCatalogFilterResultOffset2 = 0;
  homeCatalogLoading2 = false;
  container.innerHTML = buildHomeCatalogSectionHtml2([]);
  const initialGrid = container.querySelector("#homeCatalogGrid");
  if (initialGrid) initialGrid.innerHTML = renderAnimeCardSkeleton(12);
  bindHomeCatalogCards2(container);
  bindHomeCatalogMenu2(container);
  syncHomeCatalogGenreControl2(container);
  syncHomeCatalogMoreButton2();
  try {
    const catalogItems = await fetchHomeCatalogPageSafe2(1).catch((error) => {
      console.error("\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443:", error);
      homeCatalogTotal2 = 0;
      throw error;
    });
    if (requestId !== homeSectionsRequestId2) return;
    homeCatalogItems2 = catalogItems.filter((item) => item?.url);
    if (homeCatalogMode2 === "manga") homeCatalogAvailableTotal2 = homeCatalogItems2.filter((item) => item.readerAvailable || item.readerUrl || Number(item.chapters) > 0).length;
    syncHomeCatalogGenreControl2(container);
    renderHomeCatalogGrid2();
    syncHomeCatalogMoreButton2();
  } catch (err) {
    console.error("\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0433\u043E\u043B\u043E\u0432\u043D\u043E\u0457 \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0438:", err);
    const grid = container.querySelector("#homeCatalogGrid");
    if (grid) {
      grid.innerHTML = `<div class="home-catalog-empty">\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u043A\u0430\u0442\u0430\u043B\u043E\u0433. <button class="btn-outline" type="button" id="homeCatalogRetryBtn">\u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438 \u0449\u0435</button></div>`;
      grid.querySelector("#homeCatalogRetryBtn")?.addEventListener("click", () => reloadHomeCatalog2());
    }
    homeCatalogHasMore2 = false;
    syncHomeCatalogMoreButton2();
  }
}
function statusLabelUa2(status) {
  const map = { ongoing: "\u041E\u043D\u0433\u043E\u0456\u043D\u0433", released: "\u0412\u0438\u0439\u0448\u043B\u043E", finished: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E", completed: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E", anons: "\u0410\u043D\u043E\u043D\u0441" };
  if (!status) return "";
  return map[status] || status.charAt(0).toUpperCase() + status.slice(1);
}
function cardPoster2(a, fallback = ANIME_CARD_PLACEHOLDER2) {
  return a?.images?.jpg?.medium_image_url || a?.images?.jpg?.large_image_url || a?.poster || a?.image || fallback;
}
var HOME_CATALOG_ANIME_TIMEOUT_MS2, currentTab2, currentPage2, currentSearchQuery2, currentCategory2, quickFilterParams2, HOME_FEED_MAX_ITEMS2, homeFeedItems2, homeFeedPage2, homeFeedHasMore2, homeFeedLoading2, homeFeedRequestId2, homeFeedObserver2, homeFeedRetryAt2, popularRenderGen2, ANIME_CARD_PLACEHOLDER2, animeCardDataMap2, TMDB_ENRICH_CONCURRENCY2, tmdbEnrichActive2, tmdbEnrichQueue2, animeCardObserver2, ANIME_GRID_MAX_RENDERED2, ANIME_GRID_RESTORE_ROWS2, animeGridSpacerObserver2, genreList2, homeSectionsRequestId2, homeCatalogRequestId2, homeCatalogPage2, homeCatalogItems2, homeCatalogLoading2, HOME_CATALOG_FEED_MAX_ITEMS2, homeCatalogFeedObserver2, homeCatalogFeedBusy2, homeCatalogFeedCooldownUntil2, homeCatalogFeedError2, homeCatalogTotal2, homeCatalogAvailableTotal2, homeCatalogHasMore2, homeCatalogMode2, homeCatalogQuery2, homeCatalogSort2, homeCatalogView2, homeCatalogPreset2, homeCatalogGenre2, homeCatalogAdult2, homeCatalogStatus2, homeCatalogAvailability2, homeCatalogAge2, homeCatalogOrigin2, homeCatalogGenres2, homeCatalogType2, homeCatalogYearMin2, homeCatalogYearMax2, homeCatalogScoreMin2, homeCatalogFilterResultItems2, homeCatalogFilterResultOffset2, homeCatalogFilterIndexReady2, honeyCatalogPageCache2, honeyMangaApiCache2, honeyMangaFullCatalogPromises2, HOME_CATALOG_MODES2, HONEY_API3, HONEY_SEARCH_API2, HONEY_WEB3, HONEY_IMAGE2, HONEY_SEARCH_PATTERN2, honeySearchCache2, honeyReaderCache2, honeyReaderPendingCache2, honeyAvailabilityMap2, HONEY_PROMO_MARKERS2, HONEY_PROMO_POSTER_IDS2, homeCatalogFilterOpen2, CATALOG_YEAR_OPTIONS2, CATALOG_YEAR_RANGES2, CATALOG_TYPE_OPTIONS2, CATALOG_SORT_OPTIONS2, CATALOG_MANGA_GENRES2, CATALOG_MANGA_AVAILABILITY_OPTIONS2, CATALOG_MANGA_AGE_OPTIONS2;
var init_homeLegacy2 = __esm({
  "src/js/pages/home/homeLegacy.js?v=20260927-persistence-v1"() {
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
    HOME_CATALOG_ANIME_TIMEOUT_MS2 = 12e3;
    currentTab2 = "main";
    currentPage2 = 1;
    currentSearchQuery2 = "";
    currentCategory2 = "";
    quickFilterParams2 = null;
    HOME_FEED_MAX_ITEMS2 = 960;
    homeFeedItems2 = [];
    homeFeedPage2 = 1;
    homeFeedHasMore2 = true;
    homeFeedLoading2 = false;
    homeFeedRequestId2 = 0;
    homeFeedObserver2 = null;
    homeFeedRetryAt2 = 0;
    popularRenderGen2 = 0;
    ANIME_CARD_PLACEHOLDER2 = "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><rect width="300" height="420" fill="#2a2a2a"/><text x="150" y="215" font-family="sans-serif" font-size="42" fill="#666" text-anchor="middle">?</text></svg>`
    );
    animeCardDataMap2 = /* @__PURE__ */ new Map();
    TMDB_ENRICH_CONCURRENCY2 = 3;
    tmdbEnrichActive2 = 0;
    tmdbEnrichQueue2 = [];
    animeCardObserver2 = null;
    ANIME_GRID_MAX_RENDERED2 = 120;
    ANIME_GRID_RESTORE_ROWS2 = 6;
    animeGridSpacerObserver2 = null;
    window.changePage = (p) => {
      if (p < 1) return;
      currentPage2 = p;
      window.scrollTo({ top: 0, behavior: "smooth" });
      loadContent2();
    };
    genreList2 = Object.entries(GENRE_MAP2).map(([name, slug]) => ({ name, slug }));
    homeSectionsRequestId2 = 0;
    homeCatalogRequestId2 = 0;
    homeCatalogPage2 = 1;
    homeCatalogItems2 = [];
    homeCatalogLoading2 = false;
    HOME_CATALOG_FEED_MAX_ITEMS2 = 960;
    homeCatalogFeedObserver2 = null;
    homeCatalogFeedBusy2 = false;
    homeCatalogFeedCooldownUntil2 = 0;
    homeCatalogFeedError2 = false;
    homeCatalogTotal2 = 0;
    homeCatalogAvailableTotal2 = 0;
    homeCatalogHasMore2 = true;
    homeCatalogMode2 = "anime";
    homeCatalogQuery2 = "";
    homeCatalogSort2 = "score";
    homeCatalogView2 = "grid";
    homeCatalogPreset2 = "all";
    homeCatalogGenre2 = "all";
    homeCatalogAdult2 = false;
    homeCatalogStatus2 = "all";
    homeCatalogAvailability2 = "all";
    homeCatalogAge2 = "all";
    homeCatalogOrigin2 = "all";
    homeCatalogGenres2 = /* @__PURE__ */ new Set();
    homeCatalogType2 = "all";
    homeCatalogYearMin2 = "";
    homeCatalogYearMax2 = "";
    homeCatalogScoreMin2 = "";
    homeCatalogFilterResultItems2 = null;
    homeCatalogFilterResultOffset2 = 0;
    homeCatalogFilterIndexReady2 = false;
    honeyCatalogPageCache2 = /* @__PURE__ */ new Map();
    honeyMangaApiCache2 = /* @__PURE__ */ new Map();
    honeyMangaFullCatalogPromises2 = /* @__PURE__ */ new Map();
    HOME_CATALOG_MODES2 = [
      { key: "anime", label: "\u0410\u043D\u0456\u043C\u0435", icon: "fa-photo-film" },
      { key: "manga", label: "\u041C\u0430\u043D\u0491\u0430", icon: "fa-palette" }
    ];
    HONEY_API3 = "https://data.api.honey-manga.com.ua";
    HONEY_SEARCH_API2 = "https://search.api.honey-manga.com.ua";
    HONEY_WEB3 = "https://honey-manga.com.ua";
    HONEY_IMAGE2 = "https://honeymangastorage-nocache.b-cdn.net/public-resources";
    HONEY_SEARCH_PATTERN2 = "/v2/manga/pattern?query=";
    honeySearchCache2 = /* @__PURE__ */ new Map();
    honeyReaderCache2 = /* @__PURE__ */ new Map();
    honeyReaderPendingCache2 = /* @__PURE__ */ new Map();
    honeyAvailabilityMap2 = null;
    HONEY_PROMO_MARKERS2 = Object.freeze([
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
    HONEY_PROMO_POSTER_IDS2 = /* @__PURE__ */ new Set([
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
    homeCatalogFilterOpen2 = false;
    CATALOG_YEAR_OPTIONS2 = [
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
    CATALOG_YEAR_RANGES2 = {
      "2026": [2026, 2026],
      "2025": [2025, 2025],
      "2024": [2024, 2024],
      "2015-2023": [2015, 2023],
      "2008-2014": [2008, 2014],
      "2000-2007": [2e3, 2007],
      "before2000": [1970, 1999]
    };
    CATALOG_TYPE_OPTIONS2 = [
      { key: "", label: "\u0411\u0443\u0434\u044C-\u044F\u043A\u0438\u0439" },
      { key: "tv", label: "\u0421\u0435\u0440\u0456\u0430\u043B" },
      { key: "movie", label: "\u0424\u0456\u043B\u044C\u043C" },
      { key: "ova", label: "OVA" },
      { key: "ona", label: "ONA" },
      { key: "special", label: "\u0421\u043F\u0435\u0448\u043B" }
    ];
    CATALOG_SORT_OPTIONS2 = [
      { key: "rating", label: "\u0417\u0430 \u0440\u0435\u0439\u0442\u0438\u043D\u0433\u043E\u043C" },
      { key: "alpha", label: "\u0417\u0430 \u0430\u043B\u0444\u0430\u0432\u0456\u0442\u043E\u043C" },
      { key: "newest", label: "\u041D\u043E\u0432\u0456\u0448\u0456" }
    ];
    CATALOG_MANGA_GENRES2 = [
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
    CATALOG_MANGA_AVAILABILITY_OPTIONS2 = [
      { key: "all", label: "\u0423\u0441\u0456 \u0442\u0430\u0439\u0442\u043B\u0438" },
      { key: "available", label: "\u0404 \u0449\u043E \u0447\u0438\u0442\u0430\u0442\u0438" }
    ];
    CATALOG_MANGA_AGE_OPTIONS2 = [
      { key: "all", label: "\u0423\u0441\u0456" },
      { key: "general", label: "\u0414\u043B\u044F \u0432\u0441\u0456\u0445" },
      { key: "teen", label: "16+" },
      { key: "adult", label: "18+" }
    ];
    window.loadHomeCatalogMore = loadHomeCatalogMore2;
  }
});
