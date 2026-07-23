// ===== СХОВИЩЕ — LocalStorage =====
// Оригінальні рядки: L6164-L6264

        //  СХОВИЩЕ
        // ====================================================================
export const Storage = {
            _syncTimer: null,
            _debounceSync() {
                if (this._syncTimer) clearTimeout(this._syncTimer);
                this._syncTimer = setTimeout(() => {
                    if (Auth.isAuthenticated()) Auth.syncUserData().then(r => {
                        if (r && r.ok) console.log('[Storage] Synced to Firestore');
                        else if (r) console.warn('[Storage] Sync failed:', r.error);
                    });
                }, 1500);
            },
            _flushSync() {
                if (this._syncTimer) {
                    clearTimeout(this._syncTimer);
                    this._syncTimer = null;
                }
                if (Auth.isAuthenticated()) Auth.syncUserData();
            },
            getTheme() { try { return localStorage.getItem('mono_anime_theme') || 'light'; } catch { return 'light'; } },
            setTheme(t) { localStorage.setItem('mono_anime_theme', t); },
            getCategory() { try { return localStorage.getItem('vakdab_category') || ''; } catch { return ''; } },
            setCategory(c) { localStorage.setItem('vakdab_category', c); },

            getProfile() {
                try {
                    const raw = localStorage.getItem('vakdab_profile');
                    if (raw) return JSON.parse(raw);
                } catch {}
                return null;
            },
            _setProfile(data) { localStorage.setItem('vakdab_profile', JSON.stringify(data)); },
            setProfile(data) {
                this._setProfile(data);
                this._debounceSync();
            },

            getHistory() {
                try {
                    const raw = localStorage.getItem('vakdab_history');
                    return raw ? JSON.parse(raw) : [];
                } catch { return []; }
            },
            _setHistory(h) { localStorage.setItem('vakdab_history', JSON.stringify(h)); },
            setHistory(h) {
                this._setHistory(h);
                this._debounceSync();
            },

            getBookmarks() {
                try {
                    const raw = localStorage.getItem('vakdab_bookmarks');
                    return raw ? JSON.parse(raw) : [];
                } catch { return []; }
            },
            _setBookmarks(b) { localStorage.setItem('vakdab_bookmarks', JSON.stringify(b)); },
            setBookmarks(b) {
                this._setBookmarks(b);
                this._debounceSync();
            },

            getLikes() {
                try {
                    const raw = localStorage.getItem('vakdab_likes');
                    return raw ? JSON.parse(raw) : {};
                } catch { return {}; }
            },
            _setLikes(l) { localStorage.setItem('vakdab_likes', JSON.stringify(l)); },
            setLikes(l) {
                this._setLikes(l);
                this._debounceSync();
            },

            getWatchTime() {
                try {
                    const raw = localStorage.getItem('vakdab_watchTime');
                    return raw ? parseInt(raw, 10) : 0;
                } catch { return 0; }
            },
            _setWatchTime(t) { localStorage.setItem('vakdab_watchTime', String(t)); },
            addWatchTime(seconds) {
                const current = this.getWatchTime();
                const total = current + seconds;
                this._setWatchTime(total);
                this._debounceSync();
                return total;
            },

            clear() {
                localStorage.removeItem('vakdab_profile');
                localStorage.removeItem('vakdab_history');
                localStorage.removeItem('vakdab_bookmarks');
                localStorage.removeItem('vakdab_likes');
                localStorage.removeItem('vakdab_watchTime');
                localStorage.removeItem('vakdab_category');
                localStorage.removeItem('vakdab_guest');
            }
        };


window.Storage = Storage;
