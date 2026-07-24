// ===== СТОРІНКА НАЛАШТУВАНЬ =====
// Оригінальні рядки: L9476-L9531

import { Storage } from '../storage/storage.js';
import { applyTheme, toggleTheme } from '../utils/helpers.js';
import { syncLeftdockActive } from '../ui/leftdock.js';

        // ====================================================================
        //  СТОРІНКА НАЛАШТУВАНЬ
        // ====================================================================
export function renderSettingsPage() {
            const container = document.getElementById('settingsPageContainer');
            if (!container) return;
            const theme = Storage.getTheme();
            const isDark = theme === 'dark';
            const icon = isDark ? 'fa-moon' : 'fa-sun';
            const label = isDark ? 'Темна тема' : 'Світла тема';
            const nextIcon = isDark ? 'fa-sun' : 'fa-moon';
            const nextLabel = isDark ? 'Світла тема' : 'Темна тема';
            container.innerHTML = `
            <div class="settings-page-header">
              <h2>Налаштування</h2>
            </div>
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-paint-brush"></i>
                <div>
                  <div class="label">Тема інтерфейсу</div>
                  <div class="desc">${label} — ${isDark ? 'нічний режим' : 'денний режим'}</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsThemeBtn">
                <i class="fas ${nextIcon}"></i> ${nextLabel}
              </button>
            </div>
            <div class="settings-card" style="opacity:0.6;pointer-events:none;">
              <div class="settings-card-left">
                <i class="fas fa-globe"></i>
                <div>
                  <div class="label">Джерело даних</div>
                  <div class="desc">animeua.club (завжди актуальне)</div>
                </div>
              </div>
              <span style="font-size:0.75rem;color:var(--text-muted);"><i class="fas fa-check"></i></span>
            </div>
            <div class="settings-card" style="opacity:0.6;pointer-events:none;">
              <div class="settings-card-left">
                <i class="fas fa-language"></i>
                <div>
                  <div class="label">Мова інтерфейсу</div>
                  <div class="desc">Українська (завжди)</div>
                </div>
              </div>
              <span style="font-size:0.75rem;color:var(--text-muted);"><i class="fas fa-flag"></i></span>
            </div>
          `;
            const themeBtn = document.getElementById('settingsThemeBtn');
            if (themeBtn) {
                themeBtn.addEventListener('click', toggleTheme);
            }
            syncLeftdockActive();
        }

