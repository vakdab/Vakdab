import { validateTelegramInitData } from './music-store.js';

const STATE_KEY = 'watch-party:global:state';
const MAX_MESSAGES = 120;
const MAX_DUBS = 24;
const ADMIN_USERNAME = 'vaditx';
const HIKKA_API = 'https://api.hikka.io';
const HIKKA_PROXY = 'https://vakdab-hikka-proxy.animegran8.workers.dev';
const SITE_BASE_URL = 'https://vakdab.github.io/VakDab';
const TIME_OPTIONS = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '21:00', '22:00'];
const FALLBACK_ANIME = [
  { slug: 'one-piece', title: 'One Piece' },
  { slug: 'naruto', title: 'Naruto' },
  { slug: 'bleach', title: 'Bleach' },
  { slug: 'jujutsu-kaisen', title: 'Jujutsu Kaisen' }
];

function corsHeaders(origin = '') {
  const allowed = new Set(['https://vakdab.github.io', 'https://vakdab.animegran8.workers.dev', 'http://127.0.0.1:4173', 'http://localhost:4173']);
  return {
    'Access-Control-Allow-Origin': allowed.has(origin) ? origin : 'https://vakdab.github.io',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(origin) } });
}
function error(message, status = 400, origin = '') { return json({ error: message }, status, origin); }
function kyivDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function kyivNowLabel() { return new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' }).format(new Date()); }
function kyivMinutes() { const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()); const values = Object.fromEntries(parts.map(part => [part.type, part.value])); return Number(values.hour) * 60 + Number(values.minute); }
function daySeed(day) { return [...String(day)].reduce((sum, char, index) => (sum * 31 + char.charCodeAt(0) + index) >>> 0, 7); }
function siteUrlFor(catalogUrl) { return `${SITE_BASE_URL}/#anime?url=${encodeURIComponent(catalogUrl)}`; }
function cleanTitle(value) { return String(value || '').replace(/<[^>]+>/g, '').trim().slice(0, 160); }
function normalizeAnime(item = {}) {
  const slug = String(item.slug || item.id || item.hikka_id || '').trim();
  const catalogUrl = /^https?:\/\//i.test(String(item.url || '')) ? String(item.url) : `${HIKKA_API}/anime/${encodeURIComponent(slug)}`;
  return {
    id: String(item.id || item.hikka_id || slug).slice(0, 100),
    slug: slug.slice(0, 160),
    title: cleanTitle(item.title_ua || item.title_en || item.title_ja || item.name_ua || item.name_en || item.title || slug || 'Аніме'),
    posterUrl: String(item.image || item.poster || item.cover || item.cover_url || '').slice(0, 1000),
    catalogUrl,
    siteUrl: siteUrlFor(catalogUrl),
    episodesTotal: Math.max(1, Math.min(999, Number(item.episodes_total || item.episodes_released || item.episodes || 12) || 12)),
    dubs: []
  };
}

async function pickDailyAnime(day) {
  try {
    const response = await fetch(`${HIKKA_API}/anime?page=1&size=30`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ only_translated: true, sort: ['score:desc', 'scored_by:desc'] }) });
    if (response.ok) {
      const data = await response.json();
      const list = Array.isArray(data?.list) ? data.list.filter(item => item && (item.slug || item.id)) : [];
      if (list.length) return normalizeAnime(list[daySeed(day) % list.length]);
    }
  } catch {}
  const fallback = FALLBACK_ANIME[daySeed(day) % FALLBACK_ANIME.length];
  return normalizeAnime(fallback);
}

