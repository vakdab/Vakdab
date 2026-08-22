const TMDB_API_KEY = '38fef08bc6a49bdd5a69c336d34a7954';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const tmdbAnimeCache = {};
const tmdbCardFrameCache = new Map();

function cleanTitleForTmdb(title) {
    return String(title || '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/[«»"'`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function tmdbQueryVariants(anime) {
    const values = [anime?.originalTitle, anime?.title];
    try {
        const slug = decodeURIComponent(new URL(anime?.url || '').pathname.split('/').pop() || '')
            .replace(/\.(html?|php)$/i, '').replace(/^\d+[-_]+/, '').replace(/[-_]+/g, ' ');
        values.push(slug);
    } catch { /* URL may be absent on external items */ }
    const variants = [];
    values.filter(Boolean).forEach(value => {
        const clean = cleanTitleForTmdb(value);
        if (!clean) return;
        variants.push(clean);
        variants.push(clean
            .replace(/\b(?:сезон|season|частина|part|cour|tv|серіал)\s*\d+\b/gi, '')
            .replace(/\b\d+\s*(?:сезон|season|частина|part|cour)\b/gi, '')
            .replace(/\s+/g, ' ').trim());
        variants.push(clean.split(/\s+[\/:|]\s+/)[0].trim());
    });
    return [...new Set(variants.filter(v => v.length >= 2))].slice(0, 6);
}

function tmdbImgUrl(path, size = 'w342') {
    return path ? `${TMDB_IMG}/${size}${path}` : null;
}

function tmdbNormalizeTitle(value) {
    return cleanTitleForTmdb(value).toLowerCase()
        .replace(/[^a-zа-яіїєґ0-9\s]/gi, ' ')
        .replace(/\b(season|сезон|part|частина|tv|серіал|anime)\b/gi, ' ')
        .replace(/\s+/g, ' ').trim();
}

function tmdbCardType(hit) {
    if (!hit) return null;
    if (hit.media_type === 'movie') return 'Фільм';
    const isAnimation = (hit.genre_ids || []).includes(16);
    const isJapanese = ['ja', 'ko'].includes((hit.original_language || '').toLowerCase()) ||
        (hit.origin_country || []).some(country => ['JP', 'KR'].includes(country));
    return isAnimation && isJapanese ? 'Аніме' : 'Серіал';
}

function tmdbIsLikelyAnime(hit) {
    if (!hit || !(hit.genre_ids || []).includes(16)) return false;
    const language = (hit.original_language || '').toLowerCase();
    const countries = hit.origin_country || [];
    return ['ja', 'ko', 'zh'].includes(language) || countries.some(country => ['JP', 'KR', 'CN'].includes(country));
}

function tmdbCandidateScore(hit, query, anime = null) {
    const q = tmdbNormalizeTitle(query);
    const candidateNames = [hit?.title, hit?.name, hit?.original_name].filter(Boolean).map(tmdbNormalizeTitle);
    const originalQuery = tmdbNormalizeTitle(anime?.originalTitle || '');
    const title = tmdbNormalizeTitle(hit.title || hit.name || hit.original_name || '');
    if (!q || !title) return -1000;
    let score = 0;
    if (candidateNames.includes(originalQuery) && originalQuery) score += 35;
    if (title === q) score += 140;
    else if (title.includes(q) || q.includes(title)) score += 45;
    const qTokens = new Set(q.split(' ').filter(Boolean));
    const overlap = title.split(' ').filter(token => qTokens.has(token)).length;
    score += overlap * 10;
    if (hit.media_type === 'tv') score += 8;
    if (tmdbIsLikelyAnime(hit)) score += 35;
    if (hit.poster_path) score += 5;
    return score + Math.min(Number(hit.popularity) || 0, 20) * 0.1;
}

async function fetchTmdbCardFrame(tmdbId, mediaType, fallbackPath) {
    const key = `${mediaType}:${tmdbId}`;
    if (tmdbCardFrameCache.has(key)) return tmdbCardFrameCache.get(key);
    let frame = fallbackPath ? tmdbImgUrl(fallbackPath, 'w780') : null;
    if (mediaType === 'tv') {
        try {
            const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}/season/1?api_key=${TMDB_API_KEY}&language=en-US`);
            if (res.ok) {
                const data = await res.json();
                const still = (data.episodes || []).find(ep => ep.still_path)?.still_path;
                if (still) frame = tmdbImgUrl(still, 'w780');
            }
        } catch (error) {
            console.warn('TMDB episode frame failed', { tmdbId, error });
        }
    }
    tmdbCardFrameCache.set(key, frame);
    return frame;
}

export async function fetchTmdbCardInfo(anime) {
    if (!anime || !TMDB_API_KEY) return null;
    const cacheKey = 'card:' + (anime.url || anime.title);
    if (tmdbAnimeCache[cacheKey] !== undefined) return tmdbAnimeCache[cacheKey];
    const queries = tmdbQueryVariants(anime);
    const languages = ['uk-UA', 'en-US'];
    let candidates = [];
    for (const query of queries) {
        for (const language of languages) {
            try {
                const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_API_KEY}&language=${language}&query=${encodeURIComponent(query)}&include_adult=false`);
                if (!res.ok) continue;
                const data = await res.json();
                candidates.push(...(data.results || []).filter(result =>
                    (result.media_type === 'tv' || result.media_type === 'movie') && result.poster_path
                ).map(result => ({ ...result, _query: query })));
            } catch (error) {
                console.error('TMDB card search failed', { query, language, error });
            }
        }
    }
    if (candidates.length) {
        const unique = [...new Map(candidates.map(result => [`${result.media_type}:${result.id}`, result])).values()];
        const preferredType = anime.type === 'movie' ? 'movie' : 'tv';
        const matching = unique
            .filter(item => item.media_type === preferredType && tmdbIsLikelyAnime(item))
            .sort((a, b) => tmdbCandidateScore(b, b._query, anime) - tmdbCandidateScore(a, a._query, anime));
        const hit = matching[0];
        if (hit && tmdbCandidateScore(hit, hit._query, anime) >= 45) {
            const frame = await fetchTmdbCardFrame(hit.id, hit.media_type, hit.backdrop_path);
            const info = {
                poster: tmdbImgUrl(hit.poster_path, 'w500'),
                frame,
                rating: hit.vote_average ? Number(hit.vote_average).toFixed(1) : null,
                type: tmdbCardType(hit),
                mediaType: hit.media_type,
                tmdbId: hit.id
            };
            tmdbAnimeCache[cacheKey] = info;
            return info;
        }
    }
    tmdbAnimeCache[cacheKey] = null;
    return null;
}
