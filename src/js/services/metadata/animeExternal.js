const JIKAN_BASE = 'https://api.jikan.moe/v4';
const jikanCache = new Map();

export const JIKAN_STATUS_LABELS = {
    'Currently Airing': 'Онґоїнг', 'Finished Airing': 'Завершено',
    'Not yet aired': 'Майбутнє', 'Discontinued': 'Скасовано', 'On Hiatus': 'Призупинено'
};

export const SEASON_LABELS = { winter: 'Зима', spring: 'Весна', summer: 'Літо', fall: 'Осінь' };

export async function fetchJikan(path) {
    if (jikanCache.has(path)) return jikanCache.get(path);
    const promise = fetch(`${JIKAN_BASE}${path}`, { cache: 'force-cache' }).then(r => {
        if (!r.ok) throw new Error(`Jikan HTTP ${r.status}`);
        return r.json();
    });
    jikanCache.set(path, promise);
    try { return await promise; } catch (e) { jikanCache.delete(path); throw e; }
}

export function normalizeJikanTitle(v) {
    return String(v || '').toLowerCase().replace(/[«»'"`]/g, '')
        .replace(/\b(season|сезон|part|частина|cour|tv|серіал|anime)\s*\d*\b/gi, ' ')
        .replace(/[^a-zа-яіїєґ0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
}

export async function resolveJikanById(malId) {
    const data = (await fetchJikan(`/anime/${malId}/full`)).data;
    if (data) data._provider = 'jikan';
    return data || null;
}

export async function withTimeout(promise, ms, label = 'Запит перевищив час очікування') {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), ms);
    });
    try { return await Promise.race([promise, timeout]); }
    finally { clearTimeout(timer); }
}

export async function resolveJikanByTitle(query) {
    const result = await fetchJikan(`/anime?q=${encodeURIComponent(query)}&limit=5&sfw=true`);
    const target = normalizeJikanTitle(query);
    const candidates = (result.data || []).map(x => {
        const names = [x.title, x.title_english, x.title_japanese, ...(x.title_synonyms || [])].map(normalizeJikanTitle);
        let score = names.includes(target) ? 100 : 0;
        if (names.some(n => n && (n.includes(target) || target.includes(n)))) score += 35;
        if (x.type === 'TV') score += 4;
        return { x, score };
    }).sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (!best || best.score < 35) return null;
    return resolveJikanById(best.x.mal_id);
}

// ====================================================================
//  ANILIST GraphQL
// ====================================================================
const ANILIST_BASE = 'https://graphql.anilist.co';
const anilistCache = new Map();

export const ANILIST_STATUS_LABELS = {
    RELEASING: 'Онґоїнг', FINISHED: 'Завершено', NOT_YET_RELEASED: 'Майбутнє',
    CANCELLED: 'Скасовано', HIATUS: 'Призупинено'
};
export const ANILIST_RELATION_LABELS = {
    PREQUEL: 'попередній сезон', SEQUEL: 'наступний сезон', SIDE_STORY: 'спін-оф',
    SPIN_OFF: 'спін-оф', ALTERNATIVE: "альтернативна версія", SUMMARY: 'короткий переказ',
    ADAPTATION: 'адаптація', PARENT: 'пов’язаний твір', CHARACTER: 'пов’язаний твір',
    FULL_STORY: 'повна історія', OTHER: 'пов’язаний твір'
};
export const ANILIST_FORMAT_LABELS = { TV: 'TV Серіал', TV_SHORT: 'TV Серіал', MOVIE: 'Фільм', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Спешл', MUSIC: 'Музика' };

export const ANILIST_SEARCH_QUERY = `query ($search: String) { Page(perPage: 5) { media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
    id title { romaji english native } format status season seasonYear episodes duration averageScore genres siteUrl
    studios(isMain: true) { nodes { name } }
    nextAiringEpisode { airingAt episode }
    characters(sort: ROLE, perPage: 10) { edges { role node { name { full native } image { large } } voiceActors(language: JAPANESE) { name { full } image { large } } } } }
} }`;

export async function fetchAnilist(query, variables) {
    const key = JSON.stringify({ query, variables });
    if (anilistCache.has(key)) return anilistCache.get(key);
    const promise = fetch(ANILIST_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query, variables })
    }).then(r => { if (!r.ok) throw new Error(`AniList HTTP ${r.status}`); return r.json(); });
    anilistCache.set(key, promise);
    try { return await promise; } catch (e) { anilistCache.delete(key); throw e; }
}

export function normalizeAnilistTitle(v) { return normalizeJikanTitle(v); }

export async function fetchAnilistRelations(anilistId) {
    const query = `query ($id: Int) { Media(id: $id) { relations { edges { relationType(version: 2) node {
        id type title { romaji english } format startDate { year } coverImage { large } siteUrl } } } } }`;
    const res = await fetchAnilist(query, { id: anilistId });
    return res?.data?.Media?.relations?.edges || [];
}

