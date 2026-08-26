# 005 — Replace remaining transition:all and unify curves across pages/components

- **Status**: DONE
- **Commit**: e665b8d
- **Severity**: MEDIUM
- **Category**: Performance & cohesion
- **Estimated scope**: 4 files, 7 rules

## Problem

Beyond chat (plan 004), several interactive controls across the site still use `transition: all` — with non-repo curves (Material `cubic-bezier(0.4, 0, 0.2, 1)` or bare `ease`) instead of the site's `var(--ui-ease)` / `--transition` tokens. These are the last `transition: all` holdouts on interactive UI; fixing them removes off-GPU animation and consolidates the site onto one motion language.

Current code:

```css
/* src/styles/pages/search.css:28 — current */
.search-page-input-wrap {
    ...
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
```

```css
/* src/styles/components/back-to-top.css:21 — current */
.back-to-top {
    ...
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

```css
/* src/styles/pages/filter.css:29 — current */
.filter-page__back {
    ...
    transition: all var(--transition);
}
```

```css
/* src/styles/components/hero.css:277 — current */
.hero-tag {
    ...
    transition: all 0.25s ease;
}
```

```css
/* src/styles/pages/search.css:68 — current */
.search-page-clear {
    ...
    transition: all 0.2s;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
}
/* its states: .visible { opacity: 0.7; ... } and :hover { opacity: 1; color: var(--accent); background: var(--hover); transform: scale(1.1); } */
```

## Target

Replace each with an explicit property list limited to what that element actually animates (its `:hover` / `:focus-visible` / `.active` states — check each rule before writing the list), using the site's tokens:

```css
/* target — search.css:28 (.search-page-input-wrap: border, shadow, background on focus) */
.search-page-input-wrap {
    transition: border-color 160ms var(--ui-ease), box-shadow 160ms var(--ui-ease), background 160ms var(--ui-ease);
}

/* target — back-to-top.css:21 (.back-to-top: opacity/transform on show/hide) */
.back-to-top {
    transition: opacity 220ms var(--ui-ease), transform 220ms var(--ui-ease);
}

/* target — filter.css:29 (.filter-page__back: background/color/shadow on hover) */
.filter-page__back {
    transition: background 160ms var(--ui-ease), color 160ms var(--ui-ease), box-shadow 160ms var(--ui-ease);
}

/* target — hero.css:277 (.hero-tag: background/color/border on hover) */
.hero-tag {
    transition: background 160ms var(--ui-ease), color 160ms var(--ui-ease), border-color 160ms var(--ui-ease);
}

/* target — search.css:68 (.search-page-clear: opacity fade on .visible, background/color/transform on hover) */
.search-page-clear {
    transition: opacity 160ms var(--ui-ease), visibility 160ms var(--ui-ease),
                background 160ms var(--ui-ease), color 160ms var(--ui-ease),
                transform 160ms var(--ui-ease);
}
```

Verify each rule's actual hover/active states and include only the properties that change; do not guess. If a rule animates `transform`, add `transform 160ms var(--ui-ease)`.

## Repo conventions to follow

- `--ui-ease: cubic-bezier(.23, 1, .32, 1)` at `src/styles/pages/ux-2026.css:9`; `--transition: 280ms cubic-bezier(.2, .9, .2, 1)` at `src/styles/base/variables.css:31`.
- Do NOT introduce `cubic-bezier(0.4, 0, 0.2, 1)` (Material) anywhere new — the site's standard is `var(--ui-ease)`.
- Exemplar: `src/styles/pages/ux-2026.css:170`.

## Steps

1. `src/styles/pages/search.css` line 28: replace `transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);` with the explicit border-color/box-shadow/background list (or the subset that the rule's focus/hover state changes).
2. `src/styles/components/back-to-top.css` line 21: replace `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);` with `transition: opacity 220ms var(--ui-ease), transform 220ms var(--ui-ease);` (this element fades/scales on scroll — confirm and use the properties it actually animates).
3. `src/styles/pages/filter.css` line 29: replace `transition: all var(--transition);` with the explicit list for the back button's hover state.
4. `src/styles/components/hero.css` line 277: replace `transition: all 0.25s ease;` with the explicit background/color/border-color list for `.hero-tag`.
5. `src/styles/pages/search.css` line 68 (`.search-page-clear`): replace `transition: all 0.2s;` with the explicit opacity/visibility/background/color/transform list above (this control fades via `.visible` and scales on `:hover`).

## Boundaries

- Do NOT touch `schedule.css` or any `.settings-*` base rules (settings-2026.css scopes overrides under `#settingsPageContainer` and already defines correct transitions there).
- Do NOT change durations outside the 160–220ms range, do NOT change markup, do NOT touch other files.
- If a `transition: all` in a listed file targets a non-interactive decorative element (e.g. a marquee), skip it and note it in the verification output.

## Verification

- **Mechanical**: `grep -rn "transition: all" src/styles/pages/search.css src/styles/pages/filter.css src/styles/components/back-to-top.css` must return nothing, and `grep -n "transition: all" src/styles/components/hero.css` must return nothing except line 406 (hero-dot), which is handled by plan 003 — after plan 003 runs, it must return nothing either.
- **Feel check**: hover the search bar (focus ring animates), clear the search query (the ✕ fades in/out), scroll for the back-to-top button, hover the filter back button, and a hero genre tag. Each should feel immediate (≤220ms) with a consistent ease-out, and no element should lag.
- **Done when**: the five rules listed in Steps plus `hero.css:406` (via plan 003) no longer use `transition: all`, and every interactive transition in these files uses `var(--ui-ease)`.
