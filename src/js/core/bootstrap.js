import { installGlobalErrorBoundary } from './errors.js';
import { startGlobalEvents } from './events.js';
import { parseRoute, getRouter } from './router.js';

let bootstrapPromise = null;

/**
 * Initializes the application exactly once. Legacy remains an explicit compatibility
 * layer while features migrate into independent modules.
 */
export function bootstrap() {
    if (bootstrapPromise) return bootstrapPromise;
    installGlobalErrorBoundary({
        onError(error) {
            console.error('[VakDab] application error:', error);
        }
    });
    startGlobalEvents();
    bootstrapPromise = import('../legacy/app-legacy.js?v=20260817-architecture-v2')
        .then(module => {
            window.VakDabLegacy = module;
            window.VakDabRouter = { parse: parseRoute, get: getRouter };
            window.dispatchEvent(new CustomEvent('vakdab:ready', { detail: { route: parseRoute() } }));
            return module;
        })
        .catch(error => {
            console.error('[VakDab] bootstrap failed:', error);
            throw error;
        });
    return bootstrapPromise;
}
