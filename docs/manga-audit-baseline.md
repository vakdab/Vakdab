# Manga/catalog audit baseline

Дата: 2026-08-18.

## Manga pipeline

`src/js/services/api/manga.js` currently calls the Worker with `manga_pages=1`, parses only `payload.images`, and maps each string to `{ content }`. The fallback client parser `extractPages()` selects `#comics img` and `img[data-src*="/uploads/"]`; it does not currently inspect `srcset`, `picture/source`, `noscript`, or generic image candidates. `fetchMangaAjaxPages()` exists but is not used by `getChapterFrames()`.

`src/js/components/manga/reader.js` receives the complete `pages` array only after `getChapterFrames()` resolves, then `buildPageMarkup()` creates one figure per page. The current preload implementation limits concurrent image requests, but it does not limit the manifest; it preloads the first three figures and a radius around the active figure. Each later page is represented by `data-src` and can enter the queue through IntersectionObserver.

`src/js/components/manga/pages.js` does not slice the pages array. It creates markup for every supplied page and includes a fallback URL and per-image error handler.

`monoanime_worker.js` currently fetches the chapter HTML, extracts `news_id` and `user_hash` with regex, calls `load_chapters_image`, then extracts only `data-src` or `src` attributes and filters URLs by common image extensions. The Worker currently has no explicit `slice/splice` in this branch, but the parser may miss images in other attributes/containers or URLs without standard extensions. It does not yet emit extraction counters or validate that the AJAX response is complete.

## Catalog pipeline

`src/js/services/catalog.js` requests Hikka with `size=24` and returns only `data.list.map(hikkaItem)`, discarding `pagination`, `total`, and `hasNextPage`. Higher-level main/search/category/genre loaders therefore cannot reliably determine the final page and often render a next button by convention.

`src/js/components/pages/homeLegacy.js` uses `size=24` for anime and novel pages. Manga HTML pages contain 24 cards per upstream page and are fetched through `/mangas/page/N/`. The current branch has a cached manga page walker and a load-more control, but the full-index path is expensive and must be checked for request deduplication, failures, progress, and filter ordering. The legacy Hikka 18+ path and separate manga 18+ path need to be unified or explicitly documented.

`src/js/services/fetch-cache.js` only deduplicates in-flight requests and retries a configured count. It does not cache settled responses, classify HTTP status codes, honor `Retry-After`, or provide a shared backoff/diagnostic contract. `abortUrl()` removes the map entry but does not abort the underlying request.

`src/js/legacy/app-legacy.js` genre pagination renders a next button without upstream `hasNextPage` metadata. The separate search page must be audited for the same behavior, including empty/last-page handling and repeated navigation.

## Initial hypotheses to verify

The chapter issue is more likely to be upstream/Worker extraction loss than `pages.js` or preload truncation, because the frontend renders every element in the supplied array. The catalog issue has at least two independent causes: upstream page size 24 is treated as a complete result in some callers because metadata is discarded, and filters may be applied to only loaded pages instead of the complete paginated result. The final implementation must prove counts at every stage with an opt-in debug flag and fixtures/live samples.

## Live probe result

Для контрольного chapter `64318-hlopjacha-bezodnja-tom-1-rozdil-1.html` source chapter HTML мав `#comics[data-news_id="64318"]`, але не містив inline image tags: `#comics img = 0`. Прямий `load_chapters_image` AJAX повернув 56 `<img>` із 56 унікальними image URLs, а live Worker `?manga_pages=1` також повернув `payload.images = 56`, від першої обкладинки до `56.jpg`. Отже, для цього chapter Worker не обрізає відповідь; основний ризик у parser coverage для інших варіантів markup, frontend priority/preload та окремих catalog pagination contracts.

У `reader.js` виявлено важливу помилку priority loading: `buildPageMarkup()` ставить першу сторінку в `src`, а сторінки 2–3 також у `src`, але `createPagePreloader()` працює лише з `img[data-src]`. Виклик `preloadAround(0)` починає з index 1 і не має явного enqueue для index 0; це потрібно виправити без зміни page manifest count.

