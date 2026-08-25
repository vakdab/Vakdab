import { FIREBASE_CONFIG, initializeApp, getAuth, signInWithCustomToken } from './config/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { TELEGRAM_AUTH_ENDPOINT } from './config/constants.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const APP_VERSION = '20260825-shazam-v24';
const MUSIC_API_BASE = 'https://vakdab.animegran8.workers.dev/telegram-webhook';
const API_TIMEOUT_MS = 7000;
const EQ_BANDS = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ_STORAGE_KEY = 'vakdab.shazam.eq.v1';
const EQ_PRESETS = Object.freeze({
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [8, 6, 4, 2, 1, 0, 0, 0, 0, 0],
  treble: [0, 0, 0, 0, 0, 2, 4, 6, 8, 8],
  vocal: [-2, -1, 0, 2, 4, 5, 4, 2, 0, -1],
  vshape: [6, 4, 2, 0, -2, -2, 0, 2, 4, 6],
  rock: [5, 4, 3, 1, -1, 0, 2, 4, 5, 5],
  electronic: [6, 4, 1, 0, -2, 2, 4, 3, 4, 5]
});
const tg = globalThis.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.('#ffffff'); tg.setBackgroundColor?.('#f4f7fb'); }

let firebaseApp;
let auth;
try {
  firebaseApp = initializeApp(FIREBASE_CONFIG, 'vakdab-music');
  auth = getAuth(firebaseApp);
} catch (error) {
  console.warn('[Shazam] Firebase init failed:', error);
}

