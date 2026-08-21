import { Auth } from './auth.js';
import { PROFILE_STICKER_SLOTS, getDefaultStickers } from '../../legacy/app-legacy.js?v=20260821-profile-thought-v16';
        export const Storage = {
            _syncTimer: null,
            _pendingSyncScope: null,
            _mergeSyncScope(scope) {
                const next = scope || 'all';
                if (!this._pendingSyncScope || next === 'all') {
                    this._pendingSyncScope = next;
                    return;
                }
                if (this._pendingSyncScope === 'all') return;
                const scopes = new Set(this._pendingSyncScope.split(',').filter(Boolean));
                next.split(',').filter(Boolean).forEach(item => scopes.add(item));
                this._pendingSyncScope = Array.from(scopes).join(',');
            },
            _debounceSync(scope = 'all') {
                this._mergeSyncScope(scope);
                if (this._syncTimer) clearTimeout(this._syncTimer);
                this._syncTimer = setTimeout(() => {
                    const pendingScope = this._pendingSyncScope || 'all';
                    this._pendingSyncScope = null;
                    this._syncTimer = null;
                    if (Auth.isAuthenticated()) Auth.syncUserData({ scope: pendingScope }).then(r => {
                        if (r && r.ok) { /* synced */ }
                        else if (r) console.warn('[Storage] Sync failed:', r.error);
                    });
                }, 1500);
            },
            _flushSync(scope = null) {
                if (scope) this._mergeSyncScope(scope);
                if (this._syncTimer) {
                    clearTimeout(this._syncTimer);
                    this._syncTimer = null;
                }
                const pendingScope = this._pendingSyncScope;
                this._pendingSyncScope = null;
                // beforeunload/visibilitychange must flush only real pending changes;
                // otherwise every app switch causes a full Firestore write.
                if (pendingScope && Auth.isAuthenticated()) Auth.syncUserData({ scope: pendingScope });
            },
            getTheme() { try { return localStorage.getItem('mono_anime_theme') || 'light'; } catch { return 'light'; } },
            setTheme(t) { localStorage.setItem('mono_anime_theme', t); },
            getCategory() { try { return localStorage.getItem('vakdab_category') || ''; } catch { return ''; } },
            setCategory(c) { localStorage.setItem('vakdab_category', c); },

            getProfile() {
                try {
                    const raw = localStorage.getItem('vakdab_profile');
                    const parsed = raw ? JSON.parse(raw) : null;
                    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
                } catch { return null; }
            },
            _setProfile(data) { localStorage.setItem('vakdab_profile', JSON.stringify(data)); },
            setProfile(data) {
                this._setProfile(data);
                this._debounceSync('profile');
            },

            _historyRaw: null,
            _historyCache: null,
            getHistory() {
                try {
                    const raw = localStorage.getItem('vakdab_history');
                    if (raw === this._historyRaw && this._historyCache) return this._historyCache;
                    const parsed = raw ? JSON.parse(raw) : [];
                    const safe = Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : [];
                    if (safe.length > 200) {
                        const capped = safe.slice(0, 200);
                        const serialized = JSON.stringify(capped);
                        localStorage.setItem('vakdab_history', serialized);
                        this._historyRaw = serialized;
                        this._historyCache = capped;
                        return capped;
                    }
                    this._historyRaw = raw;
                    this._historyCache = safe;
                    return safe;
                } catch { this._historyRaw = null; this._historyCache = []; return this._historyCache; }
            },
            _setHistory(h) {
                const safe = Array.isArray(h) ? h.slice(0, 200) : [];
                const serialized = JSON.stringify(safe);
                localStorage.setItem('vakdab_history', serialized);
                this._historyRaw = serialized;
                this._historyCache = safe;
            },
            setHistory(h) {
                this._setHistory(h);
                this._debounceSync('history');
            },

            _bookmarksRaw: null,
            _bookmarksCache: null,
            getBookmarks() {
                try {
                    const raw = localStorage.getItem('vakdab_bookmarks');
                    if (raw === this._bookmarksRaw && this._bookmarksCache) return this._bookmarksCache;
                    const parsed = raw ? JSON.parse(raw) : [];
                    const safe = Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : [];
                    this._bookmarksRaw = raw;
                    this._bookmarksCache = safe;
                    return safe;
                } catch { this._bookmarksRaw = null; this._bookmarksCache = []; return this._bookmarksCache; }
            },
            _setBookmarks(b) {
                const safe = Array.isArray(b) ? b : [];
                const serialized = JSON.stringify(safe);
                localStorage.setItem('vakdab_bookmarks', serialized);
                this._bookmarksRaw = serialized;
                this._bookmarksCache = safe;
            },
            setBookmarks(b) {
                this._setBookmarks(b);
                this._debounceSync('bookmarks');
            },

            getLikes() {
                try {
                    const raw = localStorage.getItem('vakdab_likes');
                    const parsed = raw ? JSON.parse(raw) : {};
                    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
                } catch { return {}; }
            },
            _setLikes(l) { localStorage.setItem('vakdab_likes', JSON.stringify(l)); },
            setLikes(l) {
                this._setLikes(l);
                this._debounceSync('likes');
            },

            getWatchTime() {
                try {
                    const raw = localStorage.getItem('vakdab_watchTime');
                    const parsed = raw === null ? 0 : Number(raw);
                    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
                } catch { return 0; }
            },
            _setWatchTime(t) { localStorage.setItem('vakdab_watchTime', String(t)); },
            addWatchTime(seconds) {
                const current = this.getWatchTime();
                const total = current + seconds;
                this._setWatchTime(total);
                this._debounceSync('watchTime');
                return total;
            },

            _stickersRaw: null,
            _stickersCache: null,
            getStickers() {
                try {
                    let raw = localStorage.getItem('vakdab_stickers');
                    if (raw === this._stickersRaw && this._stickersCache) return this._stickersCache;
                    const source = raw ? JSON.parse(raw) : null;
                    const parsed = source && typeof source === 'object' && !Array.isArray(source)
                        ? Object.assign(getDefaultStickers(), source)
                        : getDefaultStickers();
                    parsed.singles = Array.isArray(parsed.singles) ? parsed.singles.filter(Boolean) : [];
                    parsed.sets = Array.isArray(parsed.sets) ? parsed.sets.filter(Boolean) : [];
                    parsed.medals = Array.isArray(parsed.medals) ? parsed.medals.filter(m => typeof m === 'string' || typeof m === 'number').slice(0, PROFILE_STICKER_SLOTS) : [];
                    parsed.colors = parsed.colors && typeof parsed.colors === 'object' && !Array.isArray(parsed.colors) ? parsed.colors : {};
                    parsed.medals = parsed.medals.map(m => typeof m === 'number' ? ('v:' + m) : String(m));
                    this._stickersRaw = raw;
                    this._stickersCache = parsed;
                    return parsed;
                } catch { this._stickersRaw = null; this._stickersCache = getDefaultStickers(); return this._stickersCache; }
            },
            _setStickers(s) {
                const serialized = JSON.stringify(s);
                localStorage.setItem('vakdab_stickers', serialized);
                this._stickersRaw = serialized;
                this._stickersCache = s;
            },
            getStickersTS() { try { return Number(localStorage.getItem('vakdab_stickers_ts')) || 0; } catch { return 0; } },
            setStickers(s) {
                this._setStickers(s);
                try { localStorage.setItem('vakdab_stickers_ts', String(Date.now())); } catch {}
                // Наліпки — свідома дія користувача, але синк іде окремим scoped debounce,
                // щоб не блокувати мобільний UI великим sticker pack у момент кліку.
                this._debounceSync('stickers');
            },

            clear() {
                localStorage.removeItem('vakdab_profile');
                localStorage.removeItem('vakdab_history');
                localStorage.removeItem('vakdab_bookmarks');
                localStorage.removeItem('vakdab_likes');
                this._historyRaw = null;
                this._historyCache = null;
                this._bookmarksRaw = null;
                this._bookmarksCache = null;
                this._stickersRaw = null;
                this._stickersCache = null;
                localStorage.removeItem('vakdab_watchTime');
                localStorage.removeItem('vakdab_stickers');
                localStorage.removeItem('vakdab_category');
                localStorage.removeItem('vakdab_guest');
            }
        };