export function adaptAnilistMedia(media) {
    const studios = (media.studios?.nodes || []).map(n => ({ name: n.name }));
    const characters = (media.characters?.edges || []).map(e => ({
        character: { name: e.node?.name?.full, name_kanji: e.node?.name?.native, images: { webp: { image_url: e.node?.image?.large } } },
        role: e.role === 'MAIN' ? 'Головна роль' : 'Другорядна роль',
        voice_actors: e.voiceActors?.length ? [{ language: 'Japanese', person: { name: e.voiceActors[0].name.full, images: { webp: { image_url: e.voiceActors[0].image?.large } } } }] : []
    }));
    const seasonMap = { WINTER: 'winter', SPRING: 'spring', SUMMER: 'summer', FALL: 'fall' };
    return {
        _provider: 'anilist', _anilistId: media.id,
        title: media.title?.romaji || media.title?.english, url: media.siteUrl,
        type: media.format === 'MOVIE' ? 'Movie' : 'TV',
        status: media.status, _statusLabel: ANILIST_STATUS_LABELS[media.status] || null,
        season: seasonMap[media.season] || null, year: media.seasonYear,
        episodes: media.episodes, duration: media.duration, _durationMinutes: media.duration,
        airing: media.status === 'RELEASING',
        _nextAiringDate: media.nextAiringEpisode ? new Date(media.nextAiringEpisode.airingAt * 1000) : null,
        _nextEpisode: media.nextAiringEpisode?.episode || null,
        rating: media.averageScore ? `AniList ${(media.averageScore / 10).toFixed(1)}` : null,
        genres: media.genres || [], studios, characters
    };
}

export async function resolveAnilistByTitle(query) {
    const res = await fetchAnilist(ANILIST_SEARCH_QUERY, { search: query });
    const list = res?.data?.Page?.media || [];
    const target = normalizeAnilistTitle(query);
    const candidates = list.map(m => {
        const names = [m.title?.romaji, m.title?.english, m.title?.native].map(normalizeAnilistTitle);
        let score = names.includes(target) ? 100 : 0;
        if (names.some(n => n && (n.includes(target) || target.includes(n)))) score += 35;
        if (m.format === 'TV') score += 4;
        return { m, score };
    }).sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (!best || best.score < 35) return null;
    return adaptAnilistMedia(best.m);
}

export function hasCharacterData(data) {
    return Array.isArray(data?.characters) && data.characters.some(x => x?.character?.name);
}

export async function resolveJikanAnime(anime) {
    const stableMalId = Number(anime?.externalIds?.mal_id);
    const stableAnilistId = Number(anime?.externalIds?.anilist_id);
    let jikanFallback = null;
    if (stableMalId) {
        try {
            const byId = await withTimeout(resolveJikanById(stableMalId), 5000, 'Jikan ID запит перевищив час очікування');
            if (byId && hasCharacterData(byId)) return byId;
            if (byId) jikanFallback = byId;
        } catch (e) { console.warn('Jikan ID lookup failed, trying other sources:', e); }
    }
    if (stableAnilistId) {
        try {
            const query = `query ($id: Int) { Media(id: $id, type: ANIME) {
                id title { romaji english native } format status season seasonYear episodes duration averageScore genres siteUrl
                studios(isMain: true) { nodes { name } } nextAiringEpisode { airingAt episode }
                characters(sort: ROLE, perPage: 10) { edges { role node { name { full native } image { large } } voiceActors(language: JAPANESE) { name { full } image { large } } } } } }`;
            const res = await withTimeout(fetchAnilist(query, { id: stableAnilistId }), 8000, 'AniList ID запит перевищив час очікування');
            if (res?.data?.Media) return adaptAnilistMedia(res.data.Media);
        } catch (e) { console.warn('AniList ID lookup failed, trying title fallback:', e); }
    }
    const query = anime?.originalTitle || anime?.title;
    if (!query) return jikanFallback;
    try {
        const anilistMatch = await withTimeout(resolveAnilistByTitle(query), 8000, 'AniList пошук перевищив час очікування');
        if (anilistMatch) return anilistMatch;
    } catch (e) { console.warn('AniList title search unavailable:', e); }
    try {
        const byTitle = await withTimeout(resolveJikanByTitle(query), 5000, 'Jikan пошук перевищив час очікування');
        if (byTitle && hasCharacterData(byTitle)) return byTitle;
        if (byTitle && !jikanFallback) jikanFallback = byTitle;
    } catch (e) { console.warn('Jikan title search unavailable:', e); }
    return jikanFallback;
}

export function jikanImage(item) {
    return item?.images?.webp?.image_url || item?.images?.jpg?.image_url || '';
}
