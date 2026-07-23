import { searchAnimeua } from "../api/animeua.js";
import { openPlayerPage } from "../player/player-page.js";
import { DailyStats } from "../features/daily-tasks.js";

let searchPageState = { query: '', page: 1, list: [], loading: false };

export function renderSearchPage() {
  const container = document.getElementById('searchPageContainer');
  if (!container) return;
  const initialQuery = searchPageState.query || '';
  container.innerHTML = `
    <div class="search-page-header"><h2>Пошук аніме</h2></div>
    <div class="search-page-input-wrap">
      <i class="fas fa-search"></i>
      <input type="text" id="searchPageInput" placeholder="Назва аніме..." autocomplete="off" value="${initialQuery}" />
      <button class="search-page-clear" id="searchPageClearBtn"><i class="fas fa-times-circle"></i></button>
    </div>
    <div id="searchResultsContainer" class="search-results-grid">
      ${initialQuery ? '<div class="loader"><i class="fas fa-spinner fa-pulse"></i> Пошук...</div>' : `
        <div class="search-empty"><i class="fas fa-search"></i><p>Введіть назву аніме для пошуку</p></div>`}
    </div>
    <div class="pagination-row" id="searchPagePagination"></div>
  `;
  const input = document.getElementById('searchPageInput');
  const clearBtn = document.getElementById('searchPageClearBtn');
  if (input) {
    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (clearBtn) { if (q.length > 0) clearBtn.classList.add('visible'); else clearBtn.classList.remove('visible'); }
      if (q.length >= 2) { searchPageState.query = q; searchPageState.page = 1; performSearchPage(); }
      else if (q.length === 0) { searchPageState.query = ''; searchPageState.list = []; const res = document.getElementById('searchResultsContainer'); if (res) res.innerHTML = `<div class="search-empty"><i class="fas fa-search"></i><p>Введіть назву аніме для пошуку</p></div>`; document.getElementById('searchPagePagination').innerHTML = ''; }
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const q = input.value.trim(); if (q.length >= 2) { searchPageState.query = q; searchPageState.page = 1; performSearchPage(); } } });
    if (initialQuery.length >= 2) performSearchPage();
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', () => { const inp = document.getElementById('searchPageInput'); if (inp) { inp.value = ''; inp.focus(); searchPageState.query = ''; searchPageState.list = []; const res = document.getElementById('searchResultsContainer'); if (res) res.innerHTML = `<div class="search-empty"><i class="fas fa-search"></i><p>Введіть назву аніме для пошуку</p></div>`; document.getElementById('searchPagePagination').innerHTML = ''; clearBtn.classList.remove('visible'); } });
  }
}

async function performSearchPage() {
  const results = document.getElementById('searchResultsContainer');
  const pagination = document.getElementById('searchPagePagination');
  if (!results) return;
  const query = searchPageState.query.trim();
  if (!query || query.length < 2) return;
  DailyStats.increment('searchesToday', 1);
  searchPageState.loading = true;
  results.innerHTML = '<div class="loader" style="grid-column:1/-1;"><i class="fas fa-spinner fa-pulse"></i> Пошук...</div>';
  pagination.innerHTML = '';
  try {
    const list = await searchAnimeua(query, searchPageState.page);
    searchPageState.list = list;
    searchPageState.loading = false;
    if (!list.length) {
      results.innerHTML = `<div class="search-empty" style="grid-column:1/-1;"><i class="fas fa-search"></i><p>Нічого не знайдено за запитом "${query}"</p></div>`;
      pagination.innerHTML = '';
      return;
    }
    results.innerHTML = list.map((a, idx) => `
      <div class="anime-card" data-url="${a.url}" style="animation-delay:${idx*0.03}s">
        <div class="anime-poster"><img src="${a.images?.jpg?.large_image_url || ''}" alt="${a.title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='data:image/svg+xml,...'"></div>
        <div class="anime-title-under">${a.title || 'Без назви'}</div>
      </div>`).join('');
    results.querySelectorAll('.anime-card').forEach(card => card.addEventListener('click', () => openPlayerPage(card.dataset.url)));
    pagination.innerHTML = `
      <button class="btn-outline" onclick="window.changeSearchPage(${searchPageState.page-1})" ${searchPageState.page<=1?'disabled':''}><i class="fas fa-chevron-left"></i> Назад</button>
      <span class="page-indicator">Сторінка ${searchPageState.page}</span>
      <button class="btn-outline" onclick="window.changeSearchPage(${searchPageState.page+1})">Вперед <i class="fas fa-chevron-right"></i></button>`;
  } catch (err) {
    searchPageState.loading = false;
    results.innerHTML = `<div class="loader" style="grid-column:1/-1;">Помилка: ${err.message}<br><button class="btn-outline" onclick="performSearchPage()">Спробувати знову</button></div>`;
    pagination.innerHTML = '';
  }
}
window.changeSearchPage = (p) => { if (p < 1) return; searchPageState.page = p; window.scrollTo(0,0); performSearchPage(); };
