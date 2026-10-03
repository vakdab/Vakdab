function normalizeGenreList4(values) {
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
function normalizeSynopsisText4(value) {
  return String(value || "").replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1").replace(/<[^>]+>/g, "").replace(/\\r?\\n/g, "\n").replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function hikkaType4(item = {}) {
  return item.media_type === "movie" ? "movie" : item.media_type === "ova" || item.media_type === "ona" ? "ova" : "tv";
}
function hikkaItem4(item = {}, endpoint = "anime") {
  const title = item.title_ua || item.title_en || item.title_ja || item.name_ua || item.name_en || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
  const contentType = endpoint === "manga" ? "manga" : endpoint === "novel" ? "novel" : hikkaType4(item);
  const contentTypeLabel = contentType === "manga" ? "\u041C\u0430\u043D\u0491\u0430" : contentType === "novel" ? "\u0420\u0430\u043D\u043E\u0431\u0435" : contentType === "movie" ? "\u0424\u0456\u043B\u044C\u043C" : contentType === "ova" ? "OVA" : "\u0421\u0435\u0440\u0456\u0430\u043B";
  const genreSlugs = (Array.isArray(item.genres) ? item.genres : [item.genres]).map((value) => typeof value === "object" ? value?.slug : value).map((value) => String(value || "").trim()).filter(Boolean);
  return {
    ...item,
    mal_id: item.mal_id || item.slug?.hashCode?.() || Date.now(),
    title,
    originalTitle: item.title_en || item.title_ja || item.name_en || "",
    url: `${HIKKA_API}/${endpoint}/${item.slug}`,
    images: { jpg: { large_image_url: item.image || CATALOG_POSTER_FALLBACK4, image_url: item.image || CATALOG_POSTER_FALLBACK4 } },
    genres: normalizeGenreList4(item.genres),
    genreSlugs,
    type: contentType,
    typeLabel: contentTypeLabel,
    synopsis: normalizeSynopsisText4(item.synopsis_ua || item.synopsis_en || ""),
    from: "hikka"
  };
}
function hikkaRequest4(url, options = {}) {
  return fetch(`${HIKKA_PROXY_URL}/?url=${encodeURIComponent(url)}`, {
    ...options,
    headers: { Accept: "application/json", ...options.headers || {} }
  });
}
async function hikkaCatalog4(type = "anime", page = 1, body = {}) {
  const endpoint = type === "manga" ? "manga" : type === "novel" ? "novel" : "anime";
  const currentPage3 = Math.max(1, Number(page) || 1);
  const apiUrl = `${HIKKA_API}/${endpoint}?page=${currentPage3}&size=${HIKKA_CATALOG_PAGE_SIZE4}`;
  let res;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      res = await hikkaRequest4(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
  const items = rawItems.map((item) => hikkaItem4(item, endpoint));
  const meta = readCatalogMeta(data, currentPage3, HIKKA_CATALOG_PAGE_SIZE4, items.length);
  debugLog("catalog", "page", { endpoint, requestedPage: currentPage3, requestedLimit: HIKKA_CATALOG_PAGE_SIZE4, receivedItems: rawItems.length, uniqueItems: new Set(items.map((item) => item.url)).size, total: meta.total, hasNextPage: meta.hasNextPage });
  return attachCatalogMeta(items, meta);
}
async function fetchHikkaByCategory2(categorySlug, page) {
  const body = String(categorySlug).startsWith("format:") ? { media_type: [String(categorySlug).slice(7)], only_translated: true } : { genres: [categorySlug], only_translated: true };
  return hikkaCatalog4("anime", page, body);
}
async function fetchHikkaByGenre3(genreSlug, page) {
  return fetchHikkaByCategory2(genreSlug, page);
}
function getExternalWatchUrl3(hikkaAnime = {}, hostPattern) {
  const external = Array.isArray(hikkaAnime.external) ? hikkaAnime.external : [];
  return external.find((item) => item?.type === "watch" && hostPattern.test(item.url || ""))?.url || "";
}
function getMikaiUrl3(hikkaAnime = {}) {
  return getExternalWatchUrl3(hikkaAnime, /^https?:\/\/(?:www\.)?mikai\.me\/anime\//i);
}
function getAnimeOnUrl3(hikkaAnime = {}) {
  return getExternalWatchUrl3(hikkaAnime, /^https?:\/\/(?:www\.)?animeon\.club\/anime\//i);
}
function getAnimeOnId3(animeOnUrl = "") {
  const match = String(animeOnUrl).match(/\/anime\/(\d+)(?:[-/]|$)/i);
  return match?.[1] || "";
}
async function fetchAnimeOnJson3(url) {
  const proxyUrl = getProxyUrl(url, "desktop");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25e3);
  try {
    const res = await fetch(proxyUrl, {
      mode: "cors",
      credentials: "omit",
      cache: "no-cache",
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    if (!res.ok) throw new Error(`AnimeON API: HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
async function loadAnimeOnSeasons3(animeOnUrl) {
  const animeId = getAnimeOnId3(animeOnUrl);
  if (!animeId) return { seasons: {}, dubLogos: {}, subtitleLogos: {} };
  const data = await fetchAnimeOnJson3(`https://animeon.club/api/player/${animeId}/translations`);
  const translations = Array.isArray(data?.translations) ? data.translations : [];
  const dubEntries = translations.map((entry) => {
    const translation = entry?.translation;
    const player = (entry?.player || []).slice().sort((a, b) => {
      const aAshdi = /^ashdi$/i.test(String(a?.name || "")) ? 1 : 0;
      const bAshdi = /^ashdi$/i.test(String(b?.name || "")) ? 1 : 0;
      return bAshdi - aAshdi || (Number(b?.episodesCount) || 0) - (Number(a?.episodesCount) || 0);
    })[0];
    return { translation, player };
  }).filter(({ translation, player }) => translation?.id && player?.id && Number(player.episodesCount) > 0);
  if (!dubEntries.length) return { seasons: {}, dubLogos: {}, subtitleLogos: {} };
  const dubSeasons = {}, dubLogos = {}, subtitleLogos = {};
  for (const { translation, player } of dubEntries) {
    const dubName = String(translation.name || `\u041E\u0437\u0432\u0443\u0447\u043A\u0430 ${translation.id}`).trim();
    try {
      const episodesData = await fetchAnimeOnJson3(`https://animeon.club/api/player/${animeId}/episodes?take=100&skip=-1&playerId=${encodeURIComponent(player.id)}&translationId=${encodeURIComponent(translation.id)}&includeAlternative=true`);
      const refs = Array.isArray(episodesData?.episodes) ? episodesData.episodes : [];
      const loaded = refs.map((ref2) => ({
        episode: String(ref2.episode),
        file: `animeon:${ref2.id}`,
        dub: dubName,
        provider: "AnimeON",
        label: dubName
      })).filter((ep) => ep.episode);
      loaded.sort((a, b) => Number(a.episode) - Number(b.episode));
      if (loaded.length) dubSeasons[dubName] = loaded;
      const logo = translation.studios?.[0]?.avatar?.preview || translation.avatar?.preview || "";
      if (logo) dubLogos[dubName] = `https://animeon.club/api/uploads/images/${logo}`;
    } catch (error) {
      console.warn(`[AnimeON] \u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 ${dubName}:`, error);
    }
  }
  return { seasons: Object.keys(dubSeasons).length ? { "1": dubSeasons } : {}, dubLogos, subtitleLogos };
}
function resolveMikaiNuxtPayload3(payload) {
  const memo = /* @__PURE__ */ new Map();
  const resolving = /* @__PURE__ */ new Set();
  const resolveRef = (index) => {
    if (!Number.isInteger(index) || index < 0 || index >= payload.length) return index;
    if (memo.has(index)) return memo.get(index);
    if (resolving.has(index)) return null;
    resolving.add(index);
    const raw = payload[index];
    let value;
    if (typeof raw === "number") value = raw;
    else if (Array.isArray(raw)) {
      const tag = typeof raw[0] === "string" ? raw[0] : "";
      if (["ShallowReactive", "Reactive", "Set", "Date", "URL"].includes(tag) && raw.length > 1) {
        value = resolveRef(raw[1]);
      } else {
        value = raw.map((item) => typeof item === "number" ? resolveRef(item) : item);
      }
    } else if (raw && typeof raw === "object") {
      value = {};
      Object.entries(raw).forEach(([key, item]) => {
        value[key] = typeof item === "number" ? resolveRef(item) : item;
      });
    } else value = raw;
    resolving.delete(index);
    memo.set(index, value);
    return value;
  };
  return payload.map((_, index) => resolveRef(index));
}
function addNoAdsQuery3(url) {
  if (!url) return "";
  return `${url}${url.includes("?") ? "&" : "?"}nopl`;
}
async function fetchMikaiHtml3(mikaiUrl) {
  const cacheKey = String(mikaiUrl || "").trim();
  if (mikaiHtmlCache3.has(cacheKey)) return mikaiHtmlCache3.get(cacheKey);
  const proxyUrl = getProxyUrl(mikaiUrl, "desktop");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25e3);
  try {
    const res = await fetch(proxyUrl, {
      mode: "cors",
      credentials: "omit",
      cache: "no-cache",
      signal: controller.signal,
      headers: { Accept: "text/html,application/xhtml+xml" }
    });
    if (!res.ok) throw new Error(`Mikai proxy: HTTP ${res.status}`);
    const html = await res.text();
    mikaiHtmlCache3.set(cacheKey, html);
    return html;
  } finally {
    clearTimeout(timer);
  }
}
function getMikaiTeamLogoUrl3(team) {
  const avatarUid = team?.avatarUid || team?.avatar?.uid || team?.avatar?.id || team?.teams?.[0]?.avatarUid || "";
  return avatarUid ? `https://images.mikai.me/avatar/medium/${encodeURIComponent(avatarUid)}.webp` : "";
}
function parseMikaiSeasonsFromHtml3(html) {
  const htmlText = String(html || "");
  const posterCandidates = [...htmlText.matchAll(/https?:\/\/images\.mikai\.me\/(?:ua_poster|poster)\/(?:big|medium|small)\/[^"'<>\s]+/gi)].map((match2) => match2[0].replace(/&amp;/gi, "&"));
  const mikaiPosterUrl = posterCandidates.find((url) => /\/ua_poster\/big\//i.test(url)) || posterCandidates.find((url) => /\/ua_poster\/medium\//i.test(url)) || posterCandidates.find((url) => /\/poster\/big\//i.test(url)) || posterCandidates.find((url) => /\/poster\/medium\//i.test(url)) || "";
  const mikaiTitle = htmlText.match(/<h1[^>]*>\s*([^<]+?)\s*<\/h1>/i)?.[1]?.replace(/\s+/g, " ").trim() || htmlText.match(/<title>\s*([^<]+?)\s+-\s+аніме українською онлайн/i)?.[1]?.replace(/\s+/g, " ").trim() || "";
  const match = htmlText.match(/<script[^>]+id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) throw new Error("Mikai Nuxt payload \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E");
  let payload;
  try {
    payload = JSON.parse(match[1]);
  } catch {
    throw new Error("Mikai Nuxt payload \u043F\u043E\u0448\u043A\u043E\u0434\u0436\u0435\u043D\u0438\u0439");
  }
  const resolved = resolveMikaiNuxtPayload3(payload);
  const playerGroups = [];
  resolved.forEach((value) => {
    if (Array.isArray(value?.players)) playerGroups.push(...value.players);
  });
  const dubs = /* @__PURE__ */ new Map();
  const dubLogos = {};
  const subtitleLogos = {};
  playerGroups.forEach((group) => {
    if (!group || !Array.isArray(group.providers)) return;
    const rawName = String(group.team?.name || (group.isSubs ? "\u0421\u0443\u0431\u0442\u0438\u0442\u0440\u0438" : "\u041E\u0437\u0432\u0443\u0447\u043A\u0430")).trim();
    const isSubs = !!group.isSubs;
    const teamName = isSubs && !/субтит|sub/i.test(rawName) ? `${rawName} (\u0421\u0443\u0431\u0442\u0438\u0442\u0440\u0438)` : rawName;
    const logoUrl = getMikaiTeamLogoUrl3(group.team);
    if (logoUrl) {
      (isSubs ? subtitleLogos : dubLogos)[teamName] = logoUrl;
    }
    const playableProviders = group.providers.filter((provider) => Array.isArray(provider?.episodes) && provider.episodes.length).sort((a, b) => {
      const aAshdi = String(a?.name || "").toUpperCase() === "ASHDI" ? 1 : 0;
      const bAshdi = String(b?.name || "").toUpperCase() === "ASHDI" ? 1 : 0;
      return bAshdi - aAshdi;
    });
    playableProviders.forEach((provider) => {
      const providerName = String(provider?.name || "Mikai").trim();
      const isAshdi = providerName.toUpperCase() === "ASHDI";
      const episodes = dubs.get(teamName) || /* @__PURE__ */ new Map();
      (provider.episodes || []).forEach((ep) => {
        const number = String(ep?.number ?? "").trim();
        const playLink = String(ep?.playLink || "").trim();
        if (!number || !playLink) return;
        const previous = episodes.get(number);
        if (!previous || isAshdi && previous.provider !== "ASHDI" || String(ep?.createdAt || "") > String(previous.createdAt || "")) {
          episodes.set(number, {
            title: `\u0421\u0435\u0440\u0456\u044F ${number}`,
            season: "1",
            episode: number,
            file: isAshdi ? addNoAdsQuery3(playLink) : playLink,
            dub: teamName,
            isSubs,
            teamLogo: logoUrl,
            provider: providerName,
            createdAt: ep?.createdAt || ""
          });
        }
      });
      dubs.set(teamName, episodes);
    });
  });
  const dubObject = {};
  [...dubs.entries()].sort(([a], [b]) => a.localeCompare(b, "uk")).forEach(([team, episodes]) => {
    const list = [...episodes.values()].sort((a, b) => Number(a.episode) - Number(b.episode));
    if (list.length) dubObject[team] = list;
  });
  return {
    seasons: Object.keys(dubObject).length ? { "1": dubObject } : {},
    dubLogos,
    subtitleLogos,
    mikaiPosterUrl,
    mikaiTitle
  };
}
async function loadMikaiSeasons3(mikaiUrl) {
  if (!mikaiUrl) return { seasons: {}, dubLogos: {}, subtitleLogos: {}, mikaiPosterUrl: "" };
  const html = await fetchMikaiHtml3(mikaiUrl);
  return parseMikaiSeasonsFromHtml3(html);
}
function pickPreferredDub3(seasonData = {}) {
  const dubs = Object.keys(seasonData || {});
  return dubs.find((dub) => /робота голосом/i.test(dub)) || dubs.slice().sort((a, b) => (seasonData[b]?.length || 0) - (seasonData[a]?.length || 0))[0] || "";
}
async function switchProviderSource3(providerName) {
  if (providerName === playerPageCurrentSource) return;
  const prevSource = playerPageCurrentSource;
  setPlayerPageCurrentSource(providerName);
  updateSourceChip();
  buildBottomSheetData();
  if (providerName === "\u041E\u0441\u043D\u043E\u0432\u043D\u0435") {
    playerPageAnime.seasons = playerPageAnimeuaSeasons || {};
    refreshAfterSourceSwitch3();
    showToast("\u0414\u0436\u0435\u0440\u0435\u043B\u043E: \u041E\u0441\u043D\u043E\u0432\u043D\u0435");
    return;
  }
  showToast(`\u0428\u0443\u043A\u0430\u044E \u043E\u0437\u0432\u0443\u0447\u043A\u0438 ${providerName}...`);
  try {
    let sourceData = externalSourceCache[providerName];
    if (!sourceData) {
      const isAshdiProvider = /^(mikai\.me|ashdi)$/i.test(String(providerName || "").trim());
      if (isAshdiProvider) {
        sourceData = await loadMikaiSeasons3(playerPageAnime?.mikaiUrl || getMikaiUrl3(playerPageAnime));
      } else if (/^animeon$/i.test(String(providerName || "").trim())) {
        sourceData = await loadAnimeOnSeasons3(playerPageAnime?.animeOnUrl || getAnimeOnUrl3(playerPageAnime));
      } else throw new Error("\u041D\u0435\u0432\u0456\u0434\u043E\u043C\u0435 \u0434\u0436\u0435\u0440\u0435\u043B\u043E \u0432\u0456\u0434\u0435\u043E");
      externalSourceCache[providerName] = sourceData;
    }
    const mikaiData = sourceData;
    playerPageAnime.seasons = mikaiData.seasons || {};
    playerPageAnime.dubLogos = mikaiData.dubLogos || {};
    playerPageAnime.subtitleLogos = mikaiData.subtitleLogos || {};
    refreshAfterSourceSwitch3();
    showToast(`${providerName}: \u0443\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0435 \u0432\u0456\u0434\u0435\u043E \u0431\u0435\u0437 \u0440\u0435\u043A\u043B\u0430\u043C\u0438`);
  } catch (e) {
    console.warn("[switchProviderSource]", providerName, e);
    showToast(`${providerName}: ${e.message || "\u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E"}`);
    setPlayerPageCurrentSource(prevSource);
    updateSourceChip();
    buildBottomSheetData();
  }
}
function refreshAfterSourceSwitch3() {
  const seasons = Object.keys(playerPageAnime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
  setPlayerPageCurrentSeason(seasons[0] || "1");
  setPlayerPageCurrentDub(pickPreferredDub3(playerPageAnime.seasons[playerPageCurrentSeason]));
  buildSeasonRow(seasons);
  buildEpisodeViews();
  updateFilterChip();
  buildBottomSheetData();
  if (seasons.length === 0) {
    document.getElementById("episodeViewGrid").innerHTML = '<div class="episode-empty"><i class="fas fa-search"></i> \u0421\u0435\u0440\u0456\u0457 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u0456 \u043D\u0430 \u0446\u044C\u043E\u043C\u0443 \u0434\u0436\u0435\u0440\u0435\u043B\u0456.</div>';
  }
}
var CATALOG_POSTER_FALLBACK4, HIKKA_CATALOG_PAGE_SIZE4, mikaiHtmlCache3;
var init_catalog4 = __esm({
  "src/js/services/catalog/catalog.js?v=20260911-player-ui-v1"() {
    init_constants2();
    init_dom();
    init_image();
    init_debug();
    init_pagination();
    init_app_legacy();
    CATALOG_POSTER_FALLBACK4 = "./assets/icons/android-chrome-512x512.png";
    HIKKA_CATALOG_PAGE_SIZE4 = DEFAULT_CATALOG_PAGE_SIZE;
    mikaiHtmlCache3 = /* @__PURE__ */ new Map();
  }
});
