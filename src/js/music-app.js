import { FIREBASE_CONFIG, initializeApp, getAuth, onAuthStateChanged, signInWithCustomToken, getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, serverTimestamp, getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from './config/firebase.js';
import { TELEGRAM_AUTH_ENDPOINT } from './config/constants.js';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const APP_VERSION = '20260825-shazam-v1';
const tg = globalThis.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.('#ffffff'); tg.setBackgroundColor?.('#f4f7fb'); }

let firebaseApp;
let auth;
let db;
let storage;
try {
  firebaseApp = initializeApp(FIREBASE_CONFIG, 'vakdab-music');
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
} catch (error) {
  console.warn('[Shazam] Firebase init failed:', error);
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
  uploading: false
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
  if (!auth || !db) { toast('Firebase поки недоступний'); return false; }
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
    const snapshot = await getDocs(query(collection(db, 'musicTracks'), where('isPublic', '==', true)));
    state.publicTracks = sortNewest(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
  } catch (error) { console.warn('[Shazam] public feed:', error); state.publicTracks = []; }
  renderPublic();
}
async function loadPrivateData() {
  if (!state.user) { renderLibrary(); renderPlaylists(); return; }
  setLoading($('libraryTrackList'), 'Завантажую бібліотеку…');
  setLoading($('playlistGrid'), 'Завантажую плейлисти…');
  try {
    const [tracks, lists] = await Promise.all([
      getDocs(query(collection(db, 'musicTracks'), where('ownerId', '==', state.user.uid))),
      getDocs(query(collection(db, 'musicPlaylists'), where('ownerId', '==', state.user.uid)))
    ]);
    state.library = sortNewest(tracks.docs.map(item => ({ id: item.id, ...item.data() })));
    state.playlists = sortNewest(lists.docs.map(item => ({ id: item.id, ...item.data() })));
  } catch (error) { console.warn('[Shazam] private data:', error); toast('Не вдалося завантажити бібліотеку'); }
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

function uploadAudioWithProgress(fileRef, file, metadata, onProgress) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file, metadata);
    const timeout = setTimeout(() => {
      task.cancel();
      const error = new Error('Завантаження перевищило ліміт часу');
      error.code = 'storage/timeout';
      reject(error);
    }, 90000);
    task.on('state_changed', snapshot => {
      const progress = snapshot.totalBytes ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0;
      onProgress?.(progress);
    }, error => {
      clearTimeout(timeout);
      reject(error);
    }, () => {
      clearTimeout(timeout);
      resolve(task.snapshot);
    });
  });
}

function uploadErrorMessage(error) {
  const code = String(error?.code || '');
  if (code === 'storage/unauthorized') return 'Firebase не дозволив завантаження. Перевір вхід через Telegram.';
  if (code === 'storage/canceled') return 'Завантаження скасовано.';
  if (code === 'storage/timeout') return 'Завантаження зависло. Перевір інтернет і спробуй ще раз.';
  if (code === 'storage/quota-exceeded') return 'Сховище музики тимчасово переповнене.';
  if (code === 'storage/retry-limit-exceeded') return 'Не вдалося завершити upload. Спробуй ще раз.';
  return 'Не вдалося завантажити трек. Спробуй ще раз.';
}

async function saveTrack(event) {
  event.preventDefault();
  if (state.uploading) return;
  if (!await ensureAuth()) return;
  const file = $('trackFile').files?.[0];
  if (!file) { toast('Обери аудіофайл'); return; }
  if (file.size > MAX_FILE_BYTES) { toast('Файл завеликий: максимум 50 MB'); return; }
  const rights = $('rightsConfirmed').checked;
  const isPublic = $('trackPublic').checked;
  if (!rights || (isPublic && !rights)) { toast('Підтвердь права на цей файл'); return; }
  state.uploading = true;
  const submit = $('trackSubmit');
  if (submit) { submit.disabled = true; submit.textContent = 'Завантажую…'; }
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-90);
    const path = `music/${state.user.uid}/${crypto.randomUUID()}-${safeName}`;
    const fileRef = ref(storage, path);
    await uploadAudioWithProgress(fileRef, file, { contentType: file.type || 'audio/mpeg', customMetadata: { ownerId: state.user.uid } }, progress => {
      if (submit) submit.textContent = `Завантажую ${progress}%…`;
    });
    const audioUrl = await getDownloadURL(fileRef);
    const title = $('trackTitle').value.trim() || file.name.replace(/\.[^.]+$/, '');
    const artist = $('trackArtist').value.trim() || 'Невідомий виконавець';
    const payload = { ownerId: state.user.uid, ownerName: userLabel(), title, artist, audioUrl, storagePath: path, mimeType: file.type || 'audio/mpeg', size: file.size, isPublic, rightsConfirmed: rights, createdAt: serverTimestamp() };
    const created = await addDoc(collection(db, 'musicTracks'), payload);
    state.library.unshift({ id: created.id, ...payload, createdAt: Date.now() });
    if (isPublic) state.publicTracks.unshift({ id: created.id, ...payload, createdAt: Date.now() });
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
    const payload = { ownerId: state.user.uid, name, trackIds: [], createdAt: serverTimestamp() };
    const created = await addDoc(collection(db, 'musicPlaylists'), payload);
    state.playlists.unshift({ id: created.id, ...payload, createdAt: Date.now() });
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
    const trackIds = [...(list.trackIds || []), track.id];
    await updateDoc(doc(db, 'musicPlaylists', list.id), { trackIds });
    list.trackIds = trackIds; renderPlaylists(); toast('Додано до плейлиста');
  } catch (error) { console.warn('[Shazam] add playlist:', error); toast('Не вдалося додати трек'); }
}

