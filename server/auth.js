import crypto from 'node:crypto';
import { DB } from './db.js';

export function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  if (!password || !hash || !salt) return false;
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(hash, 'hex'));
}

export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function getRedirectUri(req, provider) {
  // Use APP_URL if configured or derive from req
  const envAppUrl = process.env.APP_URL;
  let origin = envAppUrl;
  if (!origin) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    origin = `${proto}://${host}`;
  }
  origin = origin.replace(/\/+$/, '');
  return `${origin}/auth/callback?provider=${provider}`;
}

export function verifyTelegramAuth(data, botToken) {
  if (!data || typeof data !== 'object') return false;
  const { hash, ...rest } = data;
  if (!hash || !botToken) return false;

  const checkString = Object.keys(rest)
    .sort()
    .filter(k => rest[k] !== undefined && rest[k] !== null && rest[k] !== '')
    .map(k => `${k}=${rest[k]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken.trim()).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  // Check age (24 hours)
  const authDate = Number(rest.auth_date);
  if (authDate && Date.now() / 1000 - authDate > 86400) {
    console.warn('[Telegram Auth] Auth data expired:', authDate);
    return false;
  }

  return computedHash === hash;
}

export async function exchangeGoogleCode(code, redirectUri) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange Google code');
  }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });

  const userData = await userRes.json();
  if (!userRes.ok || !userData.sub) {
    throw new Error('Failed to fetch Google userinfo');
  }

  return userData;
}

export async function exchangeDiscordCode(code, redirectUri) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET not set');

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange Discord code');
  }

  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });

  const userData = await userRes.json();
  if (!userRes.ok || !userData.id) {
    throw new Error('Failed to fetch Discord userinfo');
  }

  return userData;
}

export function extractSessionToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = req.headers['cookie'];
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)vakdab_session=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }

  return null;
}

export function authMiddleware(req, res, next) {
  const token = extractSessionToken(req);
  if (token) {
    const session = DB.getSession(token);
    if (session) {
      const user = DB.getUserById(session.user_id);
      if (user) {
        req.user = user;
        req.sessionToken = token;
      }
    }
  }
  next();
}