function blankState() {
  return {
    roomId: 'global-anime-live', day: '', status: 'voting', anime: null, preferences: {}, selection: null,
    episode: 1, sessionEpisode: 1, position: 0, playing: false, startedAt: null, finishedAt: null, updatedAt: Date.now(), messages: []
  };
}
async function readState(env) {
  const raw = await env.MAKIMA_MEMORY?.get(STATE_KEY);
  if (!raw) return blankState();
  try {
    const parsed = JSON.parse(raw);
    const base = blankState();
    return { ...base, ...parsed, anime: parsed.anime && typeof parsed.anime === 'object' ? { ...parsed.anime, dubs: Array.isArray(parsed.anime.dubs) ? parsed.anime.dubs.slice(0, MAX_DUBS) : [] } : null, preferences: parsed.preferences && typeof parsed.preferences === 'object' ? parsed.preferences : {}, selection: parsed.selection && typeof parsed.selection === 'object' ? parsed.selection : null, messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-MAX_MESSAGES) : [] };
  } catch { return blankState(); }
}
async function writeState(env, state) { state.updatedAt = Date.now(); await env.MAKIMA_MEMORY.put(STATE_KEY, JSON.stringify(state)); return state; }
async function requireUser(request, env) { return validateTelegramInitData(request.headers.get('X-Telegram-Init-Data') || '', env.TELEGRAM_BOT_TOKEN); }
function isAdmin(user, env) { const configuredId = String(env.WATCH_PARTY_ADMIN_ID || '').trim(); const configuredUsername = String(env.WATCH_PARTY_ADMIN_USERNAME || ADMIN_USERNAME).trim().toLowerCase().replace(/^@+/, ''); return (configuredId && String(user?.id) === configuredId) || String(user?.username || '').trim().toLowerCase() === configuredUsername; }
function userLabel(user) { return [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Глядач'; }
function defaultSelection(state) { const firstDub = state.anime?.dubs?.[0] || 'Озвучка сайту'; return { time: '20:00', episodes: Math.min(1, Number(state.anime?.episodesTotal || 1)), dub: firstDub }; }
function calculateSelection(state) { const fallback = defaultSelection(state); return { time: winnerFor(state, 'time', fallback.time), episodes: Number(winnerFor(state, 'episodes', fallback.episodes)), dub: winnerFor(state, 'dub', fallback.dub) }; }
function maybeStartAtSelectedTime(state) { if (!['voting', 'scheduled'].includes(state.status) || !Object.keys(state.preferences || {}).length) return false; state.selection = calculateSelection(state); state.status = 'scheduled'; const [hours, minutes] = String(state.selection.time).split(':').map(Number); if (kyivMinutes() >= hours * 60 + minutes) { state.status = 'live'; state.episode = 1; state.position = 0; state.playing = true; state.startedAt ||= Date.now(); return true; } return true; }
function countValues(state, key) { const counts = {}; Object.values(state.preferences || {}).forEach(preference => { const value = preference?.[key]; if (value !== undefined && value !== '') counts[String(value)] = (counts[String(value)] || 0) + 1; }); return counts; }
function winnerFor(state, key, fallback) { const counts = countValues(state, key); const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))); return entries[0]?.[0] ?? fallback; }
function publicState(state, userId = '') {
  const myChoices = state.preferences?.[String(userId)] || { time: '', episodes: '', dub: '' };
  return {
    roomId: state.roomId, day: state.day, status: state.status, anime: state.anime, selection: state.selection,
    episode: state.episode, sessionEpisode: state.sessionEpisode || 1, position: state.position, playing: state.playing, startedAt: state.startedAt, finishedAt: state.finishedAt,
    updatedAt: state.updatedAt, messages: state.messages, myChoices,
    counts: { time: countValues(state, 'time'), episodes: countValues(state, 'episodes'), dub: countValues(state, 'dub') },
    lock: state.status !== 'finished', kyivNow: kyivNowLabel()
  };
}
async function ensureDaily(state, env) {
  const today = kyivDay();
  if (!state.day) { state.day = today; state.anime = await pickDailyAnime(today); state.status = 'voting'; return true; }
  if (state.day !== today) {
    if (state.status === 'finished') { state.anime = await pickDailyAnime(today); state.episode = 1; }
    state.day = today; state.status = 'voting'; state.preferences = {}; state.selection = null; state.sessionEpisode = 1; state.position = 0; state.playing = false; state.startedAt = null; state.finishedAt = null; state.messages = [];
    return true;
  }
  return false;
}
function normalizeTime(value) { const text = String(value || '').trim(); return TIME_OPTIONS.includes(text) ? text : ''; }
function normalizeEpisodes(value, max) { const number = Math.round(Number(value)); return Number.isFinite(number) ? Math.max(1, Math.min(Math.max(1, Math.min(12, Number(max) || 12)), number)) : 1; }

