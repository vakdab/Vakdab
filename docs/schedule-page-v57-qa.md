# Schedule page v57 QA

## Mobile day selector

Local browser route `http://127.0.0.1:4173/index.html?v=20260822-schedule-page-v57#schedule` rendered one unified seven-column day selector with `Пн`, `Вт`, `Ср`, `Чт`, `Пт`, `Сб`, `Нд`. The active day uses the existing VakDab accent, while inactive days remain quiet within the same rounded panel.

Clicking `Вт` updated the active state and hid the other day sections; the page then showed only the Tuesday schedule section and its entries. Each tab remains a real button with `role="tab"`, `aria-selected`, keyboard focus behavior, and arrow-key navigation.

The hero and schedule cards remain visible in the same mobile layout, and the day selector is placed between the hero and the selected day content.

Додатково перевірено переключення назад: після `Вт` натискання на `Сб` відновлює суботній список, активний стан повертається на `Сб`. DOM-панель має сім рівних grid columns, висоту 76px і один спільний rounded container.
