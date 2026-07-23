// ===== СТОРІНКА ПЛЕЄРА =====
// Оригінальні рядки: L10332-L10740

import { loadAnimeuaDetail } from '../api/animeua.js';
import { LampaPlayer } from './player.js';
import { buildSeasonRow, getCurrentEpisodes, buildEpisodeViews, playEpisode, showViewMode } from './episodes.js';
import { updateBookmarkButton, toggleBookmark } from '../features/bookmarks.js';
import { updateLikeButton, updateDislikeButton, toggleLike, toggleDislike } from '../features/likes.js';
import { Storage } from '../storage/storage.js';
import { safeQuery, safeQueryAll } from '../utils/dom.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml } from '../utils/helpers.js';

        // ====================================================================
        //  ПЛЕЄР
        // ====================================================================
        let playerPageAnime = null;
        let playerPagePlayer = null;
        let _playerLoadController = null; // AbortController для поточного завантаження плеєра
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

        const QUALITY_OPTIONS = ['Максимальна', '2160p (4K)', '1440p', '1080p', '720p', '480p', '360p'];

export async function openPlayerPage(url) {
            const modal = document.getElementById('playerPageModal');
            if (!modal) return;
            // Скасувати попереднє завантаження якщо є
            if (_playerLoadController) {
                _playerLoadController.abort();
                _playerLoadController = null;
            }
            _playerLoadController = new AbortController();
            const _thisSignal = _playerLoadController.signal;

            if (playerPagePlayer) { playerPagePlayer.destroy();
                playerPagePlayer = null; }
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
            updateLikeButton();
            updateDislikeButton();
            updateBookmarkButton(url);
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            modal.querySelector('.modal-content').scrollTop = 0;
            try {
                const anime = await loadAnimeuaDetail(url);
                // Якщо плеєр вже закрили поки завантажувалось — не оновлювати DOM
                if (_thisSignal.aborted || modal.style.display === 'none') return;
                playerPageAnime = anime;
                playerPageSources = anime.sources || ['Основне'];
                playerPageCurrentSource = playerPageSources[0] || 'Основне';
                const posterUrl = anime.images?.jpg?.large_image_url || '';
                document.getElementById('playerPosterImg').src = posterUrl;
                document.getElementById('playerPosterTitle').textContent = anime.title;
                document.getElementById('playerTopbarTitle').textContent = '';
                document.getElementById('playerBlurBg').style.backgroundImage = `url(${posterUrl})`;
                const totalEpisodes = Object.values(anime.seasons || {}).reduce((sum, s) => sum + Object.values(s).reduce((s2,
                    e) => Math.max(s2, e.length), 0), 0);
                document.getElementById('playerPosterMeta').innerHTML = `
              <span class="meta-tag"><i class="fas fa-calendar"></i> ${anime.year||'—'}</span>
              <span class="meta-tag"><i class="fas fa-film"></i> ${totalEpisodes} еп.</span>
              ${(anime.genres||[]).slice(0,3).map(g=>`<span class="meta-tag">${g}</span>`).join('')}
            `;
                const synopsisEl = document.getElementById('playerSynopsis');
                synopsisEl.textContent = anime.synopsis || 'Опис відсутній.';
                const moreBtn = document.getElementById('synopsisMoreBtn');
                setTimeout(() => {
                    if (synopsisEl.scrollHeight > synopsisEl.clientHeight + 2) {
                        moreBtn.style.display = 'block';
                    }
                }, 100);
                moreBtn.onclick = () => {
                    synopsisEl.classList.toggle('expanded');
                    moreBtn.textContent = synopsisEl.classList.contains('expanded') ? 'менше' : 'більше';
                };
                updateSourceChip();
                const seasons = Object.keys(anime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
                playerPageCurrentSeason = seasons[0] || '1';
                const dubs = Object.keys((anime.seasons[playerPageCurrentSeason]) || {}).sort();
                playerPageCurrentDub = dubs[0] || '';
                playerPageCurrentQuality = '720p';
                buildSeasonRow(seasons);
                buildEpisodeViews();
                updateFilterChip();
                document.getElementById('episodePanel').classList.add('visible');
                // Якщо серій немає — показати зрозуміле повідомлення
                if (seasons.length === 0 || Object.keys(anime.seasons || {}).length === 0) {
                    document.getElementById('episodeViewGrid').innerHTML =
                        '<div class="episode-empty"><i class="fas fa-search"></i> Серії не знайдені на джерелі. Спробуйте інше аніме.</div>';
                }
                buildBottomSheetData();
            } catch (err) {
                // Якщо запит скасовано (юзер закрив плеєр або відкрив інше) — мовчки ігноруємо
                if (_thisSignal.aborted || modal.style.display === 'none') return;
                if (_thisSignal.aborted || (err && (err.name === 'AbortError' || err._playerAborted || (err.message && (err.message.includes('aborted') || err.message.includes('Fetch is aborted')))))) return;

                const isNotFound = err.message && (err.message.includes('не знайдено') || err.message.includes('404'));
                const isTimeout = err.message && err.message.includes('очікування');
                const isNetwork = err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('502') || err.message.includes('503') || err.message.includes('aborted') || err.message.includes('Fetch is aborted'));

                let userMsg, icon;
                if (isNotFound) {
                    icon = 'fa-search';
                    userMsg = 'Аніме не знайдено на джерелі';
                    document.getElementById('playerSynopsis').textContent = 'Це аніме поки що недоступне.';
                } else if (isTimeout) {
                    icon = 'fa-clock';
                    userMsg = 'Час очікування вичерпано. Перевірте з\'єднання і спробуйте ще раз.';
                    document.getElementById('playerSynopsis').textContent = userMsg;
                } else if (isNetwork) {
                    icon = 'fa-wifi';
                    userMsg = 'Помилка мережі або сервер не відповідає. Спробуйте пізніше.';
                    document.getElementById('playerSynopsis').textContent = userMsg;
                } else {
                    icon = 'fa-exclamation-circle';
                    userMsg = 'Помилка завантаження. Спробуйте пізніше.';
                    document.getElementById('playerSynopsis').textContent = userMsg;
                }

                document.getElementById('episodeViewGrid').innerHTML =
                    `<div class="episode-empty">
                        <i class="fas ${icon}" style="font-size:2rem;margin-bottom:12px;opacity:0.5;"></i>
                        <div>${userMsg}</div>
                        <button class="btn-outline" style="margin-top:16px;padding:8px 20px;border-radius:20px;cursor:pointer;" 
                            onclick="openPlayerPage('${url.replace(/'/g, "\'")}')">
                            <i class="fas fa-redo"></i> Спробувати знову
                        </button>
                    </div>`;
                document.getElementById('episodePanel').classList.add('visible');
                console.error('Player load error:', err.message || err);
            }
        }

