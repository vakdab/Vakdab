# 001 — Shorten homepage grid entrance to 300ms strong ease-out

- **Status**: DONE
- **Commit**: e665b8d
- **Severity**: HIGH
- **Category**: Easing & duration
- **Estimated scope**: 2 files, 3 lines

## Problem

Homepage anime cards enter with `animation: fadeInUp 0.5s ease both;` — 500ms, above the 300ms UI-animation budget, using the weak built-in `ease` curve. On every homepage load (the most-visited page of the site) the whole grid plays this slow, weak rise-and-fade, which delays when content is readable and makes the page feel sluggish. The repo's own motion language (ux-2026.css) is 160–300ms with the strong `var(--ui-ease)` curve; these entrances ignore it.

Current code:

```css
/* src/styles/components/hero.css:461 — current */
.anime-grid .anime-card {
    animation: fadeInUp 0.5s ease both;
}
```

```css
/* src/styles/components/hero.css:628 — current (second identical rule) */
.anime-grid .anime-card {
    animation: fadeInUp 0.5s ease both;
}
```

```css
/* src/styles/components/anime-card.css:31 — current */
.popular-card {
    transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition);
    animation: fadeInUp 0.5s ease both;
}
```

## Target

```css
/* target — hero.css:461 and hero.css:628 */
.anime-grid .anime-card {
    animation: fadeInUp .3s var(--ui-ease) both;
}
```

```css
/* target — anime-card.css:31 */
.popular-card {
    animation: fadeInUp .3s var(--ui-ease) both;
}
```

The `fadeInUp` keyframes already exist at `src/styles/base/reset.css:65-69` (`opacity 0→1`, `translateY(16px)→0`) — keep them; only the applied duration and curve change.

## Repo conventions to follow

- `--ui-ease: cubic-bezier(.23, 1, .32, 1)` is defined in `:root` at `src/styles/pages/ux-2026.css:9` and is globally available (strong ease-out).
- `--transition: 280ms cubic-bezier(.2, .9, .2, 1)` and `--transition-smooth: 360ms cubic-bezier(.2, .9, .2, 1)` live in `src/styles/base/variables.css:31-32`.
- Exemplar of correct short motion: `src/styles/pages/ux-2026.css:649` — `transition: transform 160ms var(--ui-ease), opacity 160ms ease;`. Durations in the 160–300ms range with `var(--ui-ease)` are the site-wide norm.

## Steps

1. In `src/styles/components/hero.css` line 461, replace `animation: fadeInUp 0.5s ease both;` with `animation: fadeInUp .3s var(--ui-ease) both;`.
2. In `src/styles/components/hero.css` line 628, replace `animation: fadeInUp 0.5s ease both;` with `animation: fadeInUp .3s var(--ui-ease) both;`.
3. In `src/styles/components/anime-card.css` line 31, replace `animation: fadeInUp 0.5s ease both;` with `animation: fadeInUp .3s var(--ui-ease) both;`.

## Boundaries

- Do NOT touch any other file, animation, or keyframe definition.
- Do NOT change markup/structure.
- Do NOT add a stagger — that needs per-card `animation-delay` driven by markup/JS, out of scope.

## Verification

- **Mechanical**: `grep -rn "fadeInUp 0.5s" src/styles/` must return nothing.
- **Feel check**: load the homepage. The card grid should settle in ~300ms with a snappy ease-out finish instead of a slow float. In DevTools Animations panel set playback to 10% and confirm the rise-and-fade completes quickly with a fast start and soft landing.
- **Done when**: cards on the homepage enter in ≤300ms with `var(--ui-ease)`; no `fadeInUp 0.5s` remains in `src/styles/`.
