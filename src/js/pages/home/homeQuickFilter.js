function genreEntries() {
  return Object.entries(GENRE_MAP4).map(([name, slug]) => ({ name, slug }));
}
function buildHomeQuickFilterHtml() {
  const isManga = quickFilterState.mode === "manga";
  const searchPlaceholder = isManga ? "\u041F\u043E\u0448\u0443\u043A \u043C\u0430\u043D\u0491\u0438..." : "\u041F\u043E\u0448\u0443\u043A \u0430\u043D\u0456\u043C\u0435...";
  return `
      <!-- \u041F\u0435\u0440\u0435\u043C\u0438\u043A\u0430\u0447 \u0410\u043D\u0456\u043C\u0435 / \u041C\u0430\u043D\u0491\u0430 \u043D\u0430 \u0433\u043E\u043B\u043E\u0432\u043D\u0456\u0439 \u0441\u0442\u043E\u0440\u0456\u043D\u0446\u0456 -->
      <div class="hqf-mode-tabs" role="tablist" aria-label="\u0412\u0438\u0431\u0456\u0440 \u0440\u043E\u0437\u0434\u0456\u043B\u0443">
        <button type="button" class="hqf-mode-tab${!isManga ? " active" : ""}" data-hqf-mode="anime" role="tab" aria-selected="${!isManga}">
          <i class="fas fa-photo-film" aria-hidden="true"></i>
          <span>\u0410\u043D\u0456\u043C\u0435</span>
        </button>
        <button type="button" class="hqf-mode-tab${isManga ? " active" : ""}" data-hqf-mode="manga" role="tab" aria-selected="${isManga}">
          <i class="fas fa-book-open" aria-hidden="true"></i>
          <span>\u041C\u0430\u043D\u0491\u0430</span>
        </button>
      </div>

      <div class="hqf-toolbar hqf-toolbar--merged">
        <div class="hqf-merged-bar" id="hqfMergedBar">
          <i class="fas fa-search hqf-search-glass" aria-hidden="true"></i>
          <input type="text" inputmode="search" id="hqfSearchInput" class="hqf-search-input" placeholder="${searchPlaceholder}" value="${hqfSearchQuery}" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search" aria-label="${searchPlaceholder}">
          <button type="button" class="hqf-search-clear" id="hqfSearchClear" aria-label="\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u043F\u043E\u0448\u0443\u043A"${hqfSearchQuery ? "" : " hidden"}>
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
          <span class="hqf-merged-divider" aria-hidden="true"></span>
          <button class="hqf-categories-toggle${quickFilterState.open ? " open" : ""}" id="hqfCategoriesToggle" type="button" aria-label="\u041E\u0431\u0440\u0430\u0442\u0438 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u0457" aria-expanded="${quickFilterState.open ? "true" : "false"}">
            <i class="fas fa-sliders" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div class="hqf-panel${quickFilterState.open ? " open" : ""}" id="hqfPanel">
        <div class="hqf-panel-inner">
          ${!isManga ? `
          <!-- \u0424\u0456\u043B\u044C\u0442\u0440\u0438 \u0410\u041D\u0406\u041C\u0415 -->
          <div class="hqf-col">
            <div class="hqf-col-title">\u0416\u0430\u043D\u0440</div>
            <div class="hqf-option-list" id="hqfGenreList">
              ${genreEntries().map((g) => `
                <label class="hqf-option">
                  <input type="checkbox" data-genre="${g.slug}" ${quickFilterState.genres.has(g.slug) ? "checked" : ""}>
                  <span class="hqf-option-bullet"></span>
                  <span>${g.name}</span>
                </label>`).join("")}
            </div>
          </div>
          <div class="hqf-col">
            <div class="hqf-col-title">\u0422\u0438\u043F</div>
            <div class="hqf-option-list">
              ${TYPE_OPTIONS.map((o) => `
                <label class="hqf-option">
                  <input type="radio" name="hqfType" data-type="${o.key}" ${quickFilterState.type === o.key ? "checked" : ""}>
                  <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                  <span>${o.label}</span>
                </label>`).join("")}
            </div>
            <div class="hqf-col-title hqf-col-title--spaced">\u0420\u0456\u043A \u0432\u0438\u0445\u043E\u0434\u0443</div>
            <div class="hqf-option-list">
              ${YEAR_OPTIONS.map((o) => `
                <label class="hqf-option">
                  <input type="radio" name="hqfYear" data-year="${o.key}" ${quickFilterState.year === o.key ? "checked" : ""}>
                  <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                  <span>${o.label}</span>
                </label>`).join("")}
            </div>
            <div class="hqf-col-title hqf-col-title--spaced">\u0421\u043E\u0440\u0442\u0443\u0432\u0430\u043D\u043D\u044F</div>
            <div class="hqf-option-list">
              ${SORT_OPTIONS.map((o) => `
                <label class="hqf-option">
                  <input type="radio" name="hqfSort" data-sort="${o.key}" ${quickFilterState.sort === o.key ? "checked" : ""}>
                  <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                  <span>${o.label}</span>
                </label>`).join("")}
            </div>
          </div>
          ` : `
          <!-- \u0424\u0456\u043B\u044C\u0442\u0440\u0438 \u041C\u0410\u041D\u0490\u0418 -->
          <div class="hqf-col">
            <div class="hqf-col-title">\u0416\u0430\u043D\u0440 \u043C\u0430\u043D\u0491\u0438</div>
            <div class="hqf-option-list" id="hqfGenreList">
              ${MANGA_GENRES.map((name) => `
                <label class="hqf-option">
                  <input type="checkbox" data-manga-genre="${name}" ${quickFilterState.genres.has(name) ? "checked" : ""}>
                  <span class="hqf-option-bullet"></span>
                  <span>${name}</span>
                </label>`).join("")}
            </div>
          </div>
          <div class="hqf-col">
            <div class="hqf-col-title">\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u0456\u0441\u0442\u044C</div>
            <div class="hqf-option-list">
              ${MANGA_AVAILABILITY_OPTIONS.map((o) => `
                <label class="hqf-option">
                  <input type="radio" name="hqfMangaAvail" data-manga-avail="${o.key}" ${quickFilterState.mangaAvailability === o.key ? "checked" : ""}>
                  <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                  <span>${o.label}</span>
                </label>`).join("")}
            </div>
            <div class="hqf-col-title hqf-col-title--spaced">\u0412\u0456\u043A\u043E\u0432\u0430 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u044F</div>
            <div class="hqf-option-list">
              ${MANGA_AGE_OPTIONS.map((o) => `
                <label class="hqf-option">
                  <input type="radio" name="hqfMangaAge" data-manga-age="${o.key}" ${quickFilterState.mangaAge === o.key ? "checked" : ""}>
                  <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                  <span>${o.label}</span>
                </label>`).join("")}
            </div>
            <div class="hqf-col-title hqf-col-title--spaced">\u0421\u043E\u0440\u0442\u0443\u0432\u0430\u043D\u043D\u044F</div>
            <div class="hqf-option-list">
              ${MANGA_SORT_OPTIONS.map((o) => `
                <label class="hqf-option">
                  <input type="radio" name="hqfSort" data-sort="${o.key}" ${quickFilterState.sort === o.key ? "checked" : ""}>
                  <span class="hqf-option-bullet hqf-option-bullet--radio"></span>
                  <span>${o.label}</span>
                </label>`).join("")}
            </div>
          </div>
          `}
        </div>
      </div>
    `;
}
function applyQuickFilter({ keepOpen = false } = {}) {
  setHomeRecommendationMode(quickFilterState.mode);
  const params = {
    mode: quickFilterState.mode,
    sort: quickFilterState.sort
  };
  if (quickFilterState.mode === "anime") {
    if (quickFilterState.genres.size) params.genres = [...quickFilterState.genres];
    if (quickFilterState.type) params.type = quickFilterState.type;
    if (quickFilterState.year === "ongoing") params.status = "ongoing";
    else if (YEAR_RANGES[quickFilterState.year]) {
      [params.yearMin, params.yearMax] = YEAR_RANGES[quickFilterState.year];
    }
  } else {
    if (quickFilterState.genres.size) params.genres = [...quickFilterState.genres];
    if (quickFilterState.mangaAvailability) params.availability = quickFilterState.mangaAvailability;
    if (quickFilterState.mangaAge) params.age = quickFilterState.mangaAge;
  }
  setCurrentTab("main");
  setCurrentPage(1);
  setCurrentSearchQuery("");
  setCurrentCategory("");
  const mangaHasFilters = quickFilterState.genres.size > 0 || quickFilterState.mangaAge && quickFilterState.mangaAge !== "all" || quickFilterState.mangaAvailability && quickFilterState.mangaAvailability !== "all" || quickFilterState.sort === "alpha";
  const recommendationFilter = quickFilterState.mode === "manga" && !mangaHasFilters ? null : params;
  setQuickFilterParams(recommendationFilter);
  setHomeRecommendationFilter(recommendationFilter);
  setHomeRecommendationSearchQuery(hqfSearchQuery);
  const genreSections = document.getElementById("genreSectionsContainer");
  if (genreSections) genreSections.style.display = "none";
  const animeContainer = document.getElementById("animeContainer");
  if (animeContainer) animeContainer.style.display = "none";
  const recommendations = document.getElementById("homeRecommendationsContainer");
  if (recommendations) recommendations.style.display = "block";
  quickFilterState.open = keepOpen;
  renderHomeQuickFilterBar();
  loadHomeRecommendations({ reload: true });
  recommendations?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function showRecommendations() {
  quickFilterState = {
    mode: quickFilterState.mode,
    genres: /* @__PURE__ */ new Set(),
    type: "",
    year: "",
    sort: "rating",
    mangaAvailability: "all",
    mangaAge: "all",
    open: false
  };
  setHomeRecommendationMode(quickFilterState.mode);
  setQuickFilterParams(null);
  setHomeRecommendationFilter(null);
  setCurrentTab("main");
  setCurrentPage(1);
  setCurrentSearchQuery("");
  setCurrentCategory("");
  hqfSearchQuery = "";
  setHomeRecommendationSearchQuery("");
  const genreSections = document.getElementById("genreSectionsContainer");
  if (genreSections) genreSections.style.display = "none";
  const recs = document.getElementById("homeRecommendationsContainer");
  if (recs) {
    recs.style.display = "block";
    loadHomeRecommendations({ reload: true });
  }
  const animeContainer = document.getElementById("animeContainer");
  if (animeContainer) animeContainer.style.display = "none";
  renderHomeQuickFilterBar();
}
function wireHomeQuickFilterEvents(container) {
  container.querySelectorAll("[data-hqf-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.hqfMode;
      if (mode && mode !== quickFilterState.mode) {
        quickFilterState.mode = mode;
        quickFilterState.genres.clear();
        quickFilterState.sort = "rating";
        setHomeRecommendationMode(mode);
        applyQuickFilter({ keepOpen: quickFilterState.open });
      }
    });
  });
  const toggle = document.getElementById("hqfCategoriesToggle");
  const panel = document.getElementById("hqfPanel");
  toggle?.addEventListener("click", () => {
    quickFilterState.open = !quickFilterState.open;
    toggle.classList.toggle("open", quickFilterState.open);
    toggle.setAttribute("aria-expanded", quickFilterState.open ? "true" : "false");
    panel?.classList.toggle("open", quickFilterState.open);
    container.classList.toggle("is-open", quickFilterState.open);
  });
  document.getElementById("hqfHeadlineBtn")?.addEventListener("click", () => {
    showRecommendations();
  });
  container.querySelectorAll("[data-genre]").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) quickFilterState.genres.add(cb.dataset.genre);
      else quickFilterState.genres.delete(cb.dataset.genre);
      applyQuickFilter({ keepOpen: true });
    });
  });
  container.querySelectorAll("[data-manga-genre]").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) quickFilterState.genres.add(cb.dataset.mangaGenre);
      else quickFilterState.genres.delete(cb.dataset.mangaGenre);
      applyQuickFilter({ keepOpen: true });
    });
  });
  container.querySelectorAll("[data-manga-avail]").forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) quickFilterState.mangaAvailability = radio.dataset.mangaAvail;
      applyQuickFilter({ keepOpen: true });
    });
  });
  container.querySelectorAll("[data-manga-age]").forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) quickFilterState.mangaAge = radio.dataset.mangaAge;
      applyQuickFilter({ keepOpen: true });
    });
  });
  container.querySelectorAll("[data-type]").forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) quickFilterState.type = radio.dataset.type;
      applyQuickFilter({ keepOpen: true });
    });
  });
  container.querySelectorAll("[data-year]").forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) quickFilterState.year = radio.dataset.year;
      applyQuickFilter({ keepOpen: true });
    });
  });
  container.querySelectorAll("[data-sort]").forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) quickFilterState.sort = radio.dataset.sort;
      applyQuickFilter({ keepOpen: true });
    });
  });
  const searchInput = document.getElementById("hqfSearchInput");
  const searchClear = document.getElementById("hqfSearchClear");
  const mergedBar = document.getElementById("hqfMergedBar");
  const updateSearchMode = () => {
    const hasQuery = Boolean(searchInput?.value.trim());
    mergedBar?.classList.toggle("has-query", hasQuery);
    if (searchClear) searchClear.hidden = !hasQuery;
  };
  updateSearchMode();
  const runInlineSearch = () => {
    setHomeRecommendationMode(quickFilterState.mode);
    setHomeRecommendationSearchQuery(hqfSearchQuery);
    setCurrentTab("main");
    setCurrentPage(1);
    setCurrentSearchQuery("");
    setCurrentCategory("");
    setQuickFilterParams(null);
    setHomeRecommendationFilter(null);
    const genreSections = document.getElementById("genreSectionsContainer");
    if (genreSections) genreSections.style.display = "none";
    const animeContainer = document.getElementById("animeContainer");
    if (animeContainer) animeContainer.style.display = "none";
    const recommendations = document.getElementById("homeRecommendationsContainer");
    if (recommendations) {
      recommendations.style.display = "block";
      loadHomeRecommendations({ reload: true });
    }
    if (hqfSearchQuery) recommendations?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  searchInput?.addEventListener("input", () => {
    hqfSearchQuery = searchInput.value.trim();
    updateSearchMode();
    clearTimeout(hqfSearchDebounceTimer);
    hqfSearchDebounceTimer = setTimeout(runInlineSearch, 400);
  });
  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      clearTimeout(hqfSearchDebounceTimer);
      runInlineSearch();
      searchInput.blur();
    }
  });
  searchClear?.addEventListener("click", () => {
    searchInput.value = "";
    hqfSearchQuery = "";
    updateSearchMode();
    clearTimeout(hqfSearchDebounceTimer);
    runInlineSearch();
  });
}
function renderHomeQuickFilterBar() {
  const container = document.getElementById("homeQuickFilterBar");
  if (!container) return;
  container.innerHTML = buildHomeQuickFilterHtml();
  container.classList.toggle("is-open", quickFilterState.open);
  wireHomeQuickFilterEvents(container);
}
var YEAR_OPTIONS, TYPE_OPTIONS, SORT_OPTIONS, MANGA_GENRES, MANGA_AVAILABILITY_OPTIONS, MANGA_AGE_OPTIONS, MANGA_SORT_OPTIONS, YEAR_RANGES, quickFilterState, hqfSearchQuery, hqfSearchDebounceTimer;
var init_homeQuickFilter = __esm({
  "src/js/pages/home/homeQuickFilter.js?v=20260926-comment-send-v1"() {
    init_constants5();
    init_homeLegacy();
    YEAR_OPTIONS = [
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
    TYPE_OPTIONS = [
      { key: "", label: "\u0411\u0443\u0434\u044C-\u044F\u043A\u0438\u0439" },
      { key: "tv", label: "\u0421\u0435\u0440\u0456\u0430\u043B" },
      { key: "movie", label: "\u0424\u0456\u043B\u044C\u043C" },
      { key: "ova", label: "OVA" },
      { key: "ona", label: "ONA" },
      { key: "special", label: "\u0421\u043F\u0435\u0448\u043B" }
    ];
    SORT_OPTIONS = [
      { key: "rating", label: "\u0417\u0430 \u0440\u0435\u0439\u0442\u0438\u043D\u0433\u043E\u043C" },
      { key: "alpha", label: "\u0417\u0430 \u0430\u043B\u0444\u0430\u0432\u0456\u0442\u043E\u043C" },
      { key: "episodes", label: "\u0417\u0430 \u043A\u0456\u043B-\u0442\u044E \u0441\u0435\u0440\u0456\u0439" },
      { key: "year", label: "\u0417\u0430 \u0440\u043E\u043A\u043E\u043C \u0432\u0438\u0445\u043E\u0434\u0443" },
      { key: "added", label: "\u0417\u0430 \u0434\u0430\u0442\u043E\u044E \u0434\u043E\u0434\u0430\u0432\u0430\u043D\u043D\u044F" }
    ];
    MANGA_GENRES = [
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
    MANGA_AVAILABILITY_OPTIONS = [
      { key: "all", label: "\u0423\u0441\u0456 \u0442\u0430\u0439\u0442\u043B\u0438" },
      { key: "available", label: "\u0404 \u0449\u043E \u0447\u0438\u0442\u0430\u0442\u0438" }
    ];
    MANGA_AGE_OPTIONS = [
      { key: "all", label: "\u0423\u0441\u0456 \u0432\u0456\u043A\u043E\u0432\u0456 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u0457" },
      { key: "children", label: "\u0414\u043B\u044F \u0432\u0441\u0456\u0445" },
      { key: "teen", label: "\u041F\u0456\u0434\u043B\u0456\u0442\u043A\u0438 (16+)" },
      { key: "adult", label: "\u0414\u043E\u0440\u043E\u0441\u043B\u0456 (18+)" }
    ];
    MANGA_SORT_OPTIONS = [
      { key: "rating", label: "\u0417\u0430 \u043F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u0456\u0441\u0442\u044E" },
      { key: "alpha", label: "\u0417\u0430 \u043D\u0430\u0437\u0432\u043E\u044E" }
    ];
    YEAR_RANGES = {
      "2026": [2026, 2026],
      "2025": [2025, 2025],
      "2024": [2024, 2024],
      "2015-2023": [2015, 2023],
      "2008-2014": [2008, 2014],
      "2000-2007": [2e3, 2007],
      before2000: [1970, 1999]
    };
    quickFilterState = {
      mode: "anime",
      // 'anime' | 'manga'
      genres: /* @__PURE__ */ new Set(),
      type: "",
      year: "",
      sort: "rating",
      mangaAvailability: "all",
      mangaAge: "all",
      open: false
    };
    hqfSearchQuery = "";
    hqfSearchDebounceTimer = null;
  }
});
