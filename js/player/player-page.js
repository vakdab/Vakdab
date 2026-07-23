import { Storage } from "../storage/storage.js";
import { LampaPlayer } from "./player.js";
import { buildEpisodeViews, showViewMode } from "./episodes.js";
import { loadAnimeuaDetail } from "../api/animeua.js";
import { QUALITY_OPTIONS } from "../config/constants.js";

let playerPageAnime = null;
let playerPagePlayer = null;
let _playerLoadController = null;
let playerPageCurrentSeason = '1';
let playerPageCurrentDub = '';
let playerPageCurrentQuality = '720p';
let playerPageActiveEpisodeFile = null;
let playerPageCurrentAnimeUrl = null;
let playerPageCurrentSource = 'Основне';
let playerPageCurrentView = 'grid';
let playerPageEpisodes = [];
let playerPageSources = ['Основне'];
let playerPageCurrentEpisodeNum = '1';
let playerPageHistoryUpdated = false;
let playerPageWatchStartTime = 0;

export function getPlayerState() {
  return { anime: playerPageAnime, season: playerPageCurrentSeason, dub: playerPageCurrentDub, quality: playerPageCurrentQuality, source: playerPageCurrentSource, view: playerPageCurrentView };
}

export async function openPlayerPage(url) {
  const modal = document.getElementById('playerPageModal');
  if (!modal) return;
  if (_playerLoadController) { _playerLoadController.abort(); _playerLoadController = null; }
  _playerLoadController = new AbortController();
  const _thisSignal = _playerLoadController.signal;

  if (playerPagePlayer) { playerPagePlayer.destroy(); playerPagePlayer = null; }
  playerPageAnime = null;
  playerPageCurrentAnimeUrl = url;
  playerPageHistoryUpdated = false;
  playerPageWatchStartTime = 0;
  document.getElementById('playerVideoContainer').classList.remove('active');
  document.getElementById('playerPageVideo').innerHTML = '';
  document.getElementById('episodeViewGrid').innerHTML = '';
  document.getElementById('episodeViewCompact').innerHTML = '';
  document.getElementById('episodeViewClassic').innerHTML = '';
  document.getElementById('episodePanel').classList.remove('visible');
  document.getElementById('playerSynopsis').textContent = '';
  document.getElementById('synopsisMoreBtn').style.display = 'none';
  document.getElementById('playerTopbarTitle').textContent = '';
  updateLikeButton(url);
  updateDislikeButton(url);
  updateBookmarkButton(url);
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  modal.querySelector('.modal-content').scrollTop = 0;

  try {
    const anime = await loadAnimeuaDetail(url);
    if (_thisSignal.aborted || modal.style.display === 'none') return;
    playerPageAnime = anime;
    playerPageSources = anime.sources || ['Основне'];
    playerPageCurrentSource = playerPageSources[0] || 'Основне';
    const posterUrl = anime.images?.jpg?.large_image_url || '';
    document.getElementById('playerPosterImg').src = posterUrl;
    document.getElementById('playerPosterTitle').textContent = anime.title;
    document.getElementById('playerTopbarTitle').textContent = '';
    document.getElementById('playerBlurBg').style.backgroundImage = `url(${posterUrl})`;
    const totalEpisodes = Object.values(anime.seasons || {}).reduce((sum, s) => sum + Object.values(s).reduce((s2, e) => Math.max(s2, e.length), 0), 0);
    document.getElementById('playerPosterMeta').innerHTML = `
      <span class="meta-tag"><i class="fas fa-calendar"></i> ${anime.year||'—'}</span>
      <span class="meta-tag"><i class="fas fa-film"></i> ${totalEpisodes} еп.</span>
      ${(anime.genres||[]).slice(0,3).map(g=>`<span class="meta-tag">${g}</span>`).join('')}
    `;
    const synopsisEl = document.getElementById('playerSynopsis');
    synopsisEl.textContent = anime.synopsis || 'Опис відсутній.';
    const moreBtn = document.getElementById('synopsisMoreBtn');
    setTimeout(() => { if (synopsisEl.scrollHeight > synopsisEl.clientHeight + 2) moreBtn.style.display = 'block'; }, 100);
    moreBtn.onclick = () => { synopsisEl.classList.toggle('expanded'); moreBtn.textContent = synopsisEl.classList.contains('expanded') ? 'менше' : 'більше'; };
    updateSourceChip();
    const seasons = Object.keys(anime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
    playerPageCurrentSeason = seasons[0] || '1';
    const dubs = Object.keys((anime.seasons[playerPageCurrentSeason]) || {}).sort();
    playerPageCurrentDub = dubs[0] || '';
    playerPageCurrentQuality = '720p';
    buildSeasonRow(seasons);
    buildEpisodeViewsWrapper();
    updateFilterChip();
    document.getElementById('episodePanel').classList.add('visible');
    if (seasons.length === 0 || Object.keys(anime.seasons || {}).length === 0) {
      document.getElementById('episodeViewGrid').innerHTML = '<div class="episode-empty"><i class="fas fa-search"></i> Серії не знайдені.</div>';
    }
    buildBottomSheetData();
  } catch (err) {
    if (_thisSignal.aborted || modal.style.display === 'none') return;
    const isNotFound = err.message && (err.message.includes('не знайдено') || err.message.includes('404'));
    const isTimeout = err.message && err.message.includes('очікування');
    const isNetwork = err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('502') || err.message.includes('503'));
    let userMsg, icon;
    if (isNotFound) { icon = 'fa-search'; userMsg = 'Аніме не знайдено на джерелі'; }
    else if (isTimeout) { icon = 'fa-clock'; userMsg = 'Час очікування вичерпано.'; }
    else if (isNetwork) { icon = 'fa-wifi'; userMsg = 'Помилка мережі або сервер не відповідає.'; }
    else { icon = 'fa-exclamation-circle'; userMsg = 'Помилка завантаження.'; }
    document.getElementById('episodeViewGrid').innerHTML = `
      <div class="episode-empty">
        <i class="fas ${icon}" style="font-size:2rem;margin-bottom:12px;opacity:0.5;"></i>
        <div>${userMsg}</div>
        <button class="btn-outline" style="margin-top:16px;padding:8px 20px;border-radius:20px;cursor:pointer;" onclick="openPlayerPage('${url.replace(/'/g, "\\'")}')">
          <i class="fas fa-redo"></i> Спробувати знову
        </button>
      </div>`;
    document.getElementById('episodePanel').classList.add('visible');
  }
}

