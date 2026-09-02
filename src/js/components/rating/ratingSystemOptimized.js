import { Auth } from '../../core/compat/auth.js?v=20260824-settings-redesign-v1';
import { Router } from '../../core/compat/router.js?v=20260901-home-recs-v3';
import { Storage } from '../../core/compat/storage.js?v=20260824-settings-redesign-v1';
import { db, auth, initialized as firebaseInitialized } from '../../services/firebase/client.js';
import { collection, limit, onSnapshot, query, signInAnonymously } from '../../config/firebase.js';
import { LRUCache, throttle } from '../../utils/lru-cache.js';

/**
 * Firestore Listener Manager — запобігає витоку пам'яті
 */
class FirestoreListenerManager {
  constructor() {
    this.unsubscribers = [];
  }

  subscribe(q, callback, errorCallback) {
    const unsub = onSnapshot(q, callback, errorCallback);
    this.unsubscribers.push(unsub);
    return unsub;
  }

  unsubscribeAll() {
    this.unsubscribers.forEach(fn => {
      try { fn(); } catch (e) { console.warn('Unsub error:', e); }
    });
    this.unsubscribers = [];
  }
}

const firestoreListenerManager = new FirestoreListenerManager();
const leaderboardCache = new LRUCache(500);

/**
 * HTML-екранування
 */
function escapeRatingHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function isVideoUrl(url) {
  return typeof url === 'string' && (
    /\/video\/upload\//i.test(url) || 
    /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(url)
  );
}

function isGifUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith('.gif') || lower.includes('.gif?') || lower.includes('.gif/');
}

function ratingProfileMediaMarkup(profile, className) {
  const url = profile.avatarVideo || profile.avatar || '';
  if (!url) {
    return `<span>${escapeRatingHtml((profile.nickname || '?').slice(0, 1).toUpperCase())}</span>`;
  }
  const safeUrl = escapeRatingHtml(url);
  if (isVideoUrl(url)) {
    return `<video class="${className}" src="${safeUrl}" autoplay muted loop playsinline webkit-playsinline="true" preload="metadata" aria-label="Аватарка"></video>`;
  }
  const gifClass = isGifUrl(url) ? ' is-gif' : '';
  return `<img class="${className}${gifClass}" src="${safeUrl}" alt="" loading="lazy">`;
}

function ratingNameMarkup(profile, suffix = '') {
  return `<span class="rg-profile-name-row"><span>${escapeRatingHtml(profile.nickname || 'Гість')}</span>${suffix}</span>`;
}

function getProfile() {
  const profile = Storage.getProfile() || {};
  return {
    nickname: typeof profile.nickname === 'string' && profile.nickname.trim() 
      ? profile.nickname.trim() 
      : 'Гість',
    avatar: typeof profile.avatar === 'string' ? profile.avatar : '',
    avatarVideo: typeof profile.avatarVideo === 'string' ? profile.avatarVideo : '',
    avatarVideoSettings: profile.avatarVideoSettings || {}
  };
}

// ====================================================================
//  XP / LEVEL SYSTEM
// ====================================================================

const XP_RULES = Object.freeze({
  episode: 25,
  minute: 1,
  bookmark: 15,
  achievement: 75
});

export function calculateBaseXP({ episodes = 0, watchSeconds = 0, bookmarks = 0, posts = 0, ratings = 0 } = {}) {
  const safeEpisodes = Math.max(0, Math.floor(Number(episodes) || 0));
  const watchMinutes = Math.max(0, Math.floor((Number(watchSeconds) || 0) / 60));
  const safeBookmarks = Math.max(0, Math.floor(Number(bookmarks) || 0));

  const baseXP = safeEpisodes * XP_RULES.episode + 
                 watchMinutes * XP_RULES.minute + 
                 safeBookmarks * XP_RULES.bookmark;

  let totalXP = baseXP;
  for (let pass = 0; pass < 5; pass++) {
    const achStats = { 
      episodes: safeEpisodes, 
      watchMinutes, 
      bookmarks: safeBookmarks, 
      xp: totalXP, 
      level: getLevel(totalXP)
    };
    const earnedCount = ACHIEVEMENTS.filter(a => achStats[a.field] >= a.need).length;
    const nextXP = baseXP + earnedCount * XP_RULES.achievement;
    if (nextXP === totalXP) break;
    totalXP = nextXP;
  }
  return totalXP;
}

export function calcTotalXP() {
  const history = Storage.getHistory() || [];
  const bookmarks = Storage.getBookmarks() || [];
  return calculateBaseXP({
    episodes: history.length,
    watchSeconds: Storage.getWatchTime() || 0,
    bookmarks: bookmarks.length,
    posts: DailyStats.getTotalPosts(),
    ratings: DailyStats.getTotalRatings()
  });
}

