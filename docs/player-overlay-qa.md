# Player overlay QA

На локальному `#main` успішно відкрито реальний player modal через картку «Атака титанів - 3 сезон, 2 частина». Video frame та episode/dub selectors завантажилися, український topbar показав «ЗАРАЗ ВІДТВОРЮЄТЬСЯ» і title. На першому screenshot відео ще було у preview/loading стані; після очікування frame залишився у видимому player container. Потрібно окремо запустити playback і перевірити нижню control bar та quality rail.

Після запуску серії control bar успішно з’явилася поверх відео: чорний градієнтний dock, progress bar, 0:13 / 23:55, play/pause, skip ±10 секунд, швидкість, Авто-якість, mute і fullscreen. Відео реально відтворюється, preview play зникає, controls залишаються контрастними поверх кадру. У тестовому джерелі HLS quality levels не повернулися, тому вертикальний rail був прихований коректно, а не показував декоративні 720p/360p/240p.

У v44 build після перезавантаження локальний player modal відкрився без syntax/runtime blocker і з оновленими episode/dub selectors. Після відкриття нового тайтлу preview/loading frame показався коректно; наступний крок — запуск серії та перевірка HLS levels після нового Safari/native fallback fix.

У v44 тесті ручний запуск через lower play button успішний: `0:06 / 24:06`, відео грає, нижній dock поверх кадру контрастний, fullscreen доступний окремою кнопкою. Поточне ASHDI HLS джерело в Chromium не повернуло quality levels у `hls.levels`, тому rail 720p/360p/240p залишився hidden; це відповідає правилу не показувати недоступні якості.

Quality menu QA успішний: клік по `lpQualityBtn` відкрив dark popover з українським заголовком «Якість» і `Авто`; outside/player scroll не викликав помилки, а overlay-кнопка fullscreen залишилася доступною.

У v45 local build player modal відкривається коректно після перезавантаження. До вибору серії/завантаження відео preview Play доступний у modal; наступний тест перевіряє, що його перший tap одразу запускає player без повторного натискання.

Після оновлення v45 один клік по preview Play одразу створив player, завантажив відео та перевів нижню кнопку в стан `Пауза`; preview overlay зник. Це підтверджує виправлення проблеми, коли раніше потрібно було натискати двічі.
