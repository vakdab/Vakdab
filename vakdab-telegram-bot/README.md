# VakDab Telegram Bot + Site Worker

Один Cloudflare Worker обслуговує і сайт VakDab, і Telegram-бота:

```text
/                    → статичний сайт VakDab
/telegram-webhook    → Telegram webhook бота
/set_webhook         → захищене встановлення webhook
```

Worker залишається на існуючій адресі:

`https://vakdab.vakdabpro.workers.dev/`

## Важливо для Cloudflare Build

GitHub repository: `vakdab/Vakdab`

Root directory залишити порожнім — потрібні і сайт у корені репозиторію, і `vakdab-telegram-bot/worker.js`.

Deploy command:

```bash
npx wrangler deploy
```

`wrangler.toml` використовує:

```toml
name = "vakdab"
main = "worker.js"

[assets]
directory = "."
binding = "ASSETS"
```

Тому Worker не віддає Telegram-код замість сайту: GET-запити передаються у `ASSETS`, а тільки POST на `/telegram-webhook` обробляється ботом.

## Дані AnimeUA

- Пошук: `https://animeua.club/index.php?do=search&subaction=search&story={query}&page={page}`
- Популярні: `https://animeua.club/top.html`
- Каталог: `https://animeua.club/page/{page}/`
- Випадкове: `https://animeua.club/index.php?do=rand`
- Proxy: `https://monoanime.animegran8.workers.dev?url={encoded_url}&force_ua=desktop`

## Cloudflare secrets

У Worker `vakdab` додай:

```text
TELEGRAM_BOT_TOKEN
WEBHOOK_SETUP_SECRET
```

Секрети не зберігаються у GitHub і не записуються в код.

## Встановлення Telegram webhook

Webhook має вести не на корінь сайту, а на Telegram-маршрут:

```text
https://vakdab.vakdabpro.workers.dev/set_webhook?url=https%3A%2F%2Fvakdab.vakdabpro.workers.dev%2Ftelegram-webhook&secret=<WEBHOOK_SETUP_SECRET>
```

Перевірка:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

Після цього сайт відкривається як раніше, а Telegram надсилає updates на `/telegram-webhook`.

## Gemini / Makima

Telegram-команда `/makima <запит>` або `/ask <запит>` передає запит у Gemini.
У Cloudflare Worker потрібно додати secret `GEMINI_API_KEY`; ключ не зберігається в GitHub. Опційно можна задати змінну `GEMINI_MODEL`, за замовчуванням використовується `gemini-2.5-flash`.

Команду можна додати через Cloudflare Dashboard → Worker `vakdab` → Settings → Variables and Secrets → Add secret.
