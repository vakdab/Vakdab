/** Route boundary shared by bootstrap and feature modules. */
export function parseRoute(hash = window.location.hash) {
    const raw = String(hash || '').replace(/^#/, '');
    const [name = 'main', queryString = ''] = raw.split('?');
    return { name: name || 'main', params: Object.fromEntries(new URLSearchParams(queryString)) };
}

export function getRouter() {
    return window.Router || null;
}

export function subscribeRoute(listener) {
    const notify = () => listener(parseRoute());
    window.addEventListener('hashchange', notify);
    notify();
    return () => window.removeEventListener('hashchange', notify);
}
