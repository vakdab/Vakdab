# Homepage genre data QA v61

## Reproduction

On the local route `http://127.0.0.1:4173/index.html?v=20260822-schedule-hero-v60#main`, the homepage rendered the genre rail and the catalog count `28 882`. The `Бойовики` button was clicked through the visible genre control, but the subsequent browser state still showed the all-catalog count and the same general top results instead of an action-filtered Hikka result set. This confirms the user's report is functional, not merely a styling issue.

The direct Hikka proxy probe separately confirmed that POST body `{ "genres": ["action"], "only_translated": true }` returns a distinct response with `pagination.total: 1708` and 24 items. Therefore the fix must focus on the homepage event/reload/module flow rather than the Hikka API's genre endpoint.

## Follow-up diagnosis

After clicking the exact `data-catalog-genre="action"` control and waiting 3.5 seconds, the catalog did reload with `Показано 24 з 6 132 результатів` and action-compatible first results. The original button reference reported `active: false` / `aria-pressed: false` because the reload re-rendered the genre rail and replaced the original DOM node. No JavaScript error was present in the console. This indicates the request path works, but the homepage needs a stronger post-reload state/selection synchronization and a clear functional verification using the newly rendered button.

## Multi-genre verification

The newly rendered `Бойовики` button correctly had `aria-pressed="true"` after reload. A subsequent functional check selected `Фентезі` and received `Показано 24 з 6 822 результатів`, then selected `Усі` and restored `Знайдено 28 882 результатів`; both fresh buttons had the expected active state. The data endpoint and state flow are therefore operational after asynchronous reload.

## v61 functional fix verification

After adding `only_translated: true` to the homepage anime request body, the local v61 page loaded `Знайдено 4 187 результатів` for the Ukrainian anime catalog. Selecting `Бойовики` through the exact DOM control returned `Показано 24 з 1 708 результатів`, with the fresh button reporting `aria-pressed="true"`; the first result was `Сталевий алхімік: Братерство`. This confirms the homepage genre data request is now sending a distinct Ukrainian result set and the active control survives re-render.

## Live verification

After the successful Pages deploy for commit `5714c32`, the live route `https://vakdab.github.io/Vakdab/?v=20260822-catalog-genre-data-v61#main` loaded the Ukrainian catalog and displayed `Знайдено 4 187 результатів`. The live page contained the full homepage genre rail and the updated Hikka-backed catalog flow was present. The live response remained stable after waiting for the initial asynchronous load.

## New genre slug research

The Hikka OpenAPI documentation exposes `GET /genres` as the canonical genre-list endpoint: https://api.hikka.io/docs#/Genres/genres. A direct proxy probe confirmed working slugs for 17 of the requested labels and identified that `thriller` and `magical-girl` return HTTP 400. Probe output is stored in `docs/catalog-genre-slug-probe-v62.jsonl`; the final mapping will use Hikka's canonical values rather than unsupported guesses.

## v62 cache diagnosis

The first v62 local page still displayed the old genre list. Runtime resource inspection showed `homeLegacy.js?v=20260822-home-genres-v62` and `app-legacy.js?v=20260822-home-genres-v62`, but also loaded `constants.js?v=20260820-hikka-proxy-fix4`, `constants.js?v=20260820-menu-pages-fix1`, and unversioned module URLs from compatibility imports. This duplicate module graph explains why the old `GENRE_MAP` can still win in runtime. All internal import URLs need one synchronized v62 marker, not only the already versioned paths.

## v62 runtime follow-up

After a fresh local v62 navigation, the browser still reported the old 19-button list (`Аніфільми`, `Бойові мистецтва`, `Воєнні`, etc.). Performance resources included old constants URLs (`constants.js?v=20260820-hikka-proxy-fix4`, `constants.js?v=20260820-menu-pages-fix1`) and unversioned `constants.js`/`catalog.js`, despite the repository source being synchronized to v62. This requires inspecting the actual served source and any persisted page/service-worker/module cache before finalizing.

## v63 new-list verification

With a fresh v63 module URL, the homepage displayed exactly 19 requested genre controls and no old genres. Functional checks showed `Трилер` (`suspense`) returns 283 results and an active button. `Чарівниці` (`mahou-shoujo`) returns 68 Hikka results, but the rendered card list is empty after the local client-side genre matching step. This reveals a second functional issue: the server slug is correct, but the local matcher does not recognize the returned `mahou-shoujo` item genre representation and must be fixed before release.

## v64 matcher fix verification

After preserving `genreSlugs` in Hikka-normalized items and using those slugs in the homepage matcher, the exact 19-button list rendered correctly. `Чарівниці` (`mahou-shoujo`) now returns `Показано 24 з 68 результатів` with 24 cards; `Трилер` (`suspense`) returns 283 results with 24 cards; returning to `Усі` restores 4 187 results with 24 cards. Each freshly rendered selected button reports `aria-pressed="true"`.

## Live v64 verification

After Pages deployment of commit `2f11236`, the live homepage displayed exactly the requested 19 genres and no previous genre labels. Live functional checks returned 68 results / 24 cards for `Чарівниці`, 283 results / 24 cards for `Трилер`, and restored 4 187 results / 24 cards for `Усі жанри`; each selected control retained `aria-pressed="true"` after reload.