export function updateSourceChip() {
            const label = document.getElementById('playerSourceLabel');
            if (label) label.textContent = playerPageCurrentSource || 'Джерело';
        }

export function updateFilterChip() {
            const chip = document.getElementById('playerFilterChip');
            if (chip) chip.textContent = `Сезон ${playerPageCurrentSeason} · ${playerPageCurrentDub}`;
        }

export function buildSeasonRow(seasons) {
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
                    buildEpisodeViews();
                    updateFilterChip();
                    buildBottomSheetData();
                });
            });
        }

export function getCurrentEpisodes() {
            if (!playerPageAnime) return [];
            const eps = playerPageAnime.seasons?.[playerPageCurrentSeason]?.[playerPageCurrentDub] || [];
            return eps;
        }

export function getEpisodeProgress(episode) {
            const history = Storage.getHistory();
            const animeUrl = playerPageCurrentAnimeUrl;
            const found = history.find(h => h.url === animeUrl && h.episode === episode);
            return found ? Math.min(found.progress || 0, 100) : 0;
        }

export function buildEpisodeViews() {
            const episodes = getCurrentEpisodes();
            playerPageEpisodes = episodes;
            const gridContainer = document.getElementById('episodeViewGrid');
            const compactContainer = document.getElementById('episodeViewCompact');
            const classicContainer = document.getElementById('episodeViewClassic');
            if (!episodes.length) {
                const emptyMsg = '<div class="episode-empty"><i class="fas fa-film"></i> Немає серій</div>';
                gridContainer.innerHTML = emptyMsg;
                compactContainer.innerHTML = emptyMsg;
                classicContainer.innerHTML = emptyMsg;
                return;
            }
            const posterUrl = playerPageAnime?.images?.jpg?.large_image_url || '';
            gridContainer.innerHTML = episodes.map((ep, idx) => {
                const progress = getEpisodeProgress(ep.episode);
                return `
              <div class="episode-grid-card" data-file="${ep.file}" data-episode="${ep.episode}">
                <img class="episode-grid-thumb" src="${posterUrl}" alt="" loading="lazy" />
                <div class="episode-grid-badge">${String(ep.episode).padStart(2, '0')}</div>
                <div class="episode-grid-info">
                  <div class="episode-grid-title">Серія ${ep.episode}</div>
                  <div class="episode-grid-progress"><div class="episode-grid-progress-fill" style="width:${progress}%"></div></div>
                  <div class="episode-grid-meta"><span class="rating">♦ ${(7.2 + Math.random()*1.2).toFixed(1)}</span><span>•</span><span>${playerPageCurrentDub}</span></div>
                </div>
              </div>
            `;
            }).join('');
            compactContainer.innerHTML = episodes.map((ep, idx) => {
                const progress = getEpisodeProgress(ep.episode);
                return `
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
                  <div class="episode-compact-progress"><div class="episode-compact-progress-fill" style="width:${progress}%"></div></div>
                  <div class="episode-compact-meta"><span class="rating">♦ ${(7.2 + Math.random()*1.2).toFixed(1)}</span><span>•</span><span>${playerPageCurrentDub}</span></div>
                </div>
              </div>
            `;
            }).join('');
            classicContainer.innerHTML = episodes.map((ep, idx) => {
                const progress = getEpisodeProgress(ep.episode);
                return `
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
                  <div class="episode-classic-progress"><div class="episode-classic-progress-fill" style="width:${progress}%"></div></div>
                  <div class="episode-classic-meta"><span class="rating">♦ ${(7.2 + Math.random()*1.2).toFixed(1)}</span><span>•</span><span>${playerPageCurrentDub}</span></div>
                </div>
              </div>
            `;
            }).join('');
            document.querySelectorAll('#episodeViewGrid .episode-grid-card, #episodeViewCompact .episode-compact-card, #episodeViewClassic .episode-classic-card')
                .forEach(card => {
                    card.addEventListener('click', () => {
                        const file = card.dataset.file;
                        const epNum = card.dataset.episode;
                        if (file) {
                            playerPageCurrentEpisodeNum = epNum;
                            playEpisode(file, epNum);
                        }
                    });
                });
            showViewMode(playerPageCurrentView);
        }

