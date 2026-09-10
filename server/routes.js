import express from 'express';
import crypto from 'node:crypto';
import { DB } from './db.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  getRedirectUri,
  verifyTelegramAuth,
  exchangeGoogleCode,
  exchangeDiscordCode,
  authMiddleware
} from './auth.js';

export const apiRouter = express.Router();

apiRouter.use(express.json({ limit: '15mb' }));
apiRouter.use(authMiddleware);

apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'vakdab-node-server', time: Date.now() });
});

function setSessionCookie(res, token) {
  // Required cookie configuration for iframe preview context: SameSite=None and Secure=true
  res.cookie('vakdab_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

function clearSessionCookie(res) {
  res.clearCookie('vakdab_session', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/'
  });
}

function formatUser(user) {
  if (!user) return null;
  return {
    uid: user.id,
    email: user.email,
    displayName: user.display_name,
    photoURL: user.avatar,
    provider: user.provider,
    providerId: user.provider_id,
    createdAt: user.created_at
  };
}

// -------------------------------------------------------------
//  AUTH ENDPOINTS
// -------------------------------------------------------------

apiRouter.get('/auth/me', (req, res) => {
  if (!req.user) {
    return res.json({ authenticated: false, user: null, profile: null });
  }
  const userData = DB.getUserData(req.user.id);
  res.json({
    authenticated: true,
    user: formatUser(req.user),
    profile: userData?.profile || null
  });
});

apiRouter.post('/auth/register', (req, res) => {
  const { email, password, displayName } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email та пароль обовʼязкові' });
  }

  const existing = DB.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ success: false, error: 'Користувач із такою поштою вже існує' });
  }

  const { hash, salt } = hashPassword(password);
  const userId = `usr_${crypto.randomBytes(12).toString('hex')}`;
  const name = displayName || email.split('@')[0];

  const user = DB.createUser({
    id: userId,
    email,
    passwordHash: hash,
    passwordSalt: salt,
    displayName: name,
    provider: 'local'
  });

  // Default profile in DB
  const initialProfile = {
    nickname: `@${name.replace(/[^\w]/g, '_').slice(0, 20) || 'user'}`,
    realName: name,
    avatar: '',
    bio: ''
  };
  DB.upsertUserData(userId, { profile: initialProfile });

  const token = generateToken();
  DB.createSession(userId, token);
  setSessionCookie(res, token);

  res.json({
    success: true,
    token,
    user: formatUser(user),
    profile: initialProfile
  });
});

apiRouter.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Введіть email та пароль' });
  }

  const user = DB.getUserByEmail(email);
  if (!user || !user.password_hash || !user.password_salt) {
    return res.status(401).json({ success: false, error: 'Невірний email або пароль' });
  }

  const valid = verifyPassword(password, user.password_hash, user.password_salt);
  if (!valid) {
    return res.status(401).json({ success: false, error: 'Невірний email або пароль' });
  }

  const token = generateToken();
  DB.createSession(user.id, token);
  setSessionCookie(res, token);

  const userData = DB.getUserData(user.id);
  res.json({
    success: true,
    token,
    user: formatUser(user),
    profile: userData?.profile || null
  });
});

apiRouter.post('/auth/logout', (req, res) => {
  if (req.sessionToken) {
    DB.deleteSession(req.sessionToken);
  }
  clearSessionCookie(res);
  res.json({ success: true });
});

apiRouter.delete('/auth/account', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Необхідна авторизація' });
  }
  DB.deleteUser(req.user.id);
  clearSessionCookie(res);
  res.json({ success: true });
});

// -------------------------------------------------------------
//  GOOGLE OAUTH
// -------------------------------------------------------------

apiRouter.get('/auth/google/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.json({
      configured: false,
      message: 'GOOGLE_CLIENT_ID не налаштовано в змінних середовища'
    });
  }

  const redirectUri = getRedirectUri(req, 'google');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account'
  });

  res.json({
    configured: true,
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  });
});

// -------------------------------------------------------------
//  TELEGRAM AUTH (Login Widget & Direct verification)
// -------------------------------------------------------------

apiRouter.get('/auth/telegram/config', (req, res) => {
  res.json({
    botUsername: process.env.TELEGRAM_BOT_USERNAME || '',
    hasToken: Boolean(process.env.TELEGRAM_BOT_TOKEN)
  });
});

