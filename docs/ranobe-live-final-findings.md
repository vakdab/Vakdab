# Ranobe live final findings

The production catalog uses RanobeLib API page size 60. Boundary probes confirmed pages 1-393 are full and page 394 contains 18 records; page 395 is empty, giving 393*60+18 = 23,598 current RanobeLib catalog records.

The live chapter for Ascendance of a Bookworm was opened at `/ru/6689--ascendance-of-a-bookworm-novel/read/v01/c01`. The reader already rendered valid chapter images, but Jina Markdown also contained backslash-escaped inline image blocks and many non-chapter avatar/team images. The final patch normalizes those escapes, removes image markup from paragraph text, and keeps only `/uploads/ranobe/.../chapters/...` images. Feature and reader cache keys were bumped to v6.

The exact total is now served as `23,598` through `RANOBELIB_TOTAL_COUNT`; the API has no `meta.total`, so this verified boundary is used until the catalog boundary changes.

Deployment workflow 32159216407 completed successfully after PR #15 merge.

After v6 deployment workflow 32159216407 completed, GitHub Pages briefly returned 404 during CDN propagation. A 30-second retry with curl returned HTTP 200 and the correct VakDab HTML. The browser sandbox intermittently retained the earlier 404 response for the same Pages URL; this is a CDN/browser cache inconsistency, not a missing `index.html` (main contains index.html and Pages source is main root).

Before v6 deployment, the live reader for Ascendance of a Bookworm successfully rendered real chapter images, confirming the reader route works. v6 specifically fixes the escaped inline Markdown blocks and filters non-chapter avatar images.

Latest repository audit found two active GitHub Actions workflows: custom `.github/workflows/pages.yml` (ID 336364345) and dynamic `pages-build-deployment` (ID 318117198). Pages API reports `build_type: legacy`, `source.branch: main`, `source.path: /`. The custom workflow and dynamic legacy workflow both report success for the same commits, but live requests alternated between the current 20,508-byte index and an older/stale 5,081-byte index or 404. Direct live module requests also returned 404 while root content varied. This deployment race/stale Pages source is the reason the user still sees old code despite the correct Ranobe v6 code being present in `origin/main` commit `3d3a53a`.

Important URL correction: the repository Pages URL is case-sensitive and is `https://vakdab.github.io/Vakdab/` (lowercase `d`), not `/VakDab/`. The uppercase-D path returns 404. Correct `/Vakdab/` returns the current 20,508-byte index and v6 service/reader modules with HTTP 200. In browser, the correct app shell loads but remains on `Завантаження каталогу...`; runtime console/network must be checked before declaring the live flow healthy.

Production smoke after commit `5d025ab`: custom Pages workflow `32161314321` completed successfully and live `https://vakdab.github.io/Vakdab/?v=5d025ab` renders the catalog shell. The page now exposes active `Аніме`, `Манґа`, and `Ранобе` tabs before the slow Hikka request finishes; anime catalog eventually renders 28 867 results. The correct path is lowercase-d `/Vakdab/`; uppercase-d `/VakDab/` is 404.

Ranobe tab smoke at production: clicking `Ранобе` changes the section title and search placeholder immediately, proving the tab is no longer blocked by Hikka. After the first wait, the grid still shows `Завантаження...`, so the Ranobe page-1 request/runtime chain needs one more network inspection. The heading still shows the previous anime `28 867` total during loading because the mode label/count is not reset visually until the new page resolves; this is separate from the data request.

Extended production smoke: after the Ranobe request completed, the live DOM contained the full Ranobe card list with Ukrainian translated titles, `Ранобе · Завершено/Онґоїнг` metadata, and the `Продовжити` pagination control. The network recorded RanobeLib page-1 API activity and Google Translate calls. The initial 5-second screenshot caught the request mid-flight; this was not a permanent hang.

After v7 deployment `94403e0`, the production shell initially shows a clean `0`/loading state while anime Hikka loads, with all three mode tabs immediately available. This confirms the stale previous total is cleared during mode loading and the UI is not blocked by the unrelated startup request.

Final v7 production assertion: at `https://vakdab.github.io/Vakdab/?v=94403e0`, clicking Ranobe while anime was still loading switched independently; after page 1 resolved the UI showed `Знайдено 23 598 результатів` in both count labels, 60 Ranobe cards, Ukrainian-translated titles/statuses, and `cover.cdnlibs.org` posters. No `60+` remained.

Reader smoke checkpoint: the first card click did not immediately change the route; it entered the async `resolveRanobeReader` path for a book URL. The catalog stayed intact after the first wait, so the next check is whether chapter resolution is pending/failed or the click target was not activated in the browser viewport.

Reader diagnostic: programmatic activation of the first Ranobe card set `aria-busy="true"` while keeping the hash unchanged, confirming the click handler is active and waiting for `resolveRanobeReader` to resolve a chapter from the RanobeLib book page. This is an external chapter-resolution latency check, not a dead card binding.

Reader latency check: after another wait the first card remained in the catalog with no route hash, so the book-to-chapter resolution can exceed the smoke window or fail silently. Catalog/count/posters are verified; reader route still requires a targeted source-level or direct chapter URL smoke test.

Cloudflare diagnosis for the first card: the RanobeLib book page returned HTTP 451 via Jina and Cloudflare HTML through corsproxy; a guessed direct chapter returned HTTP 451 via Jina and HTTP 403 via corsproxy. The current card resolver therefore cannot reliably discover a chapter through server-side text proxies for every title. The UI must fail fast with a readable reader error/retry state rather than leave `aria-busy` indefinitely; direct chapter URLs that are already known remain supported by the reader.
