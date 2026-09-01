# Accordion selectors QA

- The changed HTML contains three accessible accordion blocks under `#playerControls`: episode, dub, and season.
- The episode block is open by default; dub and season are collapsed.
- Each trigger uses `aria-expanded` and `aria-controls`; panel visibility is synchronized via the `hidden` attribute.
- The local app was checked from the repository root so relative CSS imports resolve correctly.
- `node --check src/js/pages/player/animePlayerPage.js` and `git diff --check` completed successfully.
- The existing `npm test` suite passed all 20 tests.
- The first local browser load from `/app` alone did not include sibling `/src` assets; a root-served load from `/app/index.html` correctly rendered the styled app shell.

## Expected interaction

Selecting an episode updates `#playerEpisodeSummary`; selecting a dub or season re-renders the lists and updates the corresponding summary through the existing state flow.

## Changed files

- `app/index.html`
- `src/js/pages/player/animePlayerPage.js`
- `src/styles/player/player-polish.css`

## Browser verification

The local app loaded the real anime data for “Проводжальниця Фрірен”. The visible player controls matched the intended stacked rounded-block layout: “Серія 1” followed by “Amanogawa”, while the episode panel exposed all 28 episodes and the dub panel exposed the available voice tracks. A DOM interaction test confirmed the episode panel changes from `aria-expanded="true"` / `hidden=false` to `aria-expanded="false"` / `hidden=true`, and opens again correctly.
