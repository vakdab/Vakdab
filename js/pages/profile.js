import { Auth } from "../auth/auth.js";
import { Storage } from "../storage/storage.js";
import { getAchievements } from "../features/achievements.js";
import { DailyStats } from "../features/daily-tasks.js";
import { calcTotalXP, getLevel } from "../features/xp-system.js";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "../config/constants.js";
import { openPlayerPage } from "../player/player-page.js";

export function getDefaultProfile() {
  return { nickname: 'Користувач', avatar: '', banner: '', bio: 'Аніме ентузіаст.' };
}
export function getProfile() { return Storage.getProfile() || getDefaultProfile(); }
export function saveProfile(data) { Storage.setProfile(data); }

export function getProfileStats() {
  const history = Storage.getHistory();
  const bookmarks = Storage.getBookmarks();
  const uniqueAnime = new Set(history.map(h => h.animeId || h.title));
  const totalEpisodes = history.length;
  const totalWatchTime = Storage.getWatchTime() || history.reduce((sum, h) => sum + (h.duration || 0), 0);
  const hours = Math.floor(totalWatchTime / 3600);
  const minutes = Math.floor((totalWatchTime % 3600) / 60);
  const stats = { episodes: totalEpisodes, watchTime: totalWatchTime, bookmarks: bookmarks.length, xp: calcTotalXP(), level: getLevel(calcTotalXP()), posts: DailyStats.getTotalPosts(), ratings: DailyStats.getTotalRatings() };
  const achievements = getAchievements(stats);
  return {
    viewed: totalEpisodes,
    bookmarks: bookmarks.length,
    achievements: achievements.filter(a => a.unlocked).length,
    totalAchievements: achievements.length,
    watchHours: hours, watchMinutes: minutes,
    totalWatchTime,
    uniqueAnime: uniqueAnime.size,
    achievementsList: achievements,
    history: history.slice(0, 50),
    bookmarksList: bookmarks
  };
}

export function renderProfilePage() {
  const container = document.getElementById('profilePageContainer');
  if (!container) return;
  if (!Auth.isAuthenticated() && !Auth.isGuest()) { renderAuthPage(); return; }
  const isGuestMode = Auth.isGuest();
  const profile = getProfile();
  const stats = getProfileStats();
  container.innerHTML = `
    <div class="profile-wrapper">
      <div class="profile-banner" onclick="document.getElementById('bannerFileInput').click()">
        <img src="${profile.banner}" alt="banner" onerror="this.style.display='none'">
        <div class="profile-banner-overlay"></div>
        <div class="profile-banner-edit"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></div>
      </div>
      <div class="profile-info">
        <div class="profile-avatar-wrap" onclick="document.getElementById('avatarFileInput').click()">
          <div class="profile-avatar"><img src="${profile.avatar}" alt="avatar" onerror="this.style.display='none'; this.parentElement.querySelector('.avatar-placeholder').style.display='flex'"><span class="avatar-placeholder" style="display:none;">${profile.nickname.charAt(0).toUpperCase()}</span></div>
          <div class="profile-avatar-badge"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></div>
        </div>
        <div class="profile-nick-row"><span class="profile-nick" id="profileNickText">${profile.nickname}</span><button class="profile-nick-edit-btn" onclick="window.profileEditNick()"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button></div>
        <div class="profile-meta"><span>@${profile.nickname.toLowerCase().replace(/\s/g,'_')}</span></div>
        <div class="profile-bio-row"><div class="profile-bio" id="profileBioText">${profile.bio}</div><button class="profile-bio-edit-btn" onclick="window.profileEditBio()"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button></div>
        <div class="profile-stats"><div class="profile-stat-pill"><div class="num">${stats.viewed}</div><div class="label">Переглянуто</div></div><div class="profile-stat-pill"><div class="num">${stats.bookmarks}</div><div class="label">Закладки</div></div><div class="profile-stat-pill"><div class="num">${stats.achievements}</div><div class="label">Досягнень</div></div></div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;"><button class="btn-outline" id="profileLogoutBtn" onclick="Auth.handleExit()" style="font-size:0.8rem;padding:0.3rem 1rem;min-height:36px;"><i class="fas fa-sign-out-alt"></i> ${isGuestMode ? 'Увійти' : 'Вийти'}</button></div>
      </div>
    </div>
    <div class="profile-tabs" id="profileTabs">
      <button class="profile-tab active" data-tab="history"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg> Історія</button>
      <button class="profile-tab" data-tab="bookmarks"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z"/></svg> Закладки</button>
      <button class="profile-tab" data-tab="achievements"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.04 2.6a1 1 0 0 1 1.92 0l1.7 5.18a1 1 0 0 0 .95.69h5.47a1 1 0 0 1 .59 1.8l-4.43 3.22a1 1 0 0 0-.36 1.12l1.7 5.18a1 1 0 0 1-1.54 1.12l-4.42-3.22a1 1 0 0 0-1.18 0l-4.42 3.22a1 1 0 0 1-1.54-1.12l1.7-5.18a1 1 0 0 0-.36-1.12L3.3 10.27a1 1 0 0 1 .59-1.8h5.47a1 1 0 0 0 .95-.69l1.7-5.18z"/></svg> Досягнення</button>
    </div>
    <div id="profilePanels">
      <div class="profile-panel active" id="profilePanel-history">${renderHistoryPanel(stats.history)}</div>
      <div class="profile-panel" id="profilePanel-bookmarks">${renderBookmarksPanel(stats.bookmarksList)}</div>
      <div class="profile-panel" id="profilePanel-achievements">${renderAchievementsPanel(stats.achievementsList, stats.totalWatchTime)}</div>
    </div>
  `;
  document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const target = this.dataset.tab;
      document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.profile-panel').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('profilePanel-' + target).classList.add('active');
    });
  });
  if (isGuestMode) {
    const logoutBtn = document.getElementById('profileLogoutBtn');
    if (logoutBtn) { logoutBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Увійти'; logoutBtn.onclick = () => { Auth.setGuest(false); renderAuthPage(); }; }
  }
}

