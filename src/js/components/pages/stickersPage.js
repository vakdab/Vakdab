/** Page module boundary for stickersPage. */
// The legacy stickers UI registers the full renderer on window as a side effect.
// Keep this feature boundary small, but make lazy loading actually initialise it.
import './stickersLegacy.js?v=20260821-social-v6';

export function renderStickersPage(container) {
    return window.renderStickersPage?.(container);
}
