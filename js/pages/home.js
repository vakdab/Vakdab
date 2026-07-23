// ===== ОСНОВНИЙ КОНТЕНТ =====
// Оригінальні рядки: L9104-L9224

import { fetchAnimeuaMain } from '../api/animeua.js';
import { safeQuery } from '../utils/dom.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml } from '../utils/helpers.js';
import { showTop100 } from './top100.js';



        // ====================================================================
        //  ОСНОВНИЙ КОНТЕНТ
        // ====================================================================
        let currentTab = 'main',
            currentPage = 1,
            currentSearchQuery = '',
            currentCategory = '';

export async function fetchContent() {
            if (currentTab === 'top100') { return await fetchAnimeuaTop100(); }
            if (currentSearchQuery) { return await searchAnimeua(currentSearchQuery, currentPage); }
            if (currentCategory) { return await fetchAnimeuaByCategory(currentCategory, currentPage); }
            return await fetchAnimeuaMain(currentPage);
        }

export function showSkeleton() {
            const container = document.getElementById('animeContainer');
            if (!container) return;
            const cols = 2;
            let html = '';
            for (let i = 0; i < cols * 3; i++) {
                html += `<div class="anime-card"><div class="anime-poster skeleton" style="padding-top: 140%;"></div></div>`;
            }
            container.innerHTML = html;
        }

export async function loadContent() {
            const container = document.getElementById('animeContainer');
            if (!container) return;
            if (window.Router?.currentRoute !== 'main') return;
            document.getElementById('genreSectionsContainer').style.display = 'none';
            document.getElementById('animeContainer').style.display = 'grid';
            document.getElementById('profilePageContainer').classList.remove('active');
            document.getElementById('profilePageContainer').style.display = 'none';
            document.getElementById('genrePageContainer').classList.remove('active');
            document.getElementById('genrePageContainer').style.display = 'none';
            document.getElementById('searchPageContainer').classList.remove('active');
            document.getElementById('searchPageContainer').style.display = 'none';
            document.getElementById('settingsPageContainer').classList.remove('active');
            document.getElementById('settingsPageContainer').style.display = 'none';
            showSkeleton();
            try {
                const list = await fetchContent();
                renderCards(list);
            } catch (err) {
                container.innerHTML =
                    `<div class="loader"><i class="fas fa-exclamation-triangle"></i> Помилка: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadContent()">Спробувати знову</button></div>`;
            }
        }

export function renderCards(list) {
            const container = document.getElementById('animeContainer');
            if (!container) return;
            if (!list.length) {
                container.innerHTML = `
              <div class="loader" style="grid-column:1/-1;text-align:center;">
                <i class="fas fa-search" style="font-size:2.5rem;display:block;margin-bottom:0.8rem;color:var(--text-muted);"></i>
                <p style="font-size:1rem;margin-bottom:0.5rem;">Нічого не знайдено</p>
                <p style="font-size:0.8rem;color:var(--text-muted);">Спробуйте змінити пошуковий запит або фільтри</p>
              </div>`;
                document.getElementById('paginationRow').innerHTML = '';
                return;
            }
            container.innerHTML = list.map((a, idx) => {
                const poster = a.images?.jpg?.large_image_url || '';
                const title = a.title || 'Без назви';
                return `
            <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${idx*0.03}s">
              <div class="anime-poster">
                <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='data:image/svg+xml,...'">
              </div>
              <div class="anime-title-under">${title}</div>
            </div>`;
            }).join('');
            container.querySelectorAll('.anime-card').forEach(card => {
                card.addEventListener('click', () => openPlayerPage(card.dataset.url));
                card.addEventListener('keydown', e => { if (e.key === 'Enter') openPlayerPage(card.dataset.url); });
            });
            renderPagination();
        }

export function renderPagination() {
            const row = document.getElementById('paginationRow');
            if (!row) return;
            const prevDisabled = currentPage <= 1 ? 'disabled' : '';
            row.innerHTML = `
            <button class="btn-outline" onclick="changePage(${currentPage-1})" ${prevDisabled}><i class="fas fa-chevron-left"></i> Назад</button>
            <span class="page-indicator">Сторінка ${currentPage}</span>
            <button class="btn-outline" onclick="changePage(${currentPage+1})">Вперед <i class="fas fa-chevron-right"></i></button>
          `;
        }

        window.changePage = (p) => {
            if (p < 1) return;
            currentPage = p;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loadContent();
        };


export function openRandomAnime() {
            openPlayerPage(`${ANIMEUA_BASE}/index.php?do=rand`);
            showToast('Випадкове аніме');
        }

