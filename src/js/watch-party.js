// Watch Party v5 frontend asset
const WATCH_API_BASE = '/watch-party-api';
const HIKKA_API = 'https://api.hikka.io';
const HIKKA_PROXY = 'https://vakdab-hikka-proxy.animegran8.workers.dev';
const SOURCE_PROXY = 'https://monoanime.animegran8.workers.dev';
const SITE_BASE_URL = 'https://vakdab.github.io/VakDab';
const TIME_OPTIONS = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '21:00', '22:00'];
const tg = globalThis.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.('#000'); tg.setBackgroundColor?.('#000'); }

const state = { data: null, user: null, detail: null, detailKey: '', sourceCache: new Map(), sourceLoading: '', pollTimer: null, syncTimer: null, controlTimer: null, lastControlAt: 0, renderingVideo: false };
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function showToast(message) { const toast = $('toast'); if (!toast) return; toast.textContent = message; toast.classList.add('is-visible'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 3000); }

async function request(action = '', payload = {}) {
  const headers = { 'content-type': 'application/json' };
  if (tg?.initData) headers['X-Telegram-Init-Data'] = tg.initData;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(WATCH_API_BASE, { method: action ? 'POST' : 'GET', headers, body: action ? JSON.stringify({ action, ...payload }) : undefined, signal: controller.signal });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Watch Party ${response.status}`);
    return result;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Сервер довго не відповідає. Спробуй оновити.');
    throw error;
  } finally { clearTimeout(timeout); }
}
function formatDate(value) { if (!value) return '—'; const date = new Date(value); if (Number.isNaN(date.getTime())) return String(value); return new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date).replace(',', ' ·'); }
function shortDay(value) { if (!value) return 'сьогодні'; const date = new Date(`${value}T12:00:00`); return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' }).format(date); }
function currentAnime() { return state.data?.anime || null; }
function selectedDub() { return state.data?.myChoices?.dub || state.data?.selection?.dub || state.data?.anime?.dubs?.[0] || 'Озвучка сайту'; }
function selectedTime() { return state.data?.myChoices?.time || state.data?.selection?.time || '20:00'; }
function selectedEpisodes() { return Number(state.data?.myChoices?.episodes || state.data?.selection?.episodes || 1); }
function mostVoted(key, fallback) { const counts = state.data?.counts?.[key] || {}; return Object.entries(counts).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] || fallback; }
function isLocked() { return ['live', 'paused'].includes(state.data?.status); }

function renderState() {
  const data = state.data || {};
  const anime = currentAnime();
  const live = data.status === 'live';
  const finished = data.status === 'finished';
  const roomText = live ? '● Ефір наживо' : finished ? 'День завершено' : '● Вибір триває';
  $('roomState').textContent = roomText;
  $('roomState').classList.toggle('is-live', live);
  $('heroStatus').textContent = live ? `Зараз дивимось: ${anime?.title || 'Аніме'}` : data.status === 'paused' ? `Пауза: продовжуємо ${anime?.title || 'аніме'}` : finished ? 'Завтра буде новий random' : data.status === 'scheduled' ? `Старт о ${data.selection?.time || '—'} · Київ` : `Вибір на ${shortDay(data.day)}`;
  $('pollQuestion').textContent = live ? 'Зараз дивимось разом' : data.status === 'paused' ? 'Цей тайтл чекає продовження' : finished ? 'Сьогоднішній ефір завершено' : 'Що дивимось сьогодні?';
  $('dailyHint').textContent = anime ? `${anime.title} · випадковий вибір VakDab` : 'Готуємо щоденний random із каталогу VakDab.';
  $('animeTitle').textContent = anime?.title || 'Завантажуємо аніме…';
  $('animeMeta').textContent = anime ? `${anime.episodesTotal || '—'} доступних серій · ${data.day ? shortDay(data.day) : 'сьогодні'}` : 'Каталог VakDab';
  const poster = $('animePoster');
  poster.innerHTML = anime?.posterUrl ? `<img src="${esc(anime.posterUrl)}" alt="" loading="eager">` : '<span>V</span>';
  $('animeSiteLink').hidden = !anime?.siteUrl;
  if (anime?.siteUrl) $('animeSiteLink').href = anime.siteUrl;
  const lock = isLocked();
  $('lockTitle').textContent = live || data.status === 'paused' ? 'Новий вибір заблоковано' : finished ? 'День завершено' : data.status === 'scheduled' ? 'Розклад зафіксовано' : 'Обери свої параметри';
  $('lockText').textContent = live || data.status === 'paused' ? 'Поки всі серії цього аніме не завершені, наступний random вибрати неможливо.' : finished ? 'Наступний випадковий тайтл з’явиться автоматично на новий день.' : data.status === 'scheduled' ? 'Кімната готується до старту. Тайтл залишиться тим самим.' : 'Час, кількість серій та озвучка визначаться більшістю.';
  $('choiceGrid').classList.toggle('is-locked', lock || finished || data.status === 'scheduled');
  $('saveChoiceButton').hidden = lock || finished || data.status === 'scheduled';
  const activeTime = live || finished || data.status === 'scheduled' ? data.selection?.time : mostVoted('time', selectedTime());
  $('scheduleTime').textContent = activeTime || '—';
  $('scheduleAnime').textContent = anime?.title || '—';
  $('scheduleEpisodes').textContent = (live || finished ? data.selection?.episodes : mostVoted('episodes', selectedEpisodes())) ? `${live || finished ? data.selection?.episodes : mostVoted('episodes', selectedEpisodes())} серій` : '—';
  $('scheduleDub').textContent = live || finished ? (data.selection?.dub || '—') : mostVoted('dub', selectedDub());
  $('scheduleStatus').textContent = live ? 'Наживо' : finished ? 'Завершено' : 'Вибір';
  $('viewerCount').textContent = String(Math.max(1, new Set((data.messages || []).map(message => message.userId)).size));
  renderChoices(); renderResults(); renderChat(); renderAdmin(); renderParty();
}

function renderChoices() {
  const data = state.data || {};
  const maxEpisodes = Math.max(1, Math.min(12, Number(data.anime?.episodesTotal) || 12));
  $('choiceTime').innerHTML = TIME_OPTIONS.map(time => `<option value="${time}">${time}</option>`).join('');
  $('choiceTime').value = selectedTime();
  $('choiceEpisodes').innerHTML = Array.from({ length: maxEpisodes }, (_, index) => `<option value="${index + 1}">${index + 1} ${index === 0 ? 'серія' : 'серій'}</option>`).join('');
  $('choiceEpisodes').value = String(Math.min(maxEpisodes, selectedEpisodes()));
  const dubs = Array.isArray(data.anime?.dubs) && data.anime.dubs.length ? data.anime.dubs : (state.detail?.dubs || []);
  $('choiceDub').innerHTML = dubs.length ? dubs.map(dub => `<option value="${esc(dub)}">${esc(dub)}</option>`).join('') : '<option value="Озвучка сайту">Озвучка сайту</option>';
  $('choiceDub').value = dubs.includes(selectedDub()) ? selectedDub() : (dubs[0] || 'Озвучка сайту');
  const disabled = isLocked() || data.status === 'finished' || data.status === 'scheduled';
  ['choiceTime', 'choiceEpisodes', 'choiceDub'].forEach(id => { $(id).disabled = disabled; });
}
function renderResults() {
  const data = state.data || {};
  if (data.status !== 'voting') { const label = data.status === 'scheduled' ? 'Старт заплановано' : data.status === 'paused' ? 'Пауза між сесіями' : 'Ефір завершено'; $('resultsContent').innerHTML = data.selection ? `<span class="results-state">${label}</span><strong>${esc(data.selection.time)}</strong> · ${esc(data.selection.episodes)} серій · ${esc(data.selection.dub)}` : label; return; }
  const choices = [['time', 'час'], ['episodes', 'серії'], ['dub', 'озвучка']];
  const html = choices.map(([key, label]) => { const counts = data.counts?.[key] || {}; const best = mostVoted(key, '—'); const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0); return `<div class="result-row"><span>${label}</span><strong>${esc(best)} <small>${total ? `(${counts[best] || 0})` : ''}</small></strong></div>`; }).join('');
  $('resultsContent').innerHTML = html || 'Ще немає голосів.';
}
function renderChat() {
  const messages = Array.isArray(state.data?.messages) ? state.data.messages : [];
  $('chatMessages').innerHTML = messages.length ? messages.map(message => `<article class="chat-message"><div><strong>${esc(message.name || 'Глядач')}</strong><time>${new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.at))}</time></div><p>${esc(message.text)}</p></article>`).join('') : '<div class="chat-empty">Чат відкриється під час ефіру.</div>';
  $('chatMessages').scrollTop = $('chatMessages').scrollHeight;
}
function renderAdmin() {
  const admin = Boolean(state.user?.isAdmin);
  $('adminPanel').hidden = !admin;
  if (!admin) return;
  const status = state.data?.status;
  $('startButton').hidden = !['voting', 'scheduled', 'paused'].includes(status);
  $('startButton').textContent = status === 'paused' ? 'Продовжити ефір' : 'Запустити переможця';
  $('nextEpisodeButton').hidden = status !== 'live';
  $('finishButton').hidden = status !== 'live';
  $('resetButton').hidden = false;
  $('adminStatus').textContent = state.data?.status === 'live' ? 'Ефір триває' : state.data?.status === 'finished' ? 'Чекаємо нового дня' : 'Можна запускати результат';
}
function episodeEntry() {
  const detail = state.detail;
  if (!detail || !state.data?.selection) return null;
  const season = detail.seasons?.[state.data.selection.season || Object.keys(detail.seasons || {})[0] || '1'] || {};
  const list = season[state.data.selection.dub] || Object.values(season).find(value => Array.isArray(value) && value.length) || [];
  return list.find(item => Number(item.episode) === Number(state.data.episode)) || list[0] || null;
}
function renderParty() {
  const data = state.data || {};
  const live = data.status === 'live' && data.selection;
  $('partySection').hidden = !live;
  if (!live) return;
  $('streamTitle').textContent = data.anime?.title || 'Трансляція';
  $('episodeLabel').textContent = `Серія ${data.episode || 1} з ${data.anime?.episodesTotal || data.selection.episodes} · сесія ${data.sessionEpisode || 1}/${data.selection.episodes}`;
  $('syncBadge').textContent = state.user?.isAdmin ? 'Ти ведеш ефір' : 'Синхронізовано';
  $('siteLink').hidden = !data.anime?.siteUrl;
  if (data.anime?.siteUrl) $('siteLink').href = data.anime.siteUrl;
  const entry = episodeEntry();
  const rawSource = String(entry?.file || '').trim();
  const needsResolve = rawSource.toLowerCase().includes('ashdi.vip/vod/');
  const source = state.sourceCache.get(rawSource) || (needsResolve ? '' : rawSource);
  const video = $('partyVideo');
  if (source && video.dataset.source !== source) { video.dataset.source = source; video.src = source; video.load(); }
  if (!source && video.dataset.source) { video.dataset.source = ''; video.removeAttribute('src'); video.load(); }
  $('videoEmpty').hidden = !source;
  $('videoEmpty').querySelector('strong').textContent = needsResolve ? 'Підключаємо ASHDI через VakDab' : state.detail ? 'Відео готується' : 'Завантажуємо серію з VakDab';
  $('streamSourceLabel').textContent = `${data.selection.dub || 'Озвучка сайту'} · джерело VakDab`;
  if (needsResolve && !source) prepareVideoSource(rawSource);
}
async function prepareVideoSource(rawSource) {
  if (!rawSource || state.sourceCache.has(rawSource) || state.sourceLoading === rawSource) return;
  state.sourceLoading = rawSource;
  try {
    const response = await fetch(`${SOURCE_PROXY}/?url=${encodeURIComponent(rawSource)}&force_ua=desktop`, { headers: { accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`ASHDI proxy ${response.status}`);
    const html = (await response.text()).replaceAll('\\\\u002F', '/').replaceAll('\\\\/', '/').replaceAll('&amp;', '&').replaceAll('"', ' ').replaceAll("'", ' ').replaceAll('<', ' ').replaceAll('>', ' ').replaceAll('\\n', ' ').replaceAll('\\r', ' ').replaceAll('\\t', ' ');
    const matches = html.split(' ').filter(value => value.startsWith('http') && value.includes('.m3u8'));
    const manifest = matches.find(url => url.toLowerCase().includes('ashdi.vip') || url.toLowerCase().includes('video')) || matches[0];
    if (!manifest) throw new Error('ASHDI manifest не знайдено');
    const forceUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ? 'mobile' : 'desktop';
    state.sourceCache.set(rawSource, `${SOURCE_PROXY}/?url=${encodeURIComponent(manifest)}&force_ua=${forceUA}`);
    renderParty();
  } catch (error) { console.warn('[Watch Party] source resolve:', error); showToast('Серія поки недоступна через source proxy'); }
  finally { state.sourceLoading = ''; }
}

async function loadState(silent = true) {
  try { const result = await request(); state.data = result.state || {}; state.user = result.user || null; renderState(); await loadCatalogDetails(); renderState(); syncVideo(); }
  catch (error) { console.warn('[Watch Party] load:', error); const authError = /telegram|некоректні дані|401/i.test(String(error?.message || '')); $('roomState').textContent = authError ? 'Відкрий через Telegram' : 'Немає з’єднання'; if (!silent) showToast(authError ? 'Відкрий Watch Party через Telegram' : (error.message || 'Немає з’єднання')); }
}
async function loadCatalogDetails() {
  const catalogUrl = String(state.data?.anime?.catalogUrl || '');
  if (!catalogUrl || state.detailKey === catalogUrl) return;
  state.detailKey = catalogUrl;
  try {
    const response = await fetch(`${HIKKA_PROXY}/?url=${encodeURIComponent(catalogUrl)}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Hikka ${response.status}`);
    const anime = await response.json();
    const external = Array.isArray(anime.external) ? anime.external : [];
    const mikai = external.find(item => /^https?:\/\/(?:www\.)?mikai\.me\/anime\//i.test(String(item?.url || '')))?.url || '';
    const animeOn = external.find(item => /^https?:\/\/(?:www\.)?animeon\.club\/anime\//i.test(String(item?.url || '')))?.url || '';
    if (mikai) {
      const htmlResponse = await fetch(`${SOURCE_PROXY}/?url=${encodeURIComponent(mikai)}&force_ua=desktop`, { headers: { accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(20000) });
      state.detail = parseMikaiDetails(await htmlResponse.text());
    } else if (animeOn) {
      state.detail = await loadAnimeOnDetails(animeOn);
    } else state.detail = { dubs: [], seasons: {} };
    const dubs = state.detail.dubs || [];
    if (dubs.length) { const result = await request('catalog_meta', { dubs, episodesTotal: Math.max(...Object.values(state.detail.seasons || {}).flatMap(season => Object.values(season).flatMap(list => list.map(item => Number(item.episode) || 0))), 0) }); state.data = result.state || state.data; }
  } catch (error) { console.warn('[Watch Party] catalog details:', error); state.detail = { dubs: [], seasons: {} }; }
}
async function loadAnimeOnDetails(animeOnUrl) {
  const id = String(animeOnUrl).match(new RegExp('/anime/(\\\\d+)', 'i'))?.[1];
  if (!id) return { dubs: [], seasons: {} };
  const fetchJson = async path => { const response = await fetch(`${SOURCE_PROXY}/?url=${encodeURIComponent(path)}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15000) }); if (!response.ok) throw new Error(`AnimeON ${response.status}`); return response.json(); };
  const data = await fetchJson(`https://animeon.club/api/player/${id}/translations`);
  const ranked = (Array.isArray(data?.translations) ? data.translations : []).slice().sort((a, b) => (Number(b?.player?.[0]?.episodesCount) || 0) - (Number(a?.player?.[0]?.episodesCount) || 0));
  const selected = ranked.find(item => (item?.player || []).some(player => Number(player?.episodesCount) > 0)) || ranked[0];
  const translation = selected?.translation; const player = (selected?.player || []).slice().sort((a, b) => (Number(b?.episodesCount) || 0) - (Number(a?.episodesCount) || 0))[0];
  if (!translation || !player) return { dubs: [], seasons: {} };
  const episodesData = await fetchJson(`https://animeon.club/api/player/${id}/episodes?take=100&skip=-1&playerId=${encodeURIComponent(player.id)}&translationId=${encodeURIComponent(translation.id)}&includeAlternative=true`);
  const refs = Array.isArray(episodesData?.episodes) ? episodesData.episodes : [];
  const loaded = await Promise.all(refs.map(async ref => { try { const episode = await fetchJson(`https://animeon.club/api/player/${encodeURIComponent(ref.id)}/episode`); const file = String(episode?.videoUrl || '').trim(); return file ? { episode: String(ref.episode), file, dub: String(translation.name || 'AnimeON') } : null; } catch { return null; } }));
  const list = loaded.filter(Boolean).sort((a, b) => Number(a.episode) - Number(b.episode)); const dub = String(translation.name || 'AnimeON');
  return { dubs: list.length ? [dub] : [], seasons: list.length ? { '1': { [dub]: list } } : {} };
}
function resolveNuxt(payload) {
  const memo = new Map(); const resolving = new Set();
    const resolve = index => { if (!Number.isInteger(index) || index < 0 || index >= payload.length) return index; if (memo.has(index)) return memo.get(index); if (resolving.has(index)) return null; resolving.add(index); const raw = payload[index]; let value; if (typeof raw === 'number') value = resolve(raw); else if (Array.isArray(raw)) { const tag = typeof raw[0] === 'string' ? raw[0] : ''; value = ['ShallowReactive', 'Reactive', 'Set', 'Date', 'URL'].includes(tag) && raw.length > 1 ? resolve(raw[1]) : raw.map(item => typeof item === 'number' ? resolve(item) : item); } else if (raw && typeof raw === 'object') value = Object.fromEntries(Object.entries(raw).map(([key, item]) => [key, typeof item === 'number' ? resolve(item) : item])); else value = raw; resolving.delete(index); memo.set(index, value); return value; };
  return payload.map((_, index) => resolve(index));
}
function parseMikaiDetails(html) {
  const script = String(html || '').match(/<script[^>]+id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i); if (!script) return { dubs: [], seasons: {} };
  let payload; try { payload = JSON.parse(script[1]); } catch { return { dubs: [], seasons: {} }; }
  const resolved = resolveNuxt(payload); const seasons = {}; const names = new Set();
  resolved.forEach(value => {
    if (!Array.isArray(value?.players)) return;
    value.players.forEach(group => { if (!group || !Array.isArray(group.providers) || group.isSubs) return; const team = String(group.team?.name || 'Озвучка сайту').trim(); const episodes = []; group.providers.filter(provider => String(provider?.name || '').toUpperCase() === 'ASHDI').forEach(provider => (provider.episodes || []).forEach(ep => { const number = String(ep?.number ?? '').trim(); const file = String(ep?.playLink || '').trim(); if (number && file && !episodes.some(item => item.episode === number)) episodes.push({ episode: number, file: file.includes('?') ? `${file}&nopl` : `${file}?nopl`, dub: team }); })); if (episodes.length) { episodes.sort((a, b) => Number(a.episode) - Number(b.episode)); names.add(team); seasons['1'] ||= {}; seasons['1'][team] = episodes; } });
  });
  return { dubs: [...names], seasons };
}
async function perform(action, payload = {}) { try { const result = await request(action, payload); state.data = result.state || state.data; state.user = result.user || state.user; renderState(); showToast('Збережено'); } catch (error) { showToast(error.message || 'Дія не виконана'); } }
async function saveChoice() { if (!tg?.initData) { showToast('Відкрий Watch Party через Telegram'); return; } await perform('choose', { time: $('choiceTime').value, episodes: $('choiceEpisodes').value, dub: $('choiceDub').value }); }
function expectedPosition() { const data = state.data; if (!data || data.status !== 'live') return 0; return Math.max(0, Number(data.position || 0) + (data.playing ? (Date.now() - Number(data.updatedAt || Date.now())) / 1000 : 0)); }
function syncVideo() { const video = $('partyVideo'); if (!state.data || state.data.status !== 'live' || !video.dataset.source) return; const expected = expectedPosition(); if (Number.isFinite(expected) && Math.abs(video.currentTime - expected) > 3) { state.renderingVideo = true; try { video.currentTime = expected; } catch {} setTimeout(() => { state.renderingVideo = false; }, 120); } if (state.data.playing && video.paused) video.play().catch(() => {}); if (!state.data.playing && !video.paused) video.pause(); }
function scheduleControl(force = false) { if (!state.user?.isAdmin || !state.data || state.data.status !== 'live') return; const video = $('partyVideo'); const now = Date.now(); if (!force && now - state.lastControlAt < 1500) return; state.lastControlAt = now; clearTimeout(state.controlTimer); state.controlTimer = setTimeout(() => request('control', { playing: !video.paused, position: Number(video.currentTime || 0) }).catch(() => {}), force ? 0 : 200); }
async function sendChat(event) { event.preventDefault(); const input = $('chatInput'); const text = input.value.trim(); if (!text || state.data?.status !== 'live') return; input.disabled = true; try { await perform('chat', { text }); input.value = ''; } finally { input.disabled = false; input.focus(); } }
function bindEvents() {
  $('refreshButton').addEventListener('click', () => loadState(false));
  $('profileButton').addEventListener('click', () => { if (!tg?.initData) showToast('Відкрий застосунок через Telegram'); });
  $('saveChoiceButton').addEventListener('click', saveChoice);
  $('startButton').addEventListener('click', () => perform('start'));
  $('nextEpisodeButton').addEventListener('click', () => perform('next_episode'));
  $('finishButton').addEventListener('click', () => perform('finish'));
  $('resetButton').addEventListener('click', () => perform('reset'));
  $('chatForm').addEventListener('submit', sendChat);
  const video = $('partyVideo'); video.addEventListener('play', () => scheduleControl(true)); video.addEventListener('pause', () => scheduleControl(true)); video.addEventListener('seeked', () => scheduleControl(true)); video.addEventListener('timeupdate', () => scheduleControl(false)); video.addEventListener('error', () => { if (state.user?.isAdmin) showToast('Не вдалося завантажити серію з сайту VakDab'); });
}
async function init() { bindEvents(); await loadState(false); state.pollTimer = setInterval(() => loadState(true), 5000); state.syncTimer = setInterval(syncVideo, 1000); }
init().catch(error => { console.error('[Watch Party] init failed:', error); showToast('Не вдалося запустити Watch Party'); });
