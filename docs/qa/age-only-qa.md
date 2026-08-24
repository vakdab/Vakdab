# Age-only catalog QA

Date: 2026-08-21

A clean v9 preview was checked in the anime and manga modes. Both modes now render the schedule control followed by an adjacent horizontal age-card rail containing only `18+ Для дорослих`, `13+ Для підлітків`, and `Діти Для дітей`.

The previous `Усі` card and all genre cards are absent from anime and manga. The rail is no longer a separate quick-choice section below the controls. The novel mode was not changed by this request.

The age-card rail remains visible after the catalog data loads and is positioned beside the schedule control in the controls row. Syntax checks, all three regression fixtures, and `git diff --check` passed.
