# Catalog genres v55 QA notes

## Local preview

- URL: `http://127.0.0.1:4173/index.html#main`
- Homepage loaded successfully from the static preview.
- The catalog exposes 18 genre buttons plus `Усі жанри`.
- The genre buttons are rendered inside the quick-actions region immediately after `Розклад виходу`.
- The preview loaded 28,882 anime results and displayed the Hikka anime cards, confirming the catalog request still works after the markup change.
- Each genre button retains `role="listitem"` and is visible to browser accessibility extraction.

## Implementation observations

- Genre selection now sends `genres: [slug]` to Hikka; `format:movie` sends `media_type: ['movie']`.
- Selecting a genre resets the catalog request state and reloads page 1 instead of filtering only the current page.
- The old standalone genre browser is removed when switching to manga or ranobe.

## Genre interaction QA

Після точного DOM click по кнопці `Бойовики` (`data-catalog-genre="action"`) rail залишився компактним, кнопка «Розклад виходу» залишилася поруч, а Hikka повернув `6 132` результатів. У каталозі відобразилися 24 картки, серед яких «Сталевий алхімік: Братерство», «Атака титанів» та інші тайтли з бойовими жанрами. Active button отримав slug `action`, а результат більше не залишився на загальному каталозі з 28 882 позицій.

Окремий DOM click по `Фентезі` (`data-catalog-genre="fantasy"`) також спрацював: Hikka повернув `6 822` результатів, active state перемістився на кнопку «Фентезі», а в сітці з’явилися 24 відповідні картки, зокрема «Проводжальниця Фрірен», «Віднесені привидами», «Мандрівний замок» і «Принцеса Мононоке».

Повернення через кнопку `Усі жанри` також спрацювало: count повернувся до `28 882` результатів, active genre знову `all`, а загальні 24 картки каталогу відновилися.

## Layout verification

DOM підтвердив правильну структуру: `#homeCatalogGenreRailHost` має класи `home-catalog-genre-rail home-catalog-genre-rail--inline` і є дочірнім елементом `.home-catalog-quick-actions home-catalog-quick-actions--genres`. Rail має горизонтальний overflow і вміщує всі жанри.

Проміжна computed-style перевірка локального preview показала старий розмір картки 116×120 замість очікуваного compact chip. Markup уже правильний, тому перед commit потрібно перевірити, чи останній CSS override фактично завантажений і не перекритий старим stylesheet cache/parser state.

Computed style diagnosis: у браузері markup має `home-catalog-genre-rail--inline`, але chip лишався 116×120 із column layout. Рекурсивна перевірка CSS rules не знайшла v55 selector у завантаженому app.css, тому перевіряю HTTP response/import chain; це cache/import delivery issue, а не помилка markup.

Після bump nested import marker і повного reload computed styles стали правильними: перший genre chip має `height: 40px`, `min-height: 40px`, `border-radius: 999px`, `flex-direction: row`; rail має `display: flex`, `overflow-x: auto`, `scrollWidth: 2180px` при ширині 978px, а кнопка «Розклад виходу» стоїть поруч із rail і має 149×48px. Це підтверджує compact inline layout і доступність genre chips через горизонтальний scroll.

## Live verification

Опублікований URL `https://vakdab.github.io/Vakdab/?v=20260822-catalog-genres-v55#main` віддає `app.js?v=20260822-catalog-genres-v55`, кнопку «Розклад виходу» та всі 18 compact genre controls. На live після click по `action` каталог показав `Показано 24 з 6 132 результатів`, тобто GitHub Pages віддає новий код і серверний genre filter працює після deploy.

GitHub Actions для commit `3a8d902` завершилися успішно: `Deploy static site to GitHub Pages` і `pages-build-deployment` мають conclusion `success`.
