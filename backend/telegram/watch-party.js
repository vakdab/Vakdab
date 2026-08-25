import { validateTelegramInitData } from './music-store.js';

const STATE_KEY = 'watch-party:global:state';
const MAX_MESSAGES = 120;
const MAX_DUBS = 24;
const MAX_CANDIDATES = 4;
const ADMIN_USERNAME = 'vaditx';
const HIKKA_API = 'https://api.hikka.io';
const SITE_BASE_URL = 'https://vakdab.github.io/Vakdab';
const TIME_OPTIONS = ['20:00'];
const MAX_EPISODES = 100;
const DEFAULT_EPISODES = 12;
const FALLBACK_ANIME = [
  { id: 'one-piece', slug: 'one-piece', title: 'One Piece' },
  { id: 'naruto', slug: 'naruto', title: 'Naruto' },
  { id: 'bleach', slug: 'bleach', title: 'Bleach' },
  { id: 'jujutsu-kaisen', slug: 'jujutsu-kaisen', title: 'Jujutsu Kaisen' }
];

function corsHeaders(origin = '') {
  const allowed = new Set(['https://vakdab.github.io', 'https://vakdab.animegran8.workers.dev', 'http://127.0.0.1:4173', 'http://localhost:4173']);
  return { 'Access-Control-Allow-Origin': allowed.has(origin) ? origin : 'https://vakdab.github.io', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
function json(data, status = 200, origin = '') { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(origin) } }); }
function error(message, status = 400, origin = '') { return json({ error: message }, status, origin); }
function kyivDay(date = new Date()) { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); const values = Object.fromEntries(parts.map(part => [part.type, part.value])); return `${values.year}-${values.month}-${values.day}`; }
function kyivNowLabel() { return new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' }).format(new Date()); }
function daySeed(day) { return [...String(day)].reduce((sum, char, index) => (sum * 31 + char.charCodeAt(0) + index) >>> 0, 7); }
function cleanTitle(value) { return String(value || '').replace(/<[^>]+>/g, '').trim().slice(0, 160); }
function catalogUrlFor(item = {}) { const slug = String(item.slug || item.id || item.hikka_id || '').trim(); return /^https?:\/\//i.test(String(item.url || '')) ? String(item.url) : `${HIKKA_API}/anime/${encodeURIComponent(slug)}`; }
function siteUrlFor(catalogUrl) { return `${SITE_BASE_URL}/#anime?url=${encodeURIComponent(catalogUrl)}`; }
function safeEpisodeTotal(value, fallback = DEFAULT_EPISODES) { const total = Number(value); return Number.isInteger(total) && total >= 1 && total <= MAX_EPISODES && total !== 999 ? total : fallback; }
function firstSafeEpisodeTotal(values = [], fallback = DEFAULT_EPISODES) { for (const value of values) { const total = safeEpisodeTotal(value, 0); if (total) return total; } return fallback; }
function normalizeAnime(item = {}) { const slug = String(item.slug || item.id || item.hikka_id || '').trim(); const catalogUrl = catalogUrlFor(item); return { id: String(item.id || item.hikka_id || slug).slice(0, 100), slug: slug.slice(0, 160), title: cleanTitle(item.title_ua || item.title_en || item.title_ja || item.name_ua || item.name_en || item.title || slug || 'Аніме'), posterUrl: String(item.image || item.poster || item.cover || item.cover_url || '').slice(0, 1000), catalogUrl, siteUrl: siteUrlFor(catalogUrl), episodesTotal: firstSafeEpisodeTotal([item.episodes_total, item.episodes_released, item.episodes]), dubs: [] }; }
function sanitizeAnime(anime, candidates = []) { if (!anime || typeof anime !== 'object') return null; const candidate = candidates.find(item => String(item?.id || '') === String(anime.id || '')); return { ...anime, episodesTotal: safeEpisodeTotal(anime.episodesTotal, safeEpisodeTotal(candidate?.episodesTotal)), dubs: Array.isArray(anime.dubs) ? anime.dubs.slice(0, MAX_DUBS) : [] }; }
async function pickDailyCandidates(day) {
  try {
    const response = await fetch(`${HIKKA_API}/anime?page=1&size=40`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ only_translated: true, sort: ['score:desc', 'scored_by:desc'] }) });
    if (response.ok) {
      const data = await response.json();
      const list = Array.isArray(data?.list) ? data.list.filter(item => item && (item.slug || item.id)) : [];
      if (list.length) {
        const seed = daySeed(day);
        const ordered = list.map((item, index) => ({ item, rank: (seed * (index + 17) + String(item.slug || item.id).length * 97) >>> 0 })).sort((a, b) => a.rank - b.rank);
        return ordered.slice(0, MAX_CANDIDATES).map(({ item }) => normalizeAnime(item));
      }
    }
  } catch {}
  return FALLBACK_ANIME.map(normalizeAnime);
}
function blankState() { return { roomId: 'global-anime-live', day: '', status: 'anime_voting', candidates: [], animeVotes: {}, dubVotes: {}, anime: null, selection: null, episode: 1, position: 0, playing: false, startedAt: null, finishedAt: null, updatedAt: Date.now(), messages: [] }; }
async function readState(env) { const raw = await env.MAKIMA_MEMORY?.get(STATE_KEY); if (!raw) return blankState(); try { const parsed = JSON.parse(raw); const candidates = (Array.isArray(parsed.candidates) ? parsed.candidates.slice(0, MAX_CANDIDATES) : []).map(candidate => ({ ...candidate, episodesTotal: safeEpisodeTotal(candidate?.episodesTotal) })); return { ...blankState(), ...parsed, candidates, animeVotes: parsed.animeVotes && typeof parsed.animeVotes === 'object' ? parsed.animeVotes : {}, dubVotes: parsed.dubVotes && typeof parsed.dubVotes === 'object' ? parsed.dubVotes : {}, anime: sanitizeAnime(parsed.anime, candidates), selection: parsed.selection && typeof parsed.selection === 'object' ? parsed.selection : null, messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-MAX_MESSAGES) : [] }; } catch { return blankState(); } }
async function writeState(env, state) { state.updatedAt = Date.now(); await env.MAKIMA_MEMORY.put(STATE_KEY, JSON.stringify(state)); return state; }
async function requireUser(request, env) { return validateTelegramInitData(request.headers.get('X-Telegram-Init-Data') || '', env.TELEGRAM_BOT_TOKEN); }
function isAdmin(user, env) { const configuredId = String(env.WATCH_PARTY_ADMIN_ID || '').trim(); const configuredUsername = String(env.WATCH_PARTY_ADMIN_USERNAME || ADMIN_USERNAME).trim().toLowerCase().replace(/^@+/, ''); return (configuredId && String(user?.id) === configuredId) || String(user?.username || '').trim().toLowerCase() === configuredUsername; }
function userLabel(user) { return [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Глядач'; }
function countValues(values) { const counts = {}; Object.values(values || {}).forEach(value => { if (value !== undefined && value !== '') counts[String(value)] = (counts[String(value)] || 0) + 1; }); return counts; }
function winnerFor(counts, fallback) { const entries = Object.entries(counts || {}).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))); return entries[0]?.[0] ?? fallback; }
function publicState(state, userId = '') { const anime = sanitizeAnime(state.anime, state.candidates); return { roomId: state.roomId, day: state.day, status: state.status, candidates: state.candidates, anime, selection: state.selection, episode: state.episode, position: state.position, playing: state.playing, startedAt: state.startedAt, finishedAt: state.finishedAt, updatedAt: state.updatedAt, messages: state.messages, myAnimeVote: state.animeVotes?.[String(userId)] || '', myDubVote: state.dubVotes?.[String(userId)] || '', candidateCounts: countValues(state.animeVotes), dubCounts: countValues(state.dubVotes), lock: state.status !== 'finished', kyivNow: kyivNowLabel() }; }
async function ensureDaily(state) { const today = kyivDay(); if (!state.day) { state.day = today; state.candidates = await pickDailyCandidates(today); state.status = 'anime_voting'; return true; } const hasNewPool = Array.isArray(state.candidates) && state.candidates.length >= 2; if (!hasNewPool) { if (state.status === 'finished' || !state.anime) { state.day = today; state.candidates = await pickDailyCandidates(today); state.status = 'anime_voting'; state.animeVotes = {}; state.dubVotes = {}; state.anime = null; state.selection = null; state.episode = 1; state.position = 0; state.playing = false; state.startedAt = null; state.finishedAt = null; state.messages = []; return true; } state.candidates = [state.anime]; state.dubVotes = {}; if (state.status !== 'live') state.status = 'dub_voting'; if (!state.selection) state.selection = null; return true; } if (state.day !== today && state.status === 'finished') { state.day = today; state.candidates = await pickDailyCandidates(today); state.status = 'anime_voting'; state.animeVotes = {}; state.dubVotes = {}; state.anime = null; state.selection = null; state.episode = 1; state.position = 0; state.playing = false; state.startedAt = null; state.finishedAt = null; state.messages = []; return true; } return false; }
function normalizeDub(value, anime) { const dub = String(value || '').trim().slice(0, 120); const available = Array.isArray(anime?.dubs) ? anime.dubs : []; return dub && (!available.length || available.includes(dub)) ? dub : ''; }
function normalizeCandidateId(value, candidates) { const id = String(value || '').trim(); return candidates.some(candidate => candidate.id === id) ? id : ''; }

