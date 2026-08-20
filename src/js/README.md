# VakDab JavaScript architecture

## Runtime entrypoint

- `app.js` is the only browser entrypoint.
- `core/bootstrap.js` installs global lifecycle/error handling and loads the compatibility application once.
- `legacy/app-legacy.js` is the remaining orchestration boundary. It owns startup wiring and compatibility exports; new domain logic must not be added there.

## Domains

- `components/` — UI and route-level features grouped by domain: manga, novel, player, community, navigation, home and pages.
- `services/` — domain/data boundaries: catalog aggregation, API clients, Firebase client, caching and pagination.
- `core/` — application lifecycle, route parsing, feature loading, events and error handling.
- `config/` — runtime constants, environment and Firebase SDK exports.
- `utils/` — stateless browser helpers.
- `styles/` — global CSS split into base, components, pages, player, themes and utilities.

## Compatibility rules

- `core/compat/` contains the only compatibility adapters for the legacy `Auth`, `Router` and `Storage` contracts.
- Components may import a small compatibility export while migration is in progress, but new shared logic must move into `services/`, `core/` or `utils/` instead of growing `legacy/app-legacy.js`.
- There is one active manga reader implementation: `components/manga/reader.js`.
- `components/player/animePlayerPage.js` owns the anime detail/player page; `components/player/lampaPlayer.js` owns playback integration.

## Verification

The repository is checked with:

1. relative-import reachability across all JavaScript modules;
2. `node --check` for every JavaScript file;
3. the fixture tests in `tests/`;
4. `git diff --check` before every push.
