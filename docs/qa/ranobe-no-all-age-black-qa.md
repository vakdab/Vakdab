# Ranobe and age-control QA

Date: 2026-08-21

A clean v11 preview was checked in ranobe and manga modes. Ranobe now renders no quick-filter card or mode-specific filter block; after loading, the catalog contains only the schedule control followed by the result grid.

Manga renders only the three compact age controls (`18+`, `13+`, `Діти`) next to the schedule control. DOM measurements are 48x48 for schedule and each age button. Computed styles for inactive age buttons are white (`rgba(255,255,255,0.96)`) with dark text; the grey gradient is removed. Active state is configured to use the black accent surface.

Syntax checks, all three regression fixtures, and `git diff --check` passed.
