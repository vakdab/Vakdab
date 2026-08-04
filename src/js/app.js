/** VakDab browser entrypoint. */
import './app-legacy.js';
import './utils/dom.js';
import './utils/string.js';
import './utils/time.js';
import './utils/device.js';
import './core/state.js';
import './core/auth.js';
import './core/storage.js';
import './core/router.js';
import './services/api.js';
import './services/parser.js';
import './services/user.js';
import './services/stickers.js';
import './services/achievements.js';

// Keep an explicit module registry for incremental feature extraction.
window.VakDabModules = Object.freeze({
    Auth: window.Auth,
    Storage: window.Storage,
    Router: window.Router,
    openPlayerPage: window.openPlayerPage
});
