import express from 'express';
import crypto from 'node:crypto';
import { DB } from './db.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  getRedirectUri,
  exchangeGoogleCode,
  exchangeDiscordCode,
  extractSessionToken,
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
  res.clearCookie('vakdab_session', {
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
  const token = req.sessionToken || extractSessionToken(req);
  if (token) {
    DB.deleteSession(token);
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
    state: 'google',
    prompt: 'select_account'
  });

  res.json({
    configured: true,
    clientId,
    redirectUri,
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  });
});

apiRouter.post('/auth/google/verify', async (req, res) => {
  const { credential, accessToken } = req.body || {};
  if (!credential && !accessToken) {
    return res.status(400).json({ error: 'Потрібен credential або accessToken' });
  }

  try {
    let userData = null;
    if (credential) {
      const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      const gUser = await gRes.json();
      if (!gRes.ok || !gUser.sub) {
        return res.status(401).json({ error: 'Недійсний Google токен' });
      }
      userData = {
        provider: 'google',
        providerId: gUser.sub,
        email: gUser.email,
        displayName: gUser.name || gUser.given_name || 'Користувач Google',
        avatar: gUser.picture || ''
      };
    } else if (accessToken) {
      const gRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const gUser = await gRes.json();
      if (!gRes.ok || !gUser.sub) {
        return res.status(401).json({ error: 'Недійсний Google access token' });
      }
      userData = {
        provider: 'google',
        providerId: gUser.sub,
        email: gUser.email,
        displayName: gUser.name || gUser.given_name || 'Користувач Google',
        avatar: gUser.picture || ''
      };
    }

    let user = DB.getUserByProvider('google', userData.providerId);
    if (!user && userData.email) {
      user = DB.getUserByEmail(userData.email);
    }

    if (!user) {
      const userId = `google_${crypto.randomBytes(8).toString('hex')}`;
      user = DB.createUser({
        id: userId,
        email: userData.email,
        displayName: userData.displayName,
        avatar: userData.avatar,
        provider: 'google',
        providerId: userData.providerId
      });

      const cleanNick = (userData.displayName || 'user').replace(/[^\w]/g, '_').slice(0, 18);
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

    const session = DB.createSession(user.id);
    setSessionCookie(res, session.token);

    const userProfile = DB.getUserData(user.id);
    res.json({
      success: true,
      token: session.token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatar: user.avatar,
        provider: user.provider,
        profile: userProfile?.profile || {}
      }
    });
  } catch (err) {
    console.error('Google verification error:', err);
    res.status(500).json({ error: err.message || 'Помилка перевірки Google' });
  }
});

// -------------------------------------------------------------
//  DISCORD OAUTH
// -------------------------------------------------------------

apiRouter.get('/auth/discord/url', (req, res) => {
  const envId = process.env.DISCORD_CLIENT_ID ? String(process.env.DISCORD_CLIENT_ID).trim() : '';
  const clientId = /^\d{16,22}$/.test(envId) ? envId : '1547837997091782756';

  const redirectUri = getRedirectUri(req, 'discord');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
    state: 'discord',
    prompt: 'consent'
  });

  res.json({
    configured: true,
    redirectUri,
    url: `https://discord.com/oauth2/authorize?${params.toString()}`
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
