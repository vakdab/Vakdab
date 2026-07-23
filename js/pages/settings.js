import { Storage } from "../storage/storage.js";
import { applyTheme, toggleTheme } from "../utils/helpers.js";

export function renderSettingsPage() {
  const container = document.getElementById('settingsPageContainer');
  if (!container) return;
  const theme = Storage.getTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Темна тема' : 'Світла тема';
  const nextIcon = isDark ? 'fa-sun' : 'fa-moon';
  const nextLabel = isDark ? 'Світла тема' : 'Темна тема';
  container.innerHTML = `
    <div class="settings-page-header"><h2>Налаштування</h2></div>
    <div class="settings-card">
      <div class="settings-card-left"><i class="fas fa-paint-brush"></i><div><div class="label">Тема інтерфейсу</div><div class="desc">${label}</div></div></div>
      <button class="settings-toggle-btn" id="settingsThemeBtn"><i class="fas ${nextIcon}"></i> ${nextLabel}</button>
    </div>
    <div class="settings-card" style="opacity:0.6;pointer-events:none;">
      <div class="settings-card-left"><i class="fas fa-globe"></i><div><div class="label">Джерело даних</div><div class="desc">animeua.club</div></div></div>
      <span style="font-size:0.75rem;color:var(--text-muted);"><i class="fas fa-check"></i></span>
    </div>
  `;
  document.getElementById('settingsThemeBtn')?.addEventListener('click', toggleTheme);
}
