# 002 — Speed up card poster hover zoom to 180ms ease-out

- **Status**: DONE
- **Commit**: e665b8d
- **Severity**: MEDIUM
- **Category**: Easing & duration
- **Estimated scope**: 1 file, 1 line

## Problem

Card poster images zoom on hover with `transition: transform 0.4s ease;` — 400ms with the weak built-in `ease` curve. Hover feedback is hit tens of times per day on the homepage; at 400ms the zoom feels floaty and lags behind the cursor. The budget for hover feedback is ≤200ms, and the repo norm is 160–180ms with `var(--ui-ease)`.

Current code:

```css
/* src/styles/components/anime-card.css:67 — current */
.popular-card__poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
}
```

Hover state that drives it (`src/styles/components/anime-card.css:69`): `.popular-card:hover .popular-card__poster img { transform: scale(1.06); }` — keep it; only the transition changes.

## Target

```css
/* target — anime-card.css:67 */
.popular-card__poster img {
    transition: transform 180ms var(--ui-ease);
}
```

## Repo conventions to follow

- `--ui-ease: cubic-bezier(.23, 1, .32, 1)` at `src/styles/pages/ux-2026.css:9`.
- Hover-scale exemplar: `src/styles/pages/ux-2026.css:170` uses `transition: transform 160ms var(--ui-ease), background 180ms var(--ui-ease), box-shadow 180ms var(--ui-ease);` — 160–180ms is the site norm for transform.

## Steps

1. In `src/styles/components/anime-card.css` line 67, replace `transition: transform 0.4s ease;` with `transition: transform 180ms var(--ui-ease);`.

## Boundaries

- Do NOT change the hover scale value (`scale(1.06)`), the keyframes, or any other property.
- Do NOT touch other files.

## Verification

- **Mechanical**: `grep -n "transition: transform 0.4s ease" src/styles/` must return nothing.
- **Feel check**: hover a card poster — the zoom should snap in crisply with a fast start, not float for 400ms. At 10% playback in the DevTools Animations panel the curve should be a quick ease-out.
- **Done when**: the poster zoom completes in ~180ms with `var(--ui-ease)`.
