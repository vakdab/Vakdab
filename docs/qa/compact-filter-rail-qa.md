
## v5 smoke test

The anime catalog still uses its original single horizontal genre rail. After switching to `Манґа`, all manga-specific options appeared in one horizontal row of anime-style cards: availability and age options were no longer stacked into separate sections. The rail contained the expected cards and the existing reset/apply actions.

After switching to `Ранобе` from a scrolled position, the current browser view showed the novel card grid without the filter rail. This needs a follow-up check in the render/update path; the compact one-row markup exists in source, but the novel panel did not appear in that specific transition state.

## v6 verification

After fixing `syncHomeCatalogModeControls()` to distinguish the anime genre browser from the mode filter panel, a clean v6 session confirmed both transitions. `Манґа` showed one rail containing its availability and age cards. Switching directly from `Манґа` to `Ранобе` showed one rail containing status, availability, age, and origin cards; the panel remained present and the novel catalog loaded normally.
