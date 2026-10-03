function normalizePosterUrl2(src = "", fallback = CATALOG_POSTER_FALLBACK3) {
  const value = String(src || "").trim();
  return /^https?:\/\//i.test(value) ? value : fallback;
}
function normalizeGenreList3(values) {
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
function normalizeSynopsisText3(value) {
  return String(value || "").replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1").replace(/<[^>]+>/g, "").replace(/\\r?\\n/g, "\n").replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function hikkaType3(item = {}) {
  return item.media_type === "movie" ? "movie" : item.media_type === "ova" || item.media_type === "ona" ? "ova" : "tv";
}
function extractExternalAnimeIds2(item = {}) {
  const external = Array.isArray(item.external) ? item.external : [];
  const fromUrl = (pattern) => {
    const hit = external.map((x) => String(x?.url || "")).map((url) => url.match(pattern)).find(Boolean);
    return hit ? Number(hit[1]) : null;
  };
  const malId = Number(item.mal_id || item.malId || fromUrl(/myanimelist\.net\/anime\/(\d+)/i) || 0) || null;
  const anilistId = Number(item.anilist_id || item.anilistId || fromUrl(/anilist\.co\/anime\/(\d+)/i) || 0) || null;
  return { ...malId ? { mal_id: malId } : {}, ...anilistId ? { anilist_id: anilistId } : {} };
}
function hikkaItem3(item = {}, endpoint = "anime") {
  const title = item.title_ua || item.title_en || item.title_ja || item.name_ua || item.name_en || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
  const contentType = endpoint === "manga" ? "manga" : endpoint === "novel" ? "novel" : hikkaType3(item);
  const contentTypeLabel = contentType === "manga" ? "\u041C\u0430\u043D\u0491\u0430" : contentType === "novel" ? "\u0420\u0430\u043D\u043E\u0431\u0435" : contentType === "movie" ? "\u0424\u0456\u043B\u044C\u043C" : contentType === "ova" ? "OVA" : "\u0421\u0435\u0440\u0456\u0430\u043B";
  const genreSlugs = (Array.isArray(item.genres) ? item.genres : [item.genres]).map((value) => typeof value === "object" ? value?.slug : value).map((value) => String(value || "").trim()).filter(Boolean);
  return {
    ...item,
    mal_id: item.mal_id || item.slug?.hashCode?.() || Date.now(),
    title,
    originalTitle: item.title_en || item.title_ja || item.name_en || "",
    url: `${HIKKA_API}/${endpoint}/${item.slug}`,
    images: { jpg: { large_image_url: item.image || CATALOG_POSTER_FALLBACK3, image_url: item.image || CATALOG_POSTER_FALLBACK3 } },
    genres: normalizeGenreList3(item.genres),
    genreSlugs,
    type: contentType,
    typeLabel: contentTypeLabel,
    synopsis: normalizeSynopsisText3(item.synopsis_ua || item.synopsis_en || ""),
    from: "hikka"
  };
}
function hikkaRequest3(url, options = {}) {
  return fetch(`${HIKKA_PROXY_URL}/?url=${encodeURIComponent(url)}`, {
    ...options,
    headers: { Accept: "application/json", ...options.headers || {} }
  });
}
async function hikkaCatalog3(type = "anime", page = 1, body = {}) {
  const endpoint = type === "manga" ? "manga" : type === "novel" ? "novel" : "anime";
  const currentPage3 = Math.max(1, Number(page) || 1);
  const apiUrl = `${HIKKA_API}/${endpoint}?page=${currentPage3}&size=${HIKKA_CATALOG_PAGE_SIZE3}`;
  let res;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      res = await hikkaRequest3(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
  const items = rawItems.map((item) => hikkaItem3(item, endpoint));
  const meta = readCatalogMeta(data, currentPage3, HIKKA_CATALOG_PAGE_SIZE3, items.length);
  debugLog("catalog", "page", { endpoint, requestedPage: currentPage3, requestedLimit: HIKKA_CATALOG_PAGE_SIZE3, receivedItems: rawItems.length, uniqueItems: new Set(items.map((item) => item.url)).size, total: meta.total, hasNextPage: meta.hasNextPage });
  return attachCatalogMeta(items, meta);
}
async function searchHikka3(query2, page) {
  return hikkaCatalog3("anime", page, { query: String(query2 || "").trim(), only_translated: true });
}
async function searchHikkaAllTitles2(query2, page) {
  return hikkaCatalog3("anime", page, { query: String(query2 || "").trim() });
}
function getExternalWatchUrl2(hikkaAnime = {}, hostPattern) {
  const external = Array.isArray(hikkaAnime.external) ? hikkaAnime.external : [];
  return external.find((item) => item?.type === "watch" && hostPattern.test(item.url || ""))?.url || "";
}
function getMikaiUrl2(hikkaAnime = {}) {
  return getExternalWatchUrl2(hikkaAnime, /^https?:\/\/(?:www\.)?mikai\.me\/anime\//i);
}
function getAnimeOnUrl2(hikkaAnime = {}) {
  return getExternalWatchUrl2(hikkaAnime, /^https?:\/\/(?:www\.)?animeon\.club\/anime\//i);
}
function getAnimeOnId2(animeOnUrl = "") {
  const match = String(animeOnUrl).match(/\/anime\/(\d+)(?:[-/]|$)/i);
  return match?.[1] || "";
}
async function fetchAnimeOnJson2(url) {
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
async function loadAnimeOnSeasons2(animeOnUrl) {
  const animeId = getAnimeOnId2(animeOnUrl);
  if (!animeId) return { seasons: {}, dubLogos: {}, subtitleLogos: {} };
  const data = await fetchAnimeOnJson2(`https://animeon.club/api/player/${animeId}/translations`);
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
      const episodesData = await fetchAnimeOnJson2(`https://animeon.club/api/player/${animeId}/episodes?take=100&skip=-1&playerId=${encodeURIComponent(player.id)}&translationId=${encodeURIComponent(translation.id)}&includeAlternative=true`);
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
function resolveMikaiNuxtPayload2(payload) {
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
function addNoAdsQuery2(url) {
  if (!url) return "";
  return `${url}${url.includes("?") ? "&" : "?"}nopl`;
}
async function fetchMikaiHtml2(mikaiUrl) {
  const cacheKey = String(mikaiUrl || "").trim();
  if (mikaiHtmlCache2.has(cacheKey)) return mikaiHtmlCache2.get(cacheKey);
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
    mikaiHtmlCache2.set(cacheKey, html);
    return html;
  } finally {
    clearTimeout(timer);
  }
}
function getMikaiTeamLogoUrl2(team) {
  const avatarUid = team?.avatarUid || team?.avatar?.uid || team?.avatar?.id || team?.teams?.[0]?.avatarUid || "";
  return avatarUid ? `https://images.mikai.me/avatar/medium/${encodeURIComponent(avatarUid)}.webp` : "";
}
function parseMikaiSeasonsFromHtml2(html) {
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
  const resolved = resolveMikaiNuxtPayload2(payload);
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
    const logoUrl = getMikaiTeamLogoUrl2(group.team);
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
            file: isAshdi ? addNoAdsQuery2(playLink) : playLink,
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
function decodeMoonAnimeHtml2(html) {
  if (!html) return null;
  const scriptTags = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const obfuscatedScript = scriptTags.find((s) => s.includes("atob(") && s.includes("Uint8Array"));
  if (obfuscatedScript) {
    const match = obfuscatedScript.match(/atob\(["']([A-Za-z0-9+/=]+)["']\)/);
    if (match) {
      try {
        const b64 = match[1];
        const binaryString = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
        const _b = Array.from(binaryString).map((c) => c.charCodeAt(0));
        const _eywfe = _b[0];
        const _gudAQ = _b.slice(1, 33);
        const _x = new Uint8Array(_b.length - 33);
        let _qXseD = _eywfe;
        for (let i = 0; i < _x.length; i++) {
          const _ig98y = _gudAQ[i % 32];
          _x[i] = _b[i + 33] ^ _ig98y ^ _qXseD;
          _qXseD = _b[i + 33] + _ig98y & 255;
        }
        const decoded = new TextDecoder().decode(_x);
        const keyMatch = decoded.match(/var\s+k\s*=\s*["']([^"']+)["']/i) || decoded.match(/k\s*=\s*["']([^"']+)["']/i);
        const key = keyMatch ? keyMatch[1] : "p2Lznfrx2p3W";
        const fileMatch = decoded.match(/_0xd\(["']([A-Za-z0-9+/=]+)["']\)/) || decoded.match(/file\s*:\s*_0xd\(["']([^"']+)["']\)/);
        if (fileMatch) {
          const encPayload = fileMatch[1];
          const b = typeof atob === "function" ? atob(encPayload) : Buffer.from(encPayload, "base64").toString("binary");
          let r = "";
          for (let i = 0; i < b.length; i++) {
            r += String.fromCharCode(b.charCodeAt(i) ^ key.charCodeAt(i % key.length));
          }
          let rawUrl = "";
          try {
            rawUrl = decodeURIComponent(escape(r));
          } catch (_) {
            rawUrl = r;
          }
          if (/https?:\/\/[^\s"'<>]+\.m3u8/i.test(rawUrl)) {
            return rawUrl.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i)[0];
          }
        }
        const m3u8Inside = decoded.match(/https?:\/\/[^"'\s<>]+\.m3u8[^\s"'<>]*/gi);
        if (m3u8Inside) return m3u8Inside[0];
      } catch (e) {
        console.warn("[MoonAnime decoder error]", e);
      }
    }
  }
  const directMatches = String(html).match(/https?:\/\/[^"'<>\s]+\.m3u8(?:\?[^"'<>\s]*)?/gi) || [];
  return directMatches.find((url) => /moonanime|content\/stream/i.test(url)) || directMatches[0] || null;
}
async function resolveAshdiPlaybackUrl2(ashdiPageUrl) {
  if (!ashdiPageUrl) throw new Error("\u041F\u043E\u0440\u043E\u0436\u043D\u0456\u0439 ASHDI URL");
  const cached = ashdiPlaybackCache2.get(ashdiPageUrl);
  if (cached) return cached;
  const html = await fetchMikaiHtml2(ashdiPageUrl);
  const normalizedHtml = String(html).replace(/\\u002F/g, "/").replace(/\\\//g, "/").replace(/&amp;/gi, "&");
  const matches = normalizedHtml.match(/https?:\/\/[^"'<>\s]+\.m3u8(?:\?[^"'<>\s]*)?/gi) || [];
  const manifest = matches.find((url) => /ashdi\.vip|video\d+/i.test(url)) || matches[0];
  if (!manifest) throw new Error("ASHDI m3u8 manifest \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E");
  const isMobileDevice = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  const proxiedManifest = getProxyUrl(manifest, isMobileDevice ? "mobile" : "desktop");
  ashdiPlaybackCache2.set(ashdiPageUrl, proxiedManifest);
  universalPlaybackCache2.set(ashdiPageUrl, proxiedManifest);
  return proxiedManifest;
}
async function resolveUniversalPlaybackUrl2(sourceUrl) {
  if (!sourceUrl) throw new Error("\u041F\u043E\u0440\u043E\u0436\u043D\u0456\u0439 URL \u0432\u0456\u0434\u0435\u043E");
  const cached = universalPlaybackCache2.get(sourceUrl);
  if (cached) return cached;
  const isMobileDevice = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  const forceUA = isMobileDevice ? "mobile" : "desktop";
  if (sourceUrl.startsWith("animeon:")) {
    const id = sourceUrl.split(":")[1];
    try {
      const episode = await fetchAnimeOnJson2(`https://animeon.club/api/player/${encodeURIComponent(id)}/episode`);
      if (episode && episode.videoUrl) {
        return resolveUniversalPlaybackUrl2(episode.videoUrl);
      }
    } catch (e) {
      throw new Error("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u043E\u0442\u0440\u0438\u043C\u0430\u0442\u0438 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F AnimeON");
    }
  }
  if (/\.(?:m3u8|mp4)(?:[?#]|$)/i.test(sourceUrl)) {
    const proxied2 = sourceUrl.startsWith(PROXY_URL) ? sourceUrl : getProxyUrl(sourceUrl, forceUA);
    universalPlaybackCache2.set(sourceUrl, proxied2);
    return proxied2;
  }
  if (/ashdi\.vip\/vod\//i.test(sourceUrl) || /video\d+\.ashdi/i.test(sourceUrl)) {
    return resolveAshdiPlaybackUrl2(sourceUrl);
  }
  if (/moonanime\.art\/(?:iframe|watch|embed)\//i.test(sourceUrl) || /moonanime/i.test(sourceUrl)) {
    const html = await fetchMikaiHtml2(sourceUrl);
    const manifest = decodeMoonAnimeHtml2(html);
    if (manifest) {
      const proxiedManifest = getProxyUrl(manifest, forceUA);
      universalPlaybackCache2.set(sourceUrl, proxiedManifest);
      return proxiedManifest;
    }
  }
  if (isEmbedUrl(sourceUrl)) {
    try {
      const html = await fetchMikaiHtml2(sourceUrl);
      const normalizedHtml = String(html).replace(/\\u002F/g, "/").replace(/\\\//g, "/").replace(/&amp;/gi, "&");
      const matches = normalizedHtml.match(/https?:\/\/[^"'<>\s]+\.m3u8(?:\?[^"'<>\s]*)?/gi) || [];
      const manifest = matches[0];
      if (manifest) {
        const proxiedManifest = getProxyUrl(manifest, forceUA);
        universalPlaybackCache2.set(sourceUrl, proxiedManifest);
        return proxiedManifest;
      }
    } catch (e) {
      console.warn("[Embed resolution fallback]", e);
    }
  }
  const proxied = sourceUrl.startsWith(PROXY_URL) ? sourceUrl : getProxyUrl(sourceUrl, forceUA);
  universalPlaybackCache2.set(sourceUrl, proxied);
  return proxied;
}
function inferAnimeSeasonNumber2(data = {}, ...sources) {
  const explicit = [data.season_number, data.seasonNumber, data.season?.number, data.season?.season_number].map(Number).find((n) => Number.isInteger(n) && n > 0 && n < 100);
  if (explicit) return String(explicit);
  const text = [
    ...sources,
    data.title_ua,
    data.title_en,
    data.title_ja,
    data.name_ua,
    data.name_en,
    data.slug,
    data.url
  ].filter(Boolean).join(" ");
  const match = String(text).match(/(?:\bseason\s*|\bсезон\s*|\bсезона\s*|\bсезону\s*)(\d{1,2})/i) || String(text).match(/\b(\d{1,2})(?:st|nd|rd|th|-й|-я|-е)?\s*season\b/i) || String(text).match(/\bs(\d{1,2})(?:\b|[-_])/i);
  const number = Number(match?.[1]);
  return Number.isInteger(number) && number > 0 && number < 100 ? String(number) : "1";
}
async function loadMikaiSeasons2(mikaiUrl) {
  if (!mikaiUrl) return { seasons: {}, dubLogos: {}, subtitleLogos: {}, mikaiPosterUrl: "" };
  const html = await fetchMikaiHtml2(mikaiUrl);
  return parseMikaiSeasonsFromHtml2(html);
}
function pickPreferredDub2(seasonData = {}) {
  const dubs = Object.keys(seasonData || {});
  return dubs.find((dub) => /робота голосом/i.test(dub)) || dubs.slice().sort((a, b) => (seasonData[b]?.length || 0) - (seasonData[a]?.length || 0))[0] || "";
}
async function loadHikkaDetail2(animeUrl) {
  const match = String(animeUrl || "").match(/\/anime\/([^\/?#]+)/i);
  const slug = match?.[1] || String(animeUrl || "").split("/").filter(Boolean).pop();
  if (!slug) throw new Error("\u041D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E Hikka slug");
  const res = await hikkaRequest3(`${HIKKA_API}/anime/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`Hikka API: HTTP ${res.status}`);
  const d = await res.json();
  const item = hikkaItem3(d);
  const total = Number(d.episodes_total || d.episodes_released || 0);
  const mikaiUrl = getMikaiUrl2(d);
  const animeOnUrl = getAnimeOnUrl2(d);
  let seasons = {};
  let dubLogos = {};
  let subtitleLogos = {};
  let mikaiPosterUrl = "";
  let mikaiTitle = "";
  if (mikaiUrl) {
    try {
      const mikaiData = await loadMikaiSeasons2(mikaiUrl);
      seasons = mikaiData.seasons || {};
      const sourceSeason = inferAnimeSeasonNumber2(d, mikaiUrl, animeUrl);
      if (sourceSeason !== "1" && seasons["1"]) seasons = { [sourceSeason]: seasons["1"] };
      dubLogos = mikaiData.dubLogos || {};
      subtitleLogos = mikaiData.subtitleLogos || {};
      mikaiPosterUrl = mikaiData.mikaiPosterUrl || "";
      mikaiTitle = mikaiData.mikaiTitle || "";
    } catch (error) {
      console.warn("[Mikai] \u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 ASHDI:", error);
    }
  }
  const mikaiAvailable = Object.keys(seasons).length > 0;
  if (mikaiAvailable && animeOnUrl) {
    try {
      const animeOnData = await loadAnimeOnSeasons2(animeOnUrl);
      if (Object.keys(animeOnData.seasons || {}).length) {
        seasons = animeOnData.seasons;
        dubLogos = animeOnData.dubLogos || dubLogos;
        subtitleLogos = animeOnData.subtitleLogos || subtitleLogos;
      }
    } catch (error) {
      console.warn("[AnimeON] \u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u043C\u0456\u043D\u0438\u0442\u0438 Moon embed:", error);
    }
  } else if (!mikaiAvailable && animeOnUrl) {
    try {
      const animeOnData = await loadAnimeOnSeasons2(animeOnUrl);
      seasons = animeOnData.seasons || {};
      dubLogos = animeOnData.dubLogos || {};
      subtitleLogos = animeOnData.subtitleLogos || {};
    } catch (error) {
      console.warn("[AnimeON] \u0420\u0435\u0437\u0435\u0440\u0432\u043D\u0435 \u0434\u0436\u0435\u0440\u0435\u043B\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0435:", error);
    }
  }
  return {
    ...item,
    title: mikaiTitle || d.title_ua || d.title_en || item.title,
    originalTitle: d.title_en || d.title_ja || "",
    year: d.year || "",
    synopsis: normalizeSynopsisText3(d.synopsis_ua || d.synopsis_en || ""),
    score: d.score || d.native_score || null,
    rating: d.score || d.native_score || null,
    runtimeMinutes: d.duration || 0,
    totalEpisodes: total,
    seasons,
    dubLogos,
    subtitleLogos,
    mikaiUrl,
    mikaiPosterUrl,
    mikaiAvailable,
    animeOnUrl,
    from: mikaiAvailable ? "hikka+mikai+ashdi" : animeOnUrl ? "hikka+animeon" : "hikka",
    externalIds: extractExternalAnimeIds2(d)
  };
}
async function switchProviderSource2(providerName) {
  if (providerName === playerPageCurrentSource) return;
  const prevSource = playerPageCurrentSource;
  setPlayerPageCurrentSource(providerName);
  updateSourceChip();
  buildBottomSheetData();
  if (providerName === "\u041E\u0441\u043D\u043E\u0432\u043D\u0435") {
    playerPageAnime.seasons = playerPageAnimeuaSeasons || {};
    refreshAfterSourceSwitch2();
    showToast("\u0414\u0436\u0435\u0440\u0435\u043B\u043E: \u041E\u0441\u043D\u043E\u0432\u043D\u0435");
    return;
  }
  showToast(`\u0428\u0443\u043A\u0430\u044E \u043E\u0437\u0432\u0443\u0447\u043A\u0438 ${providerName}...`);
  try {
    let sourceData = externalSourceCache[providerName];
    if (!sourceData) {
      const isAshdiProvider = /^(mikai\.me|ashdi)$/i.test(String(providerName || "").trim());
      if (isAshdiProvider) {
        sourceData = await loadMikaiSeasons2(playerPageAnime?.mikaiUrl || getMikaiUrl2(playerPageAnime));
      } else if (/^animeon$/i.test(String(providerName || "").trim())) {
        sourceData = await loadAnimeOnSeasons2(playerPageAnime?.animeOnUrl || getAnimeOnUrl2(playerPageAnime));
      } else throw new Error("\u041D\u0435\u0432\u0456\u0434\u043E\u043C\u0435 \u0434\u0436\u0435\u0440\u0435\u043B\u043E \u0432\u0456\u0434\u0435\u043E");
      externalSourceCache[providerName] = sourceData;
    }
    const mikaiData = sourceData;
    playerPageAnime.seasons = mikaiData.seasons || {};
    playerPageAnime.dubLogos = mikaiData.dubLogos || {};
    playerPageAnime.subtitleLogos = mikaiData.subtitleLogos || {};
    refreshAfterSourceSwitch2();
    showToast(`${providerName}: \u0443\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0435 \u0432\u0456\u0434\u0435\u043E \u0431\u0435\u0437 \u0440\u0435\u043A\u043B\u0430\u043C\u0438`);
  } catch (e) {
    console.warn("[switchProviderSource]", providerName, e);
    showToast(`${providerName}: ${e.message || "\u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E"}`);
    setPlayerPageCurrentSource(prevSource);
    updateSourceChip();
    buildBottomSheetData();
  }
}
function refreshAfterSourceSwitch2() {
  const seasons = Object.keys(playerPageAnime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
  setPlayerPageCurrentSeason(seasons[0] || "1");
  setPlayerPageCurrentDub(pickPreferredDub2(playerPageAnime.seasons[playerPageCurrentSeason]));
  buildSeasonRow(seasons);
  buildEpisodeViews();
  updateFilterChip();
  buildBottomSheetData();
  if (seasons.length === 0) {
    document.getElementById("episodeViewGrid").innerHTML = '<div class="episode-empty"><i class="fas fa-search"></i> \u0421\u0435\u0440\u0456\u0457 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u0456 \u043D\u0430 \u0446\u044C\u043E\u043C\u0443 \u0434\u0436\u0435\u0440\u0435\u043B\u0456.</div>';
  }
}
var CATALOG_POSTER_FALLBACK3, HIKKA_CATALOG_PAGE_SIZE3, mikaiHtmlCache2, ashdiPlaybackCache2, universalPlaybackCache2;
var init_catalog3 = __esm({
  "src/js/services/catalog/catalog.js?v=20260920-canonical-metadata-v1"() {
    init_constants2();
    init_dom();
    init_image();
    init_debug();
    init_pagination();
    init_app_legacy();
    CATALOG_POSTER_FALLBACK3 = "./assets/icons/android-chrome-512x512.png";
    HIKKA_CATALOG_PAGE_SIZE3 = DEFAULT_CATALOG_PAGE_SIZE;
    mikaiHtmlCache2 = /* @__PURE__ */ new Map();
    ashdiPlaybackCache2 = /* @__PURE__ */ new Map();
    universalPlaybackCache2 = /* @__PURE__ */ new Map();
  }
});