async function musicApi(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('X-Telegram-Init-Data', String(tg?.initData || ''));
  headers.set('X-Music-Path', String(path || '').replace(/^\/+/, ''));
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(MUSIC_API_BASE, { ...options, headers, signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Music API ${response.status}`);
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function readEqValues() {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(EQ_STORAGE_KEY) || 'null');
    return Array.isArray(saved) && saved.length === EQ_BANDS.length ? saved.map(value => Math.max(-12, Math.min(12, Number(value) || 0))) : [...EQ_PRESETS.flat];
  } catch { return [...EQ_PRESETS.flat]; }
}

const state = {
  user: null,
  telegramUser: null,
  library: [],
  publicTracks: [],
  playlists: [],
  activeTab: 'discover',
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  audio: new Audio(),
  audioContext: null,
  filters: [],
  source: null,
  gain: null,
  audioObjectUrl: '',
  uploading: false,
  eqValues: readEqValues(),
  mediaHandlersBound: false
};
state.audio.preload = 'metadata';
state.audio.crossOrigin = 'anonymous';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const formatTime = seconds => { const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0; return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`; };
const stamp = value => value?.toMillis?.() || (value?.seconds ? value.seconds * 1000 : Number(value) || 0);
const sortNewest = items => [...items].sort((a, b) => stamp(b.createdAt) - stamp(a.createdAt));

function toast(message) {
  const node = $('musicToast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('is-visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('is-visible'), 2800);
}
function setLoading(container, text) { if (container) container.innerHTML = `<div class="loading-card">${esc(text)}</div>`; }
function userLabel() {
  const user = state.telegramUser || {};
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || (user.username ? `@${user.username}` : state.user?.displayName || 'Моя музика');
}

async function signInTelegram() {
  if (!auth) { toast('Авторизація поки недоступна'); return false; }
  if (auth.currentUser) { state.user = auth.currentUser; return true; }
  const initData = String(tg?.initData || '').trim();
  if (!initData) { toast('Відкрий Shazam через Telegram Mini App'); return false; }
  try {
    const response = await fetch(TELEGRAM_AUTH_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.customToken) throw new Error(payload.error || 'Telegram не підтверджено');
    await signInWithCustomToken(auth, payload.customToken);
    state.telegramUser = payload.telegramUser || null;
    state.user = auth.currentUser;
    toast('Вхід через Telegram успішний');
    return true;
  } catch (error) {
    console.warn('[Shazam] Telegram auth:', error);
    toast(error.message || 'Не вдалося виконати вхід через Telegram');
    return false;
  }
}

function setProfileUi() {
  const name = $('profileName');
  const avatar = $('profileAvatar');
  if (!state.user) { if (name) name.textContent = tg?.initData ? 'Увійти через Telegram' : 'Відкрий у Telegram'; return; }
  if (name) name.textContent = userLabel();
  const photo = state.telegramUser?.photo_url;
  if (avatar) avatar.innerHTML = photo ? `<img src="${esc(photo)}" alt="" />` : '♪';
}

async function ensureAuth() { return state.user || await signInTelegram(); }

function trackCover(track, small = false) {
  const fallback = `<span>♫</span>`;
  return `<div class="cover-art${small ? ' small-cover' : ''}">${track.coverUrl ? `<img src="${esc(track.coverUrl)}" alt="" loading="lazy" />` : fallback}</div>`;
}
function trackCard(track) {
  return `<article class="track-card" data-track-id="${esc(track.id)}">${trackCover(track)}<div class="track-meta"><strong title="${esc(track.title)}">${esc(track.title)}</strong><span>${esc(track.artist || 'Невідомий виконавець')}</span><div class="track-actions"><button data-action="play" type="button">▶ Слухати</button><button data-action="playlist" type="button">＋ У плейлист</button></div></div></article>`;
}
function trackRow(track) {
  const status = track.isPublic ? 'Публічний' : 'Приватний';
  return `<article class="track-row" data-track-id="${esc(track.id)}">${trackCover(track, true)}<div class="track-meta"><strong title="${esc(track.title)}">${esc(track.title)}</strong><span>${esc(track.artist || 'Невідомий виконавець')} · ${status}</span></div><div class="row-actions"><button class="play-row" data-action="play" type="button" aria-label="Відтворити">▶</button><button data-action="playlist" type="button" aria-label="Додати до плейлиста">＋</button><button data-action="delete" type="button" aria-label="Видалити">×</button></div></article>`;
}
function playlistCard(list) {
  const tracks = list.trackIds?.length || 0;
  return `<article class="playlist-card" data-playlist-id="${esc(list.id)}"><div class="playlist-cover">♫</div><strong>${esc(list.name)}</strong><span>${tracks} ${tracks === 1 ? 'трек' : 'треків'}</span></article>`;
}

function renderPublic() {
  const grid = $('publicTrackGrid');
  const empty = $('publicEmpty');
  if (!state.publicTracks.length) { if (grid) grid.innerHTML = ''; if (empty) empty.hidden = false; return; }
  if (empty) empty.hidden = true;
  if (grid) grid.innerHTML = state.publicTracks.map(trackCard).join('');
}
function renderLibrary() {
  const list = $('libraryTrackList');
  const empty = $('libraryEmpty');
  if (!state.user || !state.library.length) { if (list) list.innerHTML = ''; if (empty) empty.hidden = false; return; }
  if (empty) empty.hidden = true;
  if (list) list.innerHTML = state.library.map(trackRow).join('');
}
function renderPlaylists() {
  const grid = $('playlistGrid');
  const empty = $('playlistEmpty');
  if (!state.user || !state.playlists.length) { if (grid) grid.innerHTML = ''; if (empty) empty.hidden = false; return; }
  if (empty) empty.hidden = true;
  if (grid) grid.innerHTML = state.playlists.map(playlistCard).join('');
}

async function loadPublic() {
  const grid = $('publicTrackGrid');
  setLoading(grid, 'Завантажую музику…');
  try {
    const payload = await musicApi('/public', { method: 'POST' });
    state.publicTracks = sortNewest(payload.tracks || []);
  } catch (error) { console.warn('[Shazam] public feed:', error); state.publicTracks = []; }
  renderPublic();
}
async function loadPrivateData() {
  if (!state.user) { renderLibrary(); renderPlaylists(); return; }
  setLoading($('libraryTrackList'), 'Завантажую бібліотеку…');
  setLoading($('playlistGrid'), 'Завантажую плейлисти…');
  const [tracksResult, playlistsResult] = await Promise.allSettled([
    musicApi('/library', { method: 'POST' }),
    musicApi('/playlists/list', { method: 'POST' })
  ]);
  if (tracksResult.status === 'fulfilled') state.library = sortNewest(tracksResult.value.tracks || []);
  else console.warn('[Shazam] library:', tracksResult.reason);
  if (playlistsResult.status === 'fulfilled') state.playlists = sortNewest(playlistsResult.value.playlists || []);
  else console.warn('[Shazam] playlists:', playlistsResult.reason);
  if (tracksResult.status === 'rejected' && playlistsResult.status === 'rejected') toast('Бібліотека не відповіла. Натисни Shazam ще раз.');
  renderLibrary(); renderPlaylists();
}

function openTrackModal() {
  $('modalBackdrop').hidden = false;
  $('trackForm').reset();
  $('fileLabel').textContent = 'Обери аудіофайл';
  $('trackTitle').focus();
}
function closeTrackModal() { $('modalBackdrop').hidden = true; }
function openPlaylistModal() { $('playlistModalBackdrop').hidden = false; $('playlistForm').reset(); $('playlistName').focus(); }
function closePlaylistModal() { $('playlistModalBackdrop').hidden = true; }

function uploadErrorMessage(error) {
  const code = String(error?.message || error?.code || '');
  if (/10 MB|завеликий/i.test(code)) return 'Файл завеликий: максимум 10 MB.';
  if (/Telegram|auth|дані/i.test(code)) return 'Відкрий Shazam через Telegram ще раз.';
  if (/rights|права/i.test(code)) return 'Підтвердь права на цей файл.';
  return 'Не вдалося зберегти трек. Спробуй ще раз.';
}

async function saveTrack(event) {
  event.preventDefault();
  if (state.uploading) return;
  if (!await ensureAuth()) return;
  const file = $('trackFile').files?.[0];
  if (!file) { toast('Обери аудіофайл'); return; }
  if (file.size > MAX_FILE_BYTES) { toast('Файл завеликий: максимум 10 MB'); return; }
  const rights = $('rightsConfirmed').checked;
  const isPublic = $('trackPublic').checked;
  if (!rights || (isPublic && !rights)) { toast('Підтвердь права на цей файл'); return; }
  state.uploading = true;
  const submit = $('trackSubmit');
  if (submit) { submit.disabled = true; submit.textContent = 'Завантажую…'; }
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-90);
    const form = new FormData();
    form.set('file', file);
    form.set('title', $('trackTitle').value.trim() || file.name.replace(/\.[^.]+$/, ''));
    form.set('artist', $('trackArtist').value.trim() || 'Невідомий виконавець');
    form.set('isPublic', String(isPublic));
    form.set('rightsConfirmed', String(rights));
    if (submit) submit.textContent = 'Завантажую…';
    const response = await musicApi('/upload', { method: 'POST', body: form });
    const created = response.track;
    state.library.unshift(created);
    if (created.isPublic) state.publicTracks.unshift(created);
    renderLibrary(); renderPublic(); closeTrackModal(); toast(isPublic ? 'Трек додано у спільну стрічку' : 'Трек збережено приватно');
  } catch (error) {
    console.error('[Shazam] upload:', error);
    toast(uploadErrorMessage(error));
  } finally {
    state.uploading = false;
    if (submit) { submit.disabled = false; submit.textContent = 'Зберегти трек'; }
  }
}

