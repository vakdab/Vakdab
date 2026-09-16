import { bootstrap } from './core/bootstrap.js?v=20260912-team-selector-v6';

try {
    if (globalThis.Telegram?.WebApp) {
        globalThis.Telegram.WebApp.ready();
        globalThis.Telegram.WebApp.expand();
    }
} catch (_) {}

const telegramStartParam = globalThis.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
if (telegramStartParam === 'live' && window.location.hash.slice(1) !== 'live') window.location.hash = 'live';

bootstrap().catch(error => console.warn('[VakDab] app bootstrap:', error));

// Keep the wide-screen sidebar in sync with the existing hash router.
const syncDesktopSidebar = () => {
    const route = (window.location.hash.slice(1).split('?')[0] || 'main');
    document.querySelectorAll('.desktop-sidebar__link[href^="#"]').forEach(link => {
        const linkRoute = link.getAttribute('href').slice(1).split('?')[0];
        link.classList.toggle('is-active', linkRoute === route);
    });
};
window.addEventListener('hashchange', syncDesktopSidebar);
window.addEventListener('DOMContentLoaded', syncDesktopSidebar, { once: true });
syncDesktopSidebar();
