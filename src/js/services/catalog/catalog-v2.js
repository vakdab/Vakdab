function normalizeGenreList2(values) {
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  for (const value of Array.isArray(values) ? values : [values]) {
    const label = String(typeof value === "object" ? value?.name_ua || value?.name || "" : value || "").trim();
    const key = label.toLocaleLowerCase("uk-UA");
    if (label && !seen.has(key)) {
      seen.add(key);
      result.push(label);
    }
  }
  return result;
}
function normalizeSynopsisText2(value) {
  return String(value || "").replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1").replace(/<[^>]+>/g, "").replace(/\\r?\\n/g, "\n").replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function hikkaType2(item = {}) {
  return item.media_type === "movie" ? "movie" : item.media_type === "ova" || item.media_type === "ona" ? "ova" : "tv";
}
function hikkaItem2(item = {}, endpoint = "anime") {
  const title = item.title_ua || item.title_en || item.title_ja || item.name_ua || item.name_en || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
  const contentType = endpoint === "manga" ? "manga" : endpoint === "novel" ? "novel" : hikkaType2(item);
  const contentTypeLabel = contentType === "manga" ? "\u041C\u0430\u043D\u0491\u0430" : contentType === "novel" ? "\u0420\u0430\u043D\u043E\u0431\u0435" : contentType === "movie" ? "\u0424\u0456\u043B\u044C\u043C" : contentType === "ova" ? "OVA" : "\u0421\u0435\u0440\u0456\u0430\u043B";
  const genreSlugs = (Array.isArray(item.genres) ? item.genres : [item.genres]).map((value) => typeof value === "object" ? value?.slug : value).map((value) => String(value || "").trim()).filter(Boolean);
  return {
    ...item,
    mal_id: item.mal_id || item.slug?.hashCode?.() || Date.now(),
    title,
    originalTitle: item.title_en || item.title_ja || item.name_en || "",
    url: `${HIKKA_API}/${endpoint}/${item.slug}`,
    images: { jpg: { large_image_url: item.image || CATALOG_POSTER_FALLBACK2, image_url: item.image || CATALOG_POSTER_FALLBACK2 } },
    genres: normalizeGenreList2(item.genres),
    genreSlugs,
    type: contentType,
    typeLabel: contentTypeLabel,
    synopsis: normalizeSynopsisText2(item.synopsis_ua || item.synopsis_en || ""),
    from: "hikka"
  };
}
function hikkaRequest2(url, options = {}) {
  return fetch(`${HIKKA_PROXY_URL}/?url=${encodeURIComponent(url)}`, {
    ...options,
    headers: { Accept: "application/json", ...options.headers || {} }
  });
}
async function hikkaCatalog2(type = "anime", page = 1, body = {}) {
  const endpoint = type === "manga" ? "manga" : type === "novel" ? "novel" : "anime";
  const currentPage3 = Math.max(1, Number(page) || 1);
  const apiUrl = `${HIKKA_API}/${endpoint}?page=${currentPage3}&size=${HIKKA_CATALOG_PAGE_SIZE2}`;
  let res;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      res = await hikkaRequest2(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) break;
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === 3) throw new Error(`Hikka API: HTTP ${res.status}`);
      await new Promise((resolve) => setTimeout(resolve, 350 * 2 ** (attempt - 1)));
    } catch (error) {
      lastError = error;
      if (/Hikka API: HTTP 4\d\d/.test(String(error?.message || "")) || attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 350 * 2 ** (attempt - 1)));
    }
  }
  if (!res?.ok) throw lastError || new Error("Hikka API: \u043F\u043E\u0440\u043E\u0436\u043D\u044F \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u044C");
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Hikka API: \u043D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 JSON");
  }
  const rawItems = Array.isArray(data?.list) ? data.list : Array.isArray(data?.data) ? data.data : [];
  const items = rawItems.map((item) => hikkaItem2(item, endpoint));
  const meta = readCatalogMeta(data, currentPage3, HIKKA_CATALOG_PAGE_SIZE2, items.length);
  debugLog("catalog", "page", { endpoint, requestedPage: currentPage3, requestedLimit: HIKKA_CATALOG_PAGE_SIZE2, receivedItems: rawItems.length, uniqueItems: new Set(items.map((item) => item.url)).size, total: meta.total, hasNextPage: meta.hasNextPage });
  return attachCatalogMeta(items, meta);
}
async function searchHikka2(query2, page) {
  return hikkaCatalog2("anime", page, { query: String(query2 || "").trim(), only_translated: true });
}
var CATALOG_POSTER_FALLBACK2, HIKKA_CATALOG_PAGE_SIZE2;
var init_catalog2 = __esm({
  "src/js/services/catalog/catalog.js"() {
    init_constants2();
    init_dom();
    init_image();
    init_debug();
    init_pagination();
    init_app_legacy();
    CATALOG_POSTER_FALLBACK2 = "./assets/icons/android-chrome-512x512.png";
    HIKKA_CATALOG_PAGE_SIZE2 = DEFAULT_CATALOG_PAGE_SIZE;
  }
});