export function playEpisode(file, epNum) {
            if (!file) { showToast('Немає файлу для відтворення'); return; }
            playerPageActiveEpisodeFile = file;
            playerPageCurrentEpisodeNum = epNum || '1';
            const videoContainer = document.getElementById('playerVideoContainer');
            const videoDiv = document.getElementById('playerPageVideo');
            videoContainer.classList.add('active');
            videoDiv.innerHTML = '';
            if (playerPagePlayer) { playerPagePlayer.destroy();
                playerPagePlayer = null; }
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
                    // Зберігаємо в історію через 2 хвилини перегляду
                    if (watchSecondsSoFar >= 120) {
                        playerPageHistoryUpdated = true;
                        const ep = epNum || playerPageCurrentEpisodeNum || '1';
                        const season = playerPageCurrentSeason || '1';
                        const history = Storage.getHistory();
                        const idx = history.findIndex(h => h.url === playerPageAnime.url);
                        // watchTime вже обчислено вище
                        if (watchSecondsSoFar > 0) {
                            Storage.addWatchTime(watchSecondsSoFar);
                            DailyStats.increment('minutesToday', Math.round(watchSecondsSoFar / 60));
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
                            DailyStats.increment('episodesToday', 1);
                            DailyStats.addUniqueAnime(playerPageAnime.url);
                            if (history.length > 200) history.length = 200;
                            Storage.setHistory(history);
                        }
                        showToast(`Серія ${ep} збережена в історію`);
                        video.removeEventListener('timeupdate', onTimeUpdate);
                        buildEpisodeViews();
                    }
                };
                video.addEventListener('timeupdate', onTimeUpdate);
                if (playerPagePlayer._timeUpdateListener) {
                    video.removeEventListener('timeupdate', playerPagePlayer._timeUpdateListener);
                }
                playerPagePlayer._timeUpdateListener = onTimeUpdate;
            }
            setTimeout(() => { videoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);
        }

export function closePlayerPage() {
            const modal = document.getElementById('playerPageModal');
            if (!modal) return;
            // Скасувати активне завантаження — щоб catch не показував помилку
            if (_playerLoadController) {
                _playerLoadController.abort();
                _playerLoadController = null;
            }
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
            if (window.Router?.currentRoute === 'profile') renderProfilePage();
        }

export function updateBookmarkButton(url) {
            const btn = document.getElementById('playerBookmarkBtn');
            if (!btn) return;
            const bookmarks = Storage.getBookmarks();
            const isBookmarked = bookmarks.some(b => b.url === url);
            btn.classList.toggle('bookmarked', isBookmarked);
            btn.innerHTML = isBookmarked ?
                '<i class="fas fa-heart" style="color:#ffd700;"></i>' :
                '<i class="fas fa-heart"></i>';
        }

export function toggleBookmark() {
            const url = playerPageCurrentAnimeUrl;
            if (!url) { showToast('Немає аніме для закладки'); return; }
            const bookmarks = Storage.getBookmarks();
            const idx = bookmarks.findIndex(b => b.url === url);
            if (idx >= 0) {
                bookmarks.splice(idx, 1);
                Storage.setBookmarks(bookmarks);
                showToast('Видалено з закладок');
                updateBookmarkButton(url);
                if (window.Router?.currentRoute === 'profile') renderProfilePage();
                return;
            }
            const anime = playerPageAnime;
            if (!anime) { showToast('Помилка: немає даних про аніме'); return; }
            const totalEpisodes = Object.values(anime.seasons || {}).reduce((sum, s) => sum + Object.values(s).reduce((s2,
                e) => Math.max(s2, e.length), 0), 0);
            bookmarks.push({
                url: anime.url,
                title: anime.title,
                poster: anime.images?.jpg?.large_image_url || '',
                episodes: totalEpisodes + ' еп.',
                addedAt: Date.now()
            });
            Storage.setBookmarks(bookmarks);
            DailyStats.increment('bookmarksToday', 1);
            showToast('Додано до закладок');
            updateBookmarkButton(url);
            if (window.Router?.currentRoute === 'profile') renderProfilePage();
        }


// Make openPlayerPage globally accessible
window.openPlayerPage = openPlayerPage;
