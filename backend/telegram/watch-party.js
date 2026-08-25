import { validateTelegramInitData } from './music-store.js';

const STATE_KEY = 'watch-party:global:state';
const MAX_OPTIONS = 12;
const MAX_MESSAGES = 120;
const ADMIN_USERNAME = 'vaditx';

function corsHeaders(origin = '') {
  const allowed = new Set(['https://vakdab.github.io', 'https://vakdab.animegran8.workers.dev', 'http://127.0.0.1:4173', 'http://localhost:4173']);
  return {
    'Access-Control-Allow-Origin': allowed.has(origin) ? origin : 'https://vakdab.github.io',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(origin) }
  });
}

function blankState() {
  return {
    roomId: 'global-anime-live',
    status: 'voting',
    title: 'Аніме Live',
    question: 'Що дивимось сьогодні?',
    options: [],
    votes: {},
    winnerId: '',
    episode: 1,
    position: 0,
    playing: false,
    startedAt: null,
    updatedAt: Date.now(),
    messages: []
  };
}

async function readState(env) {
  const raw = await env.MAKIMA_MEMORY?.get(STATE_KEY);
  if (!raw) return blankState();
  try {
    const parsed = JSON.parse(raw);
    return { ...blankState(), ...parsed, options: Array.isArray(parsed.options) ? parsed.options : [], votes: parsed.votes && typeof parsed.votes === 'object' ? parsed.votes : {}, messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-MAX_MESSAGES) : [] };
  } catch { return blankState(); }
}

async function writeState(env, state) {
  state.updatedAt = Date.now();
  await env.MAKIMA_MEMORY.put(STATE_KEY, JSON.stringify(state));
  return state;
}

async function requireUser(request, env) {
  return validateTelegramInitData(request.headers.get('X-Telegram-Init-Data') || '', env.TELEGRAM_BOT_TOKEN);
}

function isAdmin(user, env) {
  const configuredId = String(env.WATCH_PARTY_ADMIN_ID || '').trim();
  const configuredUsername = String(env.WATCH_PARTY_ADMIN_USERNAME || ADMIN_USERNAME).trim().toLowerCase().replace(/^@+/, '');
  return (configuredId && String(user?.id) === configuredId) || String(user?.username || '').trim().toLowerCase() === configuredUsername;
}

function optionFromPayload(payload) {
  const title = String(payload.title || '').trim().slice(0, 160);
  if (!title) return null;
  return {
    id: crypto.randomUUID(),
    title,
    episodes: Math.max(1, Math.min(999, Number(payload.episodes) || 1)),
    startsAt: String(payload.startsAt || '').trim().slice(0, 80),
    siteUrl: String(payload.siteUrl || '').trim().slice(0, 500),
    videoUrl: String(payload.videoUrl || '').trim().slice(0, 1000),
    posterUrl: String(payload.posterUrl || '').trim().slice(0, 1000),
    createdAt: Date.now()
  };
}

function counts(state) {
  return state.options.map(option => ({ ...option, votes: Object.values(state.votes).filter(value => value === option.id).length }));
}

function publicState(state, userId = '') {
  return { ...state, options: counts(state), votes: undefined, myVote: state.votes[String(userId)] || '' };
}

function error(message, status = 400, origin = '') { return json({ error: message }, status, origin); }

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
    if (request.method === 'GET') return json({ state: publicState(state, user.id), user: { id: String(user.id), name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Глядач', username: user.username || '', isAdmin: admin } }, 200, origin);
    const payload = await request.json().catch(() => ({}));
    const action = String(payload.action || '');
    if (action === 'add_option') {
      if (!admin) return error('Тільки адміністратор може додавати аніме', 403, origin);
      const option = optionFromPayload(payload);
      if (!option) return error('Вкажи назву аніме', 400, origin);
      if (state.options.length >= MAX_OPTIONS) return error('Максимум 12 варіантів', 400, origin);
      state.options = [...state.options, option];
    } else if (action === 'remove_option') {
      if (!admin) return error('Тільки адміністратор може змінювати голосування', 403, origin);
      state.options = state.options.filter(option => option.id !== String(payload.optionId || ''));
      Object.entries(state.votes).forEach(([voter, optionId]) => { if (!state.options.some(option => option.id === optionId)) delete state.votes[voter]; });
    } else if (action === 'publish_poll') {
      if (!admin) return error('Тільки адміністратор може почати голосування', 403, origin);
      state.status = 'voting'; state.winnerId = ''; state.episode = 1; state.position = 0; state.playing = false; state.startedAt = null; state.votes = {};
    } else if (action === 'vote') {
      const optionId = String(payload.optionId || '');
      if (!state.options.some(option => option.id === optionId)) return error('Варіант голосування не знайдено', 404, origin);
      if (state.status !== 'voting') return error('Голосування вже завершено', 409, origin);
      state.votes[String(user.id)] = optionId;
    } else if (action === 'start') {
      if (!admin) return error('Тільки адміністратор може запустити трансляцію', 403, origin);
      const tally = counts(state).sort((a, b) => b.votes - a.votes);
      if (!tally[0] || !tally[0].votes) return error('Спочатку дочекайся хоча б одного голосу', 400, origin);
      state.status = 'live'; state.winnerId = tally[0].id; state.episode = 1; state.position = 0; state.playing = true; state.startedAt = Date.now();
    } else if (action === 'control') {
      if (!admin || state.status !== 'live') return error('Керування трансляцією доступне адміністратору', 403, origin);
      if (typeof payload.playing === 'boolean') state.playing = payload.playing;
      if (Number.isFinite(Number(payload.position))) state.position = Math.max(0, Number(payload.position));
      if (Number.isFinite(Number(payload.episode))) state.episode = Math.max(1, Math.min(999, Number(payload.episode)));
    } else if (action === 'next_episode') {
      if (!admin || state.status !== 'live') return error('Трансляція ще не запущена', 403, origin);
      const winner = state.options.find(option => option.id === state.winnerId);
      if (!winner || state.episode >= winner.episodes) return error('Це була остання серія', 400, origin);
      state.episode += 1; state.position = 0; state.playing = true;
    } else if (action === 'finish') {
      if (!admin) return error('Тільки адміністратор може завершити трансляцію', 403, origin);
      state.status = 'finished'; state.playing = false;
    } else if (action === 'chat') {
      const text = String(payload.text || '').trim().slice(0, 400);
      if (!text) return error('Повідомлення порожнє', 400, origin);
      state.messages = [...state.messages, { id: crypto.randomUUID(), userId: String(user.id), name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Глядач', username: user.username || '', text, at: Date.now() }].slice(-MAX_MESSAGES);
    } else if (action === 'reset') {
      if (!admin) return error('Тільки адміністратор може очистити кімнату', 403, origin);
      state = blankState();
    } else {
      return error('Невідома дія', 400, origin);
    }
    await writeState(env, state);
    return json({ ok: true, state: publicState(state, user.id), user: { id: String(user.id), name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Глядач', username: user.username || '', isAdmin: admin } }, 200, origin);
  } catch (err) {
    const message = String(err?.message || err);
    return error(message || 'Помилка Watch Party', /Telegram|дані|користувач/i.test(message) ? 401 : 500, origin);
  }
}
