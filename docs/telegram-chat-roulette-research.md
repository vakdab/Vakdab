# Telegram Chat Roulette research

## Sources

1. Telegram Bot API documentation: https://core.telegram.org/bots/api. The Bot API is an HTTPS interface; webhooks deliver JSON `Update` objects, and Telegram supports inline keyboards, callback queries, message updates, and message-copying methods suitable for relaying content without exposing the original sender in the copied message. Webhook security can use `secret_token` and the `X-Telegram-Bot-Api-Secret-Token` header.

2. Example anonymous bot: https://github.com/davlix/Telegram-anonymous-chat-bot. Its documented feature set includes random pairing, pseudonyms, skip/reconnect, and forbidden-word filtering.

3. Example production-oriented architecture: https://github.com/mingyuanc/Anonymous_telegram_chat_bot. Its documented feature set includes queue matching, anonymous forwarding of text/media, quit, report, and persistent PostgreSQL-backed state.

## Requirements inferred for VakDab

A safe MVP should match users through a waiting queue, assign anonymous session labels, forward text/media through the bot, provide «Наступний» and «Завершити», and include «Поскаржитися» plus rate limits and a basic content filter. It should never expose Telegram usernames or user IDs to the other participant. Pairing and active sessions must be stored durably; the current Worker config has no declared KV, Durable Object, D1, or other persistent binding, while `userStates` is only in-memory and is not sufficient for a reliable cross-request or multi-instance roulette.

A real deployment therefore needs an explicit persistent storage choice. A Cloudflare Durable Object is the strongest fit for atomic queue/session matching, while a KV-backed design is lighter but requires careful race handling and is better for a first MVP only if pairing consistency is acceptable. The existing Telegram Worker currently supports only anime search/random and a Makima-branded AI flow, so content-type routing and Luna renaming are separate low-risk changes from the roulette storage decision.

## Cloudflare architecture verification

Cloudflare documentation search (22 Aug 2026) confirms that Durable Objects combine compute with per-object storage, support SQLite storage and alarms, and are configured through a `durable_objects.bindings` entry plus a `migrations` entry with `new_sqlite_classes`. A single named object can coordinate the global matchmaking queue atomically. Source: https://developers.cloudflare.com/changelog/product/durable-objects/.

## Hikka typed endpoint probe

A live public probe returned `pagination` and `list` for both `POST https://api.hikka.io/manga?page=1&size=1` and `POST https://api.hikka.io/novel?page=1&size=1`. Manga returned fields including `title_ua`, `image`, `chapters`, `volumes`, `status`, and `synopsis_ua`; novel returned the same normalized shape, with `chapters` and `volumes` available. The Worker can therefore use Hikka `/manga` and `/novel` directly for the Telegram picker without falsely linking them to the anime player.

## Telegram media relay verification

The official Telegram Bot API states that an incoming `message` may be a message of any kind including text, photo, and sticker, and `copyMessage` is the appropriate method for copying a message to another chat. The current relay already calls `copyMessage`, so the fix must ensure the Worker recognizes every required media field and does not reject Telegram message variants before that call. Source: https://core.telegram.org/bots/api.
