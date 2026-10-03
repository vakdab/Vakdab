function preloadHeroImage(url) {
  if (!url) return Promise.resolve(false);
  if (heroPreloadedImages.has(url)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const img = new Image();
    const done = (ok) => {
      heroPreloadedImages.add(url);
      resolve(ok);
    };
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = url;
  });
}
function getCurrentRoute() {
  if (window.Router?.currentRoute) return window.Router.currentRoute;
  const hash = window.location.hash.slice(1) || "main";
  return hash.split("?")[0];
}
function openPlayer(url) {
  if (typeof window.openPlayerPage === "function") {
    window.openPlayerPage(url);
  } else {
    window.location.hash = "anime?" + new URLSearchParams({ url });
  }
}
function toast(message) {
  if (typeof window.showToast === "function") {
    window.showToast(message);
  }
}
function getBookmarks() {
  if (window.Storage?.getBookmarks) return window.Storage.getBookmarks();
  try {
    return JSON.parse(localStorage.getItem("vakdab_bookmarks") || "[]");
  } catch (_) {
    return [];
  }
}
function saveBookmarks(bookmarks) {
  if (window.Storage?.setBookmarks) {
    window.Storage.setBookmarks(bookmarks);
  } else {
    try {
      localStorage.setItem("vakdab_bookmarks", JSON.stringify(bookmarks));
    } catch (_) {
    }
  }
}
function isHeroItemBookmarked(url) {
  if (!url) return false;
  return getBookmarks().some((b) => b?.url === url);
}
function toggleHeroBookmark(item) {
  if (!item?.url) return false;
  const bookmarks = getBookmarks();
  const idx = bookmarks.findIndex((b) => b?.url === item.url);
  if (idx >= 0) {
    bookmarks.splice(idx, 1);
    saveBookmarks(bookmarks);
    toast("\u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043E \u0437 \u043E\u0431\u0440\u0430\u043D\u043E\u0433\u043E");
    return false;
  }
  bookmarks.push({
    url: item.url,
    title: item.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438",
    poster: item.images?.jpg?.large_image_url || "",
    addedAt: Date.now()
  });
  saveBookmarks(bookmarks);
  toast("\u0414\u043E\u0434\u0430\u043D\u043E \u0434\u043E \u043E\u0431\u0440\u0430\u043D\u043E\u0433\u043E");
  return true;
}
function loadCachedHeroPool() {
  try {
    const cached = sessionStorage.getItem(HERO_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {
  }
  return [];
}
function saveCachedHeroPool(pool) {
  try {
    if (Array.isArray(pool) && pool.length > 0) {
      sessionStorage.setItem(HERO_CACHE_KEY, JSON.stringify(pool.slice(0, 30)));
    }
  } catch (_) {
  }
}
async function buildHeroBanner() {
  const wrapper = document.getElementById("heroWrapper");
  if (!wrapper) return;
  if (window.__vakdabHeroActive) {
    if (getCurrentRoute() === "main" && typeof window.resumeHeroRotation === "function" && !heroRotationTimer && heroItems.length > 1) {
      startHeroRotation();
    }
    return;
  }
  window.__vakdabHeroActive = true;
  if (getCurrentRoute() !== "main") {
    wrapper.style.display = "none";
    return;
  }
  wrapper.style.display = "block";
  if (heroPool.length === 0) {
    const cachedPool = loadCachedHeroPool();
    heroPool = cachedPool.length > 0 ? cachedPool : [...FALLBACK_HERO_ANIME];
    heroSeenUrls = /* @__PURE__ */ new Set();
    heroItems = takeHeroBatch();
    heroCurrentIndex = 0;
    renderHeroSlide(heroItems[0]);
    buildHeroIndicators();
    initHeroControls();
    startHeroRotation();
  } else if (heroItems.length > 1 && !heroRotationTimer) {
    startHeroRotation();
  }
  fetchFreshHeroData().catch((err) => {
    console.warn("Hero background fetch note:", err.message);
  });
}
async function fetchFreshHeroData() {
  const [topResult, mainResult] = await Promise.allSettled([
    fetchHikkaTop100(),
    fetchHikkaMain(1)
  ]);
  const topAnime = topResult.status === "fulfilled" && Array.isArray(topResult.value) ? topResult.value : [];
  const ordinaryAnime = mainResult.status === "fulfilled" && Array.isArray(mainResult.value) ? mainResult.value : [];
  const combined = [...topAnime, ...ordinaryAnime].filter((item) => item?.url && (item.images?.jpg?.large_image_url || item.image)).map((item) => ({
    ...item,
    images: {
      jpg: {
        large_image_url: item.images?.jpg?.large_image_url || item.image || ""
      }
    }
  })).filter((item, index, list) => list.findIndex((other) => other.url === item.url) === index);
  if (combined.length > 0) {
    heroPool = combined;
    saveCachedHeroPool(heroPool);
    if (getCurrentRoute() === "main" && heroItems.length > 0 && heroItems[heroCurrentIndex]) {
      const activePoster = heroItems[heroCurrentIndex]?.images?.jpg?.large_image_url || "";
      if (activePoster) {
        const probe = new Image();
        probe.onerror = () => {
          if (getCurrentRoute() !== "main" || heroItems.length === 0) return;
          heroSeenUrls = /* @__PURE__ */ new Set();
          heroItems = takeHeroBatch();
          heroCurrentIndex = 0;
          renderHeroSlide(heroItems[0]);
          buildHeroIndicators();
        };
        probe.src = activePoster;
      }
    }
    if (heroItems.length === 0 || heroItems[0]?.url === FALLBACK_HERO_ANIME[0].url) {
      heroSeenUrls = /* @__PURE__ */ new Set();
      heroItems = takeHeroBatch();
      heroCurrentIndex = 0;
      if (getCurrentRoute() === "main") {
        renderHeroSlide(heroItems[0]);
        buildHeroIndicators();
        startHeroRotation();
      }
    }
  }
}
function takeHeroBatch() {
  if (!heroPool.length) heroPool = [...FALLBACK_HERO_ANIME];
  const available = heroPool.filter((item) => item?.url && !heroSeenUrls.has(item.url));
  if (available.length < 3) {
    heroSeenUrls.clear();
  }
  const poolToPick = heroPool.filter((item) => item?.url && !heroSeenUrls.has(item.url));
  const batch = [...poolToPick].sort(() => Math.random() - 0.5).slice(0, 6);
  batch.forEach((item) => heroSeenUrls.add(item.url));
  return batch.length ? batch : heroPool.slice(0, 5);
}
async function loadNextHeroBatch() {
  stopHeroRotation();
  let nextBatch = takeHeroBatch();
  if (!nextBatch.length) {
    heroSeenUrls.clear();
    nextBatch = takeHeroBatch();
  }
  if (!nextBatch.length) return;
  heroItems = nextBatch;
  heroCurrentIndex = 0;
  renderHeroSlide(heroItems[0]);
  buildHeroIndicators();
  startHeroRotation();
  loadHeroItemDetails(0).then(() => {
    if (heroCurrentIndex === 0) updateHeroSlideContent(heroItems[0]);
  }).catch(() => {
  });
  if (heroItems.length > 1) loadHeroItemDetails(1).catch(() => {
  });
}
async function loadHeroItemDetails(idx) {
  if (idx < 0 || idx >= heroItems.length) return;
  const item = heroItems[idx];
  if (item.detailsLoaded) return;
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5e3));
  try {
    const detail = await Promise.race([loadHikkaDetail(item.url), timeoutPromise]);
    item.genres = detail.genres || item.genres || [];
    item.totalEpisodes = detail.totalEpisodes || item.totalEpisodes || 0;
    item.synopsis = detail.synopsis || item.synopsis || "";
    item.year = detail.year || item.year || "";
    item.detailsLoaded = true;
    item.rating = item.rating || (7 + Math.random() * 2.5).toFixed(1);
  } catch (e) {
    item.genres = item.genres || ["\u0410\u043D\u0456\u043C\u0435"];
    item.totalEpisodes = item.totalEpisodes || 0;
    item.synopsis = item.synopsis || "\u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \xAB\u0414\u0438\u0432\u0438\u0442\u0438\u0441\u044F\xBB, \u0449\u043E\u0431 \u043F\u0435\u0440\u0435\u0439\u0442\u0438 \u0434\u043E \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u0434\u0443.";
    item.rating = item.rating || (7 + Math.random() * 2.5).toFixed(1);
    item.detailsLoaded = true;
  }
}
function escapeHeroText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
function cleanHeroSynopsis(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}
function renderHeroSlide(item) {
  const container = document.getElementById("heroSlidesContainer");
  if (!container || !item) return;
  const poster = item.images?.jpg?.large_image_url || "";
  const rawTitle = String(item.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438").trim();
  const title = rawTitle.length > 40 ? rawTitle.substring(0, 40).trimEnd() + "\u2026" : rawTitle;
  const genres = Array.isArray(item.genres) && item.genres.length ? item.genres : ["\u0410\u043D\u0456\u043C\u0435"];
  const rawRating = item.score ?? item.rating;
  let rating = "";
  if (rawRating && !isNaN(parseFloat(rawRating)) && !String(rawRating).includes("_") && !String(rawRating).toLowerCase().includes("pg")) {
    rating = parseFloat(rawRating).toFixed(1);
  } else {
    let seed = 0;
    for (let i = 0; i < rawTitle.length; i++) seed += rawTitle.charCodeAt(i);
    rating = (8 + seed % 15 / 10).toFixed(1);
  }
  const year = item.year || "";
  const episodes = item.totalEpisodes || 0;
  const synopsis = cleanHeroSynopsis(item.synopsis);
  const metaParts = [];
  if (year) metaParts.push(year);
  if (episodes > 0) metaParts.push(episodes + " \u0435\u043F.");
  const metaHtml = metaParts.length > 0 ? `<span class="hero-info-separator">\xB7</span><span class="hero-meta">${metaParts.join(' <span class="hero-meta-dot"></span> ')}</span>` : "";
  const synopsisHtml = synopsis ? `<div class="hero-slide-desc">${escapeHeroText(synopsis)}</div>` : "";
  const slide = document.createElement("div");
  slide.className = "hero-slide";
  slide.dataset.url = item.url;
  const safePoster = poster || "";
  const bgStyle = safePoster ? `background-image: url('${safePoster}'), linear-gradient(135deg, #1a1a1a, #2d2d2d);` : "background-image: linear-gradient(135deg, #1a1a1a, #2d2d2d);";
  const bookmarked = isHeroItemBookmarked(item.url);
  slide.innerHTML = `
                <div class="hero-slide-bg" style="${bgStyle}"></div>
                <div class="hero-slide-overlay"></div>
                <div class="hero-slide-content">
                    <div class="hero-slide-title">${escapeHeroText(title)}</div>
                    <div class="hero-slide-tags">
                        ${genres.slice(0, 3).map((g) => `<span class="hero-tag genre-tag">${escapeHeroText(g)}</span>`).join("")}
                    </div>
                    ${synopsisHtml}
                    <div class="hero-info-pill hero-rating-row hero-rating-row--bottom">
                        <span class="hero-rating-badge"><span class="star">\u2605</span> ${rating}</span>
                        ${metaHtml}
                    </div>
                    <div class="hero-cta-row">
                        <button type="button" class="hero-watch-btn" aria-label="\u0414\u0438\u0432\u0438\u0442\u0438\u0441\u044C ${escapeHeroText(title)}"><i class="fas fa-play"></i><span>\u0414\u0438\u0432\u0438\u0442\u0438\u0441\u044C</span></button>
                        <button type="button" class="hero-fav-btn${bookmarked ? " is-active" : ""}" aria-pressed="${bookmarked ? "true" : "false"}" aria-label="${bookmarked ? "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0437 \u043E\u0431\u0440\u0430\u043D\u043E\u0433\u043E" : "\u0414\u043E\u0434\u0430\u0442\u0438 \u0432 \u043E\u0431\u0440\u0430\u043D\u0435"}"><i class="fas fa-heart"></i></button>
                    </div>
                </div>
            `;
  container.querySelectorAll(".hero-slide:not(.active)").forEach((el) => el.remove());
  const previousSlide = heroMountedSlide;
  container.appendChild(slide);
  heroMountedSlide = slide;
  slide.classList.add("active");
  void slide.offsetWidth;
  slide.classList.remove("active");
  void slide.offsetWidth;
  slide.classList.add("active");
  if (previousSlide && previousSlide !== slide) {
    setTimeout(() => previousSlide.remove(), 550);
  }
  slide.addEventListener("click", (e) => {
    if (heroJustSwiped) {
      heroJustSwiped = false;
      return;
    }
    if (e.target.closest(".hero-watch-btn, .hero-fav-btn, .hero-dot")) return;
    if (item.url) openPlayer(item.url);
  });
  slide.querySelector(".hero-watch-btn")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (item.url) openPlayer(item.url);
  });
  const favBtn = slide.querySelector(".hero-fav-btn");
  favBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const active = toggleHeroBookmark(item);
    favBtn.classList.toggle("is-active", active);
    favBtn.setAttribute("aria-pressed", String(active));
    favBtn.setAttribute("aria-label", active ? "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0437 \u043E\u0431\u0440\u0430\u043D\u043E\u0433\u043E" : "\u0414\u043E\u0434\u0430\u0442\u0438 \u0432 \u043E\u0431\u0440\u0430\u043D\u0435");
  });
}
function updateHeroSlideContent(item) {
  const slide = heroMountedSlide;
  if (!slide || !item || slide.dataset.url !== item.url) return;
  const rawTitle = String(item.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438").trim();
  const title = rawTitle.length > 40 ? rawTitle.substring(0, 40).trimEnd() + "\u2026" : rawTitle;
  const titleEl = slide.querySelector(".hero-slide-title");
  if (titleEl) titleEl.innerHTML = escapeHeroText(title);
  const genres = Array.isArray(item.genres) && item.genres.length ? item.genres : ["\u0410\u043D\u0456\u043C\u0435"];
  const tagsEl = slide.querySelector(".hero-slide-tags");
  if (tagsEl) tagsEl.innerHTML = genres.slice(0, 3).map((g) => `<span class="hero-tag genre-tag">${escapeHeroText(g)}</span>`).join("");
  const ratingRow = slide.querySelector(".hero-rating-row");
  if (ratingRow) {
    const rawRating = item.score ?? item.rating;
    let rating = "";
    if (rawRating && !isNaN(parseFloat(rawRating)) && !String(rawRating).includes("_") && !String(rawRating).toLowerCase().includes("pg")) {
      rating = parseFloat(rawRating).toFixed(1);
    } else {
      let seed = 0;
      for (let i = 0; i < rawTitle.length; i++) seed += rawTitle.charCodeAt(i);
      rating = (8 + seed % 15 / 10).toFixed(1);
    }
    const metaParts = [];
    if (item.year) metaParts.push(item.year);
    if (item.totalEpisodes > 0) metaParts.push(item.totalEpisodes + " \u0435\u043F.");
    const metaHtml = metaParts.length > 0 ? `<span class="hero-info-separator">\xB7</span><span class="hero-meta">${metaParts.join(' <span class="hero-meta-dot"></span> ')}</span>` : "";
    ratingRow.innerHTML = `<span class="hero-rating-badge"><span class="star">\u2605</span> ${rating}</span>${metaHtml}`;
  }
  const synopsis = cleanHeroSynopsis(item.synopsis);
  if (synopsis) {
    let descEl = slide.querySelector(".hero-slide-desc");
    if (!descEl) {
      descEl = document.createElement("div");
      descEl.className = "hero-slide-desc";
      ratingRow?.parentNode?.insertBefore(descEl, ratingRow);
    }
    descEl.textContent = synopsis;
  }
}
function buildHeroIndicators() {
  const dotsContainer = document.getElementById("heroDots");
  if (!dotsContainer) return;
  dotsContainer.innerHTML = "";
  heroItems.forEach((_, idx) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "hero-dot" + (idx === heroCurrentIndex ? " active" : "");
    dot.setAttribute("aria-label", `\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0438 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0456\u044E ${idx + 1}`);
    dot.setAttribute("aria-current", String(idx === heroCurrentIndex));
    dot.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      goToSlide(idx);
    });
    dotsContainer.appendChild(dot);
  });
}
function updateHeroIndicators() {
  const dots = document.querySelectorAll(".hero-dot");
  dots.forEach((dot, idx) => {
    const active = idx === heroCurrentIndex;
    dot.classList.toggle("active", active);
    dot.setAttribute("aria-current", String(active));
  });
}
async function goToSlide(idx) {
  if (idx < 0 || idx >= heroItems.length) return;
  if (idx === heroCurrentIndex && document.querySelector(".hero-slide")) return;
  heroCurrentIndex = idx;
  renderHeroSlide(heroItems[idx]);
  updateHeroIndicators();
  resetHeroTimer();
  if (!heroItems[idx].detailsLoaded) {
    loadHeroItemDetails(idx).then(() => {
      if (heroCurrentIndex === idx) updateHeroSlideContent(heroItems[idx]);
    }).catch(() => {
    });
  }
  const nextIdx = (idx + 1) % heroItems.length;
  if (heroItems[nextIdx]) {
    preloadHeroImage(heroItems[nextIdx].images?.jpg?.large_image_url || "");
    if (!heroItems[nextIdx].detailsLoaded) {
      loadHeroItemDetails(nextIdx).catch(() => {
      });
    }
  }
}
function nextSlide() {
  if (!heroItems.length) return;
  if (heroCurrentIndex >= heroItems.length - 1) {
    if (heroPool.length > heroItems.length) {
      loadNextHeroBatch().catch(() => {
      });
    } else {
      goToSlide(0);
    }
    return;
  }
  goToSlide(heroCurrentIndex + 1);
}
function prevSlide() {
  if (!heroItems.length) return;
  goToSlide((heroCurrentIndex - 1 + heroItems.length) % heroItems.length);
}
function initHeroControls() {
  const wrapper = document.getElementById("heroWrapper");
  if (wrapper) {
    wrapper.querySelectorAll(".hero-nav-arrow, #heroPrevBtn, #heroNextBtn").forEach((el) => el.remove());
  }
  initHeroGestures();
}
function initHeroGestures() {
  const wrapper = document.getElementById("heroWrapper");
  if (!wrapper || wrapper.dataset.gesturesInit) return;
  wrapper.dataset.gesturesInit = "1";
  let startX = 0, startY = 0, tracking = false, isDragging = false;
  wrapper.addEventListener("touchstart", (e) => {
    if (!e.touches.length) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
    isDragging = false;
  }, { passive: true });
  wrapper.addEventListener("touchmove", (e) => {
    if (!tracking || !e.touches.length) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      isDragging = true;
    }
  }, { passive: true });
  wrapper.addEventListener("touchend", (e) => {
    if (!tracking || !e.changedTouches.length) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      heroJustSwiped = true;
      if (dx < 0) nextSlide();
      else prevSlide();
      setTimeout(() => {
        heroJustSwiped = false;
      }, 300);
    }
  }, { passive: true });
  wrapper.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button, .hero-dot, a")) return;
    startX = e.clientX;
    startY = e.clientY;
    tracking = true;
    isDragging = false;
  });
  window.addEventListener("mousemove", (e) => {
    if (!tracking) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 15) {
      isDragging = true;
    }
  });
  window.addEventListener("mouseup", (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (isDragging && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      heroJustSwiped = true;
      if (dx < 0) nextSlide();
      else prevSlide();
      setTimeout(() => {
        heroJustSwiped = false;
      }, 300);
    }
  });
  wrapper.addEventListener("mouseenter", () => pauseHeroRotation());
  wrapper.addEventListener("mouseleave", () => {
    if (getCurrentRoute() === "main") resumeHeroRotation();
  });
}
function startHeroRotation() {
  stopHeroRotation();
  heroIsPaused = false;
  if (heroItems.length < 2) return;
  const fill = document.getElementById("heroProgressFill");
  let elapsed = 0;
  if (fill) fill.style.width = "0%";
  heroProgressInterval = setInterval(() => {
    if (heroIsPaused) return;
    elapsed += 50;
    if (fill) fill.style.width = Math.min(100, elapsed / HERO_SLIDE_DURATION * 100) + "%";
  }, 50);
  heroRotationTimer = setTimeout(() => {
    if (!heroIsPaused) nextSlide();
  }, HERO_SLIDE_DURATION);
}
function stopHeroRotation() {
  if (heroRotationTimer) {
    clearTimeout(heroRotationTimer);
    heroRotationTimer = null;
  }
  if (heroProgressInterval) {
    clearInterval(heroProgressInterval);
    heroProgressInterval = null;
  }
  const fill = document.getElementById("heroProgressFill");
  if (fill) fill.style.width = "0%";
}
function pauseHeroRotation() {
  heroIsPaused = true;
}
function resumeHeroRotation() {
  heroIsPaused = false;
  if (!heroRotationTimer && heroItems.length > 1) {
    startHeroRotation();
  }
}
function resetHeroTimer() {
  stopHeroRotation();
  startHeroRotation();
}
var FALLBACK_HERO_ANIME, heroItems, heroPool, heroSeenUrls, heroCurrentIndex, heroRotationTimer, heroProgressInterval, heroJustSwiped, heroIsPaused, HERO_SLIDE_DURATION, HERO_CACHE_KEY, heroMountedSlide, heroPreloadedImages;
var init_heroBanner = __esm({
  "src/js/components/home/heroBanner.js?v=20260920-hero-motion-v1"() {
    init_catalog();
    FALLBACK_HERO_ANIME = [
      {
        title: "\u041F\u0440\u043E\u0432\u043E\u0434\u0436\u0430\u043B\u044C\u043D\u0438\u0446\u044F \u0424\u0440\u0456\u0440\u0435\u043D",
        url: "https://api.hikka.io/anime/sousou-no-frieren-ad4e3e",
        images: { jpg: { large_image_url: "https://cdn.hikka.io/content/anime/sousou-no-frieren-ad4e3e/8D-SGEkCBMAUE7CgEt9UPQ.jpg" } },
        genres: ["\u0414\u0440\u0430\u043C\u0430", "\u0428\u044C\u043E\u043D\u0435\u043D", "\u0424\u0435\u043D\u0442\u0435\u0437\u0456"],
        year: 2023,
        totalEpisodes: 28,
        rating: "9.3",
        synopsis: "\u041F\u0456\u0441\u043B\u044F \u043F\u0435\u0440\u0435\u043C\u043E\u0433\u0438 \u043D\u0430\u0434 \u041A\u043E\u0440\u043E\u043B\u0435\u043C \u0414\u0435\u043C\u043E\u043D\u0456\u0432 \u0435\u043B\u044C\u0444\u0456\u0439\u043A\u0430-\u0447\u0430\u0440\u0456\u0432\u043D\u0438\u0446\u044F \u0424\u0440\u0456\u0440\u0435\u043D \u0432\u0438\u0440\u0443\u0448\u0430\u0454 \u0443 \u043D\u043E\u0432\u0443 \u043C\u0430\u043D\u0434\u0440\u0456\u0432\u043A\u0443, \u0449\u043E\u0431 \u043F\u0456\u0437\u043D\u0430\u0442\u0438 \u0441\u043F\u0440\u0430\u0432\u0436\u043D\u0454 \u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F \u043B\u044E\u0434\u0441\u044C\u043A\u0438\u0445 \u0437\u0432'\u044F\u0437\u043A\u0456\u0432."
      },
      {
        title: "\u0421\u0442\u0430\u043B\u0435\u0432\u0438\u0439 \u0430\u043B\u0445\u0456\u043C\u0456\u043A: \u0411\u0440\u0430\u0442\u0435\u0440\u0441\u0442\u0432\u043E",
        url: "https://api.hikka.io/anime/fullmetal-alchemist-brotherhood-fc524a",
        images: { jpg: { large_image_url: "https://cdn.hikka.io/content/anime/fullmetal-alchemist-brotherhood-fc524a/1dRVedKKpa2i_iiHmEcDhA.jpg" } },
        genres: ["\u0414\u0440\u0430\u043C\u0430", "\u0428\u044C\u043E\u043D\u0435\u043D", "\u0411\u043E\u0439\u043E\u0432\u0438\u043A"],
        year: 2009,
        totalEpisodes: 64,
        rating: "9.1",
        synopsis: "\u0411\u0440\u0430\u0442\u0438 \u0415\u043B\u0440\u0456\u043A\u0438 \u0448\u0443\u043A\u0430\u044E\u0442\u044C \u0444\u0456\u043B\u043E\u0441\u043E\u0444\u0441\u044C\u043A\u0438\u0439 \u043A\u0430\u043C\u0456\u043D\u044C, \u0449\u043E\u0431 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438 \u0442\u0456\u043B\u0430, \u044F\u043A\u0456 \u0432\u0442\u0440\u0430\u0442\u0438\u043B\u0438 \u043F\u0456\u0434 \u0447\u0430\u0441 \u0437\u0430\u0431\u043E\u0440\u043E\u043D\u0435\u043D\u043E\u0457 \u0430\u043B\u0445\u0456\u043C\u0456\u0447\u043D\u043E\u0457 \u0441\u043F\u0440\u043E\u0431\u0438."
      },
      {
        title: "\u041F\u0435\u0440\u0435\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F: \u0416\u0438\u0442\u0442\u044F \u0437 \u043D\u0443\u043B\u044F \u0432 \u0456\u043D\u0448\u043E\u043C\u0443 \u0441\u0432\u0456\u0442\u0456 \u2014 4 \u0441\u0435\u0437\u043E\u043D",
        url: "https://api.hikka.io/anime/rezero-kara-hajimeru-isekai-seikatsu-4th-season-7f05ab",
        images: { jpg: { large_image_url: "https://cdn.hikka.io/content/anime/rezero-kara-hajimeru-isekai-seikatsu-4th-season-7f05ab/98gRlrUMjxMDIZ5GJXnnSQ.jpg" } },
        genres: ["\u041F\u043E\u0434\u043E\u0440\u043E\u0436\u0456 \u0432 \u0447\u0430\u0441\u0456", "\u041F\u0441\u0438\u0445\u043E\u043B\u043E\u0433\u0456\u044F", "\u0422\u0440\u0438\u043B\u0435\u0440"],
        year: 2026,
        totalEpisodes: 0,
        rating: "9.1",
        synopsis: "\u0421\u0443\u0431\u0430\u0440\u0443 \u0437\u043D\u043E\u0432\u0443 \u043F\u043E\u0432\u0435\u0440\u0442\u0430\u0454\u0442\u044C\u0441\u044F \u0441\u043C\u0435\u0440\u0442\u044E \u2014 \u043D\u043E\u0432\u0438\u0439 \u0441\u0435\u0437\u043E\u043D \u0432\u0438\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u043D\u044C \u0443 \u0441\u0432\u0456\u0442\u0456, \u0434\u0435 \u0447\u0430\u0441 \u0454\u0434\u0438\u043D\u043E\u044E \u0437\u0431\u0440\u043E\u0454\u044E."
      },
      {
        title: "\u0425\u0438\u043C\u0435\u0440\u043D\u0456 \u043F\u0440\u0438\u0433\u043E\u0434\u0438 \u0414\u0436\u043E\u0414\u0436\u043E: \u041F\u0435\u0440\u0435\u0433\u043E\u043D\u0438 \xAB\u0421\u0442\u0430\u043B\u0435\u0432\u0430 \u043A\u0443\u043B\u044F\xBB",
        url: "https://api.hikka.io/anime/jojo-no-kimyou-na-bouken-part-7-steel-ball-run-aae44e",
        images: { jpg: { large_image_url: "https://cdn.hikka.io/content/anime/steel-ball-run-jojo-no-kimyou-na-bouken-aae44e/eQA9BX87jQFq8_Z1m18MZg.jpg" } },
        genres: ["\u0417\u0430\u0433\u0430\u0434\u043A\u043E\u0432\u0435", "\u0411\u043E\u0439\u043E\u0432\u0438\u043A", "\u0406\u0441\u0442\u043E\u0440\u0438\u0447\u043D\u0435"],
        year: 2026,
        totalEpisodes: 0,
        rating: "9.1",
        synopsis: "\u041F\u0435\u0440\u0435\u0433\u043E\u043D\u0438 \u043D\u0430 \u0442\u0438\u0441\u044F\u0447\u043E\u043A\u0456\u043B\u043E\u043C\u0435\u0442\u0440\u043E\u0432\u0456\u0439 \u0434\u0438\u0441\u0442\u0430\u043D\u0446\u0456\u0457, \u0434\u0435 \u0434\u0436\u043E\u043A\u0435\u0457 \u0437\u043C\u0430\u0433\u0430\u044E\u0442\u044C\u0441\u044F \u043D\u0435 \u043B\u0438\u0448\u0435 \u043D\u0430 \u0448\u0432\u0438\u0434\u043A\u0456\u0441\u0442\u044C, \u0430 \u0439 \u0432\u043E\u043B\u0435\u044E \u0434\u043E \u043F\u0435\u0440\u0435\u043C\u043E\u0433\u0438."
      },
      {
        title: "\u0411\u043B\u0456\u0447: \u0422\u0438\u0441\u044F\u0447\u043E\u043B\u0456\u0442\u043D\u044F \u043A\u0440\u0438\u0432\u0430\u0432\u0430 \u0432\u0456\u0439\u043D\u0430 \u2014 \u041B\u0438\u0445\u043E",
        url: "https://api.hikka.io/anime/bleach-sennen-kessen-hen-kashin-tan-3ce3e3",
        images: { jpg: { large_image_url: "https://cdn.hikka.io/content/anime/bleach-sennen-kessen-hen-kashin-tan-3ce3e3/6Qjtoqen-jsLSUBMfPG-Ww.jpg" } },
        genres: ["\u0428\u044C\u043E\u043D\u0435\u043D", "\u0411\u043E\u0439\u043E\u0432\u0438\u043A", "\u041D\u0430\u0434\u043F\u0440\u0438\u0440\u043E\u0434\u043D\u0435"],
        year: 2024,
        totalEpisodes: 13,
        rating: "9.1",
        synopsis: "\u0424\u0456\u043D\u0430\u043B\u044C\u043D\u0430 \u0432\u0456\u0439\u043D\u0430 \u043C\u0456\u0436 \u0436\u043D\u0435\u0446\u0430\u043C\u0438 \u0434\u0443\u0448 \u0456 \u043A\u0432\u0456\u043D\u0441\u0456 \u043D\u0430\u0431\u0438\u0440\u0430\u0454 \u043E\u0431\u0435\u0440\u0442\u0456\u0432 \u2014 \u0434\u043E\u043B\u044F \u0421\u0432\u0456\u0442\u0443 \u0436\u0438\u0432\u0438\u0445 \u0456 \u043C\u0435\u0440\u0442\u0432\u0438\u0445 \u0432\u0438\u0440\u0456\u0448\u0443\u0454\u0442\u044C\u0441\u044F \u0437\u0430\u0440\u0430\u0437."
      },
      {
        title: "\u0428\u0442\u0430\u0439\u043D\u043E\u0432\u0430;\u0411\u0440\u0430\u043C\u0430",
        url: "https://api.hikka.io/anime/steinsgate-f29797",
        images: { jpg: { large_image_url: "https://cdn.hikka.io/content/anime/steinsgate-f29797/M-8Gxbqmsq0ScxFZWQAt-Q.jpg" } },
        genres: ["\u041F\u0441\u0438\u0445\u043E\u043B\u043E\u0433\u0456\u044F", "\u0424\u0430\u043D\u0442\u0430\u0441\u0442\u0438\u043A\u0430", "\u0422\u0440\u0438\u043B\u0435\u0440"],
        year: 2011,
        totalEpisodes: 24,
        rating: "9.0",
        synopsis: "\u0412\u0438\u043D\u0430\u0445\u0456\u0434\u043B\u0438\u0432\u0438\u0439 \u0441\u0442\u0443\u0434\u0435\u043D\u0442 \u0432\u0438\u043F\u0430\u0434\u043A\u043E\u0432\u043E \u0441\u0442\u0432\u043E\u0440\u044E\u0454 \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439, \u0449\u043E \u043D\u0430\u0434\u0441\u0438\u043B\u0430\u0454 \u043F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F \u0432 \u043C\u0438\u043D\u0443\u043B\u0435 \u2014 \u0456 \u0437\u043C\u0456\u043D\u044E\u0454 \u0434\u043E\u043B\u044E \u0441\u0432\u0456\u0442\u0443."
      },
      {
        title: "\u0410\u0442\u0430\u043A\u0430 \u0442\u0438\u0442\u0430\u043D\u0456\u0432 \u2014 3 \u0441\u0435\u0437\u043E\u043D, 2 \u0447\u0430\u0441\u0442\u0438\u043D\u0430",
        url: "https://api.hikka.io/anime/shingeki-no-kyojin-season-3-part-2-91a350",
        images: { jpg: { large_image_url: "https://cdn.hikka.io/content/anime/shingeki-no-kyojin-season-3-part-2-91a350/G2dalZZxHj8T2-MXipYabg.jpg" } },
        genres: ["\u0415\u043A\u0448\u043D", "\u0414\u0440\u0430\u043C\u0430", "\u041C\u0456\u0441\u0442\u0438\u043A\u0430"],
        year: 2019,
        totalEpisodes: 10,
        rating: "9.0",
        synopsis: "\u0410\u0440\u043C\u0456\u044F \u0415\u0440\u0435\u043D\u0430 \u0432\u0435\u0434\u0435 \u043E\u0441\u0442\u0430\u043D\u043D\u0456\u0439 \u0431\u0456\u0439 \u0437\u0430 \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F \u0441\u0442\u0456\u043D \u0456 \u043F\u0440\u0430\u0432\u0434\u0443 \u043F\u0440\u043E \u0441\u0432\u0456\u0442 \u0437\u0430 \u043D\u0438\u043C\u0438."
      },
      {
        title: "\u041B\u044E\u0434\u0438\u043D\u0430-\u0431\u0435\u043D\u0437\u043E\u043F\u0438\u043B\u0430: \u0410\u0440\u043A\u0430 \u0420\u0435\u0437\u0435",
        url: "https://api.hikka.io/anime/chainsaw-man-movie-reze-hen-c4febd",
        images: { jpg: { large_image_url: "https://cdn.hikka.io/content/anime/chainsaw-man-movie-reze-hen-c4febd/UfgfLlbLkAlsSy2ppbY8Vg.jpg" } },
        genres: ["\u0415\u043A\u0448\u043D", "\u041D\u0430\u0434\u043F\u0440\u0438\u0440\u043E\u0434\u043D\u0435", "\u041A\u043E\u043C\u0435\u0434\u0456\u044F"],
        year: 2025,
        totalEpisodes: 1,
        rating: "9.0",
        synopsis: "\u0414\u0435\u043D\u0434\u0436\u0456 \u0437\u0443\u0441\u0442\u0440\u0456\u0447\u0430\u0454 \u0420\u0435\u0437\u0435 \u2014 \u0434\u0456\u0432\u0447\u0438\u043D\u0443, \u044F\u043A\u0430 \u0445\u043E\u0432\u0430\u0454 \u0441\u0435\u043A\u0440\u0435\u0442 \u043D\u0435\u0431\u0435\u0437\u043F\u0435\u0447\u043D\u0456\u0448\u0438\u0439 \u0437\u0430 \u0431\u0443\u0434\u044C-\u044F\u043A\u043E\u0433\u043E \u0434\u0438\u044F\u0432\u043E\u043B\u0430."
      }
    ];
    heroItems = [];
    heroPool = [];
    heroSeenUrls = /* @__PURE__ */ new Set();
    heroCurrentIndex = 0;
    heroRotationTimer = null;
    heroProgressInterval = null;
    heroJustSwiped = false;
    heroIsPaused = false;
    HERO_SLIDE_DURATION = 6500;
    HERO_CACHE_KEY = "vakdab_hero_cache_v3";
    heroMountedSlide = null;
    heroPreloadedImages = /* @__PURE__ */ new Set();
    window.buildHeroBanner = buildHeroBanner;
    window.heroNextSlide = nextSlide;
    window.heroPrevSlide = prevSlide;
    window.stopHeroRotation = stopHeroRotation;
    window.pauseHeroRotation = pauseHeroRotation;
    window.resumeHeroRotation = resumeHeroRotation;
  }
});
