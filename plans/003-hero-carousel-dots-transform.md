# 003 — Animate hero carousel dots with transform scaleX instead of width

- **Status**: DONE
- **Commit**: e665b8d
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 1 file, 1 rule + 1 active state

## Problem

The hero carousel's active dot grows by animating `width` (24px → 40px) via `transition: all 0.3s ease`. Animating `width` triggers layout + paint on every slide change; per the craft bar only `transform` and `opacity` should animate. `transition: all` also pulls in off-GPU properties.

Current code:

```css
/* src/styles/components/hero.css:403-411 — current */
.hero-dot {
    width: 24px;
    height: 3px;
    border-radius: 2px;
    background: rgba(255,255,255,0.25);
    cursor: pointer;
    transition: all 0.3s ease;
}
.hero-dot.active {
    background: #ffffff;
    width: 40px;
    box-shadow: 0 0 8px rgba(255,255,255,0.3);
}
```

## Target

Keep the 24px base width and render the 40px active state as a GPU transform, scaling from the left edge:

```css
/* target — hero.css */
.hero-dot {
    width: 24px;
    height: 3px;
    border-radius: 2px;
    background: rgba(255,255,255,0.25);
    cursor: pointer;
    transform-origin: left center;
    transition: transform 180ms var(--ui-ease), background 180ms var(--ui-ease), box-shadow 180ms var(--ui-ease);
}
.hero-dot.active {
    background: #ffffff;
    transform: scaleX(1.6667); /* 24px × 1.6667 ≈ 40px, matches the old width */
    box-shadow: 0 0 8px rgba(255,255,255,0.3);
}
```

`scaleX(1.6667)` of the 24px base reproduces the 40px visual exactly while animating only the composite transform. Keep `transform-origin: left center` so the pill grows from the left, matching the old width-animation direction.

## Repo conventions to follow

- `--ui-ease: cubic-bezier(.23, 1, .32, 1)` at `src/styles/pages/ux-2026.css:9`.
- The site already animates with transform scales elsewhere (`transform: scale(.92)` etc.); this aligns the dots with that practice.
- Carousel dots are an occasional interaction (slide changes), so 180ms is comfortably inside the 125–200ms small-control budget.

## Steps

1. In `src/styles/components/hero.css`, add `transform-origin: left center;` to the `.hero-dot` rule and replace its `transition: all 0.3s ease;` with `transition: transform 180ms var(--ui-ease), background 180ms var(--ui-ease), box-shadow 180ms var(--ui-ease);`.
2. In the `.hero-dot.active` rule, remove `width: 40px;` and add `transform: scaleX(1.6667);` (keep `background` and `box-shadow`).

## Boundaries

- Do NOT change the base `width: 24px`, the colors, or the carousel JS.
- Do NOT touch other files or other hero animations.
- Do NOT remove `.hero-dot.active` — the selector and JS wiring stay.

## Verification

- **Mechanical**: `grep -n "transition: all 0.3s ease" src/styles/components/hero.css` must return nothing; `grep -n "width: 40px" src/styles/components/hero.css` must return nothing.
- **Feel check**: click the dots — the active pill extends smoothly from the left edge. In DevTools Rendering enable Paint Flashing; during a dot transition only compositing (green) should flash, no layout paint on the dots.
- **Done when**: the active dot grows via transform only, from the left, in 180ms, with no `width` animation.
