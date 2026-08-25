const MUSIC_PREFIX = 'music:';
const TRACK_PREFIX = `${MUSIC_PREFIX}track:`;
const PLAYLIST_PREFIX = `${MUSIC_PREFIX}playlist:`;
const OWNER_INDEX_PREFIX = `${MUSIC_PREFIX}owner:`;
const PLAYLIST_INDEX_PREFIX = `${MUSIC_PREFIX}playlist-index:`;
const PUBLIC_INDEX_KEY = `${MUSIC_PREFIX}public-index`;
const CHUNK_BYTES = 256 * 1024;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_TRACKS_PER_USER = 500;
const MAX_PUBLIC_TRACKS = 500;
const MAX_PLAYLISTS_PER_USER = 100;
const TELEGRAM_INIT_MAX_AGE_SECONDS = 24 * 60 * 60;

function corsHeaders(origin = '') {
  const allowed = new Set(['https://vakdab.github.io', 'http://127.0.0.1:4173', 'http://localhost:4173']);
  return {
    'Access-Control-Allow-Origin': allowed.has(origin) ? origin : 'https://vakdab.github.io',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, X-Music-Path',
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

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(keyBytes, message) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

async function validateTelegramInitData(raw, botToken) {
  if (!botToken || typeof raw !== 'string' || raw.length < 20 || raw.length > 8192) throw new Error('Некоректні дані Telegram');
  const params = new URLSearchParams(raw);
  const receivedHash = String(params.get('hash') || '').toLowerCase();
  const authDate = Number(params.get('auth_date') || 0);
  const userJson = params.get('user') || '';
  if (!/^[a-f0-9]{64}$/.test(receivedHash) || !authDate || !userJson) throw new Error('Неповні дані Telegram');
  if (Math.abs(Math.floor(Date.now() / 1000) - authDate) > TELEGRAM_INIT_MAX_AGE_SECONDS) throw new Error('Дані Telegram застаріли');
  let user;
  try { user = JSON.parse(userJson); } catch { throw new Error('Некоректний профіль Telegram'); }
  if (!user?.id) throw new Error('Користувача Telegram не знайдено');
  const secretKey = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', new TextEncoder().encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    new TextEncoder().encode(botToken)
  );
  const checkString = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const calculatedHash = await hmacHex(secretKey, checkString);
  if (!constantTimeEqual(calculatedHash, receivedHash)) throw new Error('Не вдалося перевірити Telegram');
  return user;
}

async function requireUser(request, env) {
  return validateTelegramInitData(request.headers.get('X-Telegram-Init-Data') || '', env.TELEGRAM_BOT_TOKEN);
}

async function getJson(env, key, fallback) {
  const raw = await env.MAKIMA_MEMORY?.get(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

async function putJson(env, key, value) {
  await env.MAKIMA_MEMORY.put(key, JSON.stringify(value));
}

async function appendIndex(env, key, id, max) {
  const current = await getJson(env, key, []);
  const next = [id, ...current.filter(item => item !== id)].slice(0, max);
  await putJson(env, key, next);
  return next;
}

async function removeFromIndex(env, key, id) {
  const current = await getJson(env, key, []);
  await putJson(env, key, current.filter(item => item !== id));
}

async function getTrack(env, id) {
  return getJson(env, `${TRACK_PREFIX}${id}`, null);
}

async function listTracks(env, ids) {
  const tracks = await Promise.all((Array.isArray(ids) ? ids : []).map(id => getTrack(env, id)));
  return tracks.filter(Boolean);
}

function publicTrack(track, origin) {
  return {
    ...track,
    audioUrl: `${origin}/telegram-webhook?music=stream/${encodeURIComponent(track.id)}`
  };
}

async function storeAudio(env, { ownerId, ownerName, title, artist, mimeType, bytes, isPublic, rightsConfirmed, telegramFileId = '' }) {
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength > MAX_AUDIO_BYTES) throw new Error('Файл завеликий: максимум 10 MB');
  const id = crypto.randomUUID();
  const chunkCount = Math.ceil(bytes.byteLength / CHUNK_BYTES);
  const storagePrefix = `${MUSIC_PREFIX}chunk:${id}:`;
  for (let index = 0; index < chunkCount; index += 1) {
    const start = index * CHUNK_BYTES;
    await env.MAKIMA_MEMORY.put(`${storagePrefix}${index}`, bytes.slice(start, Math.min(bytes.byteLength, start + CHUNK_BYTES)));
  }
  const track = {
    id,
    ownerId: String(ownerId),
    ownerName: String(ownerName || 'Telegram користувач'),
    title: String(title || 'Без назви').trim().slice(0, 160),
    artist: String(artist || 'Невідомий виконавець').trim().slice(0, 120),
    mimeType: String(mimeType || 'audio/mpeg').slice(0, 80),
    size: bytes.byteLength,
    chunkCount,
    storagePrefix,
    telegramFileId: String(telegramFileId || ''),
    isPublic: Boolean(isPublic && rightsConfirmed),
    rightsConfirmed: Boolean(rightsConfirmed),
    createdAt: Date.now()
  };
  await putJson(env, `${TRACK_PREFIX}${id}`, track);
  await appendIndex(env, `${OWNER_INDEX_PREFIX}${track.ownerId}`, id, MAX_TRACKS_PER_USER);
  if (track.isPublic) await appendIndex(env, PUBLIC_INDEX_KEY, id, MAX_PUBLIC_TRACKS);
  return track;
}

async function deleteTrack(env, track) {
  for (let index = 0; index < Number(track.chunkCount || 0); index += 1) await env.MAKIMA_MEMORY.delete(`${track.storagePrefix}${index}`);
  await env.MAKIMA_MEMORY.delete(`${TRACK_PREFIX}${track.id}`);
  await removeFromIndex(env, `${OWNER_INDEX_PREFIX}${track.ownerId}`, track.id);
  await removeFromIndex(env, PUBLIC_INDEX_KEY, track.id);
  const playlistIds = await getJson(env, `${PLAYLIST_INDEX_PREFIX}${track.ownerId}`, []);
  for (const playlistId of playlistIds) {
    const playlist = await getJson(env, `${PLAYLIST_PREFIX}${playlistId}`, null);
    if (playlist) {
      playlist.trackIds = (playlist.trackIds || []).filter(id => id !== track.id);
      await putJson(env, `${PLAYLIST_PREFIX}${playlistId}`, playlist);
    }
  }
}

async function streamTrack(request, env, track, origin = '') {
  const total = Number(track.size || 0);
  const rangeHeader = request.headers.get('Range');
  let start = 0;
  let end = Math.max(0, total - 1);
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (match) {
      if (match[1]) start = Number(match[1]);
      if (match[2]) end = Number(match[2]);
      else end = total - 1;
      if (!match[1] && match[2]) start = Math.max(0, total - Number(match[2]));
    }
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= total || end < start) return new Response('Range Not Satisfiable', { status: 416 });
  end = Math.min(end, total - 1);
  const firstChunk = Math.floor(start / CHUNK_BYTES);
  const lastChunk = Math.floor(end / CHUNK_BYTES);
  const chunks = await Promise.all(Array.from({ length: lastChunk - firstChunk + 1 }, (_, offset) => env.MAKIMA_MEMORY.get(`${track.storagePrefix}${firstChunk + offset}`, 'arrayBuffer')));
  const body = new Uint8Array(end - start + 1);
  let cursor = 0;
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = new Uint8Array(chunks[index] || 0);
    const chunkStart = (firstChunk + index) * CHUNK_BYTES;
    const from = Math.max(start, chunkStart) - chunkStart;
    const to = Math.min(end, chunkStart + chunk.length - 1) - chunkStart + 1;
    if (to > from) { body.set(chunk.slice(from, to), cursor); cursor += to - from; }
  }
  const headers = {
    'content-type': track.mimeType || 'audio/mpeg',
    'content-length': String(body.byteLength),
    'accept-ranges': 'bytes',
    'cache-control': 'private, max-age=300',
    ...corsHeaders(origin)
  };
  if (rangeHeader) { headers['content-range'] = `bytes ${start}-${end}/${total}`; return new Response(body, { status: 206, headers }); }
  return new Response(body, { status: 200, headers });
}

