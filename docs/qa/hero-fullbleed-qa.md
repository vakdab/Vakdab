# Hero full-bleed QA

Date: 2026-08-21

The first edge fix removed the inner border but did not address the actual source of the visible side gaps. The real cause was the `appRoot` horizontal padding. v13 adds a full-bleed rule to `.hero-wrapper`: `width: 100vw`, `max-width: none`, and centered negative viewport margins.

In the clean v13 preview, the hero spans the viewport rather than the app shell content width. The wrapper has zero padding and zero border; the slide/background remain clipped by the wrapper's rounded overflow. The screenshot shows the hero touching the viewport edges without the previous white side strips.

Syntax checks, all three regression fixtures, and `git diff --check` passed.
