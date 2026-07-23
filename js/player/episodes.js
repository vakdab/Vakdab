import { Storage } from "../storage/storage.js";

export function getCurrentEpisodes(anime, season, dub) {
  if (!anime) return [];
  return anime.seasons?.[season]?.[dub] || [];
}

export function getEpisodeProgress(episode, animeUrl) {
  const history = Storage.getHistory();
  const found = history.find(h => h.url === animeUrl && h.episode === episode);
  return found ? Math.min(found.progress || 0, 100) : 0;
}

export function buildEpisodeViews(anime, season, dub, viewMode, posterUrl, animeUrl) {
  const episodes = getCurrentEpisodes(anime, season, dub);
  const grid = document.getElementById('episodeViewGrid');
  const compact = document.getElementById('episodeViewCompact');
  const classic = document.getElementById('episodeViewClassic');
  if (!episodes.length) {
    const empty = '<div class="episode-empty"><i class="fas fa-film"></i> Немає серій</div>';
    grid.innerHTML = empty;
    compact.innerHTML = empty;
    classic.innerHTML = empty;
    return;
  }
  const renderCard = (ep, template) => {
    const progress = getEpisodeProgress(ep.episode, animeUrl);
    return template(ep, progress, posterUrl);
  };
  const gridHtml = episodes.map(ep => `
    <div class="episode-grid-card" data-file="${ep.file}" data-episode="${ep.episode}">
      <img class="episode-grid-thumb" src="${posterUrl}" alt="" loading="lazy" />
      <div class="episode-grid-badge">${String(ep.episode).padStart(2, '0')}</div>
      <div class="episode-grid-info">
        <div class="episode-grid-title">Серія ${ep.episode}</div>
        <div class="episode-grid-progress"><div class="episode-grid-progress-fill" style="width:${getEpisodeProgress(ep.episode, animeUrl)}%"></div></div>
        <div class="episode-grid-meta"><span class="rating">♦ ${(7.2 + Math.random()*1.2).toFixed(1)}</span><span>•</span><span>${dub}</span></div>
      </div>
    </div>
  `).join('');
  grid.innerHTML = gridHtml;

  const compactHtml = episodes.map(ep => `
    <div class="episode-compact-card" data-file="${ep.file}" data-episode="${ep.episode}">
      <div class="episode-compact-thumb-wrap">
        <img class="episode-compact-thumb" src="${posterUrl}" alt="" loading="lazy" />
        <div class="episode-compact-badge">${String(ep.episode).padStart(2, '0')}</div>
      </div>
      <div class="episode-compact-info">
        <div class="episode-compact-title-row">
          <div class="episode-compact-ep-title">Серія ${ep.episode}</div>
          <div class="episode-compact-duration">24 хв</div>
        </div>
        <div class="episode-compact-progress"><div class="episode-compact-progress-fill" style="width:${getEpisodeProgress(ep.episode, animeUrl)}%"></div></div>
        <div class="episode-compact-meta"><span class="rating">♦ ${(7.2 + Math.random()*1.2).toFixed(1)}</span><span>•</span><span>${dub}</span></div>
      </div>
    </div>
  `).join('');
  compact.innerHTML = compactHtml;

  const classicHtml = episodes.map(ep => `
    <div class="episode-classic-card" data-file="${ep.file}" data-episode="${ep.episode}">
      <div class="episode-classic-thumb-wrap">
        <img class="episode-classic-thumb" src="${posterUrl}" alt="" loading="lazy" />
        <div class="episode-classic-badge">${String(ep.episode).padStart(2, '0')}</div>
      </div>
      <div class="episode-classic-info">
        <div class="episode-classic-title-row">
          <div class="episode-classic-ep-title">Серія ${ep.episode}</div>
          <div class="episode-classic-duration">24 хв</div>
        </div>
        <div class="episode-classic-progress"><div class="episode-classic-progress-fill" style="width:${getEpisodeProgress(ep.episode, animeUrl)}%"></div></div>
        <div class="episode-classic-meta"><span class="rating">♦ ${(7.2 + Math.random()*1.2).toFixed(1)}</span><span>•</span><span>${dub}</span></div>
      </div>
    </div>
  `).join('');
  classic.innerHTML = classicHtml;

  document.querySelectorAll('#episodeViewGrid .episode-grid-card, #episodeViewCompact .episode-compact-card, #episodeViewClassic .episode-classic-card')
    .forEach(card => {
      card.addEventListener('click', () => {
        const file = card.dataset.file;
        const epNum = card.dataset.episode;
        if (file && window.playEpisode) window.playEpisode(file, epNum);
      });
    });

  showViewMode(viewMode);
}

export function showViewMode(mode) {
  const grid = document.getElementById('episodeViewGrid');
  const compact = document.getElementById('episodeViewCompact');
  const classic = document.getElementById('episodeViewClassic');
  grid.classList.toggle('hidden', mode !== 'grid');
  compact.classList.toggle('hidden', mode !== 'compact');
  classic.classList.toggle('hidden', mode !== 'classic');
  document.querySelectorAll('.episode-view-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === mode);
  });
}