У `app-legacy.js` filter pagination має штучні safety caps `maxTotal = 30`, `maxPages = 6` та максимум дві сторінки на genre. У `catalog.js` Hikka adapter discards pagination metadata after `size=24`, тому search/genre/home callers не мають надійного `hasNextPage`.

## Local browser smoke result

На актуальному local static server після 5 секунд головний каталог успішно ініціалізувався без runtime error: `#homeCatalogSection` присутній, 24 картки відрендерено, кнопка `Продовжити` присутня, `homeCatalogEmpty` відсутній. Lived Hikka response показав 28 867 результатів для legacy main label; це окремий homepage value, тоді як direct Hikka catalog metadata probe повернув `pagination.total = 4 186`, `pages = 175`, `page = 1` для API body із `only_translated`.

## Manga catalog browser smoke

На local browser smoke після перемикання на Манґа було 24 картки й кнопка `Продовжити`. Після натискання додалося 24 картки: `24 → 48`, усі 48 URL були унікальними, кнопка залишилася присутньою. Тест виявив, що доступний-count після load-more залишався 24; це виправлено одразу після тесту — `homeCatalogAvailableTotal` тепер перераховується після кожної доданої сторінки.

## 18+ browser smoke

Після натискання 18+ локальний UI швидко перейшов у заголовок `18+ манґа`, показав 19 відфільтрованих карток із 4 420 і залишив кнопку `Продовжити`. Через додаткові 15 секунд UI залишився стабільним: 19 карток, без loader/error. Повний manga index у фоні ще не завершився в цей проміжок, що очікувано для проходження приблизно 185 HTML pages через upstream; окремо потрібно перевірити progress/timeout behavior, щоб довгий index не зависав без індикатора.

## Current browser verification

Після hard reload `/?debug=1` головний каталог аніме успішно завантажився: 24 картки, load-more button, без `.home-catalog-empty`. Перемикання на Манґа також успішне: після 6 секунд 24 картки, 24 унікальні URL, лічильник `Доступно для читання: 24 із 4 420 манґи`, кнопка `Продовжити`, без error state.

У свіжій debug версії click handler load-more спочатку залишив DOM на 24 картках через повільний upstream-запит; окремий стан через кілька секунд показав `48` карток, `48` унікальних URL, кнопку знову enabled і без error. Отже, behavior є коректним, але upstream latency перевищує 5 секунд; UI не зависає назавжди і відновлює кнопку після завершення.

## Search browser smoke

На `#search` пошук `Наруто` після приблизно 17 секунд upstream latency показав 24 картки. Pagination відобразила `Сторінка 1 · 24`; кнопка `Вперед` була disabled, бо цей конкретний search response повернув metadata без наступної сторінки. Це підтверджує, що search UI більше не показує безумовно активну кнопку за межами `hasNextPage`.

## Genre route note

Спроба відкрити `#genres` напряму не дала сторінки: поточний legacy router не обробляє цей hash як валідний route, тому це не зараховано як genre pagination regression. Потрібно перевірити правильний navigation trigger через меню/Router route перед фінальним звітом.

## Genre browser smoke

За правильним route `#genre?slug=action&name=Бойовик` після приблизно 27 секунд Hikka proxy latency сторінка жанру показала 24 картки, `Сторінка 1 · 1706` і активну кнопку `Вперед`. Це підтверджує, що genre metadata (`total`, `hasNextPage`) доходить до UI; попередня 12-секундна перевірка ще була в loading і не вважалася помилкою.

## Reader browser smoke

Після повного cache-bust і explicit `getProxyUrl` import контрольний chapter успішно відкрився. Reader показав `56` figures і counter `1 / 56`; перша й третя сторінки мали loaded `img.src`, сторінка 10 залишалась deferred через lazy/preload policy, error state був порожній. У DOM є retry control для кожної сторінки, але він hidden до помилки; це відповідає вимозі retry per page без зміни звичайного layout.

## Final v9 reader smoke

Після оновлення index/app/bootstrap/module versions фінальний local build v9 знову відкрив контрольний reader без module/runtime error: `56` figures, counter `1 / 56`, first/third images loaded, page 10 deferred, error state порожній.

## Production fix verification

