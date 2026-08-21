
## v17 save-flow smoke test

The compact composer opens correctly, accepts text, and after clicking `Зберегти` the composer closes while `#profileThoughtNote` appears with the saved text and the toast `Думку збережено`.

The smoke screenshot exposed one CSS issue for the next patch: because the saved note used `display: inline-flex` with only `max-width`, absolute-position shrink-to-fit collapsed the note into a very narrow vertical column. The next fix sets an explicit responsive width while retaining the compact bubble design.

## v18 width and edit QA

The explicit responsive width fix prevents the saved note from collapsing vertically. In the clean v18 preview, `Моя думка` appears as a compact horizontal note beside the avatar. Clicking the note reopens the compact editor with the saved text already loaded for editing.
