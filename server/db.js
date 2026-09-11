import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../data');

fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'vakdab.db');

export const db = new DatabaseSync(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    password_salt TEXT,
    display_name TEXT,
    avatar TEXT,
    provider TEXT NOT NULL DEFAULT 'local',
    provider_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_data (
    user_id TEXT PRIMARY KEY,
    profile TEXT,
    history TEXT,
    bookmarks TEXT,
    likes TEXT,
    watch_time INTEGER DEFAULT 0,
    stickers TEXT,
    stickers_updated_at INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS anime_ratings (
    id TEXT PRIMARY KEY,
    anime_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    value INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS diagnostics (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_ratings_anime ON anime_ratings(anime_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);

// User queries
const stmtFindUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const stmtFindUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const stmtFindUserByProvider = db.prepare('SELECT * FROM users WHERE provider = ? AND provider_id = ?');
const stmtInsertUser = db.prepare(`
  INSERT INTO users (id, email, password_hash, password_salt, display_name, avatar, provider, provider_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const stmtUpdateUser = db.prepare(`
  UPDATE users SET display_name = ?, avatar = ?, updated_at = ? WHERE id = ?
`);
const stmtDeleteUser = db.prepare('DELETE FROM users WHERE id = ?');

// User Data queries
const stmtGetUserData = db.prepare('SELECT * FROM user_data WHERE user_id = ?');
const stmtUpsertUserData = db.prepare(`
  INSERT INTO user_data (user_id, profile, history, bookmarks, likes, watch_time, stickers, stickers_updated_at, xp, level, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    profile = COALESCE(excluded.profile, user_data.profile),
    history = COALESCE(excluded.history, user_data.history),
    bookmarks = COALESCE(excluded.bookmarks, user_data.bookmarks),
    likes = COALESCE(excluded.likes, user_data.likes),
    watch_time = COALESCE(excluded.watch_time, user_data.watch_time),
    stickers = COALESCE(excluded.stickers, user_data.stickers),
    stickers_updated_at = COALESCE(excluded.stickers_updated_at, user_data.stickers_updated_at),
    xp = COALESCE(excluded.xp, user_data.xp),
    level = COALESCE(excluded.level, user_data.level),
    updated_at = excluded.updated_at
`);

// Sessions
const stmtInsertSession = db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)');
const stmtGetSession = db.prepare('SELECT * FROM sessions WHERE token = ?');
const stmtDeleteSession = db.prepare('DELETE FROM sessions WHERE token = ?');
const stmtDeleteUserSessions = db.prepare('DELETE FROM sessions WHERE user_id = ?');
const stmtCleanupSessions = db.prepare('DELETE FROM sessions WHERE expires_at < ?');

// Leaderboard & Community
const stmtGetLeaderboard = db.prepare(`
  SELECT u.id, u.display_name, u.avatar, u.provider, d.profile, d.history, d.watch_time, d.stickers, d.xp, d.level
  FROM users u
  LEFT JOIN user_data d ON u.id = d.user_id
  ORDER BY COALESCE(d.xp, 0) DESC, COALESCE(d.watch_time, 0) DESC
  LIMIT ?
`);

const stmtGetCommunityStickers = db.prepare(`
  SELECT u.id, u.display_name, u.avatar, d.profile, d.stickers
  FROM users u
  JOIN user_data d ON u.id = d.user_id
  WHERE d.stickers IS NOT NULL AND d.stickers != ''
  LIMIT 200
`);

// Ratings
const stmtGetAnimeRatings = db.prepare('SELECT value FROM anime_ratings WHERE anime_id = ?');
const stmtGetUserAnimeRating = db.prepare('SELECT value FROM anime_ratings WHERE anime_id = ? AND user_id = ?');
const stmtUpsertAnimeRating = db.prepare(`
  INSERT INTO anime_ratings (id, anime_id, user_id, value, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`);
const stmtDeleteAnimeRating = db.prepare('DELETE FROM anime_ratings WHERE anime_id = ? AND user_id = ?');

// Diagnostics
const stmtInsertDiagnostic = db.prepare('INSERT INTO diagnostics (id, data, created_at) VALUES (?, ?, ?)');

export const DB = {
  getUserById(id) {
    return stmtFindUserById.get(id) || null;
  },

  getUserByEmail(email) {
    if (!email) return null;
    return stmtFindUserByEmail.get(email.toLowerCase().trim()) || null;
  },

  getUserByProvider(provider, providerId) {
    if (!provider || !providerId) return null;
    return stmtFindUserByProvider.get(provider, String(providerId)) || null;
  },

  createUser({ id, email, passwordHash, passwordSalt, displayName, avatar, provider = 'local', providerId = null }) {
    const now = Date.now();
    stmtInsertUser.run(
      id,
      email ? email.toLowerCase().trim() : null,
      passwordHash || null,
      passwordSalt || null,
      displayName || 'Користувач',
      avatar || '',
      provider,
      providerId ? String(providerId) : null,
      now,
      now
    );
    return this.getUserById(id);
  },

  updateUser(id, { displayName, avatar }) {
    const now = Date.now();
    const user = this.getUserById(id);
    if (!user) return null;
    stmtUpdateUser.run(
      displayName !== undefined ? displayName : user.display_name,
      avatar !== undefined ? avatar : user.avatar,
      now,
      id
    );
    return this.getUserById(id);
  },

  deleteUser(id) {
    stmtDeleteUserSessions.run(id);
    const delData = db.prepare('DELETE FROM user_data WHERE user_id = ?');
    delData.run(id);
    stmtDeleteUser.run(id);
    return true;
  },

  getUserData(userId) {
    const row = stmtGetUserData.get(userId);
    if (!row) return null;
    return {
      userId: row.user_id,
      profile: row.profile ? JSON.parse(row.profile) : null,
      history: row.history ? JSON.parse(row.history) : [],
      bookmarks: row.bookmarks ? JSON.parse(row.bookmarks) : [],
      likes: row.likes ? JSON.parse(row.likes) : {},
      watchTime: Number(row.watch_time || 0),
      stickers: row.stickers ? JSON.parse(row.stickers) : null,
      stickersUpdatedAt: Number(row.stickers_updated_at || 0),
      xp: Number(row.xp || 0),
      level: Number(row.level || 1),
      updatedAt: Number(row.updated_at || 0)
    };
  },

  upsertUserData(userId, data = {}) {
    const now = Date.now();
    const current = this.getUserData(userId) || {};
    const profile = data.profile !== undefined ? JSON.stringify(data.profile) : (current.profile ? JSON.stringify(current.profile) : null);
    const history = data.history !== undefined ? JSON.stringify(data.history) : (current.history ? JSON.stringify(current.history) : '[]');
    const bookmarks = data.bookmarks !== undefined ? JSON.stringify(data.bookmarks) : (current.bookmarks ? JSON.stringify(current.bookmarks) : '[]');
    const likes = data.likes !== undefined ? JSON.stringify(data.likes) : (current.likes ? JSON.stringify(current.likes) : '{}');
    const watchTime = data.watchTime !== undefined ? Number(data.watchTime) : Number(current.watchTime || 0);
    const stickers = data.stickers !== undefined ? JSON.stringify(data.stickers) : (current.stickers ? JSON.stringify(current.stickers) : null);
    const stickersUpdatedAt = data.stickersUpdatedAt !== undefined ? Number(data.stickersUpdatedAt) : Number(current.stickersUpdatedAt || 0);
    const xp = data.xp !== undefined ? Number(data.xp) : Number(current.xp || 0);
    const level = data.level !== undefined ? Number(data.level) : Number(current.level || 1);

    stmtUpsertUserData.run(
      userId,
      profile,
      history,
      bookmarks,
      likes,
      watchTime,
      stickers,
      stickersUpdatedAt,
      xp,
      level,
      now
    );

    return this.getUserData(userId);
  },

  createSession(userId, token, ttlMs = 30 * 24 * 60 * 60 * 1000) {
    const now = Date.now();
    const expiresAt = now + ttlMs;
    stmtInsertSession.run(token, userId, now, expiresAt);
    return { token, userId, expiresAt };
  },

  getSession(token) {
    if (!token) return null;
    const session = stmtGetSession.get(token);
    if (!session) return null;
    if (session.expires_at < Date.now()) {
      stmtDeleteSession.run(token);
      return null;
    }
    return session;
  },

  deleteSession(token) {
    if (!token) return;
    stmtDeleteSession.run(token);
  },

  cleanupExpiredSessions() {
    stmtCleanupSessions.run(Date.now());
  },

  getLeaderboard(limit = 100) {
    const rows = stmtGetLeaderboard.all(Math.min(limit, 200));
    return rows.map(r => {
      let profile = {};
      try { profile = r.profile ? JSON.parse(r.profile) : {}; } catch (e) {}
      let history = [];
      try { history = r.history ? JSON.parse(r.history) : []; } catch (e) {}
      let stickers = {};
      try { stickers = r.stickers ? JSON.parse(r.stickers) : {}; } catch (e) {}

      return {
        uid: r.id,
        name: profile.realName || profile.name || r.display_name || 'Аніматор',
        realName: profile.realName || r.display_name || '',
        nickname: profile.nickname || `@user_${r.id.slice(0, 6)}`,
        avatar: profile.avatar || r.avatar || '',
        avatarVideo: profile.avatarVideo || '',
        avatarVideoSettings: profile.avatarVideoSettings || {},
        stickers: stickers,
        episodes: Array.isArray(history) ? history.length : 0,
        minutes: Math.floor(Number(r.watch_time || 0) / 60),
        xp: Number(r.xp || 0),
        level: Number(r.level || 1)
      };
    });
  },

  getCommunityStickers() {
    const rows = stmtGetCommunityStickers.all();
    const singles = [];
    const sets = [];
    rows.forEach(r => {
      let stickers = null;
      let profile = {};
      try { stickers = JSON.parse(r.stickers); } catch (e) {}
      try { profile = r.profile ? JSON.parse(r.profile) : {}; } catch (e) {}
      if (!stickers) return;

      const ownerNickname = profile.nickname || r.display_name || 'Користувач';
      const ownerAvatar = profile.avatar || r.avatar || '';

      if (Array.isArray(stickers.singles)) {
        stickers.singles.forEach(s => {
          if (s && s.image) {
            singles.push({
              ...s,
              _public: true,
              _author: ownerNickname,
              _authorAvatar: ownerAvatar,
              _authorId: r.id
            });
          }
        });
      }

      if (Array.isArray(stickers.sets)) {
        stickers.sets.forEach(set => {
          if (set && Array.isArray(set.items) && set.items.length) {
            sets.push({
              ...set,
              _public: true,
              _author: ownerNickname,
              _authorAvatar: ownerAvatar,
              _authorId: r.id
            });
          }
        });
      }
    });
    return { singles, sets };
  },

  getAnimeRating(animeId) {
    const rows = stmtGetAnimeRatings.all(animeId);
    if (!rows.length) return { score: 0, count: 0 };
    let sum = 0;
    let count = 0;
    rows.forEach(r => {
      if (r.value === 1 || r.value === -1) {
        sum += r.value;
        count++;
      }
    });
    if (count === 0) return { score: 0, count: 0 };
    const score = (((sum / count) + 1) / 2) * 10;
    return { score: Number(score.toFixed(1)), count };
  },

  getUserAnimeRating(animeId, userId) {
    const row = stmtGetUserAnimeRating.get(animeId, userId);
    return row ? row.value : 0;
  },

  setAnimeRating(animeId, userId, value) {
    if (value === 0) {
      stmtDeleteAnimeRating.run(animeId, userId);
    } else {
      const id = `${animeId}_${userId}`;
      stmtUpsertAnimeRating.run(id, animeId, userId, value, Date.now());
    }
    return this.getAnimeRating(animeId);
  },

  saveDiagnostic(data) {
    const id = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    stmtInsertDiagnostic.run(id, JSON.stringify(data), Date.now());
    return id;
  }
};
