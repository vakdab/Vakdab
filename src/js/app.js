import { bootstrap } from './core/bootstrap.js?v=20260824-settings-redesign-v1';
import { initLiveStream } from './components/live/liveStream.js?v=20260827-live-screen-v2';

const telegramStartParam = globalThis.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
if (telegramStartParam === 'live' && window.location.hash.slice(1) !== 'live') window.location.hash = 'live';

bootstrap().then(() => initLiveStream()).catch(error => console.warn('[VakDab] live stream init:', error));
