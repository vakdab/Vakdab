const SENPLAYER_AUTO_LAUNCH_KEY = 'vakdab_senplayer_auto_launch_enabled';
const LEGACY_SENPLAYER_BUTTON_KEY = 'vakdab_senplayer_button_enabled';
const PLAYABLE_MEDIA_EXTENSION = /\.(?:m3u8|mp4|m4v|mov|mkv|webm|avi|ts)$/i;

export function isSenPlayerAutoLaunchEnabled() {
    try {
        const storage = globalThis.localStorage;
        const saved = storage?.getItem(SENPLAYER_AUTO_LAUNCH_KEY);
        if (saved !== null && saved !== undefined) return saved === '1';

        // Preserve the previous opt-in if the user enabled the first version's button.
        const legacy = storage?.getItem(LEGACY_SENPLAYER_BUTTON_KEY);
        if (legacy === null || legacy === undefined) return false;
        storage?.setItem(SENPLAYER_AUTO_LAUNCH_KEY, legacy === '1' ? '1' : '0');
        return legacy === '1';
    } catch {
        return false;
    }
}

export function setSenPlayerAutoLaunchEnabled(enabled) {
    try {
        const storage = globalThis.localStorage;
        storage?.setItem(SENPLAYER_AUTO_LAUNCH_KEY, enabled ? '1' : '0');
        storage?.removeItem(LEGACY_SENPLAYER_BUTTON_KEY);
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

export function shouldAutoLaunchSenPlayer(mediaUrl, {
    autoplay = true,
    enabled = isSenPlayerAutoLaunchEnabled(),
    supportedDevice = isSenPlayerAvailableOnThisDevice()
} = {}) {
    return Boolean(autoplay && enabled && supportedDevice && isDirectMediaUrl(mediaUrl));
}

export function buildSenPlayerUrl(mediaUrl) {
    if (!isDirectMediaUrl(mediaUrl)) throw new TypeError('SenPlayer needs a direct media URL');

    return `senplayer://x-callback-url/play?url=${encodeURIComponent(String(mediaUrl))}`;
}
