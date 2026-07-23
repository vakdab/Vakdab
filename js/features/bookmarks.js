import { Storage } from "../storage/storage.js";
export function toggleBookmark(url, anime, showToastFn) {
  const bookmarks = Storage.getBookmarks();
  const idx = bookmarks.findIndex(b => b.url === url);
  if (idx >= 0) { bookmarks.splice(idx, 1); Storage.setBookmarks(bookmarks); showToastFn('Видалено з закладок'); return false; }
  const totalEpisodes = Object.values(anime.seasons || {}).reduce((sum, s) => sum + Object.values(s).reduce((s2, e) => Math.max(s2, e.length), 0), 0);
  bookmarks.push({ url: anime.url, title: anime.title, poster: anime.images?.jpg?.large_image_url || '', episodes: totalEpisodes + ' еп.', addedAt: Date.now() });
  Storage.setBookmarks(bookmarks);
  if (window.DailyStats) window.DailyStats.increment('bookmarksToday', 1);
  showToastFn('Додано до закладок');
  return true;
}
