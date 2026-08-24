# Telegram authentication research

## Verified requirements

Telegram's official Mini Apps documentation states that `window.Telegram.WebApp.initData` is the raw data suitable for validation and that it must be validated on the bot server before use. The parsed `initDataUnsafe` object must not be trusted directly in the client.

Firebase's official custom-token documentation states that a server can validate external sign-in credentials, create a Firebase custom JWT with the Admin SDK, and return it to the client. The client then signs in with `signInWithCustomToken()`. The Firebase service-account private key must remain server-side and must never be placed in the static GitHub Pages application.

## Architecture implication

The current static site can add a Telegram Mini App button and send raw `initData` to a secure server endpoint. A server-side component is required to validate the Telegram HMAC using the VakDabBot token and, if Firebase account continuity is required, mint a Firebase custom token. The existing Google and email/password flows remain unchanged.

## Sources

- Telegram Mini Apps: https://core.telegram.org/bots/webapps
- Firebase Create Custom Tokens: https://firebase.google.com/docs/auth/admin/create-custom-tokens


## HMAC validation detail

The official Telegram Mini Apps documentation specifies `secret_key = HMAC_SHA256(<bot_token>, "WebAppData")`, followed by HMAC-SHA-256 over the alphabetically sorted data-check-string using that secret key. It also recommends checking `auth_date` to reject outdated initData. The Worker implementation follows this order and checks a 24-hour maximum age.

Source: https://core.telegram.org/bots/webapps


## Client smoke test

After clearing the sandbox-only local auth state, the profile auth page displayed the Telegram button (`Увійти або зареєструватися через Telegram`) together with the existing Google, email/password, and guest controls. The Telegram button is available for both first-time account creation and subsequent sign-in; Firebase custom-token sign-in creates the Firebase user on first use.


## References

[1] [Telegram Mini Apps — validating data received via the Mini App](https://core.telegram.org/bots/webapps)

[2] [Firebase Authentication — Create Custom Tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens)

[3] [Cloudflare Workers — Multipart upload metadata](https://developers.cloudflare.com/workers/configuration/multipart-upload-metadata/)


## UI v40 verification

The local auth page now renders a blue Telegram button with the Telegram logo. On the login tab the label is `Увійти через Telegram`; after switching to the registration tab it changes to `Зареєструватися через Telegram`. Google, email/password, and guest controls remain available in both modes.


## Profile persistence fix v41

Profile edits now write the updated profile to local storage and immediately call `Auth.syncUserData({ scope: 'profile' })` for authenticated users. The auth layer keeps the latest profile-sync promise and waits for it during logout before clearing local state. This prevents nickname, bio, avatar, and other profile edits made in Telegram Mini App from being lost during logout/login.