export function closePlayerPage() {
  const modal = document.getElementById('playerPageModal');
  if (!modal) return;
  if (_playerLoadController) { _playerLoadController.abort(); _playerLoadController = null; }
  modal.style.display = 'none';
  document.body.style.overflow = '';
  if (playerPagePlayer) {
    if (playerPagePlayer._timeUpdateListener && playerPagePlayer.videoRef) {
      playerPagePlayer.videoRef.removeEventListener('timeupdate', playerPagePlayer._timeUpdateListener);
    }
    playerPagePlayer.destroy();
    playerPagePlayer = null;
  }
  document.getElementById('playerVideoContainer').classList.remove('active');
  document.getElementById('playerPageVideo').innerHTML = '';
  document.getElementById('episodePanel').classList.remove('visible');
}

function updateSourceChip() {
  const label = document.getElementById('playerSourceLabel');
  if (label) label.textContent = playerPageCurrentSource || 'Джерело';
}
function updateFilterChip() {
  const chip = document.getElementById('playerFilterChip');
  if (chip) chip.textContent = `Сезон ${playerPageCurrentSeason} · ${playerPageCurrentDub}`;
}

function buildSeasonRow(seasons) {
  const row = document.getElementById('episodeSeasonRow');
  if (!row) return;
  let html = `<span class="episode-season-label">Сезон</span>`;
  seasons.forEach(s => {
    const active = s === playerPageCurrentSeason ? ' active' : '';
    html += `<button class="episode-season-btn${active}" data-season="${s}">${s}</button>`;
  });
  row.innerHTML = html;
  row.querySelectorAll('.episode-season-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const season = btn.dataset.season;
      if (season === playerPageCurrentSeason) return;
      playerPageCurrentSeason = season;
      const dubs = Object.keys((playerPageAnime.seasons[season]) || {}).sort();
      playerPageCurrentDub = dubs[0] || '';
      row.querySelectorAll('.episode-season-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildEpisodeViewsWrapper();
      updateFilterChip();
      buildBottomSheetData();
    });
  });
}

