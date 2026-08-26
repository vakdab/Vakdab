# 004 — Replace transition:all with explicit GPU-safe properties in chat

- **Status**: DONE
- **Commit**: e665b8d
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 1 file, 13 rules

## Problem

`src/styles/community/chat.css` uses `transition: all` on 13 interactive, high-frequency controls (tabs, stat cells, achievement items, sort tabs, leaderboard items, the input box, send button, type options, filter tabs, message action buttons, anime result items, anime cards). `transition: all` animates every animatable property, including off-GPU ones (margin, padding, width, filter), and runs at `.3s` / `.2s`. In a live community this UI is hit constantly; `transition: all` is always a finding per the craft bar.

Current code (13 rules, all in `src/styles/community/chat.css`):

| Line | Selector | Current transition |
| --- | --- | --- |
| 40 | `.rg-main-tab` | `transition: all .3s cubic-bezier(.2,.9,.2,1);` |
| 135 | `.rg-stat-cell` | `transition: all .3s cubic-bezier(.2,.9,.2,1);` |
| 183 | `.rg-ach-item` | `transition: all .3s cubic-bezier(.2,.9,.2,1);` |
| 222 | `.rg-sort-tab` | `transition: all .3s cubic-bezier(.2,.9,.2,1);` |
| 309 | `.rg-lb-item` | `transition: all .3s cubic-bezier(.2,.9,.2,1);` |
| 601 | `.com-input-box` | `transition: all .3s cubic-bezier(.2,.9,.2,1);` |
| 654 | `.com-send-btn` | `transition: all .3s cubic-bezier(.2,.9,.2,1);` |
| 690 | `.com-type-opt` | `cursor: pointer; transition: all .2s;` |
| 718 | `.com-filter-tab` | `transition: all .3s cubic-bezier(.2,.9,.2,1);` |
| 738 | `.com-msg-action-btn` | `transition: all .2s; padding: 0; border-radius: 50%;` |
| 779 | `.com-anime-result-item` | `transition: all .2s;` |
| 816 | `.com-ach-opt` | `font-family: inherit; transition: all .2s;` |
| 831 | `.com-anime-card` | `transition: all .2s; max-width: 260px;` |

## Target

For each rule, replace `transition: all <dur> [curve];` with an explicit property list limited to the properties that actually change in that rule's `:hover` / `:active` / `:checked` states — almost always a subset of `background`, `color`, `border-color`, `box-shadow`, `transform`. Use the repo motion tokens:

```css
/* target pattern — background/color/border/shadow changes */
transition: background 160ms var(--ui-ease), color 160ms var(--ui-ease),
            border-color 160ms var(--ui-ease), box-shadow 160ms var(--ui-ease);
/* + if the rule also has a hover/active transform: */
transition: background 160ms var(--ui-ease), color 160ms var(--ui-ease),
            border-color 160ms var(--ui-ease), box-shadow 160ms var(--ui-ease),
            transform 160ms var(--ui-ease);
```

Explicitly:

- `.com-send-btn` (line 654) also transforms on press — keep the transform by adding `transform 160ms var(--ui-ease)` to the list (the rule's `:active { transform: scale(.95); }` stays).
- `.com-type-opt`, `.com-msg-action-btn`, `.com-anime-result-item`, `.com-ach-opt`, `.com-anime-card` (the `.2s` ones) → use the same 160ms pattern above.
- Do NOT change the curve token choice where the rule's own hover already defines a concrete property (e.g. a rule that only fades background). The bar: every listed property must be one that element actually animates.

## Repo conventions to follow

- `--ui-ease: cubic-bezier(.23, 1, .32, 1)` at `src/styles/pages/ux-2026.css:9`.
- Exemplar of explicit property lists: `src/styles/pages/ux-2026.css:170` — `transition: transform 160ms var(--ui-ease), background 180ms var(--ui-ease), box-shadow 180ms var(--ui-ease);`.
- 160–200ms for these controls is inside the 125–250ms small-control budget.

## Steps

1. For each of the 13 lines listed above, replace the `transition: all …;` with an explicit property list (pattern above), enumerating only the properties that change on that element's hover/active/checked states.
2. Preserve each rule's other declarations (padding, border-radius, font-family, max-width, etc.) untouched.
3. Confirm no `transition: all` remains in the file.

## Boundaries

- Do NOT change any other declaration, selector, keyframe, or the markup.
- Do NOT touch `.rg-tab-panel`'s `animation`, message fadeInUp animations, or anything outside the 13 listed rules.
- Do NOT touch other files.

## Verification

- **Mechanical**: `grep -c "transition: all" src/styles/community/chat.css` must return `0`.
- **Feel check**: open the community/chat panel; click through tabs, sort controls, send a message, hover result items. Feedback should feel the same (or snappier at 160ms) with no visible lag or jitter. In DevTools Rendering → Paint Flashing, confirm only compositing flashes during hovers, no layout paint.
- **Done when**: no `transition: all` remains in chat.css and all controls animate only `background`/`color`/`border-color`/`box-shadow`/`transform`.
