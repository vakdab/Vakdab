// ===== ЕПІЗОДИ =====
// Оригінальні рядки: L10474-L10602, L11065-L11081

import { Storage } from '../storage/storage.js';
import { safeQuery } from '../utils/dom.js';

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

        // ====================================================================
        //  ПОКАЗ ВИГЛЯДУ ЕПІЗОДІВ
        // ====================================================================
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
            playerPageCurrentView = mode;
        }
        window.showViewMode = showViewMode;