async function uploadFromForm(request, env, user, origin) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return json({ error: 'Аудіофайл не знайдено' }, 400, origin);
  if (file.size > MAX_AUDIO_BYTES) return json({ error: 'Файл завеликий: максимум 10 MB' }, 413, origin);
  const rightsConfirmed = String(form.get('rightsConfirmed') || '') === 'true';
  const isPublic = String(form.get('isPublic') || '') === 'true';
  if (!rightsConfirmed) return json({ error: 'Підтвердь права на цей файл' }, 400, origin);
  const track = await storeAudio(env, {
    ownerId: user.id,
    ownerName: [user.first_name, user.last_name].filter(Boolean).join(' ') || (user.username ? `@${user.username}` : 'Telegram користувач'),
    title: form.get('title') || file.name.replace(/\.[^.]+$/, ''),
    artist: form.get('artist') || 'Невідомий виконавець',
    mimeType: file.type || 'audio/mpeg',
    bytes: await file.arrayBuffer(),
    isPublic,
    rightsConfirmed
  });
  return json({ track: publicTrack(track, new URL(request.url).origin) }, 201, origin);
}

async function createPlaylist(request, env, user, origin) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 80);
  if (!name) return json({ error: 'Вкажи назву плейлиста' }, 400, origin);
  const indexKey = `${PLAYLIST_INDEX_PREFIX}${user.id}`;
  const ids = await getJson(env, indexKey, []);
  if (ids.length >= MAX_PLAYLISTS_PER_USER) return json({ error: 'Досягнуто ліміт плейлистів' }, 400, origin);
  const playlist = { id: crypto.randomUUID(), ownerId: String(user.id), name, trackIds: [], createdAt: Date.now() };
  await putJson(env, `${PLAYLIST_PREFIX}${playlist.id}`, playlist);
  await appendIndex(env, indexKey, playlist.id, MAX_PLAYLISTS_PER_USER);
  return json({ playlist }, 201, origin);
}