async function createPlaylist(event) {
  event.preventDefault();
  if (!await ensureAuth()) return;
  const name = $('playlistName').value.trim();
  if (!name) return;
  try {
    const response = await musicApi('/playlists', { method: 'POST', body: JSON.stringify({ name }) });
    state.playlists.unshift(response.playlist);
    renderPlaylists(); closePlaylistModal(); toast('Плейлист створено');
  } catch (error) { console.error('[Shazam] playlist:', error); toast('Не вдалося створити плейлист'); }
}

async function addToPlaylist(track) {
  if (!await ensureAuth()) return;
  if (!state.playlists.length) { toast('Спочатку створи плейлист'); openPlaylistModal(); return; }
  const choice = state.playlists.map((item, index) => `${index + 1}. ${item.name}`).join('\n');
  const selected = Number(globalThis.prompt(`Додати «${track.title}» до:\n${choice}\n\nВведи номер`));
  const list = state.playlists[selected - 1];
  if (!list) return;
  if (list.trackIds?.includes(track.id)) { toast('Трек уже є в цьому плейлисті'); return; }
  try {
    const response = await musicApi(`/playlists/${encodeURIComponent(list.id)}/tracks`, { method: 'POST', body: JSON.stringify({ trackId: track.id }) });
    list.trackIds = response.playlist?.trackIds || list.trackIds;
    renderPlaylists(); toast('Додано до плейлиста');
  } catch (error) { console.warn('[Shazam] add playlist:', error); toast('Не вдалося додати трек'); }
}

