import { loadFeature } from '../../core/feature-loader.js';
import { Router } from '../../core/compat/router.js?v=20260926-comments-auth-v1';
import { openPlayerPage, closePlayerPage } from '../../legacy/app-legacy.js?v=20260926-comments-auth-v1';
import { getProfile, getProfileDisplayName } from '../../services/profile/profileStorage.js';
import { escapeHtml } from '../../utils/string.js';

function renderProfileAvatar() {
    const avatarEl = document.getElementById('bnProfileAvatar');
    if (!avatarEl) return;

    const profile = getProfile();
    const mediaUrl = profile.avatarVideo || profile.avatar || '';
    const isVideo = /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(mediaUrl);

    if (mediaUrl && isVideo) {
        avatarEl.innerHTML = `<video src="${escapeHtml(mediaUrl)}" autoplay muted loop playsinline aria-label="Аватарка"></video>`;
    } else if (mediaUrl) {
        avatarEl.innerHTML = `<img src="${escapeHtml(mediaUrl)}" alt="Аватарка">`;
    } else {
        avatarEl.textContent = getProfileDisplayName(profile).charAt(0).toUpperCase();
    }
    avatarEl.classList.toggle('has-media', Boolean(mediaUrl));
}

export function initBottomNav() {

            const nav = document.getElementById('bottomNav');
            if (!nav) return;

            renderProfileAvatar();
            window.addEventListener('vakdab:profile-changed', renderProfileAvatar);

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
            document.getElementById('bnCatalog')?.addEventListener('click', () => {
                Router.goTo('catalog');
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

            // Оновлення стану меню при зміні маршруту.
            function handleNavVisibility(route) {
                nav.classList.remove('hidden-nav');
                updateBottomNav(route);
            }

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