async function addPlaylistTrack(request, env, user, playlistId, origin) {
  const playlist = await getJson(env, `${PLAYLIST_PREFIX}${playlistId}`, null);
  if (!playlist || String(playlist.ownerId) !== String(user.id)) return json({ error: 'Плейлист не знайдено' }, 404, origin);
  const body = await request.json().catch(() => ({}));
  const track = await getTrack(env, String(body.trackId || ''));
  if (!track || String(track.ownerId) !== String(user.id)) return json({ error: 'Трек не знайдено у твоїй бібліотеці' }, 404, origin);
  playlist.trackIds = [...new Set([...(playlist.trackIds || []), track.id])].slice(0, 500);
  await putJson(env, `${PLAYLIST_PREFIX}${playlist.id}`, playlist);
  return json({ playlist }, 200, origin);
}

export async function handleMusicApiRequest(request, env) {
  const url = new URL(request.url);
  const apiMarkers = ['/music-api/', '/music/api/'];
  const apiMarker = apiMarkers.find(marker => url.pathname.includes(marker));
  const apiStart = apiMarker ? url.pathname.indexOf(apiMarker) : -1;
  const requestedMusicPath = String(request.headers.get('X-Music-Path') || '').replace(/^\/+/, '');
  const musicPreflight = request.method === 'OPTIONS' && String(request.headers.get('Access-Control-Request-Headers') || '').toLowerCase().includes('x-music-path');
  const webhookMusicPath = url.pathname === '/telegram-webhook'
    ? (requestedMusicPath || String(url.searchParams.get('music') || '') || (musicPreflight ? 'public' : ''))
    : '';
  if (apiStart < 0 && !webhookMusicPath && !musicPreflight) return null;
  const origin = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  try {
    const path = webhookMusicPath
      ? webhookMusicPath.split('/').filter(Boolean)
      : url.pathname.slice(apiStart + apiMarker.length).split('/').filter(Boolean);
    if ((request.method === 'GET' || request.method === 'POST') && path[0] === 'public') {
      const ids = await getJson(env, PUBLIC_INDEX_KEY, []);
      const tracks = await listTracks(env, ids);
      return json({ tracks: tracks.filter(track => track.isPublic).map(track => publicTrack(track, url.origin)) }, 200, origin);
    }
    if ((request.method === 'GET' || request.method === 'POST') && path[0] === 'stream' && path[1]) {
      const track = await getTrack(env, decodeURIComponent(path[1]));
      if (!track) return new Response('Not Found', { status: 404 });
      if (!track.isPublic) {
        const user = await requireUser(request, env);
        if (String(user.id) !== String(track.ownerId)) return json({ error: 'Цей трек приватний' }, 403, origin);
      }
      return streamTrack(request, env, track, origin);
    }
    const user = await requireUser(request, env);
    if ((request.method === 'GET' || request.method === 'POST') && path[0] === 'library') {
      const ids = await getJson(env, `${OWNER_INDEX_PREFIX}${user.id}`, []);
      const tracks = await listTracks(env, ids);
      return json({ tracks: tracks.map(track => publicTrack(track, url.origin)) }, 200, origin);
    }
    if (request.method === 'POST' && path[0] === 'upload') return uploadFromForm(request, env, user, origin);
    if (request.method === 'POST' && path[0] === 'playlists' && path.length === 1) return createPlaylist(request, env, user, origin);
    if (request.method === 'POST' && path[0] === 'playlists' && path[2] === 'tracks') return addPlaylistTrack(request, env, user, path[1], origin);
    if (request.method === 'DELETE' && path[0] === 'tracks' && path[1]) {
      const track = await getTrack(env, decodeURIComponent(path[1]));
      if (!track || String(track.ownerId) !== String(user.id)) return json({ error: 'Трек не знайдено' }, 404, origin);
      await deleteTrack(env, track);
      return json({ ok: true }, 200, origin);
    }
    if (request.method === 'POST' && path[0] === 'playlists' && path[1] === 'list') {
      const ids = await getJson(env, `${PLAYLIST_INDEX_PREFIX}${user.id}`, []);
      const playlists = await Promise.all(ids.map(id => getJson(env, `${PLAYLIST_PREFIX}${id}`, null)));
      return json({ playlists: playlists.filter(Boolean) }, 200, origin);
    }
    return json({ error: 'Music API route not found' }, 404, origin);
  } catch (error) {
    console.error('[music-api]', error?.stack || error?.message || error);
    const status = /Telegram|дані|користувач/i.test(String(error?.message || '')) ? 401 : 500;
    return json({ error: error?.message || 'Music API error' }, status, origin);
  }
}

