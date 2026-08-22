
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


## v25 mobile composer QA

The open composer was previously appearing as a clipped rectangular panel. v25 applies the same masked cloud silhouette to the composer and constrains it to `calc(100vw - 32px)`, with `left: 0` relative to the avatar wrapper. Console geometry confirms the composer is positioned inside the local viewport (`x: 74`, `width: 300` in the 892px browser viewport) and has the cloud mask applied. The saved note remains connected to the trigger via the right-side tail.


## v28 compact marked-area placement

The saved thought cloud is now compact and placed in the marked profile header area, right of the avatar and below the banner edge. Local console geometry confirms the note is `150px` wide and starts at x126 while the trigger starts at x138, so its body sits beside the trigger and extends to the right instead of occupying the full banner. The note height is `92px`, matching the smaller target shown by the user.


## v30 clean rewrite QA

The previous accumulated thought-note overrides from lines 1455 onward were removed and replaced with one clean block. The saved note is a compact 142–148px cloud beside the trigger with a three-line clamp. The editor is a separate compact panel with a 252–264px responsive width, short textarea, and no SVG mask; this prevents editor controls from being clipped or stretched by the decorative cloud. Local browser checks confirmed both the saved note and the open editor render as separate compact elements.


## v31 poster blur overlay QA

The saved thought remains over the poster area. Browser console confirms a translucent background (`color(srgb 1 1 1 / 0.634118)`) and `backdrop-filter: blur(6px) saturate(0.9)`. The note is 154px wide and 70px high, positioned above the trigger so the poster remains visible beneath the cloud while the text stays readable.


## v33 controls and expiry QA

The trigger now uses a modern outline SVG thought icon instead of the previous Font Awesome dots. The composer is narrower and shorter, and its footer contains adjacent `Видалити` and `Зберегти` actions. Delete was smoke-tested locally: it cleared the note, closed the editor, and displayed `Думку видалено`. Saving writes `thoughtAt`, and the runtime timer plus render-time guard remove the thought after four hours.
