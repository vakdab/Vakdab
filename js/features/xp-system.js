import { Storage } from "../storage/storage.js";
import { ACHIEVEMENTS } from "../config/constants.js";

function getDailyXPBonus() {
  try { return parseInt(localStorage.getItem('vakdab_daily_xp_total') || '0', 10) || 0; } catch { return 0; }
}
export function calcTotalXP() {
  const history = Storage.getHistory() || [];
  const bookmarks = Storage.getBookmarks() || [];
  const watchSec = Storage.getWatchTime() || 0;
  const watchHours = watchSec / 3600;
  const episodes = history.length;
  const achStats = { episodes, watchTime: watchSec, bookmarks: bookmarks.length };
  const earnedCount = ACHIEVEMENTS.filter(a => achStats[a.field] >= a.need).length;
  const baseXP = Math.floor(episodes * 30 + watchHours * 15 + bookmarks.length * 10 + earnedCount * 100);
  return baseXP + getDailyXPBonus();
}
export function getLevel(xp) { return Math.floor(Math.sqrt(xp / 50)) + 1; }
export function getXPForLevel(level) { return Math.pow(level - 1, 2) * 50; }
export function getXPProgress(xp) {
  const level = getLevel(xp);
  const current = getXPForLevel(level);
  const next = getXPForLevel(level + 1);
  const into = xp - current;
  const needed = next - current;
  return { level, pct: needed > 0 ? Math.min(100, Math.round(into / needed * 100)) : 100, into, needed };
}
export function getUserRankInfo(episodes, watchHours) {
  if (watchHours >= 200) return { label: 'Легенда аніме',  color: 'var(--accent)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>' };
  if (watchHours >= 100) return { label: 'Майстер',        color: 'var(--text)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>' };
  if (watchHours >= 50)  return { label: 'Ветеран',        color: 'var(--text-secondary)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>' };
  if (watchHours >= 20)  return { label: 'Досвідчений',    color: 'var(--text-secondary)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7L12 3 4 7m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 0v10M4 7v10l8 4"/></svg>' };
  if (watchHours >= 5)   return { label: 'Початківець',    color: 'var(--text-muted)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' };
  return                        { label: 'Новачок',        color: 'var(--text-muted)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' };
}
