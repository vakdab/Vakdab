# One-all instant filter QA

Date: 2026-08-21

The v7 local preview was checked in a clean browser session. In the manga filter rail, there is one shared `Усі` card, followed by the manga-specific cards `Є що читати`, `Для дорослих`, `Для підлітків`, and `Для дітей`. The novel rail uses the same single shared `Усі` card plus its own status, availability, age, and origin choices.

The `Скинути` and `Застосувати` buttons are no longer rendered. Clicking a non-all card immediately starts the catalog update and the rail remains visible while the results refresh. Clicking the shared `Усі` card resets all mode-specific filter state and reloads the full catalog.

Static checks passed: changed JavaScript syntax checks, all three regression fixtures (`catalog-pagination`, `manga-loading`, `novel-source`), and `git diff --check`.

A direct DOM smoke test confirmed the active-state behavior: clicking the manga age card `Для дорослих` immediately changed the rail so the shared `Усі` card became inactive and `Для дорослих` became active.