async function removeTrack(track) {
  if (!await ensureAuth()) return;
  if (!globalThis.confirm(`Видалити «${track.title}» з бібліотеки?`)) return;
  try {
    await musicApi(`/tracks/${encodeURIComponent(track.id)}`, { method: 'DELETE' });
    state.library = state.library.filter(item => item.id !== track.id);
    state.publicTracks = state.publicTracks.filter(item => item.id !== track.id);
    state.playlists.forEach(list => { list.trackIds = (list.trackIds || []).filter(id => id !== track.id); });
    renderLibrary(); renderPublic(); if (state.currentTrack?.id === track.id) stopTrack(); toast('Трек видалено');
  } catch (error) { console.warn('[Shazam] delete:', error); toast('Не вдалося видалити трек'); }
}

function allPlayableTracks() { return [...state.publicTracks, ...state.library.filter(item => !state.publicTracks.some(publicTrack => publicTrack.id === item.id))]; }
function ensureAudioGraph() {
  if (state.audioContext || !globalThis.AudioContext && !globalThis.webkitAudioContext) return;
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  state.audioContext = new Context();
  state.source = state.audioContext.createMediaElementSource(state.audio);
  state.filters = EQ_BANDS.map((frequency, index) => { const filter = state.audioContext.createBiquadFilter(); filter.type = index === 0 ? 'lowshelf' : index === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking'; filter.frequency.value = frequency; filter.Q.value = 1; filter.gain.value = state.eqValues[index]; return filter; });
  state.gain = state.audioContext.createGain();
  let chain = state.source;
  state.filters.forEach(filter => { chain.connect(filter); chain = filter; });
  chain.connect(state.gain); state.gain.connect(state.audioContext.destination);
}
function syncMediaSession(track) {
  if (!('mediaSession' in navigator) || !track) return;
  if ('MediaMetadata' in globalThis) navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist || 'Невідомий виконавець', album: 'VakDab Music', artwork: track.coverUrl ? [{ src: track.coverUrl }] : [] });
  if (state.mediaHandlersBound) return;
  const handlers = { play: () => state.audio.play(), pause: () => state.audio.pause(), previoustrack: () => nextTrack(-1), nexttrack: () => nextTrack(1), seekbackward: () => { state.audio.currentTime = Math.max(0, state.audio.currentTime - 10); }, seekforward: () => { state.audio.currentTime = Math.min(state.audio.duration || Infinity, state.audio.currentTime + 10); }, seekto: event => { if (event.seekTime != null) state.audio.currentTime = event.seekTime; } };
  Object.entries(handlers).forEach(([action, handler]) => { try { navigator.mediaSession.setActionHandler(action, handler); } catch {} });
  state.mediaHandlersBound = true;
}

async function sendCurrentToTelegram() {
  const track = state.currentTrack;
  if (!track) { toast('Спочатку запусти трек'); return; }
  if (!await ensureAuth()) return;
  const button = $('backgroundBtn');
  if (button) { button.disabled = true; button.textContent = '…'; }
  try {
    await musicApi(`/tracks/${encodeURIComponent(track.id)}/telegram`, { method: 'POST' });
    toast('Трек надіслано в Telegram. Тепер його можна слухати у фоні.');
    setTimeout(() => tg?.close?.(), 650);
  } catch (error) {
    console.warn('[Shazam] Telegram background fallback:', error);
    toast('Не вдалося відкрити фонове прослуховування');
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Фон'; }
  }
}

