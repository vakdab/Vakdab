
## v17 save-flow smoke test

The compact composer opens correctly, accepts text, and after clicking `Зберегти` the composer closes while `#profileThoughtNote` appears with the saved text and the toast `Думку збережено`.

The smoke screenshot exposed one CSS issue for the next patch: because the saved note used `display: inline-flex` with only `max-width`, absolute-position shrink-to-fit collapsed the note into a very narrow vertical column. The next fix sets an explicit responsive width while retaining the compact bubble design.

## v18 width and edit QA

The explicit responsive width fix prevents the saved note from collapsing vertically. In the clean v18 preview, `Моя думка` appears as a compact horizontal note beside the avatar. Clicking the note reopens the compact editor with the saved text already loaded for editing.

## v20 cloud refinement

- The thought trigger is now 27px on desktop and 25px on narrow mobile screens, anchored at the avatar bottom-right so it does not cover the avatar.
- The saved thought note is positioned above the avatar with `bottom: calc(100% + 12px)` and moves toward the hero/banner.
- The saved note no longer uses a pill or rectangular border. It uses a CSS SVG mask with rounded cloud lobes and a two-dot tail, plus a soft drop shadow.
- The compact composer remains separate from the saved note and clicking the saved cloud still reopens the editor.
- The local profile route `#profile` loads the thought trigger and saved note elements.
- Regression checks passed: catalog-pagination fixtures, manga-loading fixtures, novel-source test, JavaScript syntax checks, and `git diff --check`.
