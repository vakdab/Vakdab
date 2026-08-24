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

## Profile smoke test

- Local `#profile` route correctly opens the authentication screen, and «Продовжити як гість» renders the profile page without a runtime error.
- The guest profile renders the banner, avatar, metadata, statistics, and all 28 sticker slots.
- Desktop local viewport shows the profile banner stretched across the profile content area without visible white side strips; the new CSS is active locally.
- The «Досягнення» tab still needs a direct check for the minutes-only watch-time label before commit.

## Cache-busting discovery

- The profile smoke test exposed one remaining stale import: `src/js/app.js` itself had a fresh query in `index.html`, but line 2 still imported `app-legacy.js?v=animeon-fallback-v1`.
- Because of that nested import, the local browser still showed the previous achievements text (`год` plus `хв`) even though the source had already been changed to minutes.
- The nested `app-legacy.js` import must receive the same new cache key before the final deploy.

## Resource verification

- Direct no-cache fetch confirms that `index.html`, `src/js/app.js`, and the nested `src/js/app-legacy.js` all use `20260816-profile-minutes`.
- The fetched legacy source contains the new `totalMinutes` markup and no longer contains the old hours markup.
- The browser DOM still showed the old text because the already-running SPA instance was not fully reinitialized by same-route navigation; a hard reload is needed for the final visual check.

## Final cache diagnosis

- Performance entries show that the current browser instance executed `app.js?v=20260816-stable-ui` and `app-legacy.js?v=animeon-fallback-v1`, which explains the old hours markup.
- Direct no-cache fetches already return the new `app.js?v=20260816-profile-minutes` and nested `app-legacy.js?v=20260816-profile-minutes` sources.
- The source fix is correct; the smoke test must use a cache-busted document URL to start a fresh module graph.

## Cache-busted profile smoke test

Opening the document with `?profile_check=20260816-profile-minutes` forced a fresh module graph and removed the old cached entrypoint. The profile banner visually reaches the viewport edges on the wide local viewport, with no white side strips visible around the banner. The annotated tab click did not switch reliably, so the final minutes assertion will be made through a direct DOM click and text read.

## Final integration audit

The cache-busted profile DOM now renders `ЗАГАЛЬНИЙ ЧАС ПЕРЕГЛЯДУ АНІМЕ` as `0хв` with `0 серій переглянуто`; the old combined `0год 0хв` string is absent. The wide local viewport shows the profile banner reaching the content edges without white side strips.

The sticker pipeline imports `@imgly/background-removal@1.7.0`, selects `model: 'isnet_fp16'`, forces `device: 'cpu'`, emits transparent PNG output, provides progress messages, has a two-minute timeout, resets the cached module after failures, and is used both during custom upload and the existing single-sticker reprocess action.

The Telegram Worker passes syntax validation. Popular, search, random, and anime callbacks route to Hikka-backed detail rendering; schedule uses Mikai. Details render a single `Дивитись на VakDab` deep-link button plus navigation controls, with no Mikai/source link in the details keyboard.
