// ===== ДОПОМІЖНІ ФУНКЦІЇ =====
// Оригінальні рядки: L6265-L6291, L9104-L9116

import { Storage } from '../storage/storage.js';
import { showToast } from '../ui/toast.js';

export function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    const settingsBtn = document.getElementById('settingsThemeBtn');
    if (settingsBtn) {
        const icon = theme === 'dark' ? 'fa-moon' : 'fa-sun';
        const label = theme === 'dark' ? 'Темна тема' : 'Світла тема';
        settingsBtn.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
    }
}

export function toggleTheme() {
    const next = Storage.getTheme() === 'dark' ? 'light' : 'dark';
    Storage.setTheme(next);
    applyTheme(next);
    showToast(next === 'dark' ? 'Темний режим' : 'Світлий режим');
    if (window.Router?.currentRoute === 'settings') {
        window.renderSettingsPage?.();
    }
}

export function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
