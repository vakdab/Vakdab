// ===== ТОП 100 =====
// Оригінальні рядки: L9208-L9219

import { fetchAnimeuaTop100 } from '../api/animeua.js';
import { ANIMEUA_BASE } from '../config/api.js';
import { openPlayerPage } from '../player/player-page.js';
import { showToast } from '../ui/toast.js';

export function showTop100() {
            currentTab = 'top100';
            currentPage = 1;
            currentSearchQuery = '';
            currentCategory = '';
            document.querySelectorAll('.action-pill').forEach(p => p.classList.remove('active-pill'));
            document.getElementById('top100Btn')?.classList.add('active-pill');
            if (window.Router?.currentRoute === 'main') loadContent();
            syncLeftdockActive();
            showToast('ТОП 100 аніме');
        }