Correct Pages URL is `https://vakdab.github.io/Vakdab/`; bare `https://vakdab.github.io/` is a GitHub Pages 404. After PR #2 merge and Pages build commit `06e86f7842911208bd1bbc28deef61e0b4c1e794`, live resource graph loads app v9 and versioned app-legacy/homeLegacy modules. The 18+ production screen now shows exactly 10 cards and the visible count is `10 із 4 420`, so the original `24 із 10` mismatch is fixed. A remaining UX issue is that while the full filtered index is still loading, the denominator is still the overall manga total; the 18+ label should show a contextual filtered total or omit the denominator until indexing completes.

## Final live counter verification before last patch

After PR #3, live production correctly switched to 18+ with 10 cards and showed `Доступно для читання: 10 манґи` while the filtered index was still loading. After the full index completed it showed `24 із 1 248 манґи`, confirming a contextual filtered denominator rather than 4 420. A live load-more check added 24 unique cards (`24 → 48`) but exposed one remaining count bug: the available count stayed 24 in the filtered-result branch. This was patched immediately so the count will now update with each filtered load-more batch.

## Final production smoke after PR #4

After PR #4 and Pages build `fca44462bbf274953a0f843d094faf64d911ded7`, live production behaves correctly on the mobile catalog flow. Manga mode starts at `24` cards and `Доступно для читання: 24 із 4 420 манґи`. 18+ starts with exactly `10` filtered cards and the temporary label `Доступно для читання: 10 манґи`, without a false denominator. After the full filtered index completes it becomes `24 із 1 248 манґи`. Load-more adds `24` unique cards (`24 → 48`) and keeps `Доступно для читання: 24 із 1 248 манґи`; DOM inspection shows 48 visible cards are pending reader resolution and 0 have a resolved reader URL, so the first number is the available-to-read count, not the visible card count.

## Honey Manga local smoke after migration

The local static build switched to Honey Manga mode successfully. The catalog displayed **30 cards** and `Доступно для читання: 30 із 1 889 манґи`, with posters served from `honeymangastorage-nocache.b-cdn.net` and Honey book metadata visible in each card. The 18+ toggle switched to a separate Honey API request and displayed only cards marked `18+`; the filtered mode completed with the source counter of **263** and no non-adult card was visible. This confirms the new catalog, card mapper, adult filter, counter and CDN image path work together in the browser before deployment.

The local Honey Search smoke used the query `наречена`. The pattern endpoint returned 9 mapped results, the UI rendered 9 Honey cards, and the contextual label showed `Доступно для читання: 8 із 9 манґи`. Results included both ordinary and 16+ items while the public mode correctly excluded 18+ entries; posters continued to use the Honey CDN.

The reader smoke used free chapter 9 of the same Honey book. The route `/#manga?url=https://honey-manga.com.ua/read/db4ed14e-f564-4103-be20-688948370f3d/8c336683-10ca-4912-9666-e18a1689da6e` loaded the full **10-page** frame manifest, displayed the Honey title/description, populated all **11** chapter options, and loaded CDN page images through the preloader. A monetized chapter correctly returned a user-facing access message instead of a broken reader. This validates both public frames and the expected Honey paywall behavior.

After leaving the Honey reader and reloading the root route, the standard anime catalog still initialized normally, confirming the new manga route does not break the existing anime/novel route lifecycle. A subsequent switch back to Honey manga also restored the manga search/filter controls and loading state without a runtime error.

## Production Pages smoke after Honey merge

GitHub Pages build `1159151477` completed with status `built` for merge commit `0432c37d5078b358587051dcfc104b90f743b06c`. The production URL `https://vakdab.github.io/Vakdab/` loaded the current app and the existing Hikka anime catalog successfully before the live Honey mode check. The live Honey manga mode then rendered **30 cards**, displayed `Доступно для читання: 30 із 1 889 манґи`, used Honey CDN poster URLs, and showed age badges only for actual `16+` entries rather than the raw `NONE` API value. The live 18+ toggle completed on the Honey adult dataset with **24 cards**, `Доступно для читання: 24 із 263 манґи`, and every visible card marked `18+`; no ordinary catalog item was present.

The final production reader route for free chapter 9 loaded the complete **10-page** manifest on GitHub Pages, populated all **11** chapter options, displayed the Honey book title and description, and served page images through the nocache Honey CDN. The live reader had no error state.
