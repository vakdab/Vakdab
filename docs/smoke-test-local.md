# Local smoke test

Date: 2026-08-17

The local static preview at `http://127.0.0.1:4173/` loaded the VakDab HTML and bootstrap successfully. The page title, home actions, catalog loading state, footer, filters, genres, stickers, schedule, and settings navigation surfaces were present. Browser console showed only the existing Tailwind CDN production warning; no `ReferenceError`, `TypeError`, failed local module import, 404 module, or circular dependency error was reported during startup.

The catalog remained in its normal loading state during the initial short observation because external API responses are not part of this static import smoke test.
