function loadStoredCache(key) {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (parsed.exp && parsed.exp < Date.now()) {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}
function saveStoredCache(key, data, ttlMs = 24 * 3600 * 1e3) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ data, exp: Date.now() + ttlMs }));
  } catch {
  }
}
function safeUrl(value, fallback = "") {
  try {
    const url = new URL(String(value || ""), HONEY_WEB);
    return /^https?:$/i.test(url.protocol) ? url.href : fallback;
  } catch {
    return fallback;
  }
}
function isHoneyChapterUrl(value) {
  try {
    const url = new URL(String(value || ""), HONEY_WEB);
    return url.origin === HONEY_WEB && /^\/read\/[^/]+\/[^/]+\/?$/i.test(url.pathname);
  } catch {
    return false;
  }
}
function isHoneyComicItem(item = {}) {
  const rawType = item?.type ?? item?.contentType ?? item?.kind ?? item?.category ?? "";
  const type = String(rawType || "").trim().toLowerCase();
  if (!type) return true;
  return !/(novel|light\s*novel|web\s*novel|раноб|новел)/i.test(type);
}
function parseChapterUrl(value) {
  const url = safeUrl(value, "");
  const match = url.match(/\/read\/([^/?#]+)\/([^/?#]+)\/?$/i);
  if (!match || !isHoneyChapterUrl(url)) throw new Error("\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u043D\u0430 \u0440\u043E\u0437\u0434\u0456\u043B Honey Manga");
  return { source: "honey-manga.com.ua", chapterId: decodeURIComponent(match[1]), titleId: decodeURIComponent(match[2]), url };
}
function sortHoneyChaptersForReading(chapters = []) {
  const list = Array.isArray(chapters) ? chapters.filter(Boolean) : [];
  const numberOf = (value, fallback = Number.POSITIVE_INFINITY) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };
  return [...list].sort((left, right) => {
    const volumeDiff = numberOf(left.volume, 0) - numberOf(right.volume, 0);
    if (volumeDiff) return volumeDiff;
    const chapterDiff = numberOf(left.chapterNum) - numberOf(right.chapterNum);
    if (chapterDiff) return chapterDiff;
    const subChapterDiff = numberOf(left.subChapterNum, 0) - numberOf(right.subChapterNum, 0);
    if (subChapterDiff) return subChapterDiff;
    return String(left.lastUpdated || "").localeCompare(String(right.lastUpdated || ""));
  });
}
function selectHoneyReaderChapter(chapters = []) {
  const list = sortHoneyChaptersForReading(chapters);
  return list.find((chapter) => chapter.isMonetized !== true) || list[0] || null;
}
function resourceUrl(resourceId, base = HONEY_CDN) {
  return `${base}/${encodeURIComponent(String(resourceId))}?optimizer=image&quality=85&width=992`;
}
function pageImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return resourceUrl(raw);
}
function pageImageFallbackUrl(value) {
  const raw = String(value || "").trim();
  const id = raw.match(/\/public-resources\/([^?/#]+)/i)?.[1] || raw;
  return resourceUrl(decodeURIComponent(id), HONEY_CDN_FALLBACK);
}
function normalizeResourceValue(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";
  return String(value.resourceId || value.resourceID || value.id || value.uuid || value.url || value.src || value.content || "").trim();
}
function extractHoneyResourceIds(payload) {
  const candidates = [
    payload?.resourceIds,
    payload?.data?.resourceIds,
    payload?.pages,
    payload?.data?.pages,
    payload?.resources,
    payload?.data?.resources
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const entries = candidate.map((value, index) => [String(index), normalizeResourceValue(value)]).filter(([, value]) => value);
      if (entries.length) return Object.fromEntries(entries);
    }
    if (candidate && typeof candidate === "object") {
      const entries = Object.entries(candidate).map(([index, value]) => [index, normalizeResourceValue(value)]).filter(([, value]) => value);
      if (entries.length) return Object.fromEntries(entries);
    }
  }
  return {};
}
function hasHoneyPageResources(payload) {
  return Object.keys(extractHoneyResourceIds(payload)).length > 0;
}
async function fetchWithRetry(url, options = {}, { timeoutMs = 2e4, maxAttempts = 3 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (response.ok || response.status >= 400 && response.status < 500 && response.status !== 429) return response;
      if (attempt === maxAttempts) return response;
      const retryAfter = Number(response.headers.get("Retry-After"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(8e3, retryAfter * 1e3) : Math.min(4e3, 350 * 2 ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, Math.min(4e3, 350 * 2 ** (attempt - 1))));
    }
  }
  throw lastError || new Error("\u0417\u0430\u043F\u0438\u0442 Honey Manga \u043D\u0435 \u0432\u0438\u043A\u043E\u043D\u0430\u043D\u043E");
}
async function fetchJson(path, options = {}, baseUrl = HONEY_API) {
  const url = `${baseUrl}${path}`;
  const cacheKey = `${url}:${options.method || "GET"}:${options.body || ""}`;
  if (jsonCache.has(cacheKey)) return jsonCache.get(cacheKey);
  const request = fetchWithRetry(url, { credentials: "omit", cache: "no-store", headers: { Accept: "application/json", ...options.headers || {} }, ...options }).then(async (response) => {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const error = new Error(payload?.message || `Honey Manga API: HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }).catch((error) => {
    jsonCache.delete(cacheKey);
    throw error;
  });
  jsonCache.set(cacheKey, request);
  return request;
}
async function getChapterFrames(chapterUrl) {
  const ids = parseChapterUrl(chapterUrl);
  const cacheKey = ids.url;
  if (chapterFramesCache.has(cacheKey)) return chapterFramesCache.get(cacheKey);
  const stored = loadStoredCache(`frames_${ids.chapterId}`);
  if (stored && Array.isArray(stored) && stored.length > 0) {
    chapterFramesCache.set(cacheKey, Promise.resolve(stored));
    return stored;
  }
  const request = (async () => {
    let payload;
    try {
      payload = await fetchJson(`/v2/chapter/frames/${encodeURIComponent(ids.chapterId)}/${encodeURIComponent(ids.titleId)}`);
    } catch (error) {
      if (error?.status === 403) throw new Error("\u0426\u0435\u0439 \u0440\u043E\u0437\u0434\u0456\u043B Honey Manga \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u043B\u0438\u0448\u0435 \u043F\u0456\u0441\u043B\u044F \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043D\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u0443.");
      throw error;
    }
    const resourceIds = extractHoneyResourceIds(payload);
    const pages = Object.entries(resourceIds).sort(([left], [right]) => Number(left) - Number(right)).map(([index, resourceId]) => ({ content: pageImageUrl(resourceId), resourceId: String(resourceId), index: Number(index) }));
    debugLog("manga", "honey-frame-manifest", { chapterId: ids.chapterId, titleId: ids.titleId, apiResourceCount: Object.keys(resourceIds).length, frontendPages: pages.length });
    if (!pages.length) throw new Error("\u0423 \u0446\u044C\u043E\u043C\u0443 \u0440\u043E\u0437\u0434\u0456\u043B\u0456 Honey Manga \u043D\u0435\u043C\u0430\u0454 \u0441\u0442\u043E\u0440\u0456\u043D\u043E\u043A.");
    saveStoredCache(`frames_${ids.chapterId}`, pages, 7 * 24 * 3600 * 1e3);
    return pages;
  })().catch((error) => {
    chapterFramesCache.delete(cacheKey);
    throw error;
  });
  chapterFramesCache.set(cacheKey, request);
  return request;
}
async function fetchChapterList(mangaId) {
  const key = String(mangaId || "");
  if (!key) return [];
  if (chapterListCache.has(key)) return chapterListCache.get(key);
  const request = (async () => {
    const pageSize = 100;
    const chapters = [];
    let page = 1;
    while (page <= 100) {
      const payload = await fetchJson("/v2/chapter/cursor-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, pageSize, mangaId: key, sortOrder: "DESC" })
      });
      chapters.push(...Array.isArray(payload?.data) ? payload.data : []);
      if (!payload?.cursorNext?.page || page >= Number(payload.cursorNext.page)) break;
      page = Number(payload.cursorNext.page);
    }
    return chapters;
  })().catch((error) => {
    chapterListCache.delete(key);
    throw error;
  });
  chapterListCache.set(key, request);
  return request;
}
async function getMangaChapters(mangaUrl) {
  const url = safeUrl(mangaUrl, "");
  const mangaId = url.match(/\/book\/([^/?#]+)/i)?.[1] || url.match(/\/read\/[^/]+\/([^/?#]+)/i)?.[1] || "";
  if (!mangaId) return { title: "", description: "", chapters: [] };
  try {
    const [book, chapters] = await Promise.all([
      fetchJson(`/manga/${encodeURIComponent(mangaId)}`).catch(() => null),
      fetchChapterList(mangaId)
    ]);
    return {
      title: String(book?.title || book?.lowTitle || "").trim(),
      description: String(book?.description || "").trim(),
      chapters: chapters.map((chapter) => ({
        ...chapter,
        id: String(chapter.id),
        url: `${HONEY_WEB}/read/${encodeURIComponent(chapter.id)}/${encodeURIComponent(mangaId)}`
      }))
    };
  } catch {
    return { title: "", description: "", chapters: [] };
  }
}
function saveMangaReadingProgress(titleId, chapterUrl, pageIndex = 0) {
  if (!titleId) return;
  try {
    localStorage.setItem(`vakdab_manga_prog_${titleId}`, JSON.stringify({
      chapterUrl,
      pageIndex: Number(pageIndex) || 0,
      updatedAt: Date.now()
    }));
  } catch {
  }
}
function getMangaReadingProgress(titleId) {
  if (!titleId) return null;
  try {
    const raw = localStorage.getItem(`vakdab_manga_prog_${titleId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function getReaderBackgroundData(titleId, chapterUrl) {
  const ids = parseChapterUrl(chapterUrl);
  return getMangaChapters(`${HONEY_WEB}/book/${encodeURIComponent(titleId)}`).then((payload) => ({
    title: { title: payload.title || "\u041C\u0430\u043D\u0491\u0430", description: payload.description || "" },
    chapter: chapterUrl,
    chapterList: payload.chapters || []
  })).catch(() => ({ title: {}, chapter: chapterUrl, chapterList: [] }));
}
var HONEY_WEB, HONEY_API, HONEY_CDN, HONEY_CDN_FALLBACK, DEFAULT_CHAPTER_URL, jsonCache, chapterFramesCache, chapterListCache, STORAGE_PREFIX;
var init_manga = __esm({
  "src/js/services/api/manga.js?v=20260824-settings-redesign-v1"() {
    init_debug();
    HONEY_WEB = "https://honey-manga.com.ua";
    HONEY_API = "https://data.api.honey-manga.com.ua";
    HONEY_CDN = "https://honeymangastorage-nocache.b-cdn.net/public-resources";
    HONEY_CDN_FALLBACK = "https://hmvolumestorage.b-cdn.net/public-resources";
    DEFAULT_CHAPTER_URL = `${HONEY_WEB}/read/db4ed14e-f564-4103-be20-688948370f3d/8c336683-10ca-4912-9666-e18a1689da6e`;
    jsonCache = /* @__PURE__ */ new Map();
    chapterFramesCache = /* @__PURE__ */ new Map();
    chapterListCache = /* @__PURE__ */ new Map();
    STORAGE_PREFIX = "vakdab_manga_";
  }
});