async function removeTrack(track) {
  if (!await ensureAuth()) return;
  if (!globalThis.confirm(`Видалити «${track.title}» з бібліотеки?`)) return;
  try {
    await deleteDoc(doc(db, 'musicTracks', track.id));
    if (track.storagePath) await deleteObject(ref(storage, track.storagePath)).catch(() => {});
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
  const frequencies = [60, 170, 350, 1000, 3000];
  state.filters = frequencies.map((frequency, index) => { const filter = state.audioContext.createBiquadFilter(); filter.type = index === 0 ? 'lowshelf' : index === frequencies.length - 1 ? 'highshelf' : 'peaking'; filter.frequency.value = frequency; filter.Q.value = 1; filter.gain.value = 0; return filter; });
  state.gain = state.audioContext.createGain();
  let chain = state.source;
  state.filters.forEach(filter => { chain.connect(filter); chain = filter; });
  chain.connect(state.gain); state.gain.connect(state.audioContext.destination);
}
function playTrack(track) {
  if (!track?.audioUrl) { toast('У цього треку немає аудіопосилання'); return; }
  ensureAudioGraph();
  state.audioContext?.resume?.();
  state.currentTrack = track;
  state.queue = allPlayableTracks();
  state.queueIndex = state.queue.findIndex(item => item.id === track.id);
  state.audio.src = track.audioUrl;
  state.audio.volume = Number($('volumeRange')?.value || .85);
  state.audio.play().then(() => updatePlayerUi()).catch(error => { console.warn('[Shazam] play:', error); toast('Браузер заблокував відтворення — натисни ▶ ще раз'); });
  $('playerDock').hidden = false;
  updatePlayerUi();
}
function stopTrack() { state.audio.pause(); state.audio.currentTime = 0; state.currentTrack = null; $('playerDock').hidden = true; }
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
function renderEq() {
  const labels = ['60', '170', '350', '1k', '3k'];
  $('eqSliders').innerHTML = labels.map((label, index) => `<label class="eq-band"><span>${label}</span><input type="range" min="-12" max="12" step="1" value="0" data-eq-index="${index}" orient="vertical" /><small>0 dB</small></label>`).join('');
}
function applyPreset(name) {
  const values = { flat: [0, 0, 0, 0, 0], bass: [8, 5, 2, -1, 1], vocal: [-2, 1, 4, 5, 2], night: [-4, -2, 1, 2, -2] }[name] || [0, 0, 0, 0, 0];
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
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => applyPreset(button.dataset.preset)));
  $('eqSliders').addEventListener('input', event => { const input = event.target.closest('[data-eq-index]'); if (!input) return; const index = Number(input.dataset.eqIndex); const value = Number(input.value); if (state.filters[index]) state.filters[index].gain.value = value; input.nextElementSibling.textContent = `${value > 0 ? '+' : ''}${value} dB`; document.querySelectorAll('[data-preset]').forEach(button => button.classList.remove('is-active')); });
  document.addEventListener('click', event => { const action = event.target.closest('[data-action]')?.dataset.action; const row = event.target.closest('[data-track-id]'); if (!action || !row) return; const track = [...state.library, ...state.publicTracks].find(item => item.id === row.dataset.trackId); if (!track) return; if (action === 'play') playTrack(track); if (action === 'playlist') addToPlaylist(track); if (action === 'delete') removeTrack(track); });
  state.audio.addEventListener('timeupdate', updatePlayerUi); state.audio.addEventListener('loadedmetadata', updatePlayerUi); state.audio.addEventListener('play', updatePlayerUi); state.audio.addEventListener('pause', updatePlayerUi); state.audio.addEventListener('ended', () => nextTrack(1));
}

async function init() {
  renderEq(); bindEvents(); setProfileUi();
  if (auth) onAuthStateChanged(auth, async user => { state.user = user; setProfileUi(); await loadPrivateData(); });
  await loadPublic();
  if (tg?.initData) await signInTelegram();
  setProfileUi();
  await loadPrivateData();
}
init();