function buildEpisodeViewsWrapper() {
  if (!playerPageAnime) return;
  const poster = playerPageAnime.images?.jpg?.large_image_url || '';
  buildEpisodeViews(playerPageAnime, playerPageCurrentSeason, playerPageCurrentDub, playerPageCurrentView, poster, playerPageCurrentAnimeUrl);
}

export function playEpisode(file, epNum) {
  if (!file) { showToast('Немає файлу для відтворення'); return; }
  playerPageActiveEpisodeFile = file;
  playerPageCurrentEpisodeNum = epNum || '1';
  const videoContainer = document.getElementById('playerVideoContainer');
  const videoDiv = document.getElementById('playerPageVideo');
  videoContainer.classList.add('active');
  videoDiv.innerHTML = '';
  if (playerPagePlayer) { playerPagePlayer.destroy(); playerPagePlayer = null; }
  playerPagePlayer = new LampaPlayer(videoDiv, {});
  playerPagePlayer.loadSource(file, playerPageAnime?.title || '', `Серія ${epNum}`);
  playerPageHistoryUpdated = false;
  playerPageWatchStartTime = Date.now();
  const video = playerPagePlayer.videoRef;
  if (video) {
    const onTimeUpdate = () => {
      if (playerPageHistoryUpdated) return;
      if (!playerPageAnime) return;
      const duration = video.duration;
      if (!duration || duration === Infinity) return;
      const progress = (video.currentTime / duration) * 100;
      const watchSecondsSoFar = Math.floor((Date.now() - playerPageWatchStartTime) / 1000);
      if (watchSecondsSoFar >= 120) {
        playerPageHistoryUpdated = true;
        const ep = epNum || playerPageCurrentEpisodeNum || '1';
        const season = playerPageCurrentSeason || '1';
        const history = Storage.getHistory();
        const idx = history.findIndex(h => h.url === playerPageAnime.url);
        if (watchSecondsSoFar > 0) {
          Storage.addWatchTime(watchSecondsSoFar);
          if (window.DailyStats) window.DailyStats.increment('minutesToday', Math.round(watchSecondsSoFar / 60));
        }
        if (idx >= 0) {
          history[idx].episode = ep;
          history[idx].season = season;
          history[idx].timestamp = Date.now();
          history[idx].progress = Math.min(progress, 100);
          history[idx].duration = Math.floor(video.currentTime);
          Storage.setHistory(history);
        } else {
          const entry = {
            animeId: playerPageAnime.mal_id || playerPageAnime.url.hashCode(),
            title: playerPageAnime.title,
            poster: playerPageAnime.images?.jpg?.large_image_url || '',
            url: playerPageAnime.url,
            episode: ep,
            season: season,
            timestamp: Date.now(),
            progress: Math.min(progress, 100),
            duration: Math.floor(video.currentTime)
          };
          history.unshift(entry);
          if (window.DailyStats) { window.DailyStats.increment('episodesToday', 1); window.DailyStats.addUniqueAnime(playerPageAnime.url); }
          if (history.length > 200) history.length = 200;
          Storage.setHistory(history);
        }
        showToast(`Серія ${ep} збережена в історію`);
        video.removeEventListener('timeupdate', onTimeUpdate);
        buildEpisodeViewsWrapper();
      }
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    if (playerPagePlayer._timeUpdateListener) video.removeEventListener('timeupdate', playerPagePlayer._timeUpdateListener);
    playerPagePlayer._timeUpdateListener = onTimeUpdate;
  }
  setTimeout(() => { videoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);
}

function updateBookmarkButton(url) {
  const btn = document.getElementById('playerBookmarkBtn');
  if (!btn) return;
  const bookmarks = Storage.getBookmarks();
  const isBookmarked = bookmarks.some(b => b.url === url);
  btn.classList.toggle('bookmarked', isBookmarked);
  btn.innerHTML = isBookmarked ? '<i class="fas fa-heart" style="color:#ffd700;"></i>' : '<i class="fas fa-heart"></i>';
}
function updateLikeButton(url) {
  const btn = document.getElementById('likeBtn');
  if (!btn) return;
  const likes = Storage.getLikes();
  if (url && likes[url] === 'like') { btn.classList.add('liked'); btn.innerHTML = '<i class="fas fa-thumbs-up" style="color:#00ff88;"></i>'; }
  else { btn.classList.remove('liked'); btn.innerHTML = '<i class="fas fa-thumbs-up"></i>'; }
}
function updateDislikeButton(url) {
  const btn = document.getElementById('dislikeBtn');
  if (!btn) return;
  const likes = Storage.getLikes();
  if (url && likes[url] === 'dislike') { btn.classList.add('disliked'); btn.innerHTML = '<i class="fas fa-thumbs-down" style="color:#ff4444;"></i>'; }
  else { btn.classList.remove('disliked'); btn.innerHTML = '<i class="fas fa-thumbs-down"></i>'; }
}

function buildBottomSheetData() {
  if (!playerPageAnime) return;
  const sources = playerPageSources || ['Основне'];
  const sourceList = document.getElementById('bsSourceList');
  if (sourceList) {
    sourceList.innerHTML = sources.map(s => `
      <div class="bottom-sheet-item ${s === playerPageCurrentSource ? 'selected' : ''}" data-source="${s}">
        <div><div class="bottom-sheet-item-label">${s}</div></div>
        ${s === playerPageCurrentSource ? '<span class="bottom-sheet-item-check">✓</span>' : ''}
      </div>
    `).join('');
    sourceList.querySelectorAll('.bottom-sheet-item').forEach(el => {
      el.addEventListener('click', () => {
        const src = el.dataset.source;
        if (src === playerPageCurrentSource) return;
        playerPageCurrentSource = src;
        updateSourceChip();
        buildBottomSheetData();
        showToast(`Джерело: ${src}`);
      });
    });
  }
  const qualityRow = document.getElementById('bsQualityRow');
  if (qualityRow) {
    qualityRow.innerHTML = QUALITY_OPTIONS.map(q => `
      <button class="bottom-sheet-quality-btn ${q === playerPageCurrentQuality ? 'active-q' : ''}" data-quality="${q}">${q}</button>
    `).join('');
    qualityRow.querySelectorAll('.bottom-sheet-quality-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = btn.dataset.quality;
        if (q === playerPageCurrentQuality) return;
        playerPageCurrentQuality = q;
        qualityRow.querySelectorAll('.bottom-sheet-quality-btn').forEach(b => b.classList.remove('active-q'));
        btn.classList.add('active-q');
        showToast(`Якість: ${q}`);
      });
    });
  }
  const dubs = Object.keys((playerPageAnime.seasons[playerPageCurrentSeason]) || {}).sort();
  const dubList = document.getElementById('bsDubList');
  if (dubList) {
    dubList.innerHTML = dubs.map(d => `
      <div class="bottom-sheet-item ${d === playerPageCurrentDub ? 'selected' : ''}" data-dub="${d}">
        <div><div class="bottom-sheet-item-label">${d}</div></div>
        ${d === playerPageCurrentDub ? '<span class="bottom-sheet-item-check">✓</span>' : ''}
      </div>
    `).join('');
    dubList.querySelectorAll('.bottom-sheet-item').forEach(el => {
      el.addEventListener('click', () => {
        const dub = el.dataset.dub;
        if (dub === playerPageCurrentDub) return;
        playerPageCurrentDub = dub;
        buildEpisodeViewsWrapper();
        updateFilterChip();
        buildBottomSheetData();
        showToast(`Озвучка: ${dub}`);
      });
    });
  }
  const seasons = Object.keys(playerPageAnime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
  const seasonList = document.getElementById('bsSeasonList');
  if (seasonList) {
    seasonList.innerHTML = seasons.map(s => `
      <div class="bottom-sheet-item ${s === playerPageCurrentSeason ? 'selected' : ''}" data-season="${s}">
        <div><div class="bottom-sheet-item-label">Сезон ${s}</div></div>
        ${s === playerPageCurrentSeason ? '<span class="bottom-sheet-item-check">✓</span>' : ''}
      </div>
    `).join('');
    seasonList.querySelectorAll('.bottom-sheet-item').forEach(el => {
      el.addEventListener('click', () => {
        const s = el.dataset.season;
        if (s === playerPageCurrentSeason) return;
        playerPageCurrentSeason = s;
        const dubs2 = Object.keys((playerPageAnime.seasons[s]) || {}).sort();
        playerPageCurrentDub = dubs2[0] || '';
        document.querySelectorAll('.episode-season-btn').forEach(b => b.classList.toggle('active', b.dataset.season === s));
        buildEpisodeViewsWrapper();
        updateFilterChip();
        buildBottomSheetData();
        showToast(`Сезон ${s}`);
      });
    });
  }
}

export { buildBottomSheetData };
