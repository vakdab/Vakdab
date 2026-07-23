import { loadAndDisplayGenreSections } from "../pages/home.js";
import { renderProfilePage, renderAuthPage } from "../pages/profile.js";
import { renderGenrePage } from "../pages/genre.js";
import { renderGenresPage } from "../pages/genres.js";
import { renderSearchPage } from "../pages/search.js";
import { renderSettingsPage } from "../pages/settings.js";
import { initRatingPage } from "../features/rating.js";
import { Auth } from "../auth/auth.js";

export const Router = {
  currentRoute: 'main',
  params: {},

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  handleRoute() {
    const hash = window.location.hash.slice(1) || 'main';
    const parts = hash.split('?');
    const route = parts[0];
    const query = parts[1] || '';
    const params = Object.fromEntries(new URLSearchParams(query));
    this.currentRoute = route;
    this.params = params;
    this.navigate(route, params);
  },

  navigate(route, params) {
    document.getElementById('genreSectionsContainer').style.display = 'none';
    document.getElementById('animeContainer').style.display = 'none';
    document.getElementById('paginationRow').innerHTML = '';
    document.getElementById('profilePageContainer').classList.remove('active');
    document.getElementById('profilePageContainer').style.display = 'none';
    document.getElementById('genrePageContainer').classList.remove('active');
    document.getElementById('genrePageContainer').style.display = 'none';
    document.getElementById('searchPageContainer').classList.remove('active');
    document.getElementById('searchPageContainer').style.display = 'none';
    document.getElementById('settingsPageContainer').classList.remove('active');
    document.getElementById('settingsPageContainer').style.display = 'none';
    document.getElementById('ratingPageContainer').classList.remove('active');
    document.getElementById('ratingPageContainer').style.display = 'none';
    document.getElementById('genresPageContainer').classList.remove('active');
    document.getElementById('genresPageContainer').style.display = 'none';

    const hero = document.getElementById('heroWrapper');
    const actions = document.getElementById('actionsRow');
    const logo = document.querySelector('.logo');
    const searchBtn = document.querySelector('.search-circle-btn');

    if (route === 'main') {
      hero.style.display = 'block';
      actions.style.display = 'flex';
      if (logo) logo.style.display = 'flex';
      if (searchBtn) searchBtn.style.display = 'flex';
    } else {
      hero.style.display = 'none';
      actions.style.display = 'none';
      if (logo) logo.style.display = 'none';
      if (searchBtn) searchBtn.style.display = 'none';
    }

    if (route === 'main') {
      this.showMain();
    } else if (route === 'profile') {
      this.showProfile();
    } else if (route === 'genre') {
      this.showGenre(params.slug || '', params.name || '');
    } else if (route === 'search') {
      this.showSearch();
    } else if (route === 'settings') {
      this.showSettings();
    } else if (route === 'genres') {
      this.showGenres();
    } else if (route === 'rating') {
      this.showRating();
    } else {
      window.location.hash = 'main';
    }
  },

  showMain() {
    document.getElementById('genreSectionsContainer').style.display = 'flex';
    document.getElementById('animeContainer').style.display = 'none';
    document.getElementById('paginationRow').innerHTML = '';
    if (!document.getElementById('genreSectionsContainer').hasChildNodes() ||
        document.getElementById('genreSectionsContainer').querySelector('.loader')) {
      loadAndDisplayGenreSections();
    }
  },

  showProfile() {
    const container = document.getElementById('profilePageContainer');
    container.style.display = 'block';
    container.classList.add('active');
    if (!Auth._authResolved) {
      container.innerHTML = '<div class="loader">Перевірка сесії...</div>';
      setTimeout(() => {
        if (!Auth._authResolved && Router.currentRoute === 'profile') {
          Auth._authResolved = true;
          if (Auth.isAuthenticated() || Auth.isGuest()) renderProfilePage();
          else renderAuthPage();
        }
      }, 1500);
    } else if (Auth.isAuthenticated() || Auth.isGuest()) {
      renderProfilePage();
    } else {
      renderAuthPage();
    }
  },

  showGenre(slug, name) {
    const container = document.getElementById('genrePageContainer');
    container.style.display = 'block';
    container.classList.add('active');
    renderGenrePage(slug, name);
  },

  showGenres() {
    const container = document.getElementById('genresPageContainer');
    container.style.display = 'block';
    container.classList.add('active');
    renderGenresPage();
  },

  showSearch() {
    const container = document.getElementById('searchPageContainer');
    if (container) { container.style.display = 'block'; container.classList.add('active'); }
    renderSearchPage();
  },

  showSettings() {
    const container = document.getElementById('settingsPageContainer');
    if (container) { container.style.display = 'block'; container.classList.add('active'); }
    renderSettingsPage();
  },

  showRating() {
    const container = document.getElementById('ratingPageContainer');
    if (container) { container.style.display = 'block'; container.classList.add('active'); }
    initRatingPage();
  },

  goTo(route, params = {}) {
    const query = new URLSearchParams(params).toString();
    window.location.hash = query ? route + '?' + query : route;
  }
};
