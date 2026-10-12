# VakDab Cloudflare auth

`auth-worker.js` is the source for a separate `vakdab-auth-api` Worker. It adds D1-backed email/password and Telegram sessions plus profile/rating records. Telegram `initData` is checked by an internal Cloudflare Service Binding to the existing `vakdab-telegram-auth` Worker; that Worker is not overwritten.

## Data and identity

- The `vakdab-auth` D1 database is a new, empty store. No Firebase users or Firestore records are imported.
- Email registrations create new Cloudflare identities. Existing Firebase passwords and account IDs are not transferred.
- Passwords are salted and hashed with PBKDF2-SHA-256 (100,000 iterations, the Cloudflare WebCrypto runtime limit); only hashed opaque session tokens are stored in D1.
- The old Firebase project and its data remain untouched.

## Email capabilities

Email/password registration and login work without an email provider. The Worker currently returns `EMAIL_SENDING_NOT_CONFIGURED` for password-reset requests because the Cloudflare account does not have a Cloudflare-managed zone/Email Sending domain. Enable a verified sender/domain and add an Email Service binding before enabling password-reset email. Do not silently report reset success until mail delivery is configured.

## Deploy

The new Worker needs D1 binding `{ type: "d1", name: "DB", id: "e7fb7412-0d51-411e-b72f-9895e8121651" }` and service binding `{ type: "service", name: "TELEGRAM_VERIFIER", service: "vakdab-telegram-auth" }`. The existing Telegram Worker and its secrets are left unchanged.

Apply `schema.sql` to D1 before deploying the new module. Its workers.dev URL is `https://vakdab-auth-api.animegran8.workers.dev`.
