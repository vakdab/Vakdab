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

## Follow-up screenshot QA
The 390px follow-up preview confirms that VakDab is now a normal header brand above the hero rather than a pill floating over artwork. The home catalog poster cards no longer render play/favorite controls or the related bottom gradient. The mobile catalog is configured for three equal columns, and the bottom navigation is a compact floating five-item bar instead of a tall wide tray.

## Search and navigation QA checkpoint
The browser render after the interaction-state patch shows the catalog search input and active catalog tab remain present and functional. The final CSS explicitly removes native input focus outlines, keeps the search field on one composed focus ring, forces readable foreground color for active/pressed controls, and restores animated transitions for bottom navigation visibility, active pills, hover, and press feedback.

## Computed-style verification
Browser computed styles confirm the active catalog tab resolves to a monochrome black background with white text and white `-webkit-text-fill-color`, eliminating the unreadable pressed state. The focused search input has no native outline or inner box-shadow; the surrounding shell receives one 4px focus ring and an elevated shadow. Bottom navigation resolves to a 64px compact bar with transform/opacity/box-shadow transitions and the active Home pill uses the accent background.

## Conditional player controls runtime QA
The actual browser render exposed why the previous conditional-controls commit appeared ineffective: the `hidden` attribute was applied to the season wrapper, but the existing player CSS used `display: flex` on `.player-select-wrap`, overriding the browser's hidden presentation. A final `[hidden] { display: none !important; }` rule scoped to player controls is required so single-season selectors and movie episode/season controls truly disappear.

## Runtime cache-busting correction
The second browser verification showed the season wrapper had `hidden: true` but still rendered at 60px with `display: flex`, proving the conditional rule was not active in the browser session. The player-polish import used a stale query version, so app.css now points to a new `20260821-player-conditional-v2` version to force clients to fetch the corrected visibility rules.

## Second runtime verification
After cache-busting, the fresh browser render still shows a visible `Сезон 1` field for Steins;Gate. This confirms the remaining issue is not only stale CSS; the next check must inspect the exact wrapper's `hidden` property and the runtime call order/state used for this anime.

## Root stylesheet cache-busting
The runtime DOM confirmed the season wrapper had `hidden=""` and the season block had `display:none`, but the wrapper still computed to `display:flex`, because the root `app.css` URL itself was cached. The HTML stylesheet link is now versioned to `20260821-player-conditional-v3`, in addition to the updated player-polish import.

## Mikai runtime QA
After the Mikai entrypoint cache-bust, the movie player runtime reports `Mikai.me` as the source label. The season and episode wrappers have zero height for the movie, while the Ukrainian озвучка select remains visible. The app entry script is the new `20260821-mikai-source-v2` version.

## Mikai playback attempt
On the fresh `app.js?v=20260821-mikai-source-v2` runtime, the movie player shows `Mikai.me` as the source label and Ukrainian controls. Pressing the preview play button creates the custom video controls, so the player lifecycle starts; the next verification should inspect the media element after a short wait for `currentSrc`, `readyState`, `networkState`, `duration`, and `MediaError`.

## Verified Mikai playback proof
A real movie playback was started in the browser. After 5 seconds: source label = `Mikai.me`; video `readyState = 4`, `paused = false`, `currentTime = 43.53s`, `duration = 6015.51s`, `MediaError = null`, buffered range starts at 0 and reaches the full duration. The actual `currentSrc` is a proxied HLS manifest resolved from an `ashdi.vip` URL through the configured Mikai playback flow.

## Related renderer runtime QA
After the related-ua cache-busted entrypoint, the opened Gintama player shows Ukrainian title `Ґінтама`, Ukrainian genres and controls. The related section is below the current viewport and needs a targeted scroll/DOM check to confirm localized related cards and poster fallback states.

## Related-ua-v2 movie QA
The related-ua-v2 runtime loaded successfully and the movie page correctly hides season/episode controls. The movie itself has no visible related cards in this data response, so the next related localization verification must use a TV title with actual relations (for example Gintama or Frieren).

## Final related localization proof
The exact `Ґінтама` TV player now renders related cards in Ukrainian: `Ґінтама - 2 сезон`, `Ґінтама: Оскільки початок є вирішальним...`, `Ґінтама: Народження білого демона`, and `Ґінтама: Грандіозні збори`. Relation/type labels are Ukrainian (`наступний сезон`, `спін-оф`, `Серіал`), and poster images use valid AniList URLs instead of blank blocks.
