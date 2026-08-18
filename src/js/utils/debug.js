export function isVakdabDebugEnabled() {
    try {
        const query = new URLSearchParams(window.location.search);
        return query.get('debug') === '1' || window.localStorage?.getItem('vakdab_debug') === '1';
    } catch {
        return false;
    }
}

export function debugLog(scope, event, details = {}) {
    if (!isVakdabDebugEnabled()) return;
    console.debug(`[VakDab:${scope}] ${event}`, details);
}