export function getLevel(xp) {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

export function getXPForLevel(level) {
  return Math.pow(level - 1, 2) * 50;
}

export function getXPProgress(xp) {
  const level = getLevel(xp);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const into = xp - currentLevelXP;
  const needed = nextLevelXP - currentLevelXP;
  return {
    level,
    pct: needed > 0 ? Math.min(100, Math.round(into / needed * 100)) : 100,
    into,
    needed
  };
}

// ====================================================================
//  DAILY STATS / TASKS
// ====================================================================

const DAILY_TASK_POOL = [
  { id: 'dt1', field: 'episodesToday', target: 1, xp: 35, desc: 'Перегляньте 1 серію сьогодні' },
  { id: 'dt2', field: 'episodesToday', target: 2, xp: 50, desc: 'Подивіться 2 серії за день' },
  { id: 'dt3', field: 'episodesToday', target: 3, xp: 65, desc: 'Перегляньте 3 серії аніме' },
];

function _todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function _loadDailyState() {
  let st;
  try { st = JSON.parse(localStorage.getItem('vakdab_daily_state') || 'null'); } catch { st = null; }
  const today = _todayStr();
  if (!st || st.date !== today) {
    const pool = [...DAILY_TASK_POOL];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    st = {
      date: today,
      taskIds: pool.slice(0, 10).map(t => t.id),
      stats: { episodesToday: 0, minutesToday: 0, bookmarksToday: 0, postsToday: 0, likesToday: 0, searchesToday: 0, uniqueAnime: [] },
      completed: []
    };
    try { localStorage.setItem('vakdab_daily_state', JSON.stringify(st)); } catch {}
  }
  return st;
}

export const DailyStats = {
  increment(field, amount = 1) {
    const st = _loadDailyState();
    st.stats[field] = (st.stats[field] || 0) + amount;
    try { localStorage.setItem('vakdab_daily_state', JSON.stringify(st)); } catch {}
  },
  getTotalPosts() {
    try { return parseInt(localStorage.getItem('vakdab_total_posts') || '0', 10) || 0; } catch { return 0; }
  },
  getTotalRatings() {
    try { return parseInt(localStorage.getItem('vakdab_total_ratings') || '0', 10) || 0; } catch { return 0; }
  }
};

// ====================================================================
//  ACHIEVEMENTS
// ====================================================================

export const ACHIEVEMENTS = [
  { id: 'ep1', field: 'episodes', need: 1, name: 'Перший крок', req: '1 серія' },
  { id: 'ep5', field: 'episodes', need: 5, name: 'Розігрів', req: '5 серій' },
  { id: 'ep10', field: 'episodes', need: 10, name: '10 серій', req: '10 серій' },
  { id: 'h1', field: 'watchMinutes', need: 60, name: 'Перший час', req: '60 хвилин' },
  { id: 'h100', field: 'watchMinutes', need: 6000, name: '100 годин', req: '6000 хвилин' },
];

export function getUserRankInfo(episodes, watchMinutes) {
  if (watchMinutes >= 2000) return { label: 'Легенда аніме', color: 'var(--accent)' };
  if (watchMinutes >= 1000) return { label: 'Майстер', color: 'var(--text)' };
  if (watchMinutes >= 500) return { label: 'Ветеран', color: 'var(--text-secondary)' };
  if (watchMinutes >= 200) return { label: 'Досвідчений', color: 'var(--text-secondary)' };
  if (watchMinutes >= 60) return { label: 'Початківець', color: 'var(--text-muted)' };
  return { label: 'Новачок', color: 'var(--text-muted)' };
}

// ====================================================================
//  RATING PAGE INIT
// ====================================================================

let _lbSortKey = 'xp';
let _lbUsersCache = [];

const LB_SORT_CONFIG = {
  xp: { unit: 'XP', getVal: u => u.xp },
  episodes: { unit: 'сер.', getVal: u => u.episodes },
  minutes: { unit: 'хв', getVal: u => u.minutes },
  bookmarks: { unit: 'зак.', getVal: u => u.bookmarks }
};

export function initRatingPage() {
  const wrap = document.getElementById('ratingPageContainer');
  if (!wrap || wrap.dataset.init) return;
  wrap.dataset.init = '1';

  wrap.innerHTML = `
    <div class="rg-tab-panel active" id="rgPanelRating">
      <div id="rgMyStats"></div>
      <div id="rgDailyTasks"></div>
      <div id="rgAchievements"></div>
      <div class="rg-lb-title">Глобальний рейтинг</div>
      <div class="rg-sort-tabs" id="rgSortTabs">
        <button class="rg-sort-tab active" data-sort="xp">За XP</button>
        <button class="rg-sort-tab" data-sort="episodes">За серіями</button>
        <button class="rg-sort-tab" data-sort="minutes">За хвилинами</button>
        <button class="rg-sort-tab" data-sort="bookmarks">За закладками</button>
      </div>
      <div id="rgLeaderboard">
        <div style="display:flex;justify-content:center;padding:24px;">
          <svg style="width:22px;height:22px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
      </div>
    </div>
  `;

  wrap.querySelectorAll('.rg-sort-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      wrap.querySelectorAll('.rg-sort-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _lbSortKey = btn.dataset.sort;
      const lb = document.getElementById('rgLeaderboard');
      if (lb && _lbUsersCache.length) renderLeaderboard(lb, _lbUsersCache, _lbSortKey);
    });
  });

  loadMyStats();
  loadLeaderboard();
}

