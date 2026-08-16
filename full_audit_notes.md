# VakDab stability audit — 2026-08-16

## Findings

- `src/js/app-legacy.js` passes `node --check`; `src/js/app.js` passes `node --check`; `git diff --check` is clean before the current cache-version edit.
- The live homepage at `https://vakdab.github.io/Vakdab/` loads the HeroBar, catalog, buttons, and 28,864-result count successfully.
- The browser console currently contains historical AI background-removal test errors from earlier debugging, not a fresh homepage runtime error. The verified cause was the `isnet_quint8` model compatibility problem; production was switched to `isnet_fp16` in a later commit.
- `index.html` used stale cache-busting values: CSS `?v=stickers-profile-v3` and JS `?v=animeon-fallback-v1`, even after many feature commits. These were changed to `?v=20260816-stable-ui` so GitHub Pages receives the current code.
- The legacy app is approximately 648 KB; many images are already lazy-loaded. Some profile and player images still use plain `<img>` or CSS background images and can be optimized later if profiling shows a bottleneck.
- There are multiple global listeners and timers by design; the highest-confidence low-risk stability fix at this point is cache invalidation plus targeted runtime checks before broader refactors.

## Current changes not yet committed

- `index.html`: refreshed CSS/JS cache-busting query parameters.
- `full_audit_notes.md`: this audit record.

## Unrelated untracked file

- `jojo_source_findings.md` exists locally and is unrelated; do not include it in the stability commit.

## Local smoke test

- Local HTTP server on port 4173 loads `index.html` and the app entrypoint successfully.
- Browser console shows no runtime JavaScript error on initial load; only the known Tailwind CDN production warning.
- The initial catalog remained on a loading state during the short smoke-test window, so API timing should be checked separately; this is not currently accompanied by a console exception.

## Route smoke test

- After the local API data finished loading, the homepage rendered HeroBar, Hikka catalog cards, and the catalog controls normally.
- Clicking the «Популярні» action did not produce a browser runtime error and the homepage remained responsive while the HeroBar/catalog updated.
- The current changes still need a final commit and a fresh cache-busted deploy before the public GitHub Pages URL will show them.
