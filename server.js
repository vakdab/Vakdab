import express from 'express';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/routes.js';
import { DB } from './server/db.js';
import {
  generateToken,
  getRedirectUri,
  exchangeGoogleCode,
  exchangeDiscordCode
} from './server/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Trust reverse proxy for correct protocol/host resolution in iframe/Cloud Run
app.set('trust proxy', 1);

// Static files
app.use(express.static(__dirname));

// Mount API
app.use('/api', apiRouter);

// Helper for rendering OAuth popup callback page
function renderCallbackHtml(token, user, error) {
  const safeError = error ? String(error).replace(/</g, '&lt;').replace(/>/g, '&gt;') : null;
  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Авторизація VakDab</title>
  <style>
    body {
      background: #0d1117;
      color: #e6edf3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      text-align: center;
      padding: 16px;
      box-sizing: border-box;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 16px;
      padding: 32px 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
    .spinner {
      width: 42px;
      height: 42px;
      border: 3.5px solid rgba(255, 255, 255, 0.15);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
    p { margin: 0 0 16px; color: #8b949e; font-size: 14px; line-height: 1.5; }
    .err-box {
      color: #f85149;
      background: rgba(248, 81, 73, 0.1);
      border: 1px solid rgba(248, 81, 73, 0.2);
      border-radius: 8px;
      padding: 12px;
      font-size: 13px;
      margin-bottom: 16px;
      text-align: left;
      word-break: break-word;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 8px;
      background: #238636;
      color: #fff;
      font-weight: 500;
      font-size: 14px;
      text-decoration: none;
      border: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    ${safeError ? `
      <h2 style="color:#f85149;">Помилка авторизації</h2>
      <div class="err-box">${safeError}</div>
      <button class="btn" onclick="window.close()" style="background:#21262d;border:1px solid #30363d;">Закрити вікно</button>
    ` : `
      <div class="spinner"></div>
      <h2>Успішний вхід!</h2>
      <p>Завершуємо автентифікацію. Вікно закриється автоматично...</p>
    `}
  </div>
  ${!safeError && token ? `
  <script>
    (function() {
      const payload = { token: ${JSON.stringify(token)}, user: ${JSON.stringify(user)} };
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'VAKDAB_AUTH_SUCCESS', payload: payload }, '*');
          setTimeout(() => window.close(), 350);
          return;
        }
      } catch (e) {
        console.warn('postMessage failed:', e);
      }
      localStorage.setItem('vakdab_auth_token', ${JSON.stringify(token)});
      setTimeout(() => {
        window.location.href = '/#profile';
      }, 500);
    })();
  </script>
  ` : ''}
</body>
</html>`;
}

// OAuth Callback Route for Google, Discord, etc.
app.get(['/auth/callback', '/auth/callback/', '/auth/google/callback', '/auth/discord/callback'], async (req, res) => {
  const code = req.query.code;
  const error = req.query.error;
  const error_description = req.query.error_description;
  const state = req.query.state;
  let provider = req.query.provider || state;
  if (!provider) {
    if (req.path.includes('google')) provider = 'google';
    else if (req.path.includes('discord')) provider = 'discord';
    else provider = 'google';
  }

  if (error) {
    return res.send(renderCallbackHtml(null, null, error_description || error));
  }
  if (!code) {
    return res.send(renderCallbackHtml(null, null, 'Код авторизації не передано сервером провайдера'));
  }

  try {
    const envAppUrl = process.env.APP_URL;
    let origin = envAppUrl;
    if (!origin) {
      const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      origin = `${proto}://${host}`;
    }
    origin = origin.replace(/\/+$/, '');
    const cleanPath = req.path.replace(/\/+$/, '') || '/auth/callback';
    const redirectUri = `${origin}${cleanPath}`;

    let userData = null;

    if (provider === 'google') {
      const gUser = await exchangeGoogleCode(code, redirectUri);
      userData = {
        provider: 'google',
        providerId: gUser.sub,
        email: gUser.email,
        displayName: gUser.name || gUser.given_name || 'Користувач Google',
        avatar: gUser.picture || ''
      };
    } else if (provider === 'discord') {
      const dUser = await exchangeDiscordCode(code, redirectUri);
      const avatarUrl = dUser.avatar
        ? `https://cdn.discordapp.com/avatars/${dUser.id}/${dUser.avatar}.png`
        : '';
      userData = {
        provider: 'discord',
        providerId: dUser.id,
        email: dUser.email,
        displayName: dUser.global_name || dUser.username || 'Користувач Discord',
        avatar: avatarUrl
      };
    } else {
      throw new Error(`Непідтримуваний провайдер авторизації: ${provider}`);
    }

    // Lookup existing user by provider ID or email
    let user = DB.getUserByProvider(userData.provider, userData.providerId);
    if (!user && userData.email) {
      user = DB.getUserByEmail(userData.email);
    }

    if (!user) {
      const userId = `${userData.provider}_${crypto.randomBytes(8).toString('hex')}`;
      user = DB.createUser({
        id: userId,
        email: userData.email,
        displayName: userData.displayName,
        avatar: userData.avatar,
        provider: userData.provider,
        providerId: userData.providerId
      });

      const cleanNick = (userData.displayName || userData.provider).replace(/[^\w]/g, '_').slice(0, 18);
      DB.upsertUserData(userId, {
        profile: {
          nickname: `@${cleanNick || 'user'}`,
          realName: userData.displayName,
          avatar: userData.avatar,
          bio: ''
        }
      });
    } else {
      DB.updateUser(user.id, {
        displayName: userData.displayName || user.display_name,
        avatar: userData.avatar || user.avatar
      });
    }

    const token = generateToken();
    DB.createSession(user.id, token);

    // Set session cookie
    res.cookie('vakdab_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.send(renderCallbackHtml(token, {
      uid: user.id,
      email: user.email,
      displayName: user.display_name,
      photoURL: user.avatar,
      provider: user.provider
    }, null));
  } catch (err) {
    console.warn('[OAuth Callback Warning]', err.message);
    return res.status(200).send(renderCallbackHtml(null, null, err.message || 'Помилка авторизації'));
  }
});

// SPA fallback for client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VakDab Server running on http://0.0.0.0:${PORT}`);
});
