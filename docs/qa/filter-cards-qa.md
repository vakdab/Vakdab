# Filter cards QA

Date: 2026-08-21

The v4 local preview loaded with `app.js?v=20260821-filter-cards-v4`. In `Манґа`, the separate filter panel used the anime genre card language: horizontal card rails, round short icons, Ukrainian labels, active card state, and `Скинути`/`Застосувати` actions. The manga-specific groups were `Доступність` (`Усі тайтли`, `Є що читати`) and `Вікова категорія` (`Усі`, `Для дорослих`, `Для підлітків`, `Для дітей`).

In `Ранобе`, the same card treatment was used for `Статус`, `Доступність`, `Вікова категорія`, and `Походження`. The anime genre browser was absent in both modes. The card rails were visible and horizontally scrollable, with the existing anime card styles reused rather than introducing a new visual language.

Static checks passed: syntax checks for changed JavaScript, all three regression fixtures (`catalog-pagination`, `manga-loading`, `novel-source`), and `git diff --check`.
