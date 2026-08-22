# Schedule page v57 QA

## Mobile day selector

Local browser route `http://127.0.0.1:4173/index.html?v=20260822-schedule-page-v57#schedule` rendered one unified seven-column day selector with `Пн`, `Вт`, `Ср`, `Чт`, `Пт`, `Сб`, `Нд`. The active day uses the existing VakDab accent, while inactive days remain quiet within the same rounded panel.

Clicking `Вт` updated the active state and hid the other day sections; the page then showed only the Tuesday schedule section and its entries. Each tab remains a real button with `role="tab"`, `aria-selected`, keyboard focus behavior, and arrow-key navigation.

The hero and schedule cards remain visible in the same mobile layout, and the day selector is placed between the hero and the selected day content.

Додатково перевірено переключення назад: після `Вт` натискання на `Сб` відновлює суботній список, активний стан повертається на `Сб`. DOM-панель має сім рівних grid columns, висоту 76px і один спільний rounded container.

## Live verification

Live route `https://vakdab.github.io/Vakdab/?v=20260822-schedule-page-v57#schedule` served `app.js?v=20260822-schedule-page-v57`. The live DOM showed one 940px-wide, 76px-high rounded day panel with seven equal grid columns, active `Сб`, and only the Saturday section visible. This verifies the day-selector fix is deployed.

## Hero edge and character v60

A local headless 375×812 screenshot verified the v60 mobile fix: the dark hero reaches the viewport edges without white side gutters, while the character is positioned lower and smaller inside the hero. The head and full visible silhouette no longer protrude above the hero or overlap the kicker text. The seven-day panel and the first schedule cards remain below the hero in the expected order.