export async function handleWatchPartyRequest(request, env) {
  const url = new URL(request.url);
  if (!['/watch-party-api', '/watch-party/api'].includes(url.pathname)) return null;
  const origin = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (!['GET', 'POST'].includes(request.method)) return error('Метод не підтримується', 405, origin);
  try {
    const user = await requireUser(request, env);
    const admin = isAdmin(user, env);
    let state = await readState(env);
    const dailyChanged = await ensureDaily(state, env);
    const scheduledChanged = maybeStartAtSelectedTime(state);
    if (dailyChanged || scheduledChanged) await writeState(env, state);
    if (request.method === 'GET') return json({ state: publicState(state, user.id), user: { id: String(user.id), name: userLabel(user), username: user.username || '', isAdmin: admin } }, 200, origin);
    const payload = await request.json().catch(() => ({}));
    const action = String(payload.action || '');
    if (action === 'catalog_meta') {
      if (!['voting', 'scheduled'].includes(state.status)) return error('Дані озвучки можна оновити лише до старту', 409, origin);
      const dubs = Array.isArray(payload.dubs) ? payload.dubs.map(value => String(value || '').trim().slice(0, 120)).filter(Boolean).slice(0, MAX_DUBS) : [];
      if (dubs.length) state.anime.dubs = [...new Set([...(state.anime?.dubs || []), ...dubs])].slice(0, MAX_DUBS);
      const total = Number(payload.episodesTotal);
      if (Number.isFinite(total) && total > 0) state.anime.episodesTotal = Math.min(999, Math.max(1, Math.round(total)));
    } else if (action === 'choose') {
      if (!['voting', 'scheduled'].includes(state.status)) return error('Поточний ефір уже розпочато. Наступний вибір буде після завершення аніме.', 409, origin);
      const time = normalizeTime(payload.time);
      const episodes = normalizeEpisodes(payload.episodes, state.anime?.episodesTotal);
      const dubs = state.anime?.dubs || [];
      const dub = String(payload.dub || '').trim().slice(0, 120) || dubs[0] || 'Озвучка сайту';
      if (!time) return error('Обери час початку', 400, origin);
      state.preferences[String(user.id)] = { time, episodes, dub, at: Date.now() };
    } else if (action === 'start') {
      if (!admin) return error('Тільки адміністратор може запустити трансляцію', 403, origin);
      if (!['voting', 'scheduled'].includes(state.status)) return error('Цей ефір уже запущено або завершено', 409, origin);
      if (!Object.keys(state.preferences).length) return error('Дочекайся хоча б одного вибору користувача', 400, origin);
      state.selection = calculateSelection(state);
      state.status = 'live'; state.sessionEpisode = 1; state.position = 0; state.playing = true; state.startedAt = Date.now();
    } else if (action === 'control') {
      if (!admin || state.status !== 'live') return error('Керування трансляцією доступне адміністратору під час ефіру', 403, origin);
      if (typeof payload.playing === 'boolean') state.playing = payload.playing;
      if (Number.isFinite(Number(payload.position))) state.position = Math.max(0, Number(payload.position));
    } else if (action === 'next_episode') {
      if (!admin || state.status !== 'live') return error('Трансляція ще не запущена', 403, origin);
      if (payload.completed !== true) return error('Наступна серія відкриється після завершення поточної', 409, origin);
      const totalEpisodes = Math.max(1, Number(state.anime?.episodesTotal || 1));
      const batchSize = Math.max(1, Number(state.selection?.episodes || 1));
      if (state.episode >= totalEpisodes) { state.status = 'finished'; state.playing = false; state.finishedAt = Date.now(); }
      else if (Number(state.sessionEpisode || 1) >= batchSize) { state.status = 'voting'; state.playing = false; state.episode += 1; state.sessionEpisode = 1; state.position = 0; state.preferences = {}; state.selection = null; }
      else { state.episode += 1; state.sessionEpisode = Number(state.sessionEpisode || 1) + 1; state.position = 0; state.playing = true; }
    } else if (action === 'finish') {
      if (!admin || state.status !== 'live') return error('Завершити можна лише активний ефір', 403, origin);
      const totalEpisodes = Math.max(1, Number(state.anime?.episodesTotal || 1));
      if (state.episode < totalEpisodes) return error('Не можна відкрити новий random: поточне аніме ще не завершене', 409, origin);
      state.status = 'finished'; state.playing = false; state.finishedAt = Date.now();
    } else if (action === 'chat') {
      const text = String(payload.text || '').trim().slice(0, 400);
      if (!text) return error('Повідомлення порожнє', 400, origin);
      state.messages = [...state.messages, { id: crypto.randomUUID(), userId: String(user.id), name: userLabel(user), username: user.username || '', text, at: Date.now() }].slice(-MAX_MESSAGES);
    } else if (action === 'reset') {
      if (!admin) return error('Тільки адміністратор може очистити кімнату', 403, origin);
      state = blankState();
      await ensureDaily(state, env);
    } else {
      return error('Невідома дія', 400, origin);
    }
    maybeStartAtSelectedTime(state);
    await writeState(env, state);
    return json({ ok: true, state: publicState(state, user.id), user: { id: String(user.id), name: userLabel(user), username: user.username || '', isAdmin: admin } }, 200, origin);
  } catch (err) {
    const message = String(err?.message || err);
    return error(message || 'Помилка Watch Party', /Telegram|дані|користувач/i.test(message) ? 401 : 500, origin);
  }
}

export const WATCH_PARTY_TIME_OPTIONS = TIME_OPTIONS;
export const __watchPartyTest = { kyivDay, daySeed, normalizeAnime, normalizeEpisodes, pickDailyAnime };