function loadMyStats() {
  const statsEl = document.getElementById('rgMyStats');
  if (!statsEl) return;

  const profile = getProfile();
  const history = Storage.getHistory() || [];
  const bookmarks = Storage.getBookmarks() || [];
  const watchSec = Storage.getWatchTime() || 0;
  const watchMinutes = Math.floor(watchSec / 60);
  const episodes = history.length;
  const rankInfo = getUserRankInfo(episodes, watchMinutes);
  const totalXP = calcTotalXP();
  const xpLvl = getLevel(totalXP);
  const xpProg = getXPProgress(totalXP);

  const avHtml = ratingProfileMediaMarkup(profile, 'rg-stats-avatar-media');

  statsEl.innerHTML = `
    <div class="rg-my-stats">
      <div class="rg-stats-top">
        <div class="rg-stats-avatar">${avHtml}</div>
        <div>
          <div class="rg-stats-name">${ratingNameMarkup(profile)}</div>
          <div class="rg-stats-rank-badge">${rankInfo.label} · Lv.${xpProg.level}</div>
        </div>
      </div>
      <div class="rg-xp-bar-wrap" style="margin:10px 0 4px;">
        <div style="height:6px;border-radius:3px;background:var(--border,rgba(128,128,128,.2));overflow:hidden;">
          <div style="height:100%;width:${xpProg.pct}%;background:var(--accent);border-radius:3px;transition:width .3s;"></div>
        </div>
      </div>
      <div class="rg-stats-grid">
        <div class="rg-stat-cell"><div class="rg-stat-val">${episodes}</div><div class="rg-stat-label">Серій</div></div>
        <div class="rg-stat-cell"><div class="rg-stat-val">${watchMinutes}</div><div class="rg-stat-label">Хвилин</div></div>
      </div>
    </div>
  `;
}

/**
 * ОПТИМІЗАЦІЯ: throttle для Firestore onSnapshot (300ms дебаунс)
 */