async function playTrack(track) {
  if (!track?.audioUrl) { toast('У цього треку немає аудіопосилання'); return; }
  ensureAudioGraph();
  state.audioContext?.resume?.();
  state.currentTrack = track;
  syncMediaSession(track);
  state.queue = allPlayableTracks();
  state.queueIndex = state.queue.findIndex(item => item.id === track.id);
  $('playerDock').hidden = false;
  updatePlayerUi();
  try {
    let audioUrl = track.audioUrl;
    const response = await fetch(track.audioUrl, { method: 'POST', headers: { 'X-Telegram-Init-Data': String(tg?.initData || '') } });
    if (!response.ok) throw new Error(`Stream ${response.status}`);
    const blob = await response.blob();
    if (state.currentTrack?.id !== track.id) return;
    if (state.audioObjectUrl) URL.revokeObjectURL(state.audioObjectUrl);
    state.audioObjectUrl = URL.createObjectURL(blob);
    audioUrl = state.audioObjectUrl;
    if (state.currentTrack?.id !== track.id) return;
    state.audio.src = audioUrl;
    state.audio.volume = Number($('volumeRange')?.value || .85);
    await state.audio.play();
    updatePlayerUi();
  } catch (error) {
    console.warn('[Shazam] play:', error);
    toast('Не вдалося відтворити трек. Спробуй відкрити Mini App через Telegram ще раз.');
  }
}
function stopTrack() {
  state.audio.pause();
  state.audio.currentTime = 0;
  if (state.audioObjectUrl) { URL.revokeObjectURL(state.audioObjectUrl); state.audioObjectUrl = ''; }
  state.currentTrack = null;
  $('playerDock').hidden = true;
}
function nextTrack(direction = 1) { if (!state.queue.length) return; const next = (state.queueIndex + direction + state.queue.length) % state.queue.length; playTrack(state.queue[next]); }
function updatePlayerUi() {
  const track = state.currentTrack;
  if (!track) return;
  $('playerTitle').textContent = track.title;
  $('playerArtist').textContent = track.artist || 'Невідомий виконавець';
  $('playerCover').innerHTML = track.coverUrl ? `<img src="${esc(track.coverUrl)}" alt="" />` : '♫';
  $('playBtn').textContent = state.audio.paused ? '▶' : 'Ⅱ';
  $('currentTime').textContent = formatTime(state.audio.currentTime);
  $('duration').textContent = formatTime(state.audio.duration);
  $('progressRange').value = state.audio.duration ? (state.audio.currentTime / state.audio.duration) * 100 : 0;
}
function formatEqFrequency(frequency) { return frequency >= 1000 ? `${frequency / 1000}k` : String(frequency); }
function renderEq() {
  $('eqSliders').innerHTML = EQ_BANDS.map((frequency, index) => `<label class="eq-band"><span>${formatEqFrequency(frequency)}</span><input type="range" min="-12" max="12" step="1" value="${state.eqValues[index]}" data-eq-index="${index}" orient="vertical" aria-label="${frequency} Hz" /><small>${state.eqValues[index] > 0 ? '+' : ''}${state.eqValues[index]} dB</small></label>`).join('');
}
function applyPreset(name) {
  const values = EQ_PRESETS[name] || EQ_PRESETS.flat;
  state.eqValues = [...values];
  try { globalThis.localStorage?.setItem(EQ_STORAGE_KEY, JSON.stringify(state.eqValues)); } catch {}
  document.querySelectorAll('[data-eq-index]').forEach((input, index) => { input.value = values[index]; input.nextElementSibling.textContent = `${values[index] > 0 ? '+' : ''}${values[index]} dB`; if (state.filters[index]) state.filters[index].gain.value = values[index]; });
  document.querySelectorAll('[data-preset]').forEach(button => button.classList.toggle('is-active', button.dataset.preset === name));
}

