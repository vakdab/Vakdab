import { Storage } from "../storage/storage.js";
export function toggleLike(url, showToastFn) {
  const likes = Storage.getLikes();
  if (likes[url] === 'like') { delete likes[url]; Storage.setLikes(likes); showToastFn('Лайк скасовано'); return 'removed'; }
  likes[url] = 'like'; Storage.setLikes(likes); if (window.DailyStats) { window.DailyStats.increment('likesToday', 1); window.DailyStats.addTotalRating(); }
  showToastFn('Лайк'); return 'liked';
}
export function toggleDislike(url, showToastFn) {
  const likes = Storage.getLikes();
  if (likes[url] === 'dislike') { delete likes[url]; Storage.setLikes(likes); showToastFn('Дизлайк скасовано'); return 'removed'; }
  likes[url] = 'dislike'; Storage.setLikes(likes); showToastFn('Дизлайк'); return 'disliked';
}
