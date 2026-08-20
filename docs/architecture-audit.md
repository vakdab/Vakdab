# VakDab architecture audit

Date: 2026-08-20

## Current truth

VakDab is a vanilla JavaScript single-page application. The browser starts at `src/js/app.js`, which calls `core/bootstrap.js`. Bootstrap installs the global error/event boundaries and dynamically loads `legacy/app-legacy.js` as the current compatibility orchestration layer.

The code is partially migrated, not fully rewritten. The legacy layer is now a small startup/compatibility boundary, while the heavy feature implementations live under `components/` and `services/`. This document intentionally describes the repository as it exists rather than claiming a complete migration.

## Ownership map

| Area | Owner |
| --- | --- |
| Startup and lifecycle | `src/js/core/bootstrap.js`, `core/events.js`, `core/errors.js` |
| Route parsing and feature loading | `src/js/core/router.js`, `core/feature-loader.js` |
| Legacy compatibility contracts | `src/js/core/compat/` |
| Anime home/catalog data | `src/js/components/pages/homeLegacy.js`, `src/js/services/catalog.js` |
| Anime detail and player page | `src/js/components/player/animePlayerPage.js` |
| Video playback integration | `src/js/components/player/lampaPlayer.js` |
| Manga reader | `src/js/components/manga/reader.js`, `components/manga/pages.js`, `components/manga/preload.js` |
| Novel reader | `src/js/components/novel/reader.js`, `src/js/services/api/novel.js` |
| Community | `src/js/components/community/` |
| Profile/settings/stickers/schedule/filters | `src/js/components/pages/` |
| Remote data and Firebase client | `src/js/services/` |
| CSS | `src/styles/` |

## Cleanup completed on 2026-08-20

Removed confirmed-unreachable leftovers from the previous migration:

- unused `core/auth.js`, `core/constants.js`, `core/state.js`, and `core/storage.js` facades;
- unused `services/firebase/firestore.js` facade;
- unused `services/manga-reader-v2.js` reader re-export.

`services/api.js` and `services/fetch-cache.js` remain active dependencies of the Hikka API facade. `utils/string.js` was retained because `legacy/app-legacy.js` imports it for its `String.prototype.hashCode` compatibility behavior.

## Current limitation

`legacy/app-legacy.js` is still an orchestration/compatibility boundary and some feature modules import selected compatibility exports from it. That is a known migration seam, not a second implementation. Removing it safely requires route-level browser smoke tests for auth, catalog, player, community, profile, settings and readers; it should be done incrementally, not by mechanically moving functions.

## Verification contract

Before a change is pushed:

- every relative JavaScript import must resolve;
- every JavaScript file must pass `node --check`;
- all fixture tests in `tests/` must pass;
- `git diff --check` must pass;
- the final message must distinguish verified work from remaining migration seams.
