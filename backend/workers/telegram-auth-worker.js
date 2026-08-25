const TELEGRAM_MAX_AGE_SECONDS = 24 * 60 * 60;
const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

function corsHeaders(origin) {
  const allowed = new Set([
    'https://vakdab.github.io',
    'https://vakdab.animegran8.workers.dev',
    'http://127.0.0.1:4173',
    'http://localhost:4173'
  ]);
  const value = allowed.has(origin) ? origin : 'https://vakdab.github.io';
  return {
    'Access-Control-Allow-Origin': value,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) }
  });
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
}

function base64UrlEncode(value) {
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(normalized);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function hmacHex(keyBytes, message) {
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

async function validateTelegramInitData(raw, botToken) {
  if (typeof raw !== 'string' || raw.length < 20 || raw.length > 8192) throw new Error('Некоректні дані Telegram');
  const params = new URLSearchParams(raw);
  const receivedHash = String(params.get('hash') || '').toLowerCase();
  const authDate = Number(params.get('auth_date') || 0);
  const userJson = params.get('user') || '';
  if (!/^[a-f0-9]{64}$/.test(receivedHash) || !authDate || !userJson) throw new Error('Неповні дані Telegram');
  if (Math.abs(Math.floor(Date.now() / 1000) - authDate) > TELEGRAM_MAX_AGE_SECONDS) throw new Error('Дані Telegram застаріли');
  let user;
  try { user = JSON.parse(userJson); } catch { throw new Error('Некоректний профіль Telegram'); }
  if (!user || !user.id) throw new Error('Користувача Telegram не знайдено');

  const secretKey = await crypto.subtle.sign(
    'HMAC',
            await crypto.subtle.importKey('raw', new TextEncoder().encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    new TextEncoder().encode(botToken)
  );
  const checkString = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const calculatedHash = await hmacHex(secretKey, checkString);
  if (!constantTimeEqual(calculatedHash, receivedHash)) throw new Error('Не вдалося перевірити Telegram');
  return user;
}

function pemToArrayBuffer(pem) {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  return base64UrlDecode(base64.replace(/\+/g, '-').replace(/\//g, '_'));
}

async function createFirebaseCustomToken(user, serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const uid = `telegram_${String(user.id)}`;
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: FIREBASE_AUDIENCE,
    iat: now,
    exp: now + 3600,
    uid,
    claims: { provider: 'telegram', telegram_id: String(user.id) }
  };
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;
}

function publicTelegramUser(user) {
  return {
    id: String(user.id),
    first_name: String(user.first_name || ''),
    last_name: String(user.last_name || ''),
    username: String(user.username || ''),
    photo_url: String(user.photo_url || '')
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    const url = new URL(request.url);
    if (url.pathname !== '/telegram/auth' || request.method !== 'POST') return json({ error: 'Not found' }, 404, origin);
    try {
      const body = await request.json();
      const telegramUser = await validateTelegramInitData(body?.initData, env.TELEGRAM_BOT_TOKEN);
      const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      if (serviceAccount.project_id !== 'vakdab') throw new Error('Неправильний Firebase project');
      const customToken = await createFirebaseCustomToken(telegramUser, serviceAccount);
      return json({ customToken, telegramUser: publicTelegramUser(telegramUser) }, 200, origin);
    } catch (error) {
      return json({ error: error?.message || 'Telegram authentication failed' }, 401, origin);
    }
  }
};