async function loadLeaderboard() {
  const lb = document.getElementById('rgLeaderboard');
  if (!lb) return;

  const spinner = `<div style="display:flex;justify-content:center;padding:24px;">
    <svg style="width:22px;height:22px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  </div>`;

  lb.className = '';
  lb.innerHTML = spinner;

  const showFallback = (msg) => {
    const profile = getProfile();
    const xp = calcTotalXP();
    const lv = getLevel(xp);
    const av = ratingProfileMediaMarkup(profile, 'rg-lb-avatar-media');
    lb.innerHTML = `
      <div class="rg-lb-list">
        <div class="rg-lb-item is-me">
          <div class="rg-lb-num" style="color:var(--accent);font-weight:800;">#1</div>
          <div class="rg-lb-avatar">${av}</div>
          <div class="rg-lb-info">
            <div class="rg-lb-name">${ratingNameMarkup(profile, '<span class="rg-you-badge">YOU</span>')}</div>
            <div class="rg-lb-rank">Lv.${lv}</div>
          </div>
          <div class="rg-lb-score">${xp} <span class="unit">XP</span></div>
        </div>
      </div>
      <p style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:8px;">${msg}</p>
    `;
  };

  let waited = 0;
  while ((!firebaseInitialized || !db) && waited < 6000) {
    await new Promise(res => setTimeout(res, 250));
    waited += 250;
  }

  if (!firebaseInitialized || !db) {
    showFallback('Firebase недоступний. Перевірте з\'єднання.');
    return;
  }

  waited = 0;
  while (!Auth._authResolved && waited < 4000) {
    await new Promise(res => setTimeout(res, 150));
    waited += 150;
  }

  if (!Auth.isAuthenticated()) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.warn('Anonymous sign-in failed:', e.code);
      showFallback('Глобальний рейтинг тимчасово доступний лише для авторизованих.');
      return;
    }
  }

  try {
    const { getDocs } = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js');
    const q = query(collection(db, 'users'), limit(500));
    const tp = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000));
    const snap = await Promise.race([getDocs(q), tp]);

    const mapUsers = (snapshot) => {
      let arr = [];
      snapshot.forEach(d => {
        const data = d.data();
        const episodes = Array.isArray(data.history) ? data.history.length : 0;
        const minutes = Math.floor((data.watchTime || 0) / 60);
        const bookmarks = Array.isArray(data.bookmarks) ? data.bookmarks.length : 0;
        const xp = calculateBaseXP({ episodes, watchSeconds: data.watchTime || 0, bookmarks });
        
        arr.push({
          uid: d.id,
          nickname: data.profile?.nickname || data.profile?.name || 'Аніматор',
          avatar: data.profile?.avatar || '',
          avatarVideo: data.profile?.avatarVideo || '',
          episodes,
          minutes,
          bookmarks,
          xp,
          level: getLevel(xp)
        });
      });
      return arr;
    };

    let users = mapUsers(snap);
    if (!users.length) {
      showFallback('Рейтинг з\'явиться після реєстрації користувачів.');
      return;
    }

    _lbUsersCache = users;
    renderLeaderboard(lb, users, _lbSortKey);

    /**
     * ОПТИМІЗАЦІЯ: throttle для Firestore onSnapshot (300ms)
     * Запобігає надмірним перендерам при частих оновленнях
     */
    const throttledRender = throttle((newUsers) => {
      if (newUsers.length && document.getElementById('rgLeaderboard')) {
        _lbUsersCache = newUsers;
        renderLeaderboard(lb, newUsers, _lbSortKey);
      }
    }, 300);

    // Очищувати попередній слухач
    if (window._lbUnsub) {
      try { window._lbUnsub(); } catch (e) { console.warn('Prev unsub error:', e); }
      window._lbUnsub = null;
    }

    // Підписати з тротлінгом
    window._lbUnsub = firestoreListenerManager.subscribe(q, (snap2) => {
      const u = mapUsers(snap2);
      throttledRender(u);
    }, (err) => console.warn('LB snapshot error:', err));

  } catch (e) {
    console.warn('loadLeaderboard error:', e.message);
    showFallback('Помилка завантаження: ' + e.message);
  }
}

function renderLeaderboard(lb, users, sortKey) {
  sortKey = sortKey || _lbSortKey || 'xp';
  const cfg = LB_SORT_CONFIG[sortKey] || LB_SORT_CONFIG.xp;
  const sorted = [...users].sort((a, b) => cfg.getVal(b) - cfg.getVal(a));

  const myUid = Auth.isAuthenticated() ? Auth._user?.uid : null;
  let html = '';

  html += '<div class="rg-lb-list">';
  sorted.slice(0, 20).forEach((u, i) => {
    const isMe = u.uid === myUid;
    const av = ratingProfileMediaMarkup(u, 'rg-lb-avatar-media');
    const ri = getUserRankInfo(u.episodes, u.minutes);
    const listProfileAttrs = u.uid ? ` data-profile-uid="${escapeRatingHtml(u.uid)}" role="link" tabindex="0"` : '';
    html += `<div class="rg-lb-item ${isMe ? 'is-me' : ''}"${listProfileAttrs} style="animation-delay:${Math.min(i * 0.02, 0.4)}s">
      <div class="rg-lb-num">${i + 1}</div>
      <div class="rg-lb-avatar">${av}</div>
      <div class="rg-lb-info">
        <div class="rg-lb-name">${ratingNameMarkup(u, isMe ? '<span class="rg-you-badge">YOU</span>' : '')}</div>
        <div class="rg-lb-rank" style="color:${ri.color}">Lv.${u.level}</div>
      </div>
      <div class="rg-lb-score">${cfg.getVal(u)} <span class="unit">${cfg.unit}</span></div>
    </div>`;
  });
  html += '</div>';

  lb.className = '';
  lb.innerHTML = html;

  lb.querySelectorAll('[data-profile-uid]').forEach(card => {
    const openProfile = () => Router.goTo('profile', { uid: card.dataset.profileUid });
    card.addEventListener('click', openProfile);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openProfile();
      }
    });
  });
}

/**
 * Очищення слухачів при навігації від сторінки рейтингу
 */
export function cleanupRatingPage() {
  firestoreListenerManager.unsubscribeAll();
  if (window._lbUnsub) {
    try { window._lbUnsub(); } catch (e) { console.warn('Cleanup unsub error:', e); }
    window._lbUnsub = null;
  }
  leaderboardCache.clear();
  _lbUsersCache = [];
}

export async function loadRatingPage() { initRatingPage(); }
export async function loadRatingList() { initRatingPage(); }
