async function resolveLiveVideoSource(source) {
  const value = String(source || "").trim();
  if (!value) return "";
  if (/\.(?:m3u8|mp4)(?:[?#].*)?$/i.test(value) || /[?&]url=[^&]*(?:m3u8|mp4)/i.test(value)) {
    return value.startsWith(LIVE_VIDEO_PROXY_URL) ? value : `${LIVE_VIDEO_PROXY_URL}?url=${encodeURIComponent(value)}&force_ua=mobile`;
  }
  if (videoResolutionCache.has(value)) return videoResolutionCache.get(value);
  try {
    const response = await fetch(`${LIVE_VIDEO_PROXY_URL}?url=${encodeURIComponent(value)}&force_ua=mobile`, { cache: "no-store", headers: { accept: "text/html,application/xhtml+xml" } });
    if (!response.ok) throw new Error(`LIVE_SOURCE_HTTP_${response.status}`);
    const html = String(await response.text()).replace(/\\u002F/g, "/").replace(/\\\//g, "/");
    const manifest = (html.match(/https?:\/\/[^"'<>\s]+\.m3u8(?:\?[^"'<>\s]*)?/i) || [])[0] || "";
    const resolved = manifest ? `${LIVE_VIDEO_PROXY_URL}?url=${encodeURIComponent(manifest)}&force_ua=mobile` : "";
    videoResolutionCache.set(value, resolved);
    return resolved;
  } catch (error) {
    console.warn("[VakDab] live source resolution failed:", error);
    videoResolutionCache.set(value, "");
    return "";
  }
}
async function loadLiveState() {
  const response = await fetch(LIVE_API_URL, { cache: "no-store", headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`LIVE_HTTP_${response.status}`);
  const payload = await response.json();
  const liveState = payload?.live || payload;
  if (liveState?.videoUrl) {
    const resolvedVideo = await resolveLiveVideoSource(liveState.videoUrl);
    if (resolvedVideo) liveState.videoUrl = resolvedVideo;
  }
  return liveState;
}
var LIVE_API_URL, LIVE_VIDEO_PROXY_URL, videoResolutionCache;
var init_liveStream = __esm({
  "src/js/components/live/liveStream.js?v=20260827-live-screen-v2"() {
    LIVE_API_URL = "https://vakdab.animegran8.workers.dev/api/live";
    LIVE_VIDEO_PROXY_URL = "https://monoanime.animegran8.workers.dev";
    videoResolutionCache = /* @__PURE__ */ new Map();
  }
});
