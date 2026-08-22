import { loadFeature } from '../../core/feature-loader.js';
import { Router } from '../../core/compat/router.js?v=20260822-profile-identity-v42';
import { openPlayerPage, closePlayerPage } from '../../legacy/app-legacy.js?v=20260822-profile-identity-v42';

export function initBottomNav() {

            const nav = document.getElementById('bottomNav');
            if (!nav) return;

            // Кнопка назад
            document.getElementById('bnBack').addEventListener('click', () => {
                if (history.length > 1) {
                    history.back();
                } else {
                    Router.goTo('main');
                }
            });

            // Навігаційні кнопки
            document.getElementById('bnHome').addEventListener('click', () => {
                Router.goTo('main');
            });
            document.getElementById('bnTop').addEventListener('click', () => {
                Router.goTo('rating');
            });
            document.getElementById('bnProfile').addEventListener('click', () => {
                Router.goTo('profile');
            });

            // Оновлення активного стану при зміні роуту
            function updateBottomNav(route) {
                const items = nav.querySelectorAll('.bn-item[data-route]');
                items.forEach(item => {
                    item.classList.remove('active');
                    if (item.dataset.route === route) {
                        item.classList.add('active');
                    }
                });
                // rating активний для route === 'rating'
            }

            // Router.goTo використовує hashchange → updateBottomNav спрацює автоматично

            // Ховати nav коли відкритий плеєр
            const playerModal = document.getElementById('playerPageModal');
            const _origOpenPlayer = window.openPlayerPage;
            window.openPlayerPage = function(url, options = {}) {
                if (nav) nav.classList.add('hidden-nav');
                return _origOpenPlayer(url, options);
            };
            const _origClosePlayer = window.closePlayerPage;
            window.closePlayerPage = function() {
                if (nav) nav.classList.remove('hidden-nav');
                return _origClosePlayer();
            };

            // Ховати nav при заході в Суспільне, показувати на Рейтингу
            function handleNavVisibility(route) {
                // community — під-вкладка рейтингу: ховаємо nav
                // перевіряємо активну вкладку на сторінці rating
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

            // Слухаємо кліки по вкладках рейтингу (Рейтинг ↔ Суспільне)
            document.addEventListener('click', e => {
                const tab = e.target.closest('.rg-main-tab');
                if (!tab) return;
                const hash = window.location.hash.slice(1) || 'main';
                const route = hash.split('?')[0];
                if (route !== 'rating') return;
                setTimeout(() => {
                    if (tab.dataset.panel === 'community') {
                        loadFeature('community').catch(error => console.warn('[VakDab] community feature preload:', error));
                        loadFeature('chat').catch(error => console.warn('[VakDab] chat feature preload:', error));
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
            handleNavVisibility(Router.currentRoute || 'main');
}
