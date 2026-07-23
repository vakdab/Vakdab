import { Auth } from "./auth/auth.js";
import { Router } from "./router/router.js";
import { Storage } from "./storage/storage.js";
import { applyTheme, showToast } from "./utils/helpers.js";
import { startClock } from "./ui/clock.js";
import { updateBackToTop } from "./ui/back-to-top.js";
import { initBottomNav } from "./ui/navigation.js";
import { buildHeroBanner } from "./hero/hero.js";
import { loadAndDisplayGenreSections, showTop100, openRandomAnime } from "./pages/home.js";
import { openPlayerPage, closePlayerPage } from "./player/player-page.js";
import { openBottomSheet, closeBottomSheet } from "./player/bottom-sheet.js";
import { toggleTheme } from "./utils/helpers.js";
import { toggleLike, toggleDislike } from "./features/likes.js";
import { toggleBookmark } from "./features/bookmarks.js";
import { renderProfilePage } from "./pages/profile.js";
import { renderSettingsPage } from "./pages/settings.js";

// Глобальні функції для виклику з HTML
window.Router = Router;
window.showTop100 = showTop100;
window.openRandomAnime = openRandomAnime;
window.openPlayerPage = openPlayerPage;
window.closePlayerPage = closePlayerPage;
window.toggleTheme = toggleTheme;
window.toggleLike = toggleLike;
window.toggleDislike = toggleDislike;
window.toggleBookmark = toggleBookmark;
window.openBottomSheet = openBottomSheet;
window.closeBottomSheet = closeBottomSheet;
window.Auth = Auth;
window.Storage = Storage;
window.renderProfilePage = renderProfilePage;
window.renderSettingsPage = renderSettingsPage;

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(Storage.getTheme());
  startClock();
  updateBackToTop();
  initBottomNav();
  Auth.init();
  Router.init();

  // Обробники кнопок
  document.getElementById('searchCircleBtn')?.addEventListener('click', () => { Router.goTo('search'); setTimeout(() => document.getElementById('searchPageInput')?.focus(), 200); });
  document.getElementById('top100Btn')?.addEventListener('click', showTop100);
  document.getElementById('randomBtn')?.addEventListener('click', openRandomAnime);
  document.getElementById('logoHome')?.addEventListener('click', () => Router.goTo('main'));
  document.getElementById('closePlayerPageBtn')?.addEventListener('click', closePlayerPage);
  document.getElementById('playerFullscreenBtn')?.addEventListener('click', () => {
    const container = document.getElementById('playerVideoContainer');
    if (!container) return;
    if (!document.fullscreenElement) {
      if (container.requestFullscreen) container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  });
  document.getElementById('playerSourceChip')?.addEventListener('click', () => openBottomSheet('source'));
  document.getElementById('playerFilterBtn')?.addEventListener('click', () => openBottomSheet('full'));
  document.getElementById('bsApplyBtn')?.addEventListener('click', () => { closeBottomSheet(); showToast('Застосовано'); });
  document.getElementById('bottomSheetOverlay')?.addEventListener('click', function(e) { if (e.target === this) closeBottomSheet(); });
  document.getElementById('likeBtn')?.addEventListener('click', () => {
    const url = document.getElementById('playerTopbarTitle')?.dataset?.url;
    if (url) toggleLike(url, showToast);
  });
  document.getElementById('dislikeBtn')?.addEventListener('click', () => {
    const url = document.getElementById('playerTopbarTitle')?.dataset?.url;
    if (url) toggleDislike(url, showToast);
  });
  document.getElementById('playerBookmarkBtn')?.addEventListener('click', () => {
    // реалізовано в player-page через toggleBookmark
  });

  // Клавіатура
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closePlayerPage(); if (document.getElementById('bottomSheetOverlay').classList.contains('open')) closeBottomSheet(); return; }
    const isInput = document.activeElement?.tagName?.toLowerCase() === 'input' || document.activeElement?.tagName?.toLowerCase() === 'textarea';
    if (isInput) return;
    if (e.key === '/') { e.preventDefault(); Router.goTo('search'); setTimeout(() => document.getElementById('searchPageInput')?.focus(), 200); }
    if (e.key === 't' || e.key === 'T') { e.preventDefault(); toggleTheme(); }
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); openRandomAnime(); }
  });

  // Завантаження основного контенту
  setTimeout(() => {
    if (Router.currentRoute === 'main') loadAndDisplayGenreSections();
  }, 50);
  setTimeout(() => buildHeroBanner(), 100);

  // Синхронізація перед закриттям
  window.addEventListener('beforeunload', () => Storage._flushSync());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && Auth.isAuthenticated()) Storage._flushSync();
  });
});
