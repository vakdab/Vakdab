# VakDab Telegram Bot Worker

Цей Worker використовує той самий data flow, що й сайт VakDab:

`Telegram → Cloudflare Worker → monoanime.animegran8.workers.dev → animeua.club`

## Фактичні джерела VakDab

- Пошук: `https://animeua.club/index.php?do=search&subaction=search&story={query}&page={page}`
- Популярні: `https://animeua.club/top.html`
- Основний каталог: `https://animeua.club/page/{page}/`
- Деталі: URL картки `/anime/...`, отриманий із реальної відповіді сайту
- Proxy: `https://monoanime.animegran8.workers.dev?url={encoded_url}&force_ua=desktop`

`worker.js` не парсить GitHub Pages і не містить Telegram token.

## Cloudflare setup

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put WEBHOOK_SETUP_SECRET
wrangler deploy
```

Після deploy встанови webhook, підставивши URL Worker і секрет setup:

```text
https://<worker-domain>/set_webhook?url=https%3A%2F%2F<worker-domain>&secret=<WEBHOOK_SETUP_SECRET>
```

Перевірка:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

## Що підтримує Worker

- `/start`, головне меню, популярні, випадкове, пошук;
- пошук через реальний endpoint AnimeUA з частковим пошуком на стороні джерела;
- кирилиця, латиниця, нормалізація пробілів;
- пагінація;
- деталі, постер і реальний URL аніме;
- callback queries, inline keyboards, `sendMessage`, `editMessageText`, `sendPhoto`, `answerCallbackQuery`;
- HTML escaping для Telegram;
- розділення помилки API та відсутності результатів;
- короткі callback data;
- in-memory cache/state без KV/D1.

## Важливе обмеження Cloudflare Worker

`Map` і кеш живуть у пам'яті конкретного Worker isolate та можуть очищатися після простою або нового деплою. Для базової роботи цього достатньо. KV/D1 потрібні лише якщо треба зберігати стани користувачів і результати між перезапусками.
