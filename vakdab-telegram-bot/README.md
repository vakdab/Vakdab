# VakDab Telegram Bot Worker

Цей Worker використовує той самий data flow, що й сайт VakDab:

`Telegram → Cloudflare Worker → monoanime.animegran8.workers.dev → animeua.club`

Worker прив'язаний до існуючої адреси:

`https://vakdab.vakdabpro.workers.dev/`

## Фактичні джерела VakDab

- Пошук: `https://animeua.club/index.php?do=search&subaction=search&story={query}&page={page}`
- Популярні: `https://animeua.club/top.html`
- Основний каталог: `https://animeua.club/page/{page}/`
- Випадкове: `https://animeua.club/index.php?do=rand`
- Деталі: URL картки на кшталт `/388-boruto-naruto-next-generations.html`, отриманий із реальної відповіді сайту
- Proxy: `https://monoanime.animegran8.workers.dev?url={encoded_url}&force_ua=desktop`

`worker.js` не парсить GitHub Pages і не містить Telegram token.

## Автоматичне підключення GitHub → Cloudflare

У корені репозиторію додано workflow:

`.github/workflows/deploy-vakdab-telegram.yml`

Після кожного push у `vakdab-telegram-bot/` GitHub Actions автоматично:

1. перевіряє синтаксис Worker;
2. запускає Wrangler;
3. деплоїть код у Worker `vakdab`;
4. оновлює `https://vakdab.vakdabpro.workers.dev/`.

У GitHub Repository Settings → Secrets and variables → Actions потрібно один раз додати:

- `CLOUDFLARE_API_TOKEN` — Cloudflare API Token з правом `Account.Workers Scripts:Edit`;
- `CLOUDFLARE_ACCOUNT_ID` — Account ID Cloudflare.

Секрети Telegram залишаються у Cloudflare і не зберігаються в GitHub:

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put WEBHOOK_SETUP_SECRET
```

## Webhook

Webhook Telegram має бути встановлений на вже існуючу адресу Worker:

```text
https://vakdab.vakdabpro.workers.dev/set_webhook?url=https%3A%2F%2Fvakdab.vakdabpro.workers.dev&secret=<WEBHOOK_SETUP_SECRET>
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
