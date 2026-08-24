# Hero square-top QA

Date: 2026-08-21

The hero wrapper now uses `border-radius: 0 0 32px 32px` on the checked viewport. Computed styles confirm top-left and top-right radii are `0px`, while bottom-left and bottom-right remain rounded. The clean v15 mobile preview shows the hero touching the top edge with square top corners and rounded lower corners.

Syntax checks, all three regression fixtures, and `git diff --check` passed.
