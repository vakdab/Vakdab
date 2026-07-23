// ===== СТОРІНКА ПЛЕЄРА =====
// Оригінальні рядки: L10332-L10740

import { loadAnimeuaDetail } from '../api/animeua.js';
import { LampaPlayer } from './player.js';
import { buildSeasonRow, getCurrentEpisodes, buildEpisodeViews, playEpisode } from './episodes.js';
import { Storage } from '../storage/storage.js';
import { safeQuery, safeQueryAll } from '../utils/dom.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml } from '../utils/helpers.js';
// showViewMode accessed via window (avoids circular import)

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
            window.updateLikeButton();
            window.updateDislikeButton();
            window.updateBookmarkButton(url);
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
import { updateFilterChip, updateSourceChip } from './episodes.js';
                }
                window.buildBottomSheetData();
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
            if (window.Router?.currentRoute === 'profile') window.renderProfilePage();
        }




// Make openPlayerPage globally accessible
window.openPlayerPage = openPlayerPage;

window.closePlayerPage = closePlayerPage;
