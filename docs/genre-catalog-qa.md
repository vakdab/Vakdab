# Genre catalog integration QA

Date: 2026-08-21

The local static preview at `http://127.0.0.1:4173/` loaded successfully with HTTP 200. The catalog rendered the inline Ukrainian genre browser with 19 cards, including `Усі жанри`; the cards use the letter-icon visual language from the former genres page and are horizontally scrollable.

Selecting `Бойовики` changed the active card state to `action`, reduced the visible catalog to 15 cards, and updated the result label to `Показано 15 з 28 878 результатів`. The catalog filter dialog trigger `#homeCatalogFilterBtn` was absent.

The menu popover contained only `Фільтри`, `Мої наліпки`, `Розклад виходу`, and `Налаштування`; no `Жанри` menu item was present. The bottom menu button had no `data-route` attribute. Navigating to the legacy `#genres` hash redirected to `#main` and rendered the main catalog instead of the removed standalone genres page.

Static checks passed for modified JavaScript files, `git diff --check` passed, and the existing regression fixtures passed: `catalog-pagination`, `manga-loading`, and `novel-source`.
