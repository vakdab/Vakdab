const SENPLAYER_SETTING_KEY = 'vakdab_senplayer_button_enabled';
const PLAYABLE_MEDIA_EXTENSION = /\.(?:m3u8|mp4|m4v|mov|mkv|webm|avi|ts)$/i;

export function isSenPlayerButtonEnabled() {
    try {
        return globalThis.localStorage?.getItem(SENPLAYER_SETTING_KEY) === '1';
    } catch {
        return false;
    }
}

export function setSenPlayerButtonEnabled(enabled) {
    try {
        globalThis.localStorage?.setItem(SENPLAYER_SETTING_KEY, enabled ? '1' : '0');
    } catch {
        // Storage can be unavailable in private browsing; the setting is device-local.
    }
}

export function isSenPlayerAvailableOnThisDevice() {
    if (typeof navigator === 'undefined') return false;
    const userAgent = String(navigator.userAgent || '');
    const platform = String(navigator.platform || '');
    return /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(userAgent) ||
        (platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1);
}

export function isDirectMediaUrl(candidate, depth = 0) {
    if (depth > 3 || !candidate) return false;

    let parsed;
    try {
        parsed = new URL(String(candidate));
    } catch {
        return false;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (PLAYABLE_MEDIA_EXTENSION.test(parsed.pathname)) return true;

    for (const key of ['url', 'file', 'src', 'source']) {
        const nested = parsed.searchParams.get(key);
        if (nested && nested !== candidate && isDirectMediaUrl(nested, depth + 1)) return true;
    }
    return false;
}

export function buildSenPlayerUrl(mediaUrl, title = '') {
    if (!isDirectMediaUrl(mediaUrl)) throw new TypeError('SenPlayer needs a direct media URL');

    const params = new URLSearchParams({ url: String(mediaUrl) });
    if (title) params.set('name', String(title));
    return `senplayer://x-callback-url/play?${params.toString()}`;
}