function bindEvents() {
  document.querySelectorAll('.music-tab').forEach(button => button.addEventListener('click', () => { state.activeTab = button.dataset.tab; document.querySelectorAll('.music-tab').forEach(item => item.classList.toggle('is-active', item === button)); document.querySelectorAll('[data-panel]').forEach(panel => panel.classList.toggle('is-active', panel.dataset.panel === state.activeTab)); }));
  $('profilePill').addEventListener('click', () => ensureAuth().then(setProfileUi));
  ['heroUploadBtn', 'libraryUploadBtn', 'emptyUploadBtn'].forEach(id => $(id)?.addEventListener('click', openTrackModal));
  ['heroPlaylistBtn', 'newPlaylistBtn', 'emptyPlaylistBtn'].forEach(id => $(id)?.addEventListener('click', openPlaylistModal));
  $('refreshPublicBtn').addEventListener('click', loadPublic);
  $('trackForm').addEventListener('submit', saveTrack);
  $('playlistForm').addEventListener('submit', createPlaylist);
  $('trackFile').addEventListener('change', event => { const file = event.target.files?.[0]; if (file) { $('fileLabel').textContent = file.name; if (!$('trackTitle').value) $('trackTitle').value = file.name.replace(/\.[^.]+$/, ''); } });
  ['modalClose', 'modalBackdrop'].forEach(id => $(id)?.addEventListener('click', event => { if (id === 'modalClose' || event.target.id === id) closeTrackModal(); }));
  ['playlistModalClose', 'playlistModalBackdrop'].forEach(id => $(id)?.addEventListener('click', event => { if (id === 'playlistModalClose' || event.target.id === id) closePlaylistModal(); }));
  $('playBtn').addEventListener('click', () => { if (!state.currentTrack) return; if (state.audio.paused) { ensureAudioGraph(); state.audioContext?.resume?.(); state.audio.play(); } else state.audio.pause(); updatePlayerUi(); });
  $('prevBtn').addEventListener('click', () => nextTrack(-1)); $('nextBtn').addEventListener('click', () => nextTrack(1));
  $('progressRange').addEventListener('input', event => { if (state.audio.duration) state.audio.currentTime = state.audio.duration * (Number(event.target.value) / 100); });
  $('volumeRange').addEventListener('input', event => { state.audio.volume = Number(event.target.value); if (state.gain) state.gain.gain.value = 1; });
  $('equalizerBtn').addEventListener('click', () => { $('equalizerPanel').hidden = !$('equalizerPanel').hidden; }); $('closeEqualizer').addEventListener('click', () => { $('equalizerPanel').hidden = true; });
  $('backgroundBtn')?.addEventListener('click', sendCurrentToTelegram);
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => applyPreset(button.dataset.preset)));
  $('eqSliders').addEventListener('input', event => { const input = event.target.closest('[data-eq-index]'); if (!input) return; const index = Number(input.dataset.eqIndex); const value = Number(input.value); state.eqValues[index] = value; try { globalThis.localStorage?.setItem(EQ_STORAGE_KEY, JSON.stringify(state.eqValues)); } catch {} if (state.filters[index]) state.filters[index].gain.value = value; input.nextElementSibling.textContent = `${value > 0 ? '+' : ''}${value} dB`; document.querySelectorAll('[data-preset]').forEach(button => button.classList.remove('is-active')); });
  document.addEventListener('click', event => { const action = event.target.closest('[data-action]')?.dataset.action; const row = event.target.closest('[data-track-id]'); if (!action || !row) return; const track = [...state.library, ...state.publicTracks].find(item => item.id === row.dataset.trackId); if (!track) return; if (action === 'play') playTrack(track); if (action === 'playlist') addToPlaylist(track); if (action === 'delete') removeTrack(track); });
  state.audio.addEventListener('timeupdate', updatePlayerUi); state.audio.addEventListener('loadedmetadata', updatePlayerUi); state.audio.addEventListener('play', () => { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; updatePlayerUi(); }); state.audio.addEventListener('pause', () => { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; updatePlayerUi(); }); state.audio.addEventListener('ended', () => nextTrack(1));
}

async function init() {
  renderEq(); bindEvents(); setProfileUi();
  if (auth) onAuthStateChanged(auth, async user => { state.user = user; setProfileUi(); await loadPrivateData(); });
  await loadPublic();
  if (tg?.initData) await signInTelegram();
  setProfileUi();
  await loadPrivateData();
}
init().catch(error => {
  console.error('[Shazam] init failed:', error);
  renderPublic(); renderLibrary(); renderPlaylists();
  toast('Shazam не зміг завантажити бібліотеку. Відкрий Mini App ще раз.');
});
