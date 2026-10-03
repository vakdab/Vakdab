function isSenPlayerAutoLaunchEnabled() {
  try {
    const storage = globalThis.localStorage;
    const saved = storage?.getItem(SENPLAYER_AUTO_LAUNCH_KEY);
    if (saved !== null && saved !== void 0) return saved === "1";
    const legacy = storage?.getItem(LEGACY_SENPLAYER_BUTTON_KEY);
    if (legacy === null || legacy === void 0) return false;
    storage?.setItem(SENPLAYER_AUTO_LAUNCH_KEY, legacy === "1" ? "1" : "0");
    return legacy === "1";
  } catch {
    return false;
  }
}
function setSenPlayerAutoLaunchEnabled(enabled) {
  try {
    const storage = globalThis.localStorage;
    storage?.setItem(SENPLAYER_AUTO_LAUNCH_KEY, enabled ? "1" : "0");
    storage?.removeItem(LEGACY_SENPLAYER_BUTTON_KEY);
  } catch {
  }
}
function isSenPlayerAvailableOnThisDevice() {
  if (typeof navigator === "undefined") return false;
  const userAgent = String(navigator.userAgent || "");
  const platform = String(navigator.platform || "");
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(userAgent) || platform === "MacIntel" && Number(navigator.maxTouchPoints) > 1;
}
function isDirectMediaUrl(candidate, depth = 0) {
  if (depth > 3 || !candidate) return false;
  let parsed;
  try {
    parsed = new URL(String(candidate));
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (PLAYABLE_MEDIA_EXTENSION.test(parsed.pathname)) return true;
  for (const key of ["url", "file", "src", "source"]) {
    const nested = parsed.searchParams.get(key);
    if (nested && nested !== candidate && isDirectMediaUrl(nested, depth + 1)) return true;
  }
  return false;
}
function shouldAutoLaunchSenPlayer(mediaUrl, {
  autoplay = true,
  enabled = isSenPlayerAutoLaunchEnabled(),
  supportedDevice = isSenPlayerAvailableOnThisDevice()
} = {}) {
  return Boolean(autoplay && enabled && supportedDevice && isDirectMediaUrl(mediaUrl));
}
function buildSenPlayerUrl(mediaUrl) {
  if (!isDirectMediaUrl(mediaUrl)) throw new TypeError("SenPlayer needs a direct media URL");
  return `senplayer://x-callback-url/play?url=${encodeURIComponent(String(mediaUrl))}`;
}
var SENPLAYER_AUTO_LAUNCH_KEY, LEGACY_SENPLAYER_BUTTON_KEY, PLAYABLE_MEDIA_EXTENSION;
var init_senPlayer = __esm({
  "src/js/components/player/senPlayer.js?v=20260927-senplayer-auto-v1"() {
    SENPLAYER_AUTO_LAUNCH_KEY = "vakdab_senplayer_auto_launch_enabled";
    LEGACY_SENPLAYER_BUTTON_KEY = "vakdab_senplayer_button_enabled";
    PLAYABLE_MEDIA_EXTENSION = /\.(?:m3u8|mp4|m4v|mov|mkv|webm|avi|ts)$/i;
  }
});
