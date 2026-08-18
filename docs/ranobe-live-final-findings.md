# Ranobe live final findings

The production catalog uses RanobeLib API page size 60. Boundary probes confirmed pages 1-393 are full and page 394 contains 18 records; page 395 is empty, giving 393*60+18 = 23,598 current RanobeLib catalog records.

The live chapter for Ascendance of a Bookworm was opened at `/ru/6689--ascendance-of-a-bookworm-novel/read/v01/c01`. The reader already rendered valid chapter images, but Jina Markdown also contained backslash-escaped inline image blocks and many non-chapter avatar/team images. The final patch normalizes those escapes, removes image markup from paragraph text, and keeps only `/uploads/ranobe/.../chapters/...` images. Feature and reader cache keys were bumped to v6.

The exact total is now served as `23,598` through `RANOBELIB_TOTAL_COUNT`; the API has no `meta.total`, so this verified boundary is used until the catalog boundary changes.

Deployment workflow 32159216407 completed successfully after PR #15 merge.

After v6 deployment workflow 32159216407 completed, GitHub Pages briefly returned 404 during CDN propagation. A 30-second retry with curl returned HTTP 200 and the correct VakDab HTML. The browser sandbox intermittently retained the earlier 404 response for the same Pages URL; this is a CDN/browser cache inconsistency, not a missing `index.html` (main contains index.html and Pages source is main root).

Before v6 deployment, the live reader for Ascendance of a Bookworm successfully rendered real chapter images, confirming the reader route works. v6 specifically fixes the escaped inline Markdown blocks and filters non-chapter avatar images.

Latest repository audit found two active GitHub Actions workflows: custom `.github/workflows/pages.yml` (ID 336364345) and dynamic `pages-build-deployment` (ID 318117198). Pages API reports `build_type: legacy`, `source.branch: main`, `source.path: /`. The custom workflow and dynamic legacy workflow both report success for the same commits, but live requests alternated between the current 20,508-byte index and an older/stale 5,081-byte index or 404. Direct live module requests also returned 404 while root content varied. This deployment race/stale Pages source is the reason the user still sees old code despite the correct Ranobe v6 code being present in `origin/main` commit `3d3a53a`.

Important URL correction: the repository Pages URL is case-sensitive and is `https://vakdab.github.io/Vakdab/` (lowercase `d`), not `/VakDab/`. The uppercase-D path returns 404. Correct `/Vakdab/` returns the current 20,508-byte index and v6 service/reader modules with HTTP 200. In browser, the correct app shell loads but remains on `Завантаження каталогу...`; runtime console/network must be checked before declaring the live flow healthy.
