import { bootstrap } from './core/bootstrap.js?v=20260912-team-selector-v3';

try {
    if (globalThis.Telegram?.WebApp) {
        globalThis.Telegram.WebApp.ready();
        globalThis.Telegram.WebApp.expand();
    }
} catch (_) {}

const telegramStartParam = globalThis.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
if (telegramStartParam === 'live' && window.location.hash.slice(1) !== 'live') window.location.hash = 'live';

bootstrap().catch(error => console.warn('[VakDab] app bootstrap:', error));
