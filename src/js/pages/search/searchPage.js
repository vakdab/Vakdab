function renderSearchPage() {
  const container = document.getElementById("searchPageContainer");
  if (!container) return;
  const initialQuery = searchPageState2.query || "";
  container.innerHTML = `
    <div class="search-page-header">
      <h2>\u041F\u043E\u0448\u0443\u043A \u0430\u043D\u0456\u043C\u0435</h2>
    </div>
    <div class="search-page-input-wrap">
      <i class="fas fa-search"></i>
      <input type="text" id="searchPageInput" placeholder="\u041D\u0430\u0437\u0432\u0430 \u0430\u043D\u0456\u043C\u0435..." autocomplete="off" value="${initialQuery}" />
      <button class="search-page-clear" id="searchPageClearBtn" aria-label="\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438"><i class="fas fa-times-circle"></i></button>
    </div>
    <div id="searchResultsContainer" class="search-results-grid">
      ${initialQuery ? renderAnimeCardSkeleton(10) : `
        <div class="search-empty">
          <i class="fas fa-search"></i>
          <p>\u0412\u0432\u0435\u0434\u0456\u0442\u044C \u043D\u0430\u0437\u0432\u0443 \u0430\u043D\u0456\u043C\u0435 \u0434\u043B\u044F \u043F\u043E\u0448\u0443\u043A\u0443</p>
          <p class="sub">\u041D\u0430\u043F\u0440\u0438\u043A\u043B\u0430\u0434: "\u0410\u0442\u0430\u043A\u0430 \u0442\u0438\u0442\u0430\u043D\u0456\u0432", "\u041D\u0430\u0440\u0443\u0442\u043E", "\u0421\u044F\u044E\u0447\u0456"</p>
        </div>
      `}
    </div>
    <div class="pagination-row" id="searchPagePagination"></div>
  `;
  const input = document.getElementById("searchPageInput");
  const clearBtn = document.getElementById("searchPageClearBtn");
  if (input) {
    let searchPageDebounce;
    input.addEventListener("input", () => {
      const q = input.value.trim();
      if (clearBtn) {
        if (q.length > 0) clearBtn.classList.add("visible");
        else clearBtn.classList.remove("visible");
      }
      clearTimeout(searchPageDebounce);
      if (q.length >= 2) {
        searchPageDebounce = setTimeout(() => {
          searchPageState2.query = q;
          searchPageState2.page = 1;
          performSearchPage();
        }, 350);
      } else if (q.length === 0) {
        searchPageState2.query = "";
        searchPageState2.list = [];
        searchPageState2.hasNextPage = false;
        searchPageState2.total = 0;
        const results = document.getElementById("searchResultsContainer");
        if (results) {
          results.innerHTML = `
                <div class="search-empty">
                  <i class="fas fa-search"></i>
                  <p>\u0412\u0432\u0435\u0434\u0456\u0442\u044C \u043D\u0430\u0437\u0432\u0443 \u0430\u043D\u0456\u043C\u0435 \u0434\u043B\u044F \u043F\u043E\u0448\u0443\u043A\u0443</p>
                  <p class="sub">\u041D\u0430\u043F\u0440\u0438\u043A\u043B\u0430\u0434: "\u0410\u0442\u0430\u043A\u0430 \u0442\u0438\u0442\u0430\u043D\u0456\u0432", "\u041D\u0430\u0440\u0443\u0442\u043E", "\u0421\u044F\u044E\u0447\u0456"</p>
                </div>
              `;
        }
        document.getElementById("searchPagePagination").innerHTML = "";
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const q = input.value.trim();
        if (q.length >= 2) {
          searchPageState2.query = q;
          searchPageState2.page = 1;
          performSearchPage();
        }
      }
    });
    if (initialQuery.length >= 2) {
      performSearchPage();
    }
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const inp = document.getElementById("searchPageInput");
      if (inp) {
        inp.value = "";
        inp.focus();
        searchPageState2.query = "";
        searchPageState2.list = [];
        searchPageState2.hasNextPage = false;
        searchPageState2.total = 0;
        const results = document.getElementById("searchResultsContainer");
        if (results) {
          results.innerHTML = `
                <div class="search-empty">
                  <i class="fas fa-search"></i>
                  <p>\u0412\u0432\u0435\u0434\u0456\u0442\u044C \u043D\u0430\u0437\u0432\u0443 \u0430\u043D\u0456\u043C\u0435 \u0434\u043B\u044F \u043F\u043E\u0448\u0443\u043A\u0443</p>
                  <p class="sub">\u041D\u0430\u043F\u0440\u0438\u043A\u043B\u0430\u0434: "\u0410\u0442\u0430\u043A\u0430 \u0442\u0438\u0442\u0430\u043D\u0456\u0432", "\u041D\u0430\u0440\u0443\u0442\u043E", "\u0421\u044F\u044E\u0447\u0456"</p>
                </div>
              `;
        }
        document.getElementById("searchPagePagination").innerHTML = "";
        clearBtn.classList.remove("visible");
      }
    });
  }
  syncLeftdockActive();
}
async function performSearchPage() {
  const results = document.getElementById("searchResultsContainer");
  const pagination = document.getElementById("searchPagePagination");
  if (!results) return;
  const query2 = searchPageState2.query.trim();
  if (!query2 || query2.length < 2) return;
  searchPageState2.loading = true;
  results.innerHTML = renderAnimeCardSkeleton(10);
  pagination.innerHTML = "";
  try {
    const list = await searchHikka2(query2, searchPageState2.page);
    searchPageState2.list = list;
    searchPageState2.hasNextPage = list.hasNextPage !== void 0 ? Boolean(list.hasNextPage) : list.length >= 28;
    searchPageState2.total = Number(list.total || list.pagination?.total || 0);
    searchPageState2.loading = false;
    if (!list.length) {
      results.innerHTML = `
        <div class="search-empty" style="grid-column:1/-1;">
          <i class="fas fa-search" style="font-size:2rem;"></i>
          <p>\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0437\u0430 \u0437\u0430\u043F\u0438\u0442\u043E\u043C "${query2}"</p>
          <p class="sub">\u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0437\u043C\u0456\u043D\u0438\u0442\u0438 \u043F\u043E\u0448\u0443\u043A\u043E\u0432\u0438\u0439 \u0437\u0430\u043F\u0438\u0442</p>
        </div>
      `;
      pagination.innerHTML = "";
      return;
    }
    results.innerHTML = list.map((a, idx) => {
      const poster = a.images?.jpg?.large_image_url || "";
      const title = a.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
      return `
        <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${idx * 0.03}s">
          <div class="anime-poster">
            <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='data:image/svg+xml,...'">
          </div>
          <div class="anime-title-under">${title}</div>
        </div>
      `;
    }).join("");
    results.querySelectorAll(".anime-card").forEach((card) => {
      card.addEventListener("click", () => openPlayerPage2(card.dataset.url));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter") openPlayerPage2(card.dataset.url);
      });
    });
    const prevDisabled = searchPageState2.page <= 1 ? "disabled" : "";
    const nextDisabled = searchPageState2.hasNextPage ? "" : "disabled";
    pagination.innerHTML = `
      <button class="btn-outline" onclick="changeSearchPage(${searchPageState2.page - 1})" ${prevDisabled}><i class="fas fa-chevron-left"></i> \u041D\u0430\u0437\u0430\u0434</button>
      <span class="page-indicator">\u0421\u0442\u043E\u0440\u0456\u043D\u043A\u0430 ${searchPageState2.page}${searchPageState2.total ? ` \xB7 ${searchPageState2.total}` : ""}</span>
      <button class="btn-outline" onclick="changeSearchPage(${searchPageState2.page + 1})" ${nextDisabled}>\u0412\u043F\u0435\u0440\u0435\u0434 <i class="fas fa-chevron-right"></i></button>
    `;
  } catch (err) {
    searchPageState2.loading = false;
    results.innerHTML = `
      <div class="loader" style="grid-column:1/-1;">
        <i class="fas fa-exclamation-triangle"></i> \u041F\u043E\u043C\u0438\u043B\u043A\u0430: ${err.message}
        <br><button class="btn-outline" style="margin-top:1rem;" onclick="performSearchPage()">\u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438 \u0437\u043D\u043E\u0432\u0443</button>
      </div>
    `;
    pagination.innerHTML = "";
  }
}
var searchPageState2;
var init_searchPage = __esm({
  "src/js/pages/search/searchPage.js"() {
    init_catalog2();
    init_animePlayerPage();
    init_app_legacy();
    init_skeleton();
    searchPageState2 = { query: "", page: 1, list: [], loading: false, hasNextPage: false, total: 0 };
    if (typeof window !== "undefined") {
      window.changeSearchPage = (p) => {
        if (p < 1 || p > searchPageState2.page && searchPageState2.hasNextPage === false) return;
        searchPageState2.page = p;
        window.scrollTo({ top: 0, behavior: "smooth" });
        performSearchPage();
      };
    }
  }
});
