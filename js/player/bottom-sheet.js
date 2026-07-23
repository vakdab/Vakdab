// ===== BOTTOM SHEET — ФІЛЬТРИ =====
// Оригінальні рядки: L10810-L10940

import { safeQuery, safeQueryAll } from '../utils/dom.js';

        // ====================================================================
        //  BOTTOM SHEET
        // ====================================================================
        let bottomSheetMode = 'full';

export function buildBottomSheetData() {
            if (!playerPageAnime) return;
            const sources = playerPageSources || ['Основне'];
            const sourceList = document.getElementById('bsSourceList');
            if (sourceList) {
                sourceList.innerHTML = sources.map(s => `
              <div class="bottom-sheet-item ${s === playerPageCurrentSource ? 'selected' : ''}" data-source="${s}">
                <div>
                  <div class="bottom-sheet-item-label">${s}</div>
                </div>
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
                        qualityRow.querySelectorAll('.bottom-sheet-quality-btn').forEach(b => b.classList.remove(
                            'active-q'));
                        btn.classList.add('active-q');
                        buildEpisodeViews();
                        showToast(`Якість: ${q}`);
                    });
                });
            }
            const dubs = Object.keys((playerPageAnime.seasons[playerPageCurrentSeason]) || {}).sort();
            const dubList = document.getElementById('bsDubList');
            if (dubList) {
                dubList.innerHTML = dubs.map(d => `
              <div class="bottom-sheet-item ${d === playerPageCurrentDub ? 'selected' : ''}" data-dub="${d}">
                <div>
                  <div class="bottom-sheet-item-label">${d}</div>
                </div>
                ${d === playerPageCurrentDub ? '<span class="bottom-sheet-item-check">✓</span>' : ''}
              </div>
            `).join('');
                dubList.querySelectorAll('.bottom-sheet-item').forEach(el => {
                    el.addEventListener('click', () => {
                        const dub = el.dataset.dub;
                        if (dub === playerPageCurrentDub) return;
                        playerPageCurrentDub = dub;
                        buildEpisodeViews();
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
                <div>
                  <div class="bottom-sheet-item-label">Сезон ${s}</div>
                </div>
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
                        document.querySelectorAll('.episode-season-btn').forEach(b => {
                            b.classList.toggle('active', b.dataset.season === s);
                        });
                        buildEpisodeViews();
                        updateFilterChip();
                        buildBottomSheetData();
                        showToast(`Сезон ${s}`);
                    });
                });
            }
            const sections = {
                source: document.getElementById('bsSourceSection'),
                quality: document.getElementById('bsQualitySection'),
                dub: document.getElementById('bsDubSection'),
                season: document.getElementById('bsSeasonSection'),
            };
            if (bottomSheetMode === 'source') {
                sections.source.style.display = 'block';
                sections.quality.style.display = 'none';
                sections.dub.style.display = 'none';
                sections.season.style.display = 'none';
                document.getElementById('bsTitle').textContent = 'Джерело';
                document.getElementById('bsApplyBtn').textContent = 'Вибрати';
            } else {
                sections.source.style.display = 'block';
                sections.quality.style.display = 'block';
                sections.dub.style.display = 'block';
                sections.season.style.display = 'block';
                document.getElementById('bsTitle').textContent = 'Фільтри';
                document.getElementById('bsApplyBtn').textContent = 'Застосувати';
            }
        }

export function openBottomSheet(mode) {
            bottomSheetMode = mode || 'full';
            buildBottomSheetData();
            document.getElementById('bottomSheetOverlay').classList.add('open');
        }

export function closeBottomSheet() {
            document.getElementById('bottomSheetOverlay').classList.remove('open');
        }

