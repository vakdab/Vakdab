// ===== BOTTOM NAV =====
// Оригінальні рядки: L11170-L11272

export function updateBottomNav(route) {
    const nav = document.getElementById('bottomNav');
    if (!nav) return;
    const items = nav.querySelectorAll('.bottom-nav-item');
    items.forEach(item => {
        item.classList.remove('active');
        const id = item.id;
        if (id === 'navHome' && route === 'main') {
            item.classList.add('active');
        } else if (id === 'navRating' && route === 'rating') {
            item.classList.add('active');
        } else if (id === 'navProfile' && route === 'profile') {
            item.classList.add('active');
        }
    });
}

export function handleNavVisibility(route) {
    const nav = document.getElementById('bottomNav');
    if (!nav) return;
    // community — під-вкладка рейтингу: ховаємо nav
    const isCommunityActive = () => {
        const panel = document.getElementById('rgPanelCommunity');
        return panel && panel.classList.contains('active');
    };

    if (route === 'rating' && isCommunityActive()) {
        nav.classList.add('hidden-nav');
    } else {
        nav.classList.remove('hidden-nav');
    }
    updateBottomNav(route);
}

(function initBottomNav() {
    const nav = document.getElementById('bottomNav');
    if (!nav) return;

    // Кнопка назад
    document.getElementById('navBack').addEventListener('click', () => {
        if (history.length > 1) {
            history.back();
        } else {
            window.Router?.goTo('main');
        }
    });

    // Навігаційні кнопки
    document.getElementById('navHome').addEventListener('click', () => {
        window.Router?.goTo('main');
    });
    document.getElementById('navRating').addEventListener('click', () => {
        window.Router?.goTo('rating');
    });
    document.getElementById('navProfile').addEventListener('click', () => {
        window.Router?.goTo('profile');
    });

    // Ховати nav коли відкритий плеєр
    const playerModal = document.getElementById('playerPageModal');
    const _origOpenPlayer = window.openPlayerPage;
    window.openPlayerPage = function(url) {
        if (nav) nav.classList.add('hidden-nav');
        return _origOpenPlayer(url);
    };
    const _origClosePlayer = window.closePlayerPage;
    window.closePlayerPage = function() {
        if (nav) nav.classList.remove('hidden-nav');
        return _origClosePlayer();
    };

    // Слухаємо кліки по вкладках рейтингу (Рейтинг ↔ Суспільне)
    document.addEventListener('click', e => {
        const tab = e.target.closest('.rg-main-tab');
        if (!tab) return;
        const hash = window.location.hash.slice(1) || 'main';
        const route = hash.split('?')[0];
        if (route !== 'rating') return;
        setTimeout(() => {
            if (tab.dataset.panel === 'community') {
                nav.classList.add('hidden-nav');
            } else {
                nav.classList.remove('hidden-nav');
            }
        }, 50);
    });

    // Також ховати/показувати при hashchange
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1) || 'main';
        const route = hash.split('?')[0];
        // Якщо йдемо не на rating — завжди показуємо nav і знімаємо community-active
        if (route !== 'rating') {
            document.body.classList.remove('community-active');
        }
        handleNavVisibility(route);
    });

    // Початковий стан
    handleNavVisibility(window.Router?.currentRoute || 'main');
})();
