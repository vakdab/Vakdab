async function renderGenrePage(slug, name) {
  const container = document.getElementById("genrePageContainer");
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
      ${renderAnimeCardSkeleton(9)}
    </div>
    <div class="pagination-row" id="genrePagePagination"></div>
  `;
  await loadGenrePageContent();
}
var genrePageState;
var init_genrePage = __esm({
  "src/js/pages/genre/genrePage.js"() {
    init_app_legacy();
    init_skeleton();
    genrePageState = { slug: "", name: "", page: 1, list: [], hasNextPage: false, total: 0 };
  }
});
