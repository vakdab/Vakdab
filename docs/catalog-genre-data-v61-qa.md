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
