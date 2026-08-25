# Browser baseline — 2026-08-25

## Main page

The local page `app/index.html` loads successfully. The initial UI renders the catalog shell, tabs for anime/manga/novels, sorting controls, filters, schedule link, settings, and bottom navigation. The catalog initially shows zero results while content is loading.

## Runtime console

No JavaScript exception was observed during startup. The console reports the expected Telegram WebView theme/viewport requests. There is one production warning about loading `cdn.tailwindcss.com` directly.

## Follow-up

The next checks should cover the dedicated Anime Live/watch-party page, schedule page, route/deep-link handling, loading/error states, and interaction behavior under the local static server.

## Anime Live page

The dedicated `app/watch-party.html` page renders correctly at a visual level, including the daily watch-party hero, candidate panel, winner panel, refresh control, and Telegram button. However, its data request fails locally with `Watch Party 404`, leaving the candidate list in a permanent loading state. This is the first confirmed user-facing bug: the page needs a reliable API/base URL strategy and a clear offline/error state rather than an indefinite loader.

Telegram WebView compatibility warnings about header/background color support also appear in the sandbox, but no uncaught JavaScript exception is emitted.

## Production check

The deployed Worker page `https://vakdab.animegran8.workers.dev/app/watch-party` responds with HTTP 200, while `GET /watch-party-api` correctly returns HTTP 401 without Telegram init data. Outside Telegram, the UI shows `Відкрий через Telegram` and keeps the candidate area in a loading presentation. The production route itself is reachable; the API correctly requires Telegram authentication. The UX issue remains that unauthenticated users see an ambiguous loading block instead of a deliberate sign-in explanation.

## After-fix browser check

When opened outside Telegram, the updated page now replaces the indefinite loader with an explicit card: `Відкрий Anime Live у Telegram` and an explanation that voting and chat are available only inside the Mini App. The API request now targets the production Worker from non-Worker hosts, which also fixes the GitHub Pages deployment path. The only remaining console entries are expected Telegram WebView compatibility warnings and the handled authentication warning.
