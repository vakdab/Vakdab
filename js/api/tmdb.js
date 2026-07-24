// ===== TMDB API — Аніме через The Movie Database =====
// Використовує Discover API з жанром 16 (Animation) + keywords 210024|287501 (anime)
// Див: https://www.themoviedb.org/talk/628b76ac5cea184d122c137e

import { TMDB_API_KEY, TMDB_BASE, TMDB_IMG } from '../config/api.js';

const GENRE_ANIMATION = 16;
const KEYWORDS_ANIME = '210024|287501';

/**
 * Мапить TMDB TV show → формат картки додатку
 */
function mapTmdbToCard(item) {
    const poster = item.poster_path ? `${TMDB_IMG}w500${item.poster_path}` : '';
    const backdrop = item.backdrop_path ? `${TMDB_IMG}original${item.backdrop_path}` : '';
    const year = item.first_air_date ? parseInt(item.first_air_date.substring(0, 4)) : null;
    return {
        mal_id: `tmdb-${item.id}`,
        title: item.name || item.original_name || 'Без назви',
        url: `tmdb:${item.id}`,
        images: {
            jpg: { large_image_url: poster, image_url: poster },
            backdrop: backdrop
        },
        score: item.vote_average || null,
        year: year,
        overview: item.overview || '',
        from: 'tmdb',
        tmdb_id: item.id
    };
}

/**
 * Мапить повні деталі TMDB → формат деталей додатку
 */
function mapTmdbToDetail(d) {
    const poster = d.poster_path ? `${TMDB_IMG}w500${d.poster_path}` : '';
    const backdrop = d.backdrop_path ? `${TMDB_IMG}original${d.backdrop_path}` : '';
    const genres = (d.genres || []).map(g => g.name);
    const year = d.first_air_date ? parseInt(d.first_air_date.substring(0, 4)) : null;

    // Будуємо seasons структуру для плеєра
    const seasons = {};
    (d.seasons || []).forEach(s => {
        if (s.season_number === 0) return;
        const sn = String(s.season_number);
        seasons[sn] = { 'UA': [] };
        for (let i = 1; i <= s.episode_count; i++) {
            seasons[sn]['UA'].push({
                title: `Епізод ${i}`,
                season: sn,
                episode: String(i),
                file: null,
                dub: 'UA',
                provider: 'TMDB'
            });
        }
    });

    return {
        mal_id: `tmdb-${d.id}`,
        title: d.name || d.original_name || 'Без назви',
        images: {
            jpg: { large_image_url: poster, image_url: poster },
            backdrop: backdrop
        },
        genres,
        year,
        synopsis: d.overview || '',
        seasons,
        url: `tmdb:${d.id}`,
        from: 'tmdb',
        score: d.vote_average ? String(d.vote_average) : null,
        sources: ['TMDB'],
        totalEpisodes: d.number_of_episodes || 0,
        tmdb_id: d.id,
        status: d.status || ''
    };
}

/**
 * Discover аніме — популярне за замовчуванням
 */
export async function fetchTmdbAnime(page = 1, sortBy = 'popularity.desc') {
    const url = `${TMDB_BASE}/discover/tv?api_key=${TMDB_API_KEY}&language=uk-UA&page=${page}` +
        `&with_genres=${GENRE_ANIMATION}&with_keywords=${KEYWORDS_ANIME}` +
        `&include_adult=false&sort_by=${sortBy}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`TMDB HTTP ${resp.status}`);
    const data = await resp.json();
    return (data.results || []).map(mapTmdbToCard);
}

/**
 * Топ рейтингове аніме
 */
export async function fetchTmdbTopAnime(page = 1) {
    return fetchTmdbAnime(page, 'vote_average.desc');
}

/**
 * Пошук аніме через discover з with_text_query
 */
export async function searchTmdbAnime(query, page = 1) {
    const url = `${TMDB_BASE}/discover/tv?api_key=${TMDB_API_KEY}&language=uk-UA&page=${page}` +
        `&with_genres=${GENRE_ANIMATION}&with_keywords=${KEYWORDS_ANIME}` +
        `&with_text_query=${encodeURIComponent(query)}&include_adult=false&sort_by=popularity.desc`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`TMDB HTTP ${resp.status}`);
    const data = await resp.json();
    return (data.results || []).map(mapTmdbToCard);
}

/**
 * Трендове аніме за тиждень — для hero banner
 */
export async function fetchTmdbTrendingAnime() {
    const url = `${TMDB_BASE}/trending/tv/week?api_key=${TMDB_API_KEY}&language=uk-UA`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`TMDB HTTP ${resp.status}`);
    const data = await resp.json();
    const anime = (data.results || []).filter(r => r.genre_ids && r.genre_ids.includes(GENRE_ANIMATION));
    return anime.map(item => {
        const card = mapTmdbToCard(item);
        card.trending = true;
        return card;
    });
}

/**
 * Деталі аніме через TMDB ID
 */
export async function fetchTmdbDetail(tmdbId) {
    const url = `${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=uk-UA&append_to_response=seasons,credits,similar`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`TMDB HTTP ${resp.status}`);
    const data = await resp.json();
    return mapTmdbToDetail(data);
}

/**
 * Перевірка чи картка з TMDB
 */
export function isTmdbCard(card) {
    return card && card.from === 'tmdb';
}

/**
 * Парсить tmdb_id з URL формату tmdb:12345
 */
export function parseTmdbId(url) {
    const m = String(url || '').match(/^tmdb:(\d+)$/);
    return m ? parseInt(m[1]) : null;
}
