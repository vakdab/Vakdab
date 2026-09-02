import { bootstrap } from './core/bootstrap.js?v=20260903-home-feed-v1';

function syncTelegramStartRoute() {
    const telegramStartParam = globalThis.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
    if (telegramStartParam === 'live' && window.location.hash.slice(1) !== 'live') window.location.hash = 'live';
}

// Telegram is loaded with defer so it does not block first paint. Re-check the
// start parameter when the SDK finishes, preserving the live deep-link.
syncTelegramStartRoute();
document.querySelector('script[src*="telegram.org/js/telegram-web-app.js"]')?.addEventListener('load', syncTelegramStartRoute, { once: true });

bootstrap().catch(error => console.warn('[VakDab] app bootstrap:', error));
