import { bootstrap } from './core/bootstrap.js?v=20260901-startup-fix-1';

const telegramStartParam = globalThis.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
if (telegramStartParam === 'live' && window.location.hash.slice(1) !== 'live') window.location.hash = 'live';

bootstrap().catch(error => {
    console.warn('[VakDab] app bootstrap:', error);
    const root = document.getElementById('appRoot');
    if (root) root.insertAdjacentHTML('afterbegin', `<div style="padding:24px;color:#b91c1c;background:#fee2e2;border-radius:12px;font-family:monospace;white-space:pre-wrap;z-index:9999;position:relative">Помилка запуску: ${String(error?.stack || error?.message || error)}</div>`);
});
