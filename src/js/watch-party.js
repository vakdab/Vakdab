const WATCH_API_BASE = '/watch-party-api';
const tg = globalThis.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.('#090b12'); tg.setBackgroundColor?.('#090b12'); }

const state = { data: null, user: null, pollTimer: null, syncTimer: null, controlTimer: null, lastControlAt: 0, renderingVideo: false };
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function showToast(message) {
  const toast = $('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

async function request(action = '', payload = null) {
  const headers = { 'content-type': 'application/json' };
  if (tg?.initData) headers['X-Telegram-Init-Data'] = tg.initData;
  const response = await fetch(WATCH_API_BASE, { method: action ? 'POST' : 'GET', headers, body: action ? JSON.stringify({ action, ...payload }) : undefined });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Watch Party ${response.status}`);
  return result;
}

function formatKyiv(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date).replace(',', ' ·');
}

function currentWinner() { return state.data?.options?.find(option => option.id === state.data?.winnerId) || null; }
function selectedVote() { return state.data?.myVote || ''; }

function renderState() {
  const data = state.data || {};
  const winner = currentWinner();
  const isLive = data.status === 'live';
  $('roomState').textContent = isLive ? '● Ефір наживо' : data.status === 'finished' ? 'Ефір завершено' : '● Голосування';
  $('roomState').style.color = isLive ? 'var(--green)' : '';
  $('heroStatus').textContent = isLive ? `Зараз дивимось: ${winner?.title || 'Аніме'}` : data.status === 'finished' ? 'Наступний ефір скоро' : 'Голосування триває';
  $('heroTime').textContent = winner?.startsAt ? formatKyiv(winner.startsAt) : 'Час за Києвом';
  $('pollQuestion').textContent = data.question || 'Що дивимось сьогодні?';
  const activeOption = winner || data.options?.slice().sort((a, b) => b.votes - a.votes)[0];
  $('scheduleTime').textContent = activeOption?.startsAt ? formatKyiv(activeOption.startsAt).split(' · ')[1] || formatKyiv(activeOption.startsAt) : '—';
  $('scheduleEpisodes').textContent = activeOption?.episodes ? `${activeOption.episodes} серій` : '—';
  $('scheduleStatus').textContent = isLive ? 'Наживо' : data.status === 'finished' ? 'Завершено' : 'Голосування';
  $('viewerCount').textContent = String(Math.max(1, data.messages?.length ? new Set(data.messages.map(message => message.userId)).size : 1));
  renderVotes(); renderChat(); renderAdmin(); renderParty();
}

function renderVotes() {
  const data = state.data || {};
  const options = Array.isArray(data.options) ? data.options : [];
  if (!options.length) {
    $('voteOptions').innerHTML = '<div class="state-card">Адміністратор ще не додав варіанти аніме.</div>';
    return;
  }
  const disabled = data.status !== 'voting';
  $('voteOptions').innerHTML = options.map(option => `<button class="vote-card${selectedVote() === option.id ? ' is-selected' : ''}" data-vote-id="${esc(option.id)}" type="button" ${disabled ? 'disabled' : ''}><span class="poster">${option.posterUrl ? `<img src="${esc(option.posterUrl)}" alt="" loading="lazy">` : '♫'}</span><span class="vote-info"><strong>${esc(option.title)}</strong><span>${option.episodes} серій${option.startsAt ? ` · ${esc(formatKyiv(option.startsAt))}` : ''}</span></span><span class="vote-count"><strong>${option.votes || 0}</strong><span>голосів</span></span></button>`).join('');
  $('voteOptions').querySelectorAll('[data-vote-id]').forEach(button => button.addEventListener('click', () => vote(button.dataset.voteId)));
}

function renderChat() {
  const messages = Array.isArray(state.data?.messages) ? state.data.messages : [];
  $('chatMessages').innerHTML = messages.length ? messages.map(message => `<article class="chat-message"><div><strong>${esc(message.name || 'Глядач')}</strong><time>${new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.at))}</time></div><p>${esc(message.text)}</p></article>`).join('') : '<div class="chat-empty">Повідомлення з’являться тут під час ефіру.</div>';
  $('chatMessages').scrollTop = $('chatMessages').scrollHeight;
}

function renderAdmin() {
  const admin = Boolean(state.user?.isAdmin);
  $('adminPanel').hidden = !admin;
  if (!admin) return;
  const options = state.data?.options || [];
  $('adminOptionList').innerHTML = options.length ? options.map(option => `<div class="admin-option"><span>${esc(option.title)} · ${option.votes || 0} голосів</span><button type="button" data-remove-option="${esc(option.id)}">Видалити</button></div>`).join('') : '<div class="admin-option"><span>Варіантів ще немає</span></div>';
  $('adminOptionList').querySelectorAll('[data-remove-option]').forEach(button => button.addEventListener('click', () => perform('remove_option', { optionId: button.dataset.removeOption })));
}

function renderParty() {
  const data = state.data || {};
  const winner = currentWinner();
  const live = data.status === 'live' && winner;
  $('partySection').hidden = !live;
  if (!live) return;
  $('streamTitle').textContent = winner.title;
  $('episodeLabel').textContent = `Серія ${data.episode || 1} з ${winner.episodes}`;
  $('syncBadge').textContent = state.user?.isAdmin ? 'Ти ведеш ефір' : 'Синхронізовано';
  $('siteLink').hidden = !winner.siteUrl;
  if (winner.siteUrl) $('siteLink').href = winner.siteUrl;
  const video = $('partyVideo');
  const source = String(winner.videoUrl || '').trim();
  if (source && video.dataset.source !== source) {
    video.dataset.source = source;
    video.src = source;
    video.load();
  }
  $('videoEmpty').hidden = Boolean(source);
  if (!source) $('videoEmpty').innerHTML = '<span class="empty-play">↗</span><strong>Додай пряме відео з сайту</strong><small>Для синхронного ефіру потрібне пряме MP4 або HLS-посилання у налаштуваннях варіанта.</small>';
}

async function loadState(silent = true) {
  try {
    const result = await request();
    state.data = result.state || {};
    state.user = result.user || null;
    renderState();
    syncVideo();
  } catch (error) {
    console.warn('[Watch Party] load:', error);
    if (!silent) showToast(error.message || 'Не вдалося підключитися до кімнати');
    $('roomState').textContent = 'Немає з’єднання';
  }
}

async function perform(action, payload = {}) {
  try {
    const result = await request(action, payload);
    state.data = result.state || state.data;
    state.user = result.user || state.user;
    renderState();
    showToast('Готово');
  } catch (error) { showToast(error.message || 'Дія не виконана'); }
}

async function vote(optionId) {
  if (!tg?.initData) { showToast('Відкрий Watch Party через Telegram'); return; }
  await perform('vote', { optionId });
}

function expectedPosition() {
  const data = state.data;
  if (!data || data.status !== 'live') return 0;
  return Math.max(0, Number(data.position || 0) + (data.playing ? (Date.now() - Number(data.updatedAt || Date.now())) / 1000 : 0));
}

function syncVideo() {
  const video = $('partyVideo');
  if (!state.data || state.data.status !== 'live' || !video.dataset.source) return;
  const expected = expectedPosition();
  if (Number.isFinite(expected) && Math.abs(video.currentTime - expected) > 3) {
    state.renderingVideo = true;
    try { video.currentTime = expected; } catch {}
    setTimeout(() => { state.renderingVideo = false; }, 120);
  }
  if (state.data.playing && video.paused) video.play().catch(() => {});
  if (!state.data.playing && !video.paused) video.pause();
}

function scheduleControl(force = false) {
  if (!state.user?.isAdmin || !state.data || state.data.status !== 'live') return;
  const video = $('partyVideo');
  const now = Date.now();
  if (!force && now - state.lastControlAt < 1500) return;
  state.lastControlAt = now;
  clearTimeout(state.controlTimer);
  state.controlTimer = setTimeout(() => request('control', { playing: !video.paused, position: Number(video.currentTime || 0), episode: Number(state.data.episode || 1) }).catch(() => {}), force ? 0 : 200);
}

async function sendChat(event) {
  event.preventDefault();
  const input = $('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.disabled = true;
  try { await perform('chat', { text }); input.value = ''; } finally { input.disabled = false; input.focus(); }
}

function bindEvents() {
  $('refreshButton').addEventListener('click', () => loadState(false));
  $('profileButton').addEventListener('click', () => { if (!tg?.initData) showToast('Відкрий застосунок через Telegram для участі'); });
  $('optionForm').addEventListener('submit', async event => {
    event.preventDefault();
    const startsValue = $('optionStartsAt').value;
    await perform('add_option', { title: $('optionTitle').value, episodes: $('optionEpisodes').value, startsAt: startsValue ? new Date(startsValue).toISOString() : '', siteUrl: $('optionSiteUrl').value, videoUrl: $('optionVideoUrl').value, posterUrl: $('optionPosterUrl').value });
    event.target.reset(); $('optionEpisodes').value = '12';
  });
  $('publishButton').addEventListener('click', () => perform('publish_poll'));
  $('startButton').addEventListener('click', () => perform('start'));
  $('nextEpisodeButton').addEventListener('click', () => perform('next_episode'));
  $('finishButton').addEventListener('click', () => perform('finish'));
  $('resetButton').addEventListener('click', () => perform('reset'));
  $('chatForm').addEventListener('submit', sendChat);
  const video = $('partyVideo');
  video.addEventListener('play', () => scheduleControl(true));
  video.addEventListener('pause', () => scheduleControl(true));
  video.addEventListener('seeked', () => scheduleControl(true));
  video.addEventListener('timeupdate', () => scheduleControl(false));
  video.addEventListener('error', () => { if (state.user?.isAdmin) showToast('Відео не завантажилось. Перевір пряме MP4/HLS-посилання з сайту.'); });
}

async function init() {
  bindEvents();
  await loadState(false);
  state.pollTimer = setInterval(() => loadState(true), 2500);
  state.syncTimer = setInterval(syncVideo, 1000);
}
init().catch(error => { console.error('[Watch Party] init failed:', error); showToast('Не вдалося запустити Watch Party'); });
