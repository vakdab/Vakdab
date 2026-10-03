var reader_exports = {};
__export(reader_exports, {
  DEFAULT_CHAPTER_URL: () => DEFAULT_CHAPTER_URL,
  renderMangaReader: () => renderMangaReader
});
async function renderMangaReader(container, chapterUrl = DEFAULT_CHAPTER_URL, onNavigate = () => {
}, mangaTitle = "") {
  if (!container) return;
  container.innerHTML = `<section class="manga-reader manga-reader--loading"><div class="manga-reader__loader"><div class="site-loading-skeleton site-loading-skeleton--manga" aria-label="\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0438"><div class="site-loading-skeleton__wrapper"><div class="site-loading-skeleton__circle site-skeleton__block"></div><div class="site-loading-skeleton__line site-loading-skeleton__line--1 site-skeleton__block"></div><div class="site-loading-skeleton__line site-loading-skeleton__line--2 site-skeleton__block"></div><div class="site-loading-skeleton__line site-loading-skeleton__line--3 site-skeleton__block"></div><div class="site-loading-skeleton__line site-loading-skeleton__line--4 site-skeleton__block"></div></div></div><p>\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0438 1\u2026</p><small>\u041F\u0456\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043F\u0435\u0440\u0448\u043E\u0457 \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0438</small></div></section>`;
  window.scrollTo({ top: 0, behavior: "instant" });
  let ids;
  try {
    ids = parseChapterUrl(chapterUrl);
  } catch (error) {
    showReaderError(container, error, chapterUrl, onNavigate, mangaTitle);
    return;
  }
  try {
    const pages = await getChapterFrames(chapterUrl);
    if (!pages.length) throw new Error("\u0423 \u0440\u043E\u0437\u0434\u0456\u043B\u0456 \u043D\u0435\u043C\u0430\u0454 \u0441\u0442\u043E\u0440\u0456\u043D\u043E\u043A");
    const background = getReaderBackgroundData(ids.titleId, chapterUrl);
    renderShell(container, ids, pages, background, chapterUrl, onNavigate, mangaTitle);
  } catch (error) {
    showReaderError(container, error, chapterUrl, onNavigate, mangaTitle);
  }
}
function showReaderError(container, error, chapterUrl, onNavigate, mangaTitle = "") {
  container.innerHTML = `<section class="manga-reader manga-reader--error"><div class="manga-reader__error"><i class="fas fa-triangle-exclamation"></i><h1>\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u043C\u0430\u043D\u0491\u0443</h1><p>${escapeHtml(error?.message || "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0437\u2019\u0454\u0434\u043D\u0430\u043D\u043D\u044F \u0442\u0430 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437.")}</p><button type="button" id="mangaReaderRetry">\u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438 \u0449\u0435 \u0440\u0430\u0437</button></div></section>`;
  container.querySelector("#mangaReaderRetry")?.addEventListener("click", () => renderMangaReader(container, chapterUrl, onNavigate, mangaTitle));
}
function renderShell(container, ids, pages, background, chapterUrl, onNavigate, mangaTitle = "") {
  const cleanTitle = (value) => {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text && text !== "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438" && !/^https?:\/\//i.test(text) && !/\/chapters\//i.test(text) && !/^\d+-[a-z0-9-]+(?:\.html)?$/i.test(text) ? text : "";
  };
  const titleFallback = cleanTitle(mangaTitle) || "\u041C\u0430\u043D\u0491\u0430";
  const pageMarkup = buildPageMarkup(pages, pageImageUrl, pageImageFallbackUrl);
  container.innerHTML = `<section class="manga-reader" aria-label="\u0420\u0456\u0434\u0435\u0440 \u043C\u0430\u043D\u0491\u0438">
        <header class="manga-reader__header"><button class="manga-reader__back" type="button" aria-label="\u041D\u0430\u0437\u0430\u0434"><i class="fas fa-arrow-left"></i><span>\u041D\u0430\u0437\u0430\u0434</span></button><div class="manga-reader__heading"><span>VAKDAB \xB7 \u041C\u0410\u041D\u0490\u0410</span><h1 id="mangaReaderTitle">${titleFallback}</h1><p id="mangaReaderChapter">${escapeHtml(normalizeChapterName(chapterUrl))}</p></div></header>
        <div class="manga-reader__intro"><div><strong>\u0428\u0432\u0438\u0434\u043A\u0435 \u0447\u0438\u0442\u0430\u043D\u043D\u044F</strong><span>\u041F\u0435\u0440\u0448\u0430 \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0430 \u0432\u0436\u0435 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0443\u0454\u0442\u044C\u0441\u044F, \u0456\u043D\u0448\u0456 \u2014 \u043F\u043E\u0441\u0442\u0443\u043F\u043E\u0432\u043E \u0443 \u0444\u043E\u043D\u0456.</span></div><span class="manga-reader__counter" id="mangaReaderCounter">1 / ${pages.length}</span></div>
        <div class="manga-reader__toolbar" role="toolbar" aria-label="\u041A\u0435\u0440\u0443\u0432\u0430\u043D\u043D\u044F \u0440\u0456\u0434\u0435\u0440\u043E\u043C"><button type="button" data-reader-action="prev" aria-label="\u041F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u044F \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0430"><i class="fas fa-chevron-left"></i></button><button type="button" data-reader-action="zoom-out" aria-label="\u0417\u043C\u0435\u043D\u0448\u0438\u0442\u0438"><i class="fas fa-minus"></i></button><span class="manga-reader__zoom" id="mangaReaderZoom">100%</span><button type="button" data-reader-action="zoom-in" aria-label="\u0417\u0431\u0456\u043B\u044C\u0448\u0438\u0442\u0438"><i class="fas fa-plus"></i></button><button type="button" data-reader-action="next" aria-label="\u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0430 \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0430"><i class="fas fa-chevron-right"></i></button><button type="button" data-reader-action="fullscreen" aria-label="\u041F\u043E\u0432\u043D\u0438\u0439 \u0435\u043A\u0440\u0430\u043D"><i class="fas fa-expand"></i></button></div>
        <div class="manga-reader__chapter-select"><label for="mangaReaderChapterSelect">\u0420\u043E\u0437\u0434\u0456\u043B</label><select id="mangaReaderChapterSelect" disabled><option>\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0440\u043E\u0437\u0434\u0456\u043B\u0456\u0432\u2026</option></select></div>
        <div class="manga-reader__pages" id="mangaReaderPages">${pageMarkup}</div>
        <nav class="manga-reader__pager" aria-label="\u041D\u0430\u0432\u0456\u0433\u0430\u0446\u0456\u044F \u0440\u043E\u0437\u0434\u0456\u043B\u0430\u043C\u0438"><button type="button" data-chapter-url="" disabled>\u2190 \u041F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0440\u043E\u0437\u0434\u0456\u043B</button><button type="button" data-chapter-url="" disabled>\u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u0440\u043E\u0437\u0434\u0456\u043B \u2192</button></nav>
        <details class="manga-reader__about"><summary>\u041F\u0440\u043E \u043C\u0430\u043D\u0491\u0443</summary><p id="mangaReaderDescription">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u043E\u043F\u0438\u0441\u0443\u2026</p></details>
    </section>`;
  const pagesRoot = container.querySelector("#mangaReaderPages");
  pagesRoot?.style.setProperty("--manga-reader-zoom", "1");
  const figures = [...container.querySelectorAll(".manga-reader__page")];
  const preloader = createPagePreloader(figures, { root: pagesRoot, debug: (event, details) => debugLog("manga", event, details) });
  let active = 0;
  let zoom = 1;
  figures.slice(0, 4).forEach((figure, index) => preloader.enqueue(figure, index === 0));
  const savedProg = getMangaReadingProgress(ids.titleId);
  if (savedProg && savedProg.chapterUrl === chapterUrl && Number(savedProg.pageIndex) > 0 && Number(savedProg.pageIndex) < figures.length) {
    active = Number(savedProg.pageIndex);
    setTimeout(() => {
      figures[active]?.scrollIntoView({ behavior: "auto", block: "center" });
      container.querySelector("#mangaReaderCounter").textContent = pageLabel(active, figures.length);
    }, 100);
  }
  const setActive = (index) => {
    active = Math.max(0, Math.min(figures.length - 1, index));
    preloader.enqueue(figures[active], true);
    preloader.preloadAround(active);
    figures[active]?.scrollIntoView({ behavior: "smooth", block: "center" });
    container.querySelector("#mangaReaderCounter").textContent = pageLabel(active, figures.length);
    saveMangaReadingProgress(ids.titleId, chapterUrl, active);
  };
  let scrollThrottleTimer = null;
  const updateScroll = () => {
    const top = pagesRoot.getBoundingClientRect().top;
    let closest = 0;
    let distance = Infinity;
    figures.forEach((figure, index) => {
      const d = Math.abs(figure.getBoundingClientRect().top - top);
      if (d < distance) {
        distance = d;
        closest = index;
      }
    });
    active = closest;
    container.querySelector("#mangaReaderCounter").textContent = pageLabel(active, figures.length);
    preloader.preloadAround(active);
    if (!scrollThrottleTimer) {
      scrollThrottleTimer = setTimeout(() => {
        scrollThrottleTimer = null;
        saveMangaReadingProgress(ids.titleId, chapterUrl, active);
      }, 500);
    }
  };
  pagesRoot.addEventListener("scroll", updateScroll, { passive: true });
  const setZoom = (value) => {
    zoom = Math.max(0.75, Math.min(1.75, Number(value) || 1));
    pagesRoot.style.setProperty("--manga-reader-zoom", zoom);
    const label = container.querySelector("#mangaReaderZoom");
    if (label) label.textContent = `${Math.round(zoom * 100)}%`;
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
      else if (pagesRoot.requestFullscreen) await pagesRoot.requestFullscreen();
      else {
        pagesRoot.classList.toggle("manga-reader__pages--fullscreen");
        showToastFallback("\u041F\u043E\u0432\u043D\u0438\u0439 \u0435\u043A\u0440\u0430\u043D \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u0447\u0435\u0440\u0435\u0437 \u043C\u0435\u043D\u044E \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430");
      }
    } catch {
      showToastFallback("\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u0434\u043E\u0437\u0432\u043E\u043B\u0438\u0432 \u043F\u043E\u0432\u043D\u0438\u0439 \u0435\u043A\u0440\u0430\u043D");
    }
  };
  const showToastFallback = (message) => {
    const toast2 = document.createElement("div");
    toast2.className = "manga-reader__notice";
    toast2.textContent = message;
    container.appendChild(toast2);
    setTimeout(() => toast2.remove(), 2200);
  };
  container.querySelectorAll("[data-reader-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.readerAction;
    if (action === "prev") setActive(active - 1);
    if (action === "next") setActive(active + 1);
    if (action === "zoom-in") setZoom(zoom + 0.1);
    if (action === "zoom-out") setZoom(zoom - 0.1);
    if (action === "fullscreen") toggleFullscreen();
  }));
  container.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") setActive(active - 1);
    if (event.key === "ArrowRight" || event.key === " ") {
      event.preventDefault();
      setActive(active + 1);
    }
    if (event.key === "+" || event.key === "=") setZoom(zoom + 0.1);
    if (event.key === "-") setZoom(zoom - 0.1);
    if (event.key.toLowerCase() === "f") toggleFullscreen();
  });
  container.tabIndex = 0;
  container.querySelector(".manga-reader__back")?.addEventListener("click", () => onNavigate(null));
  background.then((data) => {
    const title = data.title || {};
    const chapterList = data.chapterList || [];
    const sourceTitle = cleanTitle(title.title);
    const safeTitle = cleanTitle(mangaTitle) || sourceTitle || titleFallback;
    const currentIndex = chapterList.findIndex((item) => String(item.id) === String(ids.chapterId));
    container.querySelector("#mangaReaderTitle").textContent = safeTitle;
    container.querySelector("#mangaReaderChapter").textContent = normalizeChapterName(data.chapter || chapterUrl);
    container.querySelector("#mangaReaderDescription").textContent = title.description || "\u041E\u043F\u0438\u0441 \u0432\u0456\u0434\u0441\u0443\u0442\u043D\u0456\u0439.";
    document.title = `${safeTitle} \u2014 VakDab`;
    const select = container.querySelector("#mangaReaderChapterSelect");
    select.innerHTML = chapterList.length ? chapterList.map((item) => `<option value="${escapeHtml(String(item.id))}"${String(item.id) === String(ids.chapterId) ? " selected" : ""}>${escapeHtml(normalizeChapterName(item))}</option>`).join("") : "<option>\u0420\u043E\u0437\u0434\u0456\u043B\u0438 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0456</option>";
    select.disabled = !chapterList.length;
    const setChapterButton = (button, item, label) => {
      if (!item) {
        button.disabled = true;
        return;
      }
      button.disabled = false;
      button.dataset.chapterUrl = item.url || item.id || "";
      button.textContent = label;
    };
    setChapterButton(container.querySelector("[data-chapter-url]:first-child"), currentIndex > 0 ? chapterList[currentIndex - 1] : null, "\u2190 \u041F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0440\u043E\u0437\u0434\u0456\u043B");
    setChapterButton(container.querySelector("[data-chapter-url]:last-child"), currentIndex >= 0 && currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null, "\u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u0440\u043E\u0437\u0434\u0456\u043B \u2192");
    select.addEventListener("change", (event) => {
      const item = chapterList.find((chapter) => String(chapter.id) === event.target.value);
      if (item) onNavigate(item.url || item.id || "");
    });
    container.querySelectorAll("[data-chapter-url]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.chapterUrl) onNavigate(button.dataset.chapterUrl);
    }));
  }).catch(() => {
  });
  preloader.preloadAround(0);
}
var init_reader = __esm({
  "src/js/components/manga/reader.js?v=20260824-settings-redesign-v1"() {
    init_manga();
    init_pages();
    init_debug();
    init_preload();
  }
});
