import { DAILY_TASK_POOL } from "../config/constants.js";
import { Auth } from "../auth/auth.js";

export function _todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
}
export function _loadDailyState() {
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
    localStorage.setItem('vakdab_daily_state', JSON.stringify(st));
  }
  return st;
}
function _saveDailyState(st) { localStorage.setItem('vakdab_daily_state', JSON.stringify(st)); }

function _addDailyXPBonus(amount) {
  const cur = parseInt(localStorage.getItem('vakdab_daily_xp_total') || '0', 10) || 0;
  const next = cur + amount;
  localStorage.setItem('vakdab_daily_xp_total', String(next));
  return next;
}

export const DailyStats = {
  increment(field, amount = 1) {
    const st = _loadDailyState();
    st.stats[field] = (st.stats[field] || 0) + amount;
    _saveDailyState(st);
    this._checkCompletion(st);
  },
  addUniqueAnime(animeUrl) {
    if (!animeUrl) return;
    const st = _loadDailyState();
    if (!Array.isArray(st.stats.uniqueAnime)) st.stats.uniqueAnime = [];
    if (!st.stats.uniqueAnime.includes(animeUrl)) st.stats.uniqueAnime.push(animeUrl);
    st.stats.uniqueAnimeToday = st.stats.uniqueAnime.length;
    _saveDailyState(st);
    this._checkCompletion(st);
  },
  getTotalPosts() {
    try { return parseInt(localStorage.getItem('vakdab_total_posts') || '0', 10) || 0; } catch { return 0; }
  },
  addTotalPost() {
    const v = this.getTotalPosts() + 1;
    localStorage.setItem('vakdab_total_posts', String(v));
    return v;
  },
  getTotalRatings() {
    try { return parseInt(localStorage.getItem('vakdab_total_ratings') || '0', 10) || 0; } catch { return 0; }
  },
  addTotalRating() {
    const v = this.getTotalRatings() + 1;
    localStorage.setItem('vakdab_total_ratings', String(v));
    return v;
  },
  _checkCompletion(st) {
    let xpGain = 0;
    DAILY_TASK_POOL.forEach(t => {
      if (!st.taskIds.includes(t.id)) return;
      if (st.completed.includes(t.id)) return;
      const val = st.stats[t.field] || 0;
      if (val >= t.target) {
        st.completed.push(t.id);
        xpGain += t.xp;
      }
    });
    if (xpGain > 0) {
      _saveDailyState(st);
      _addDailyXPBonus(xpGain);
      if (Auth.isAuthenticated()) Auth.syncUserData().catch(() => {});
      showToast(`Завдання виконано! +${xpGain} XP`);
    }
  }
};

export function renderDailyTasks() {
  const el = document.getElementById('rgDailyTasks');
  if (!el) return;
  const st = _loadDailyState();
  const tasks = DAILY_TASK_POOL.filter(t => st.taskIds.includes(t.id));
  const rows = tasks.map(t => {
    const val = st.stats[t.field] || 0;
    const done = st.completed.includes(t.id);
    const pct = Math.min(100, Math.round((val / t.target) * 100));
    return `<div class="dt-item ${done ? 'done' : ''}">
      <div class="dt-check">${done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>
      <div class="dt-body">
        <div class="dt-desc">${t.desc}</div>
        <div class="dt-bar-wrap"><div class="dt-bar" style="width:${pct}%"></div></div>
        <div class="dt-meta"><span>${Math.min(val, t.target)}/${t.target}</span><span class="dt-xp">+${t.xp} XP</span></div>
      </div>
    </div>`;
  }).join('');
  const doneCount = tasks.filter(t => st.completed.includes(t.id)).length;
  el.innerHTML = `
    <div class="rg-daily-wrap">
      <div class="rg-daily-header"><span>Щоденні завдання</span><span class="rg-daily-count">${doneCount}/${tasks.length}</span></div>
      <div class="dt-list">${rows}</div>
    </div>`;
}
