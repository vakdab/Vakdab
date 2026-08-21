# Redesign research notes

## Scope
Redesign Vakdab's existing static anime catalog, with special focus on the home hero and anime catalog cards. Preserve the existing black/white/accent palette and existing data/actions.

## Current repository signals
- Plain static HTML/CSS/JavaScript project, not React.
- Main entry: `index.html`.
- Global CSS: `src/styles/app.css`, split into base, components, pages, themes and utilities.
- Relevant surfaces: `src/styles/components/hero.css`, `anime-card.css`, `header.css`, `bottom-nav.css`, and `src/styles/pages/main.css`.
- Latest repository commit already introduced visible watch/favorite actions and shared bookmark state; redesign must preserve those working behaviors.

## Design direction
- Mobile-first, content-led catalog with a restrained dark surface system that keeps current black/white/accent tokens.
- Replace overly decorative/ambiguous layering with clear hierarchy: eyebrow/metadata, title, short synopsis, rating, then primary Watch CTA and secondary Favorite control.
- Use large-radius cards, soft low-contrast elevation, consistent spacing, fluid type with `clamp()`, and purposeful transitions under 300ms.
- Keep image overlays behind text only when a scrim guarantees contrast; otherwise place metadata in solid card areas.
- Use horizontal mobile rails for featured/recommended content where useful, and a clear responsive grid for the main catalog.
- Make all controls visibly available on mobile, with at least 48px interaction boxes where practical (and never below WCAG 2.2's 24px minimum target size).
- Add visible keyboard focus, semantic labels/alt text, reduced-motion support, and states for favorite/watch actions.

## Sources consulted
1. W3C, Web Content Accessibility Guidelines 2.2 (Recommendation, 12 Dec 2024): https://www.w3.org/TR/WCAG22/
   - WCAG 2.2 applies to mobile devices and adds Focus Not Obscured, Focus Appearance, Dragging Movements, and Target Size (Minimum).
   - Use perceivable, operable, understandable, robust principles; provide text alternatives and visible focus.
2. Material Design 3, Cards guidelines: https://m3.material.io/components/cards/guidelines
   - Cards should be easy to scan, use clear hierarchy, and group related content/actions.
   - Cards can be grids, lists or carousels; filters/sorting belong outside the collection.
   - Avoid text/icons directly on images unless a scrim or bounding shape ensures contrast.
   - On small screens, consider lists/compact arrangements while retaining controls.
3. Material Design 3, Grids & spacing: https://m3.material.io/foundations/layout/grids-spacing/density
   - Default interaction targets should be at least 48x48 CSS px; icon visuals may be smaller inside that box.
   - Avoid dense interaction targets on mobile; use spacing to control information density.
4. Tubik Studio, What's Next: 7 UI Design Trends of 2026: https://tubikstudio.com/blog/ui-design-trends-2026/
   - 2026 favors purposeful motion over decorative animation, user control over inescapable effects, fluid typography via `clamp()`, structural clarity, and anti-liquid-glass restraint when effects hurt legibility.

## Acceptance criteria
- Existing palette variables remain the source of truth; no neon colors or new dominant accent palette.
- Hero CTA hierarchy is obvious at first glance; Watch remains primary and Favorite is secondary but always reachable.
- Anime cards have stable title/meta/action zones, not hover-only actions on mobile.
- Tap targets and spacing are comfortable at 320–430px widths.
- Desktop/tablet layouts remain balanced without stretching cards excessively.
- Interactions preserve existing routes, player opening, and bookmarks store.

## Browser QA checkpoint
- Local preview rendered successfully after the entry screen.
- Hero now exposes `Обрано для тебе`, title, synopsis, genre chips, rating/meta, visible `Дивитись` CTA, and favorite button.
- Hero indicators are real buttons with Ukrainian aria labels and `aria-current` state.
- Home catalog rendered real remote data with visible status, rating, watch action, title, metadata, and favorite control on every card.
- Catalog controls (mode tabs, search, sort, view toggle, schedule, filters, load more) are visible and remain wired.
- Current desktop screenshot shows the intended contained hero stage and catalog workspace hierarchy; mobile widths still need a dedicated screenshot pass.

## QA finding and fix
Browser computed styles revealed that `Router.goTo()` was setting `#actionsRow.style.display = 'flex'` inline on the home route, overriding the new CSS grid toolbar. The router now removes the inline display property on the home route, allowing the mobile-first two-column toolbar and desktop spacing rules to take effect while preserving `display:none` on subpages.

## Final mobile QA checkpoint
The final 390px screenshot shows a contained rounded hero with readable title, synopsis, genre chips, rating/meta, visible 48px Watch and Favorite controls, and accessible slide indicators. Popular and Random actions now sit side-by-side in a balanced two-column toolbar after removing the router's inline flex style. The catalog card begins with a clear title/count header and mode tabs, while the fixed bottom navigation remains reachable without horizontal page overflow.
