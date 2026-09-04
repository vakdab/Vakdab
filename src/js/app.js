import { bootstrap } from './core/bootstrap.js?v=20260904-profile-tasks-v2';

const telegramStartParam = globalThis.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
if (telegramStartParam === 'live' && window.location.hash.slice(1) !== 'live') window.location.hash = 'live';

bootstrap().catch(error => console.warn('[VakDab] app bootstrap:', error));
