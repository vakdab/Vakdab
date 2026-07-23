import { GENRE_MAP } from "../config/constants.js";
import { Router } from "../router/router.js";

export function renderGenresPage() {
  const container = document.getElementById('genresPageContainer');
  if (!container) return;
  const genres = Object.entries(GENRE_MAP).map(([name, slug]) => ({ name, slug }));
  let html = '<div class="genre-page-header"><h2>Жанри</h2></div><div class="genres-grid">';
  genres.forEach(g => {
    const letter = g.name.charAt(0).toUpperCase();
    html += `<div class="genre-card" data-slug="${g.slug}" data-name="${g.name}"><div class="genre-card__icon">${letter}</div><div class="genre-card__name">${g.name}</div></div>`;
  });
  html += '</div>';
  container.innerHTML = html;
  container.querySelectorAll('.genre-card').forEach(card => {
    card.addEventListener('click', () => {
      const slug = card.dataset.slug, name = card.dataset.name;
      Router.goTo('genre', { slug, name });
    });
  });
}
