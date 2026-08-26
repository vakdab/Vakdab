import { bootstrap } from './core/bootstrap.js?v=20260824-settings-redesign-v1';
import { initLiveStream } from './components/live/liveStream.js?v=20260826-live-v2';

bootstrap().then(() => initLiveStream()).catch(error => console.warn('[VakDab] live stream init:', error));
