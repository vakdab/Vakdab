# VakDab architecture audit and migration report

## Scope

VakDab remains a vanilla JavaScript single-page application. The refactor preserves the existing HTML, CSS, routing, Firebase behavior, catalog behavior, player behavior, community behavior, mobile layout, and desktop layout. The old implementation remains in an explicit compatibility namespace while feature ownership moves behind module boundaries.

## Baseline and current entrypoint

| Metric | Before | Current |
|---|---:|---:|
| Legacy implementation | `src/js/app-legacy.js` at about 722 KB | `src/js/legacy/app-legacy.js` retained as compatibility layer |
| Main entrypoint | Eager legacy import | `src/js/app.js` is a 90-byte bootstrap entrypoint |
| Bootstrap | Mixed with application logic | `core/bootstrap.js` installs lifecycle/error handling and dynamically imports legacy |
| Manga reader implementations | Two historical files | One active reader in `components/manga/reader.js`; service files are re-exports |
| Feature loading | Several features reachable through legacy startup | Manga, player, profile, stickers, community and chat have cache-aware dynamic import targets |

The small `app.js` file is not a claim that the entire legacy graph is already tiny: the compatibility layer is intentionally retained during staged migration. The practical first-load improvement comes from keeping the reader and feature components out of the initial module graph and loading them only when their feature is opened.

## Current structure

```text
src/js/
├── app.js                         # minimal bootstrap entrypoint
├── core/
│   ├── bootstrap.js               # one-time startup and legacy hand-off
│   ├── constants.js               # core-facing configuration facade
│   ├── errors.js                  # global error boundary
│   ├── events.js                  # idempotent global event lifecycle
│   ├── feature-loader.js          # cached feature-level dynamic imports
│   ├── router.js                  # route/query parsing and router boundary
│   └── state.js                   # existing shared state store
├── config/
│   ├── constants.js               # existing runtime constants
│   ├── environment.js             # runtime/debug/public-path environment
│   ├── firebase.js                # existing Firebase compatibility exports
│   └── ...
├── legacy/
│   └── app-legacy.js              # compatibility owner during staged migration
├── components/
│   ├── manga/
│   │   ├── reader.js              # Honey reader orchestration and UI
│   │   ├── pages.js               # escaping, labels and page markup
│   │   └── preload.js             # bounded image queue and IntersectionObserver
│   ├── player/                    # anime player, episodes and Lampa integration
│   ├── community/                 # group/chat components
│   ├── pages/                     # profile, stickers, search, filters, schedule
│   └── ui/                        # navigation, header, hero, toast and back-to-top
└── services/
    ├── api/
    │   ├── proxy.js               # single proxy boundary
    │   ├── hikka.js               # Hikka catalog/search/details/schedule boundary
    │   ├── anime.js               # anime domain facade
    │   ├── manga.js               # manga domain facade
    │   └── honey.js               # Honey frames, chapters, metadata and CDN URLs
    ├── auth/                      # auth and profile boundaries
    ├── firebase/                  # client, Firestore, users, comments, ratings, community
    ├── manga-reader-v2.js         # compatibility re-export to canonical reader
    └── manga.js                    # compatibility re-export to canonical reader
```

## Module responsibilities and boundaries

| Module | Responsibility | Migrated responsibility | Imports and exports |
|---|---|---|---|
| `core/bootstrap.js` | Starts the application once and exposes readiness metadata | Startup lifecycle and legacy hand-off | Imports error/events/router; exports `bootstrap` |
| `core/feature-loader.js` | Owns cached lazy feature imports | Feature-level loading decisions | Exports `loadFeature` and `isFeatureLoaded`; imports components only dynamically |
| `core/errors.js` | Captures uncaught errors and rejected promises | Global error handling | Exports `installGlobalErrorBoundary` |
| `core/events.js` | Prevents duplicate global listeners | Idempotent lifecycle listeners | Exports `startGlobalEvents` |
| `services/api/honey.js` | Owns Honey URLs, GET/POST, cache and normalization | Honey frames, chapters, metadata, CDN URL generation | Exports domain API methods; components do not contain endpoint strings |
| `components/manga/reader.js` | Coordinates reader shell, navigation, metadata and controls | Reader UI previously embedded in service/legacy paths | Imports Honey API, pages and preload; exports `renderMangaReader` |
| `components/manga/pages.js` | Pure HTML/label helpers | Escaping, chapter labels and page markup | Exports pure helpers; no network or globals |
| `components/manga/preload.js` | Bounded image queue and viewport preloading | Reader queue/observer logic | Exports `createPagePreloader`; depends only on browser APIs |
| `services/firebase/client.js` | Initializes Firebase once | Firebase app/auth/db setup | Exports initialized client and handles |
| `services/firebase/firestore.js` | Centralizes Firestore primitives | Shared CRUD/listener boundary | Exports explicit Firestore helpers |
| `services/firebase/users.js` | User document operations | Profile/user persistence boundary | Exports user domain methods |
| `services/firebase/comments.js` | Comment operations | Comment persistence boundary | Exports comment methods |
| `services/firebase/ratings.js` | Ratings and reaction-like operations | Rating/favorites persistence boundary | Exports rating methods |
| `services/firebase/community.js` | Posts and reactions | Community persistence boundary | Exports post/reaction methods |

The compatibility layer still owns the existing DOM-heavy page rendering and shared legacy state. This is deliberate: it prevents a mechanical split into many files with circular dependencies or behavior changes.

## Lazy-loaded features

The initial entrypoint loads only the bootstrap, core boundaries, and the compatibility layer. The feature loader has explicit cached targets for `manga`, `player`, `community`, `chat`, `profile`, and `stickers`. Manga is already invoked at its route boundary. Player, profile, and stickers are requested when those surfaces open; the existing legacy renderer remains the visible fallback owner until each feature is fully migrated.

## Duplicate removal and compatibility decisions

There is one active manga reader implementation. `services/manga-reader-v2.js` and `services/manga.js` are compatibility re-exports to `components/manga/reader.js`; neither contains a second implementation. The original root `src/js/app-legacy.js` location was moved to `src/js/legacy/app-legacy.js`, and `app.js` no longer imports it eagerly.

## Verification performed

All JavaScript files under `src/js` pass `node --check`. Relative local imports were checked for missing files, and `git diff --check` passes. The feature-loader paths point to existing component files. The canonical reader uses Honey API service methods, bounded preloading, direct Honey CDN URLs, and background metadata loading. Cache-busting was updated to `architecture-v2` for the main CSS and JavaScript entrypoint.

## Remaining optimization opportunities

The compatibility layer is still large because it intentionally preserves current behavior. The next safe migrations are the player data pipeline, community read/write flows, and profile/settings rendering, each moved behind explicit state and service contracts with route-level smoke tests. After each migration, browser-level checks should record initial JS requests, total modules loaded, Firebase requests, duplicate requests, and time until the first interactive catalog card. No redesign is required for those steps.


## 2026-08-17 cleanup

Removed unused placeholder modules that were not imported by the runtime. The active compatibility layer remains in `src/js/legacy/app-legacy.js`; it was intentionally not split mechanically because its shared lexical state spans authentication, routing, catalog, player, community, and profile features.