function renderHistoryPanel(history) {
  if (!history || !history.length) return `<div class="profile-empty"><i class="fas fa-history"></i><p>Історія переглядів порожня</p></div>`;
  let html = `<div class="profile-panel-header"><span class="profile-panel-title">Історія перегляду</span><span class="profile-panel-count">${history.length} серій</span></div><div class="profile-history-list">`;
  history.slice(0, 30).forEach(item => {
    const poster = item.poster || '';
    const title = (item.title || 'Без назви').length > 38 ? item.title.substring(0,38)+'…' : item.title;
    const ep = item.episode || '?';
    const season = item.season || '';
    const time = item.timestamp ? new Date(item.timestamp).toLocaleDateString('uk-UA') : 'невідомо';
    const progress = item.progress || 0;
    let epLabel = `Серія ${ep}`; if (season) epLabel = `Сезон ${season}, ${epLabel}`;
    html += `
      <div class="profile-history-item" onclick="openPlayerPage('${item.url || ''}')">
        <div class="profile-thumb">${poster ? `<img src="${poster}" alt="${title}" onerror="this.style.display='none'">` : ''}<span class="profile-thumb-placeholder" style="${poster?'display:none;':''}"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg></span></div>
        <div class="profile-h-info"><div class="profile-h-title">${title}</div><div class="profile-h-sub"><span>${epLabel}</span><span class="dot"></span><span>${time}</span></div></div>
        <div class="profile-h-progress"><div class="profile-h-progress-fill" style="width:${Math.min(progress,100)}%"></div></div>
      </div>`;
  });
  html += `</div>`;
  return html;
}
function renderBookmarksPanel(bookmarks) {
  if (!bookmarks || !bookmarks.length) return `<div class="profile-empty"><i class="fas fa-bookmark"></i><p>Немає збережених закладок</p></div>`;
  let html = `<div class="profile-panel-header"><span class="profile-panel-title">Закладки</span><span class="profile-panel-count">${bookmarks.length}</span></div><div class="profile-bookmark-grid">`;
  bookmarks.slice(0, 30).forEach(item => {
    const poster = item.poster || '';
    const title = (item.title || 'Без назви').length > 38 ? item.title.substring(0,38)+'…' : item.title;
    const sub = item.episodes || '';
    html += `
      <div class="profile-bookmark-card" onclick="openPlayerPage('${item.url || ''}')">
        <div class="profile-bm-thumb">${poster ? `<img src="${poster}" alt="${title}" onerror="this.style.display='none'">` : ''}<span class="profile-bm-thumb-ph" style="${poster?'display:none;':''}"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg></span></div>
        <div class="profile-bm-info"><div class="profile-bm-title">${title}</div><div class="profile-bm-sub">${sub || 'Збережено'}</div></div>
      </div>`;
  });
  html += `</div>`;
  return html;
}
function renderAchievementsPanel(achievements, totalWatchTime) {
  const hours = Math.floor(totalWatchTime / 3600);
  const minutes = Math.floor((totalWatchTime % 3600) / 60);
  let html = `
    <div class="profile-watch-card"><div class="profile-wt-label">Загальний час перегляду аніме</div><div class="profile-wt-value">${hours}<span class="profile-wt-unit">год</span> ${minutes}<span class="profile-wt-unit">хв</span></div><div class="profile-wt-sub">≈ ${Math.round(totalWatchTime/3600*10)/10} годин · ${Storage.getHistory().length} серій</div></div>
    <div class="profile-panel-header"><span class="profile-panel-title">Досягнення</span><span class="profile-panel-count">${achievements.filter(a=>a.unlocked).length} / ${achievements.length}</span></div>
    <div class="profile-achievement-list">`;
  achievements.forEach(a => {
    html += `<div class="profile-achievement ${a.unlocked?'':'locked'}"><div class="profile-ach-icon">${a.icon}</div><div class="profile-ach-info"><div class="profile-ach-name">${a.name}</div><div class="profile-ach-value">${a.description}</div></div><div class="profile-ach-badge">${a.unlocked ? 'Виконано' : (a.progress < 100 ? Math.round(a.progress)+'%' : 'Заблоковано')}</div></div>`;
  });
  html += `</div>`;
  return html;
}

