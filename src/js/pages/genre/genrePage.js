import { loadGenrePageContent } from '../../legacy/app-legacy.js?v=20260912-team-selector-v6';

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