export async function handleWatchPartyRequest(request, env) {
  const url = new URL(request.url); if (!['/watch-party-api', '/watch-party/api'].includes(url.pathname)) return null;
  const origin = request.headers.get('Origin') || ''; if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (!['GET', 'POST'].includes(request.method)) return error('Метод не підтримується', 405, origin);
  try {
    const user = await requireUser(request, env); const admin = isAdmin(user, env); let state = await readState(env); if (await ensureDaily(state)) await writeState(env, state);
    if (request.method === 'GET') return json({ state: publicState(state, user.id), user: { id: String(user.id), name: userLabel(user), username: user.username || '', isAdmin: admin } }, 200, origin);
    const payload = await request.json().catch(() => ({})); const action = String(payload.action || '');
    if (action === 'vote_anime') {
      if (state.status !== 'anime_voting') return error('Голосування за аніме вже завершене', 409, origin);
      const candidateId = normalizeCandidateId(payload.candidateId, state.candidates); if (!candidateId) return error('Обери один із запропонованих тайтлів', 400, origin); state.animeVotes[String(user.id)] = candidateId;
    } else if (action === 'lock_anime') {
      if (!admin) return error('Тільки власник може зафіксувати переможця', 403, origin); if (state.status !== 'anime_voting') return error('Голосування за аніме вже завершене', 409, origin); if (!Object.keys(state.animeVotes).length) return error('Спочатку дочекайся голосів', 400, origin);
      const winnerId = winnerFor(countValues(state.animeVotes), state.candidates[0]?.id); state.anime = { ...(state.candidates.find(candidate => candidate.id === winnerId) || state.candidates[0]), dubs: [] }; state.status = 'dub_voting'; state.dubVotes = {};
    } else if (action === 'catalog_meta') {
      if (!state.anime || state.status !== 'dub_voting') return error('Озвучки можна оновити після вибору аніме', 409, origin);
      const dubs = Array.isArray(payload.dubs) ? [...new Set(payload.dubs.map(value => String(value || '').trim().slice(0, 120)).filter(Boolean))].slice(0, MAX_DUBS) : []; if (dubs.length) state.anime.dubs = dubs;
      const total = Number(payload.episodesTotal); if (Number.isInteger(total) && total >= 1 && total <= MAX_EPISODES && total !== 999) state.anime.episodesTotal = total;
    } else if (action === 'vote_dub') {
      if (state.status !== 'dub_voting') return error('Голосування за озвучку вже завершене', 409, origin); const dub = normalizeDub(payload.dub, state.anime); if (!dub) return error('Обери доступну озвучку', 400, origin); state.dubVotes[String(user.id)] = dub;
    } else if (action === 'start') {
      if (!admin) return error('Тільки власник може запустити ефір', 403, origin); if (state.status !== 'dub_voting') return error('Спочатку зафіксуй аніме та озвучку', 409, origin); const availableDub = state.anime?.dubs?.[0] || 'Озвучка сайту'; state.selection = { time: TIME_OPTIONS[0], dub: winnerFor(countValues(state.dubVotes), availableDub), episodes: 1 }; state.status = 'live'; state.episode = 1; state.position = 0; state.playing = true; state.startedAt = Date.now();
    } else if (action === 'control') {
      if (!admin || state.status !== 'live') return error('Керування доступне власнику під час ефіру', 403, origin); if (typeof payload.playing === 'boolean') state.playing = payload.playing; if (Number.isFinite(Number(payload.position))) state.position = Math.max(0, Number(payload.position));
    } else if (action === 'next_episode') {
      if (!admin || state.status !== 'live') return error('Ефір ще не запущений', 403, origin); if (payload.completed !== true) return error('Наступна серія відкриється після завершення поточної', 409, origin); const total = Math.max(1, Number(state.anime?.episodesTotal || 1)); if (state.episode >= total) { state.status = 'finished'; state.playing = false; state.finishedAt = Date.now(); } else { state.episode += 1; state.position = 0; state.playing = true; }
    } else if (action === 'reset') {
      if (!admin) return error('Тільки власник може скинути кімнату', 403, origin); if (state.status !== 'finished') return error('Новий random заблокований до повного завершення аніме', 409, origin); state = blankState(); await ensureDaily(state);
    } else if (action === 'chat') {
      const text = String(payload.text || '').trim().slice(0, 400); if (!text) return error('Повідомлення порожнє', 400, origin); state.messages = [...state.messages, { id: crypto.randomUUID(), userId: String(user.id), name: userLabel(user), username: user.username || '', text, at: Date.now() }].slice(-MAX_MESSAGES);
    } else return error('Невідома дія', 400, origin);
    await writeState(env, state); return json({ ok: true, state: publicState(state, user.id), user: { id: String(user.id), name: userLabel(user), username: user.username || '', isAdmin: admin } }, 200, origin);
  } catch (err) { const message = String(err?.message || err); return error(message || 'Помилка Watch Party', /Telegram|дані|користувач/i.test(message) ? 401 : 500, origin); }
}

export const WATCH_PARTY_TIME_OPTIONS = TIME_OPTIONS;
export const __watchPartyTest = { kyivDay, daySeed, normalizeAnime, safeEpisodeTotal, firstSafeEpisodeTotal, sanitizeAnime, pickDailyCandidates };