export function renderAuthPage() {
  const container = document.getElementById('profilePageContainer');
  if (!container) return;
  container.innerHTML = `
    <div class="auth-card">
      <div class="mark"></div>
      <h1 id="authTitle">З поверненням</h1>
      <p class="sub" id="authSub">Увійдіть, щоб продовжити роботу з акаунтом.</p>
      <div class="switcher" id="authSwitcher">
        <div class="switcher-thumb"></div>
        <button type="button" class="active" data-mode="login">Вхід</button>
        <button type="button" data-mode="register">Реєстрація</button>
      </div>
      <button class="google-btn" type="button" id="authGoogleBtn"><svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.7 0-14.3 4.3-17.7 10.2z"/><path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5.2c-2 1.5-4.5 2.3-7.1 2.3-5.3 0-9.6-3.6-11.2-8.4l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.1 5.2C40.8 36.4 43.5 30.7 43.5 24c0-1.2-.1-2.4-.4-3.5z"/></svg> Продовжити через Google</button>
      <div class="divider">або через email</div>
      <div class="panel active" id="authPanel-login"><form id="authLoginForm"><div class="field"><label for="loginEmail">Email</label><input id="loginEmail" type="email" placeholder="you@example.com" required autocomplete="email"></div><div class="field"><label for="loginPass">Пароль</label><input id="loginPass" type="password" placeholder="••••••••" required autocomplete="current-password"></div><div class="row-between"><label class="remember"><input type="checkbox" id="loginRemember">Запам'ятати мене</label><a href="#" onclick="showToast('Скидання пароля — звʼяжіться з підтримкою');return false;">Забули пароль?</a></div><div class="auth-error" id="authError"></div><button class="submit-btn" type="submit" id="authLoginSubmit">Увійти</button></form></div>
      <div class="panel" id="authPanel-register"><form id="authRegisterForm"><div class="field"><label for="regName">Ім'я</label><input id="regName" type="text" placeholder="Ваше ім'я" required autocomplete="name"></div><div class="field"><label for="regEmail">Email</label><input id="regEmail" type="email" placeholder="you@example.com" required autocomplete="email"></div><div class="field"><label for="regPass">Пароль</label><input id="regPass" type="password" placeholder="Мінімум 6 символів" required autocomplete="new-password" minlength="6"></div><div class="auth-error" id="authErrorReg"></div><button class="submit-btn" type="submit" id="authRegisterSubmit">Створити акаунт</button></form></div>
      <button class="guest-btn" type="button" id="authGuestBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4.5"/></svg> Продовжити як гість</button>
      <p class="foot-note" id="authFootNote">Ще немає акаунта? <button type="button" id="authFootToggle">Зареєструватися</button></p>
    </div>`;
  const switcher = document.getElementById('authSwitcher');
  const btnLogin = switcher.querySelector('[data-mode="login"]');
  const btnRegister = switcher.querySelector('[data-mode="register"]');
  const panelLogin = document.getElementById('authPanel-login');
  const panelRegister = document.getElementById('authPanel-register');
  const title = document.getElementById('authTitle');
  const sub = document.getElementById('authSub');
  const footNote = document.getElementById('authFootNote');
  function setMode(mode) {
    btnLogin.classList.toggle('active', mode === 'login');
    btnRegister.classList.toggle('active', mode === 'register');
    switcher.classList.toggle('mode-register', mode === 'register');
    panelLogin.classList.toggle('active', mode === 'login');
    panelRegister.classList.toggle('active', mode === 'register');
    if (mode === 'login') { title.textContent = 'З поверненням'; sub.textContent = 'Увійдіть, щоб продовжити роботу з акаунтом.'; footNote.innerHTML = 'Ще немає акаунта? <button type="button" id="authFootToggle">Зареєструватися</button>'; }
    else { title.textContent = 'Створити акаунт'; sub.textContent = 'Зареєструйтеся, щоб почати користуватися сервісом.'; footNote.innerHTML = 'Вже маєте акаунт? <button type="button" id="authFootToggle">Увійти</button>'; }
    document.getElementById('authFootToggle')?.addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));
    document.getElementById('authError').textContent = '';
    document.getElementById('authErrorReg').textContent = '';
  }
  btnLogin.addEventListener('click', () => setMode('login'));
  btnRegister.addEventListener('click', () => setMode('register'));
  if (document.getElementById('authFootToggle')) document.getElementById('authFootToggle').addEventListener('click', () => setMode('register'));

  document.getElementById('authLoginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;
    const errorEl = document.getElementById('authError');
    if (!email || !pass) { errorEl.textContent = 'Будь ласка, заповніть усі поля.'; return; }
    const submitBtn = document.getElementById('authLoginSubmit');
    submitBtn.disabled = true; submitBtn.textContent = 'Вхід...';
    const result = await Auth.login(email, pass);
    submitBtn.disabled = false; submitBtn.textContent = 'Увійти';
    if (!result.success) errorEl.textContent = result.error || 'Помилка входу';
    else renderProfilePage();
  });
  document.getElementById('authRegisterForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const errorEl = document.getElementById('authErrorReg');
    if (!name || !email || !pass) { errorEl.textContent = 'Будь ласка, заповніть усі поля.'; return; }
    if (pass.length < 6) { errorEl.textContent = 'Пароль має містити щонайменше 6 символів.'; return; }
    const submitBtn = document.getElementById('authRegisterSubmit');
    submitBtn.disabled = true; submitBtn.textContent = 'Створення...';
    const result = await Auth.register(email, pass, name);
    submitBtn.disabled = false; submitBtn.textContent = 'Створити акаунт';
    if (!result.success) errorEl.textContent = result.error || 'Помилка реєстрації';
    else renderProfilePage();
  });
  document.getElementById('authGoogleBtn').addEventListener('click', async function() {
    this.disabled = true; this.textContent = 'Завантаження...';
    const result = await Auth.signInWithGoogle();
    this.disabled = false; this.innerHTML = '<svg viewBox="0 0 48 48">...</svg> Продовжити через Google';
    if (!result.success) document.getElementById('authError').textContent = result.error || 'Помилка Google входу';
    else renderProfilePage();
  });
  document.getElementById('authGuestBtn').addEventListener('click', () => { Auth.setGuest(true); showToast('Продовжуємо як гість'); Router.showProfile(); });
}

