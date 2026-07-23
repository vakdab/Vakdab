import { GENRE_MAP, ANIMEUA_BASE } from "../config/constants.js";
import { fetchAnimeuaByCategory, fetchAnimeuaMain, searchAnimeua, fetchAnimeuaTop100 } from "../api/animeua.js";
import { openPlayerPage } from "../player/player-page.js";

let currentTab = 'main', currentPage = 1, currentSearchQuery = '', currentCategory = '';

export async function loadAndDisplayGenreSections() {
  const container = document.getElementById('genreSectionsContainer');
  if (!container) return;
  container.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження секцій...</div>';
  container.style.display = 'flex';
  const genreList = Object.entries(GENRE_MAP).map(([name, slug]) => ({ name, slug }));
  try {
    const results = await Promise.all(genreList.map(async (genre) => {
      try { const items = await fetchAnimeuaByCategory(genre.slug, 1); return { genre, items: items.slice(0, 80) }; } catch { return { genre, items: [] }; }
    }));
    let html = '';
    for (const { genre, items } of results) {
      if (!items.length) continue;
      const sectionId = 'genre-' + genre.slug;
      html += `
        <div class="genre-section" id="${sectionId}">
          <div class="genre-title"><span class="genre-name">${genre.name}</span></div>
          <div class="genre-carousel-wrapper">
            <button class="carousel-btn carousel-btn-left" data-target="${sectionId}"><i class="fas fa-chevron-left"></i></button>
            <div class="genre-carousel" id="${sectionId}-carousel">
              ${items.map(a => `
                <div class="anime-card" data-url="${a.url}">
                  <div class="anime-poster"><img src="${a.images.jpg.large_image_url}" alt="${a.title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='data:image/svg+xml,...'"></div>
                  <div class="anime-title-under">${a.title}</div>
                </div>`).join('')}
            </div>
            <button class="carousel-btn carousel-btn-right" data-target="${sectionId}"><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>`;
    }
    container.innerHTML = html;
    container.querySelectorAll('.anime-card').forEach(card => card.addEventListener('click', () => openPlayerPage(card.dataset.url)));
    container.querySelectorAll('.carousel-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const carousel = document.getElementById(this.dataset.target + '-carousel');
        if (!carousel) return;
        const amount = carousel.clientWidth * 0.8;
        carousel.scrollBy({ left: this.classList.contains('carousel-btn-left') ? -amount : amount, behavior: 'smooth' });
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="loader">Помилка: ${err.message}</div>`;
  }
}

export function showSkeleton() {
  const container = document.getElementById('animeContainer');
  if (!container) return;
  container.innerHTML = Array.from({ length: 6 }, () => `<div class="anime-card"><div class="anime-poster skeleton" style="padding-top: 140%;"></div></div>`).join('');
}
export function renderCards(list) {
  const container = document.getElementById('animeContainer');
  if (!container) return;
  if (!list.length) {
    container.innerHTML = `<div class="loader" style="grid-column:1/-1;text-align:center;"><i class="fas fa-search" style="font-size:2.5rem;display:block;margin-bottom:0.8rem;"></i><p>Нічого не знайдено</p></div>`;
    document.getElementById('paginationRow').innerHTML = '';
    return;
  }
  container.innerHTML = list.map((a, idx) => `
    <div class="anime-card" data-url="${a.url}" style="animation-delay:${idx*0.03}s">
      <div class="anime-poster"><img src="${a.images?.jpg?.large_image_url || ''}" alt="${a.title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='data:image/svg+xml,...'"></div>
      <div class="anime-title-under">${a.title || 'Без назви'}</div>
    </div>`).join('');
  container.querySelectorAll('.anime-card').forEach(card => card.addEventListener('click', () => openPlayerPage(card.dataset.url)));
  renderPagination();
}
export function renderPagination() {
  const row = document.getElementById('paginationRow');
  if (!row) return;
  row.innerHTML = `
    <button class="btn-outline" onclick="changePage(${currentPage-1})" ${currentPage<=1?'disabled':''}><i class="fas fa-chevron-left"></i> Назад</button>
    <span class="page-indicator">Сторінка ${currentPage}</span>
    <button class="btn-outline" onclick="changePage(${currentPage+1})">Вперед <i class="fas fa-chevron-right"></i></button>`;
}
window.changePage = (p) => { if (p < 1) return; currentPage = p; window.scrollTo(0,0); loadContent(); };
export async function loadContent() {
  const container = document.getElementById('animeContainer');
  if (!container || Router.currentRoute !== 'main') return;
  document.getElementById('genreSectionsContainer').style.display = 'none';
  container.style.display = 'grid';
  showSkeleton();
  try {
    let list;
    if (currentTab === 'top100') list = await fetchAnimeuaTop100();
    else if (currentSearchQuery) list = await searchAnimeua(currentSearchQuery, currentPage);
    else if (currentCategory) list = await fetchAnimeuaByCategory(currentCategory, currentPage);
    else list = await fetchAnimeuaMain(currentPage);
    renderCards(list);
  } catch (err) {
    container.innerHTML = `<div class="loader">Помилка: ${err.message}<br><button class="btn-outline" onclick="loadContent()">Спробувати знову</button></div>`;
  }
}
export function showTop100() {
  currentTab = 'top100'; currentPage = 1; currentSearchQuery = ''; currentCategory = '';
  document.querySelectorAll('.action-pill').forEach(p => p.classList.remove('active-pill'));
  document.getElementById('top100Btn')?.classList.add('active-pill');
  loadContent();
  showToast('ТОП 100 аніме');
}
export function openRandomAnime() {
  openPlayerPage(`${ANIMEUA_BASE}/index.php?do=rand`);
  showToast('Випадкове аніме');
}
