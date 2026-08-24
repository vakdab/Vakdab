# All-only filter QA

Date: 2026-08-21

A clean v8 preview was checked in both content modes. The manga mode now renders only one quick-choice card labeled `Усі`. It no longer renders availability, reading access, age category, status, origin, or any other mode-specific filter cards.

The novel mode renders the same single `Усі` card and no status, availability, age-category, origin, or other mode-specific options. The `Скинути` and `Застосувати` buttons are absent in both modes.

The anime mode remains unchanged and still renders its genre rail. JavaScript syntax checks, all three regression fixtures (`catalog-pagination`, `manga-loading`, `novel-source`), and `git diff --check` passed.