export function profileEditNick() {
  const nickEl = document.getElementById('profileNickText');
  if (!nickEl) return;
  const current = nickEl.textContent;
  const input = document.createElement('input');
  input.type = 'text'; input.value = current;
  input.style.cssText = 'font-size:20px;font-weight:700;letter-spacing:-0.5px;color:var(--text);background:var(--tag-bg);border:1px solid var(--border);border-radius:8px;padding:2px 8px;outline:none;width:180px;font-family:inherit;';
  if (document.body.classList.contains('dark-mode')) { input.style.background = '#1a1a1a'; input.style.color = '#f7f7f7'; input.style.borderColor = '#333'; }
  nickEl.replaceWith(input); input.focus(); input.select();
  const save = () => {
    const val = input.value.trim() || current;
    const span = document.createElement('span'); span.className = 'profile-nick'; span.id = 'profileNickText'; span.textContent = val;
    input.replaceWith(span);
    const profile = getProfile(); profile.nickname = val; saveProfile(profile);
    const meta = document.querySelector('.profile-meta'); if (meta) { const first = meta.querySelector('span:first-child'); if (first) first.textContent = '@' + val.toLowerCase().replace(/\s/g, '_'); }
    if (Router.currentRoute === 'profile') renderProfilePage();
  };
  input.addEventListener('blur', save);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = current; input.blur(); } });
}
export function profileEditBio() {
  const bioEl = document.getElementById('profileBioText');
  if (!bioEl) return;
  const current = bioEl.textContent;
  const textarea = document.createElement('textarea');
  textarea.value = current;
  textarea.style.cssText = 'font-size:13px;line-height:1.6;color:var(--text-secondary);background:var(--tag-bg);border:1px solid var(--border);border-radius:8px;padding:6px 8px;outline:none;width:100%;font-family:inherit;resize:vertical;min-height:60px;';
  if (document.body.classList.contains('dark-mode')) { textarea.style.background = '#1a1a1a'; textarea.style.color = '#cfcfcf'; textarea.style.borderColor = '#333'; }
  bioEl.replaceWith(textarea); textarea.focus(); textarea.select();
  const save = () => {
    const val = textarea.value.trim() || current;
    const div = document.createElement('div'); div.className = 'profile-bio'; div.id = 'profileBioText'; div.textContent = val;
    textarea.replaceWith(div);
    const profile = getProfile(); profile.bio = val; saveProfile(profile);
    if (Router.currentRoute === 'profile') renderProfilePage();
  };
  textarea.addEventListener('blur', save);
  textarea.addEventListener('keydown', (e) => { if (e.key === 'Escape') { textarea.value = current; textarea.blur(); } if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) textarea.blur(); });
}

