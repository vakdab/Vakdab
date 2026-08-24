# Manga and novel filters QA

The served local source contains the new `homeCatalogModeFilterHtml()` helper and the conditional builder. Direct import of `homeLegacy.js?v=20260821-genre-filters-v2` reports `homeCatalogMode: manga`, returns a manga filter panel, includes `home-catalog-mode-filter-panel`, and does not include the exact anime genre section or `homeCatalogGenreRailHost` for manga. The browser session had previously loaded v1 modules before the v2 cache bump, so a clean browser session is required for final DOM smoke testing; the source and static checks are correct.

## Clean v3 browser smoke test

In a clean browser session with `app.js?v=20260821-mode-filters-v3`, switching to `Манґа` showed `Фільтри манґи` with `Доступність` and `Вікова категорія`; the anime genre rail and `homeCatalogGenreRailHost` were absent. Switching to `Ранобе` showed `Фільтри ранобе` with `Статус`, `Доступність`, `Вікова категорія`, and `Походження`; the anime genre rail was absent there as well. The novel filter `Онґоїнг` applied successfully and updated the catalog to zero matches for the current loaded page; pressing `Скинути` restored the full novel result set and repopulated the cards.
