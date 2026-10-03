/**
 * VakDab Modular JavaScript Architecture
 * 
 * Directory Structure:
 * - config/      : Firebase credentials, constants, genre maps, endpoints
 * - services/    : External API (Hikka, TMDB, AniSkip), Firebase client, Catalog services
 * - components/  : HeroBanner, SenPlayer, MangaReader, BottomNav, RatingSystem
 * - pages/       : Home, Player, Profile, Search, Schedule, Settings, Manga, Live
 * - utils/       : DOM helpers, image/proxy utilities, media upload, string sanitization
 * - core/        : Router, event hub, error reporting, bootstrap lifecycle
 */

export const MODULE_REGISTRY = {
  config: [
    'config/firebase.js',
    'config/constants.js'
  ],
  services: [
    'services/firebase/client.js',
    'services/firebase/publicProfile.js',
    'services/catalog/catalog.js',
    'services/catalog/pagination.js',
    'services/api/manga.js',
    'services/tmdb.js',
    'services/player/aniSkip.js',
    'services/metadata/animeExternal.js',
    'services/profile/profileStorage.js'
  ],
  components: [
    'components/home/heroBanner.js',
    'components/player/senPlayer.js',
    'components/player/fullscreenPlayer.js',
    'components/player/lampaPlayer.js',
    'components/manga/reader.js',
    'components/manga/pages.js',
    'components/navigation/bottomNav.js',
    'components/rating/ratingSystem.js',
    'components/live/liveStream.js'
  ],
  pages: [
    'pages/home/homeQuickFilter.js',
    'pages/player/animePlayerPage.js',
    'pages/profile/profile.js',
    'pages/profile/profileModals.js',
    'pages/profile/stickersPage.js',
    'pages/settings/settingsLegacy.js',
    'pages/search/searchPage.js',
    'pages/schedule/schedule.js',
    'pages/genre/genrePage.js',
    'pages/live/livePage.js'
  ],
  utils: [
    'utils/dom.js',
    'utils/image.js',
    'utils/debug.js',
    'utils/skeleton.js',
    'utils/string.js',
    'utils/mediaUpload.js'
  ],
  core: [
    'core/router.js',
    'core/events.js',
    'core/errors.js',
    'core/bootstrap.js',
    'app.js'
  ]
};