apiRouter.post('/auth/telegram', (req, res) => {
  const data = req.body || {};
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (botToken) {
    const isValid = verifyTelegramAuth(data, botToken);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Помилка перевірки підпису Telegram' });
    }
  } else {
    // If bot token is not set yet in environment, allow with warning
    console.warn('[Telegram Auth] TELEGRAM_BOT_TOKEN not configured; permitting demo authentication');
  }

  const tgId = String(data.id || '');
  if (!tgId) {
    return res.status(400).json({ success: false, error: 'Недійсні дані Telegram користувача' });
  }

  let user = DB.getUserByProvider('telegram', tgId);
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || 'Користувач';
  const username = data.username ? `@${data.username}` : `@tg_${tgId}`;
  const avatar = data.photo_url || '';

  if (!user) {
    const userId = `tg_${tgId}`;
    user = DB.createUser({
      id: userId,
      displayName: fullName,
      avatar,
      provider: 'telegram',
      providerId: tgId
    });

    const initialProfile = {
      nickname: username,
      realName: fullName,
      avatar,
      bio: ''
    };
    DB.upsertUserData(userId, { profile: initialProfile });
  } else {
    DB.updateUser(user.id, {
      displayName: fullName || user.display_name,
      avatar: avatar || user.avatar
    });
  }

  const token = generateToken();
  DB.createSession(user.id, token);
  setSessionCookie(res, token);

  const userData = DB.getUserData(user.id);
  res.json({
    success: true,
    token,
    user: formatUser(user),
    profile: userData?.profile || null
  });
});

// -------------------------------------------------------------
//  DISCORD OAUTH
// -------------------------------------------------------------

apiRouter.get('/auth/discord/url', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return res.json({
      configured: false,
      message: 'DISCORD_CLIENT_ID не налаштовано в змінних середовища'
    });
  }

  const redirectUri = getRedirectUri(req, 'discord');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email'
  });

  res.json({
    configured: true,
    url: `https://discord.com/api/oauth2/authorize?${params.toString()}`
  });
});

// -------------------------------------------------------------
//  QUICK / DEMO LOGIN (For immediate testing before API keys)
// -------------------------------------------------------------

apiRouter.post('/auth/quick-login', (req, res) => {
  const { provider = 'guest', nickname, name, avatar } = req.body || {};
  const cleanNick = String(nickname || '').trim().replace(/^@+/, '') || 'user';
  const displayName = String(name || cleanNick).trim();
  const providerId = `demo_${Date.now()}`;
  const userId = `${provider}_${crypto.randomBytes(6).toString('hex')}`;

  const user = DB.createUser({
    id: userId,
    displayName,
    avatar: avatar || '',
    provider,
    providerId
  });

  const initialProfile = {
    nickname: `@${cleanNick}`,
    realName: displayName,
    avatar: avatar || '',
    bio: `Користувач VakDab (${provider})`
  };
  DB.upsertUserData(userId, { profile: initialProfile });

  const token = generateToken();
  DB.createSession(userId, token);
  setSessionCookie(res, token);

  res.json({
    success: true,
    token,
    user: formatUser(user),
    profile: initialProfile
  });
});

// -------------------------------------------------------------
//  USER DATA & SYNCHRONIZATION
// -------------------------------------------------------------

apiRouter.get('/user/data', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const data = DB.getUserData(req.user.id) || {
    profile: null,
    history: [],
    bookmarks: [],
    likes: {},
    watchTime: 0,
    stickers: null,
    xp: 0,
    level: 1
  };
  res.json(data);
});

apiRouter.post('/user/sync', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = req.body || {};
  const updated = DB.upsertUserData(req.user.id, payload);
  res.json({ ok: true, success: true, data: updated });
});

// -------------------------------------------------------------
//  PUBLIC PROFILES & LEADERBOARD
// -------------------------------------------------------------

apiRouter.get('/users/:uid', (req, res) => {
  const uid = req.params.uid;
  const user = DB.getUserById(uid);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const data = DB.getUserData(uid) || {};
  res.json({
    uid: user.id,
    profile: data.profile || {
      nickname: `@${user.display_name}`,
      realName: user.display_name,
      avatar: user.avatar
    },
    history: data.history || [],
    bookmarks: data.bookmarks || [],
    watchTime: data.watchTime || 0,
    xp: data.xp || 0,
    createdAt: user.created_at
  });
});

apiRouter.get('/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  const list = DB.getLeaderboard(limit);
  res.json(list);
});

apiRouter.get('/stickers/community', (req, res) => {
  const stickers = DB.getCommunityStickers();
  res.json(stickers);
});

// -------------------------------------------------------------
//  ANIME RATINGS & DIAGNOSTICS
// -------------------------------------------------------------

apiRouter.get('/anime-ratings/:animeId', (req, res) => {
  const animeId = req.params.animeId;
  const agg = DB.getAnimeRating(animeId);
  const userRating = req.user ? DB.getUserAnimeRating(animeId, req.user.id) : 0;
  res.json({ ...agg, userRating });
});

apiRouter.post('/anime-ratings/:animeId', (req, res) => {
  const animeId = req.params.animeId;
  const { value, guestUid } = req.body || {};
  const userId = req.user ? req.user.id : (guestUid || 'guest_anon');
  const agg = DB.setAnimeRating(animeId, userId, Number(value) || 0);
  res.json(agg);
});

apiRouter.post('/diagnostics', (req, res) => {
  const id = DB.saveDiagnostic(req.body || {});
  res.json({ ok: true, id });
});
