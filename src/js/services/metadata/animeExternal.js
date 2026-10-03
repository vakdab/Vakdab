async function fetchJikan(path) {
  if (jikanCache.has(path)) return jikanCache.get(path);
  const promise = fetch(`${JIKAN_BASE}${path}`, { cache: "force-cache" }).then((r) => {
    if (!r.ok) throw new Error(`Jikan HTTP ${r.status}`);
    return r.json();
  });
  jikanCache.set(path, promise);
  try {
    return await promise;
  } catch (e) {
    jikanCache.delete(path);
    throw e;
  }
}
function normalizeJikanTitle(v) {
  return String(v || "").toLowerCase().replace(/[«»'"`]/g, "").replace(/\b(season|сезон|part|частина|cour|tv|серіал|anime)\s*\d*\b/gi, " ").replace(/[^a-zа-яіїєґ0-9]+/gi, " ").replace(/\s+/g, " ").trim();
}
async function resolveJikanById(malId) {
  const data = (await fetchJikan(`/anime/${malId}/full`)).data;
  if (data) data._provider = "jikan";
  return data || null;
}
async function withTimeout(promise, ms, label = "\u0417\u0430\u043F\u0438\u0442 \u043F\u0435\u0440\u0435\u0432\u0438\u0449\u0438\u0432 \u0447\u0430\u0441 \u043E\u0447\u0456\u043A\u0443\u0432\u0430\u043D\u043D\u044F") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
async function resolveJikanByTitle(query2) {
  const result = await fetchJikan(`/anime?q=${encodeURIComponent(query2)}&limit=5&sfw=true`);
  const target = normalizeJikanTitle(query2);
  const candidates = (result.data || []).map((x) => {
    const names = [x.title, x.title_english, x.title_japanese, ...x.title_synonyms || []].map(normalizeJikanTitle);
    let score = names.includes(target) ? 100 : 0;
    if (names.some((n) => n && (n.includes(target) || target.includes(n)))) score += 35;
    if (x.type === "TV") score += 4;
    return { x, score };
  }).sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best || best.score < 35) return null;
  return resolveJikanById(best.x.mal_id);
}
async function fetchAnilist(query2, variables) {
  const key = JSON.stringify({ query: query2, variables });
  if (anilistCache.has(key)) return anilistCache.get(key);
  const promise = fetch(ANILIST_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ query: query2, variables })
  }).then((r) => {
    if (!r.ok) throw new Error(`AniList HTTP ${r.status}`);
    return r.json();
  });
  anilistCache.set(key, promise);
  try {
    return await promise;
  } catch (e) {
    anilistCache.delete(key);
    throw e;
  }
}
function normalizeAnilistTitle(v) {
  return normalizeJikanTitle(v);
}
async function fetchAnilistRelations(anilistId) {
  const query2 = `query ($id: Int) { Media(id: $id) { relations { edges { relationType(version: 2) node {
        id type title { romaji english native } format startDate { year } coverImage { large } siteUrl } } } } }`;
  const res = await fetchAnilist(query2, { id: anilistId });
  return res?.data?.Media?.relations?.edges || [];
}
async function fetchAnimeRelations(anime, existingData = null) {
  const malId = Number(anime?.externalIds?.mal_id || anime?.mal_id || existingData?.mal_id);
  const title = anime?.originalTitle || anime?.title_orig || anime?.title_en || anime?.title || existingData?.title || "";
  const normalizeRelationTitle = (value) => String(value || "").toLocaleLowerCase().replace(/[^a-z0-9а-яіїєґ]+/gi, " ").replace(/\s+/g, " ").trim();
  const wantedTitle = normalizeRelationTitle(title);
  try {
    let shikimoriId = malId;
    if (!shikimoriId && title) {
      const searchRes = await withTimeout(
        fetch(`https://shikimori.one/api/animes?search=${encodeURIComponent(title)}&limit=5`),
        3500,
        "Shikimori search timeout"
      );
      if (searchRes?.ok) {
        const searchList = await searchRes.json();
        if (Array.isArray(searchList) && searchList.length > 0) {
          const exact = searchList.find((item) => [item.name, item.russian, item.english, item.japanese].map(normalizeRelationTitle).some((candidate) => candidate && (candidate === wantedTitle || candidate.includes(wantedTitle) || wantedTitle.includes(candidate))));
          shikimoriId = exact?.id || 0;
        }
      }
    }
    if (shikimoriId) {
      const relRes = await withTimeout(
        fetch(`https://shikimori.one/api/animes/${shikimoriId}/related`),
        4e3,
        "Shikimori relations timeout"
      );
      if (relRes?.ok) {
        const relData = await relRes.json();
        if (Array.isArray(relData) && relData.length > 0) {
          const animeRels = relData.filter((item) => item.anime && item.anime.kind && !["manga", "light_novel", "novel", "manhwa", "manhua", "one_shot", "doujin"].includes(item.anime.kind.toLowerCase()));
          if (animeRels.length > 0) {
            return animeRels.map((item) => {
              const a = item.anime;
              const imgPath = a.image?.original || a.image?.preview || "";
              const fullImg = imgPath ? imgPath.startsWith("http") ? imgPath : `https://shikimori.one${imgPath}` : "";
              return {
                title: a.russian || a.name,
                titleEn: a.name || a.russian,
                image: fullImg,
                year: a.aired_on ? a.aired_on.slice(0, 4) : "",
                typeLabel: a.kind ? a.kind.toUpperCase() : "TV",
                relationLabel: item.relation_russian || item.relation || ""
              };
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn("Shikimori relations lookup fallback:", e?.message || e);
  }
  try {
    const stableAnilistId = Number(anime?.externalIds?.anilist_id || existingData?._anilistId);
    let anilistEdges = [];
    if (stableAnilistId) {
      anilistEdges = await withTimeout(fetchAnilistRelations(stableAnilistId), 4e3, "AniList relations timeout");
    } else if (title) {
      const query2 = `query ($search: String) { Media(search: $search, type: ANIME) { relations { edges { relationType(version: 2) node { id type title { romaji english native } format startDate { year } coverImage { large } siteUrl } } } } }`;
      const res = await withTimeout(fetchAnilist(query2, { search: title }), 4e3, "AniList search relations timeout");
      anilistEdges = res?.data?.Media?.relations?.edges || [];
    }
    const filtered = (anilistEdges || []).filter((e) => e.node?.type === "ANIME");
    if (filtered.length > 0) {
      const unique = [...new Map(filtered.map((e) => [e.node.id, e])).values()];
      return unique.map((e) => ({
        url: e.node.siteUrl,
        image: e.node.coverImage?.large,
        title: e.node.title?.english || e.node.title?.romaji || e.node.title?.native,
        titleEn: e.node.title?.romaji || e.node.title?.english,
        year: e.node.startDate?.year ? String(e.node.startDate.year) : "",
        typeLabel: ANILIST_FORMAT_LABELS[e.node.format] || e.node.format,
        relationLabel: ANILIST_RELATION_LABELS[e.relationType] || e.relationType || null
      }));
    }
  } catch (e) {
    console.warn("AniList relations lookup fallback:", e?.message || e);
  }
  return [];
}
function adaptAnilistMedia(media) {
  const studios = (media.studios?.nodes || []).map((n) => ({ name: n.name }));
  const characters = (media.characters?.edges || []).map((e) => ({
    character: { name: e.node?.name?.full, name_kanji: e.node?.name?.native, images: { webp: { image_url: e.node?.image?.large } } },
    role: e.role === "MAIN" ? "\u0413\u043E\u043B\u043E\u0432\u043D\u0430 \u0440\u043E\u043B\u044C" : "\u0414\u0440\u0443\u0433\u043E\u0440\u044F\u0434\u043D\u0430 \u0440\u043E\u043B\u044C",
    voice_actors: e.voiceActors?.length ? [{ language: "Japanese", person: { name: e.voiceActors[0].name.full, images: { webp: { image_url: e.voiceActors[0].image?.large } } } }] : []
  }));
  const seasonMap = { WINTER: "winter", SPRING: "spring", SUMMER: "summer", FALL: "fall" };
  return {
    _provider: "anilist",
    _anilistId: media.id,
    title: media.title?.romaji || media.title?.english,
    url: media.siteUrl,
    type: media.format === "MOVIE" ? "Movie" : "TV",
    status: media.status,
    _statusLabel: ANILIST_STATUS_LABELS[media.status] || null,
    season: seasonMap[media.season] || null,
    year: media.seasonYear,
    episodes: media.episodes,
    duration: media.duration,
    _durationMinutes: media.duration,
    airing: media.status === "RELEASING",
    bannerImage: media.bannerImage || null,
    _nextAiringDate: media.nextAiringEpisode ? new Date(media.nextAiringEpisode.airingAt * 1e3) : null,
    _nextEpisode: media.nextAiringEpisode?.episode || null,
    rating: media.averageScore ? `AniList ${(media.averageScore / 10).toFixed(1)}` : null,
    genres: media.genres || [],
    studios,
    characters
  };
}
async function resolveAnilistByTitle(query2) {
  const res = await fetchAnilist(ANILIST_SEARCH_QUERY, { search: query2 });
  const list = res?.data?.Page?.media || [];
  const target = normalizeAnilistTitle(query2);
  const candidates = list.map((m) => {
    const names = [m.title?.romaji, m.title?.english, m.title?.native].map(normalizeAnilistTitle);
    let score = names.includes(target) ? 100 : 0;
    if (names.some((n) => n && (n.includes(target) || target.includes(n)))) score += 35;
    if (m.format === "TV") score += 4;
    return { m, score };
  }).sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best || best.score < 35) return null;
  return adaptAnilistMedia(best.m);
}
function hasCharacterData(data) {
  return Array.isArray(data?.characters) && data.characters.some((x) => x?.character?.name);
}
function adaptHikkaMetadata(anime = {}) {
  const type = anime.type === "movie" ? "Movie" : anime.type === "ova" ? "ONA" : "TV";
  const statusMap = {
    ongoing: "\u041E\u043D\u0491\u043E\u0457\u043D\u0433",
    airing: "\u041E\u043D\u0491\u043E\u0457\u043D\u0433",
    finished: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E",
    completed: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E",
    upcoming: "\u041C\u0430\u0439\u0431\u0443\u0442\u043D\u0454",
    planned: "\u041C\u0430\u0439\u0431\u0443\u0442\u043D\u0454",
    hiatus: "\u041F\u0440\u0438\u0437\u0443\u043F\u0438\u043D\u0435\u043D\u043E",
    cancelled: "\u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E"
  };
  const studios = (Array.isArray(anime.studios) ? anime.studios : anime.studio ? [anime.studio] : []).map((value) => typeof value === "object" ? value?.name_ua || value?.name_en || value?.name : value).filter(Boolean).map((name) => ({ name: String(name) }));
  return {
    _provider: "hikka-fallback",
    title: anime.title || anime.originalTitle || "",
    type,
    status: anime.status || "",
    _statusLabel: statusMap[String(anime.status || "").toLowerCase()] || anime.status || "\u2014",
    season: anime.season || null,
    year: anime.year || "",
    episodes: anime.episodes_released || anime.episodes || null,
    duration: anime.duration || anime.runtimeMinutes || null,
    rating: anime.score || anime.rating || null,
    genres: anime.genres || [],
    studios,
    characters: []
  };
}
async function resolveJikanAnime(anime) {
  const stableMalId = Number(anime?.externalIds?.mal_id);
  const stableAnilistId = Number(anime?.externalIds?.anilist_id);
  let jikanFallback = null;
  if (stableMalId) {
    try {
      const byId = await withTimeout(resolveJikanById(stableMalId), 5e3, "Jikan ID \u0437\u0430\u043F\u0438\u0442 \u043F\u0435\u0440\u0435\u0432\u0438\u0449\u0438\u0432 \u0447\u0430\u0441 \u043E\u0447\u0456\u043A\u0443\u0432\u0430\u043D\u043D\u044F");
      if (byId && hasCharacterData(byId)) return byId;
      if (byId) jikanFallback = byId;
    } catch (e) {
      console.warn("Jikan ID lookup failed, trying other sources:", e);
    }
  }
  if (stableAnilistId) {
    try {
      const query3 = `query ($id: Int) { Media(id: $id, type: ANIME) {
                id title { romaji english native } format status season seasonYear episodes duration averageScore genres siteUrl
                studios(isMain: true) { nodes { name } } nextAiringEpisode { airingAt episode }
                characters(sort: ROLE, perPage: 10) { edges { role node { name { full native } image { large } } voiceActors(language: JAPANESE) { name { full } image { large } } } } } }`;
      const res = await withTimeout(fetchAnilist(query3, { id: stableAnilistId }), 8e3, "AniList ID \u0437\u0430\u043F\u0438\u0442 \u043F\u0435\u0440\u0435\u0432\u0438\u0449\u0438\u0432 \u0447\u0430\u0441 \u043E\u0447\u0456\u043A\u0443\u0432\u0430\u043D\u043D\u044F");
      if (res?.data?.Media) return adaptAnilistMedia(res.data.Media);
    } catch (e) {
      console.warn("AniList ID lookup failed, trying title fallback:", e);
    }
  }
  const query2 = anime?.originalTitle || anime?.title;
  if (!query2) return jikanFallback || adaptHikkaMetadata(anime);
  try {
    const anilistMatch = await withTimeout(resolveAnilistByTitle(query2), 8e3, "AniList \u043F\u043E\u0448\u0443\u043A \u043F\u0435\u0440\u0435\u0432\u0438\u0449\u0438\u0432 \u0447\u0430\u0441 \u043E\u0447\u0456\u043A\u0443\u0432\u0430\u043D\u043D\u044F");
    if (anilistMatch) return anilistMatch;
  } catch (e) {
    console.warn("AniList title search unavailable:", e);
  }
  try {
    const byTitle = await withTimeout(resolveJikanByTitle(query2), 5e3, "Jikan \u043F\u043E\u0448\u0443\u043A \u043F\u0435\u0440\u0435\u0432\u0438\u0449\u0438\u0432 \u0447\u0430\u0441 \u043E\u0447\u0456\u043A\u0443\u0432\u0430\u043D\u043D\u044F");
    if (byTitle && hasCharacterData(byTitle)) return byTitle;
    if (byTitle && !jikanFallback) jikanFallback = byTitle;
  } catch (e) {
    console.warn("Jikan title search unavailable:", e);
  }
  return jikanFallback || adaptHikkaMetadata(anime);
}
function jikanImage(item) {
  return item?.images?.webp?.image_url || item?.images?.jpg?.image_url || "";
}
async function resolveAnimeVideoFrame(anime, episodeNum = null) {
  const key = anime?.url || anime?.id || anime?.title || "";
  const numericEp = episodeNum != null ? parseInt(episodeNum, 10) : null;
  const epKey = key && numericEp ? `${key}_ep_${numericEp}` : key;
  if (epKey && videoFramesCache.has(epKey)) {
    const cached = videoFramesCache.get(epKey);
    if (cached) return cached;
  }
  let malId = Number(anime?.externalIds?.mal_id || anime?.mal_id);
  const searchTitle = anime?.title_orig || anime?.title_en || anime?.title || "";
  let cachedData = key ? animeScreenshotsDataCache.get(key) : null;
  if (!cachedData) {
    cachedData = {
      shikimoriScreenshots: [],
      kitsuEpisodeThumbs: /* @__PURE__ */ new Map(),
      kitsuGenericThumbs: [],
      jikanTrailer: null,
      anilistBanner: null,
      defaultBanner: anime?.bannerUrl || anime?.backdropUrl || anime?.headerImage || ""
    };
    try {
      let shikimoriId = malId;
      if (!shikimoriId && searchTitle) {
        const searchRes = await withTimeout(
          fetch(`https://shikimori.one/api/animes?search=${encodeURIComponent(searchTitle)}&limit=3`, {
            headers: { "User-Agent": "VakDab/1.0" }
          }),
          3500,
          "Shikimori search timeout"
        );
        if (searchRes?.ok) {
          const searchList = await searchRes.json();
          if (Array.isArray(searchList) && searchList.length > 0) {
            shikimoriId = searchList[0].id;
          }
        }
      }
      if (shikimoriId) {
        const res = await withTimeout(
          fetch(`https://shikimori.one/api/animes/${shikimoriId}/screenshots`, {
            headers: { "User-Agent": "VakDab/1.0" }
          }),
          4e3,
          "Shikimori screenshots timeout"
        );
        if (res?.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            cachedData.shikimoriScreenshots = list.map((pick) => {
              const path = pick.original || pick.preview;
              return path ? path.startsWith("http") ? path : `https://shikimori.one${path}` : null;
            }).filter(Boolean);
          }
        }
      }
    } catch (e) {
      console.warn("Shikimori screenshots lookup skipped:", e?.message || e);
    }
    if (searchTitle) {
      try {
        const kitsuRes = await withTimeout(
          fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(searchTitle)}&include=episodes&page[limit]=1`),
          3500,
          "Kitsu episode frames timeout"
        );
        if (kitsuRes?.ok) {
          const kitsuData = await kitsuRes.json();
          const epNodes = (kitsuData.included || []).filter((item) => item.type === "episodes");
          epNodes.forEach((ep) => {
            const num = parseInt(ep.attributes?.number, 10);
            const thumb = ep.attributes?.thumbnail?.original || ep.attributes?.thumbnail?.large || ep.attributes?.thumbnail?.medium;
            if (num && thumb) {
              cachedData.kitsuEpisodeThumbs.set(num, thumb);
            }
            if (thumb) {
              cachedData.kitsuGenericThumbs.push(thumb);
            }
          });
        }
      } catch (e) {
        console.warn("Kitsu episode frames skipped:", e?.message || e);
      }
    }
    try {
      let jikanData = null;
      if (malId) {
        jikanData = await withTimeout(resolveJikanById(malId), 3500, "Jikan ID lookup timeout");
      } else if (searchTitle) {
        jikanData = await withTimeout(resolveJikanByTitle(searchTitle), 3500, "Jikan title lookup timeout");
      }
      cachedData.jikanTrailer = jikanData?.trailer?.images?.maximum_image_url || jikanData?.trailer?.images?.large_image_url || (jikanData?.trailer?.youtube_id ? `https://img.youtube.com/vi/${jikanData.trailer.youtube_id}/maxresdefault.jpg` : null);
    } catch (e) {
      console.warn("Jikan trailer frame lookup skipped:", e?.message || e);
    }
    const stableAnilistId = Number(anime?.externalIds?.anilist_id);
    if (stableAnilistId) {
      try {
        const query2 = `query ($id: Int) { Media(id: $id, type: ANIME) { bannerImage } }`;
        const res = await withTimeout(fetchAnilist(query2, { id: stableAnilistId }), 3500, "AniList banner timeout");
        cachedData.anilistBanner = res?.data?.Media?.bannerImage || null;
      } catch (e) {
        console.warn("AniList banner lookup skipped:", e?.message || e);
      }
    }
    if (key) {
      animeScreenshotsDataCache.set(key, cachedData);
    }
  }
  let selectedFrame = null;
  if (numericEp && cachedData.kitsuEpisodeThumbs.has(numericEp)) {
    selectedFrame = cachedData.kitsuEpisodeThumbs.get(numericEp);
  }
  if (!selectedFrame && cachedData.shikimoriScreenshots.length > 0) {
    if (numericEp && Number.isFinite(numericEp)) {
      const idx = Math.max(0, (numericEp - 1) % cachedData.shikimoriScreenshots.length);
      selectedFrame = cachedData.shikimoriScreenshots[idx];
    } else {
      selectedFrame = cachedData.shikimoriScreenshots[0];
    }
  }
  if (!selectedFrame && cachedData.kitsuGenericThumbs.length > 0) {
    if (numericEp && Number.isFinite(numericEp)) {
      const idx = Math.max(0, (numericEp - 1) % cachedData.kitsuGenericThumbs.length);
      selectedFrame = cachedData.kitsuGenericThumbs[idx];
    } else {
      selectedFrame = cachedData.kitsuGenericThumbs[0];
    }
  }
  if (!selectedFrame && cachedData.jikanTrailer) {
    selectedFrame = cachedData.jikanTrailer;
  }
  if (!selectedFrame && cachedData.anilistBanner) {
    selectedFrame = cachedData.anilistBanner;
  }
  if (!selectedFrame && cachedData.defaultBanner) {
    selectedFrame = cachedData.defaultBanner;
  }
  if (!selectedFrame) {
    selectedFrame = anime?.mikaiPosterUrl || anime?.images?.jpg?.large_image_url || anime?.posterUrl || "";
  }
  if (selectedFrame && epKey) {
    videoFramesCache.set(epKey, selectedFrame);
  }
  return selectedFrame || null;
}
var JIKAN_BASE, jikanCache, JIKAN_STATUS_LABELS, SEASON_LABELS, ANILIST_BASE, anilistCache, ANILIST_STATUS_LABELS, ANILIST_RELATION_LABELS, ANILIST_FORMAT_LABELS, ANILIST_SEARCH_QUERY, videoFramesCache, animeScreenshotsDataCache;
var init_animeExternal = __esm({
  "src/js/services/metadata/animeExternal.js?v=20260920-hikka-fallback-v1"() {
    JIKAN_BASE = "https://api.jikan.moe/v4";
    jikanCache = /* @__PURE__ */ new Map();
    JIKAN_STATUS_LABELS = {
      "Currently Airing": "\u041E\u043D\u0491\u043E\u0457\u043D\u0433",
      "Finished Airing": "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E",
      "Not yet aired": "\u041C\u0430\u0439\u0431\u0443\u0442\u043D\u0454",
      "Discontinued": "\u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E",
      "On Hiatus": "\u041F\u0440\u0438\u0437\u0443\u043F\u0438\u043D\u0435\u043D\u043E"
    };
    SEASON_LABELS = { winter: "\u0417\u0438\u043C\u0430", spring: "\u0412\u0435\u0441\u043D\u0430", summer: "\u041B\u0456\u0442\u043E", fall: "\u041E\u0441\u0456\u043D\u044C" };
    ANILIST_BASE = "https://graphql.anilist.co";
    anilistCache = /* @__PURE__ */ new Map();
    ANILIST_STATUS_LABELS = {
      RELEASING: "\u041E\u043D\u0491\u043E\u0457\u043D\u0433",
      FINISHED: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E",
      NOT_YET_RELEASED: "\u041C\u0430\u0439\u0431\u0443\u0442\u043D\u0454",
      CANCELLED: "\u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E",
      HIATUS: "\u041F\u0440\u0438\u0437\u0443\u043F\u0438\u043D\u0435\u043D\u043E"
    };
    ANILIST_RELATION_LABELS = {
      PREQUEL: "\u043F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u0441\u0435\u0437\u043E\u043D",
      SEQUEL: "\u043D\u0430\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u0441\u0435\u0437\u043E\u043D",
      SIDE_STORY: "\u0441\u043F\u0456\u043D-\u043E\u0444",
      SPIN_OFF: "\u0441\u043F\u0456\u043D-\u043E\u0444",
      ALTERNATIVE: "\u0430\u043B\u044C\u0442\u0435\u0440\u043D\u0430\u0442\u0438\u0432\u043D\u0430 \u0432\u0435\u0440\u0441\u0456\u044F",
      SUMMARY: "\u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u043F\u0435\u0440\u0435\u043A\u0430\u0437",
      ADAPTATION: "\u0430\u0434\u0430\u043F\u0442\u0430\u0446\u0456\u044F",
      PARENT: "\u043F\u043E\u0432\u2019\u044F\u0437\u0430\u043D\u0438\u0439 \u0442\u0432\u0456\u0440",
      CHARACTER: "\u043F\u043E\u0432\u2019\u044F\u0437\u0430\u043D\u0438\u0439 \u0442\u0432\u0456\u0440",
      FULL_STORY: "\u043F\u043E\u0432\u043D\u0430 \u0456\u0441\u0442\u043E\u0440\u0456\u044F",
      OTHER: "\u043F\u043E\u0432\u2019\u044F\u0437\u0430\u043D\u0438\u0439 \u0442\u0432\u0456\u0440"
    };
    ANILIST_FORMAT_LABELS = { TV: "TV \u0421\u0435\u0440\u0456\u0430\u043B", TV_SHORT: "TV \u0421\u0435\u0440\u0456\u0430\u043B", MOVIE: "\u0424\u0456\u043B\u044C\u043C", OVA: "OVA", ONA: "ONA", SPECIAL: "\u0421\u043F\u0435\u0448\u043B", MUSIC: "\u041C\u0443\u0437\u0438\u043A\u0430" };
    ANILIST_SEARCH_QUERY = `query ($search: String) { Page(perPage: 5) { media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
    id title { romaji english native } format status season seasonYear episodes duration averageScore genres siteUrl
    studios(isMain: true) { nodes { name } }
    nextAiringEpisode { airingAt episode }
    characters(sort: ROLE, perPage: 10) { edges { role node { name { full native } image { large } } voiceActors(language: JAPANESE) { name { full } image { large } } } } }
} }`;
    videoFramesCache = /* @__PURE__ */ new Map();
    animeScreenshotsDataCache = /* @__PURE__ */ new Map();
  }
});