export function isTelegramAudioMessage(message) {
  return Boolean(message?.audio || (message?.document && String(message.document.mime_type || '').startsWith('audio/')));
}

async function telegramApi(method, params, env) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(params) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.description || `Telegram ${method} failed`);
  return payload.result;
}

async function sendTelegramMessage(chatId, text, env) {
  return telegramApi('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true }, env);
}

export async function handleTelegramAudioUpload(message, env) {
  const media = message.audio || message.document;
  const size = Number(media?.file_size || 0);
  if (!media?.file_id) return false;
  if (size > MAX_AUDIO_BYTES) {
    await sendTelegramMessage(message.chat.id, 'Файл завеликий для безкоштовного сховища. Надішли аудіо до 10 MB.', env);
    return true;
  }
  try {
    const file = await telegramApi('getFile', { file_id: media.file_id }, env);
    const response = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`);
    if (!response.ok) throw new Error('Не вдалося отримати файл із Telegram');
    const bytes = await response.arrayBuffer();
    const track = await storeAudio(env, {
      ownerId: message.from.id,
      ownerName: [message.from.first_name, message.from.last_name].filter(Boolean).join(' ') || (message.from.username ? `@${message.from.username}` : 'Telegram користувач'),
      title: media.title || media.file_name?.replace(/\.[^.]+$/, '') || 'Без назви',
      artist: media.performer || 'Невідомий виконавець',
      mimeType: media.mime_type || 'audio/mpeg',
      bytes,
      isPublic: false,
      rightsConfirmed: false,
      telegramFileId: media.file_id
    });
    await sendTelegramMessage(message.chat.id, `Трек «${track.title}» збережено у твоїй бібліотеці Shazam. Відкрий Mini App через кнопку Shazam.`, env);
  } catch (error) {
    console.error('[music-api] Telegram audio import:', error?.stack || error?.message || error);
    await sendTelegramMessage(message.chat.id, 'Не вдалося зберегти аудіо. Спробуй MP3 до 10 MB ще раз.', env);
  }
  return true;
}
