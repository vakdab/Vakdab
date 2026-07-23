// ===== ЛІВЕ МЕНЮ — LEFTDOCK =====
// Оригінальні рядки: L7442-L7524

import { GENRE_MAP } from '../config/constants.js';

        // ====================================================================
        //  ЛІВЕ МЕНЮ
        // ====================================================================
        const leftdock = null; // removed
        const leftdockOverlay = null; // removed
        

export function toggleLeftdock(force) {
            window.Router?.goTo('genres');
        }

export function showLeftdock() {}

export function hideLeftdock() {}
        /* leftdock removed */

export function iconCircleLetter(label) {
            const letter = (label || '?').trim().charAt(0).toUpperCase();
            return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><text x="12" y="17" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" stroke="none">${letter}</text></svg>`;
        }

export function iconHomeSvg() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11l2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6"/></svg>`; }

export function iconProfileSvg() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`; }

export function iconSettingsSvg() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`; }

export function loadGenres() { return Object.entries(GENRE_MAP).map(([name, slug]) => ({ slug, name })).sort((a, b) => a.name
                .localeCompare(b.name, 'uk')); }

export async function buildLeftdock() {
            const inner = document.getElementById('leftdockInner');
            if (!inner) return;
            let html = '';
            html += `<div class="agnative-leftdock__case">`;
            html += `
`;
            html += `</div><div class="agnative-leftdock__split"></div><div class="agnative-leftdock__case">`;
            try {
                const genres = loadGenres();
                genres.forEach(g => {
                    html += `
                  <div class="agnative-leftdock__item selector genre-item-dock" data-action="genre-${g.slug}" data-selector="true" tabindex="0" data-genre="${g.slug}" data-name="${g.name}">
                    <div class="menu__ico">${iconCircleLetter(g.name.charAt(0))}</div><div class="menu__text">${g.name}</div>
                  </div>`;
                });
            } catch (e) { console.warn('Помилка рендеру жанрів у меню:', e); }
            html += `</div><div class="agnative-leftdock__split"></div><div class="agnative-leftdock__case">`;
            html += `
            <div class="agnative-leftdock__item selector" data-action="settings" data-selector="true" tabindex="0">
              <div class="menu__ico">${iconSettingsSvg()}</div><div class="menu__text">Налаштування</div>
            </div>`;
            html += `</div>`;
            inner.innerHTML = html;
            inner.querySelectorAll('.agnative-leftdock__item.selector').forEach(btn => {
                const action = btn.dataset.action;
                btn.addEventListener('click', () => {
                    handleLeftdockAction(action);
                    hideLeftdock(true);
                });
                btn.addEventListener('keydown', e => { if (e.key === 'Enter') { handleLeftdockAction(action);
                        hideLeftdock(true); } });
            });
            syncLeftdockActive();
        }

export function handleLeftdockAction(action) {
            if (!action) return;
            if (action === 'profile') {
                window.Router?.goTo('profile');
            } else if (action === 'main') {
                window.Router?.goTo('main');
            } else if (action.startsWith('genre-')) {
                const slug = action.replace('genre-', '');
                const name = loadGenres().find(g => g.slug === slug)?.name || slug;
                window.Router?.goTo('genre', { slug, name });
            } else if (action === 'settings') {
                window.Router?.goTo('settings');
            }
        }

export function syncLeftdockActive() {}