async function uploadToCloudinary(file, maxW, maxH, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(ev) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let w = img.width, hh = img.height;
        if (w > maxW) { hh = hh * (maxW / w); w = maxW; }
        if (hh > maxH) { w = w * (maxH / hh); hh = maxH; }
        canvas.width = Math.round(w); canvas.height = Math.round(hh);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
          const formData = new FormData();
          formData.append('file', blob, 'upload.jpg');
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
          fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData, mode: 'cors', credentials: 'omit' })
            .then(res => res.json())
            .then(data => { if (data.secure_url) resolve(data.secure_url); else reject(new Error('Cloudinary error')); })
            .catch(reject);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

document.getElementById('avatarFileInput').addEventListener('change', async function(e) {
  const file = e.target.files[0];
  if (!file) return;
  showToast('Завантаження аватарки...');
  try {
    const url = await uploadToCloudinary(file, 256, 256, 0.7);
    const profile = getProfile(); profile.avatar = url; saveProfile(profile);
    if (Router.currentRoute === 'profile') renderProfilePage();
    showToast('Аватарку оновлено');
  } catch { showToast('Помилка завантаження аватарки'); }
  e.target.value = '';
});
document.getElementById('bannerFileInput').addEventListener('change', async function(e) {
  const file = e.target.files[0];
  if (!file) return;
  showToast('Завантаження банера...');
  try {
    const url = await uploadToCloudinary(file, 1200, 400, 0.7);
    const profile = getProfile(); profile.banner = url; saveProfile(profile);
    if (Router.currentRoute === 'profile') renderProfilePage();
    showToast('Банер оновлено');
  } catch { showToast('Помилка завантаження банера'); }
  e.target.value = '';
});
