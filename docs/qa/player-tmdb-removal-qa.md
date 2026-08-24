# Player TMDB removal QA

Після винесення каталогового `fetchTmdbCardInfo` у `src/js/services/tmdb.js` окремий service module імпортується у браузері успішно. `animePlayerPage.js` має 0 згадок `tmdb` за локальним grep. Поточний v48 local shell після reload показав `Unexpected token export` у bootstrap; причина ще не підтверджена і має бути виправлена до commit. HTTP-відповіді всіх трьох модулів мають `Content-type: text/javascript`.

Додаткова локалізація: прямий browser import `services/tmdb.js` успішний, але прямі imports `homeLegacy.js` та `animePlayerPage.js` v48 повертають `Unexpected token 'export'`. Це вказує на проблему в одному з імпортованих модулів або локальному module graph/cache, а не на TMDB service syntax. Виправлення має пройти browser smoke test до commit.

Після виправлення duplicated function markers ES-module parser проходить, і v48 browser reload більше не дає bootstrap `Unexpected token export`. App shell і controls завантажуються; каталог у момент перевірки показував 0 результатів під час очікування API, без console error.

Після syntax fix v48 app shell і каталог завантажилися без bootstrap error; каталогова TMDB card enrichment продовжує працювати через окремий `services/tmdb.js`, тоді як `animePlayerPage.js` лишається без `tmdb` token.

Фінальний local player smoke test успішний: Hikka player modal відкрився, базовий poster/title/season/episode/dub працюють, а верхня статистика показує `—` і `ОЦІНКА ГЛЯДАЧІВ` без `TMDB`. Jikan extras завантажили `AniList 8.3`, персонажів, сейю, studio та related titles; TMDB metadata enrichment більше не запускається.
