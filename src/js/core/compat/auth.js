import {
    Router, getDefaultStickers, calcTotalXP, getLevel,
    renderAuthPage, renderProfilePage, showToast
} from '../../legacy/app-legacy.js?v=20260910-player-v1';
import { getDefaultProfile, normalizeNickname, stripNicknamePrefix } from '../../pages/settings/settingsLegacy.js?v=20260905-no-achievements-v1';
import { Storage } from './storage.js?v=20260905-stickers-sync-v1';

const TOKEN_KEY = 'vakdab_auth_token';

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

const Auth = {
    _user: null,
    _listeners: [],
    _initialized: false,
    _isGuest: false,
    _loadingData: false,
    _lastProfileSync: null,
    _authResolved: false,
    _welcomeShown: false,

    async init() {
        if (this._initialized) return;
        this._initialized = true;

        this._isGuest = localStorage.getItem('vakdab_guest') === '1';

        // Listen for OAuth popup completion (Google, Discord, etc.)
        window.addEventListener('message', async (event) => {
            if (event.data?.type === 'VAKDAB_AUTH_SUCCESS') {
                const payload = event.data.payload || {};
                if (payload.token) {
                    localStorage.setItem(TOKEN_KEY, payload.token);
                }
                if (payload.user) {
                    this._user = payload.user;
                    this._isGuest = false;
                    localStorage.removeItem('vakdab_guest');
                    this._authResolved = true;
                    this._notifyListeners();
                    showToast(`Привіт, ${payload.user.displayName || 'користувач'}!`);
                    await this._loadUserData(payload.user.uid);
                    if (Router.currentRoute === 'profile') {
                        renderProfilePage();
                    }
                }
            }
        });

        // Check active session from server
        try {
            const res = await fetch('/api/auth/me', {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.authenticated && data.user) {
                    this._user = data.user;
                    this._isGuest = false;
                    this._authResolved = true;
                    this._notifyListeners();

                    if (!this._welcomeShown) {
                        this._welcomeShown = true;
                        showToast(`Привіт, ${data.user.displayName || 'користувач'}`);
                    }

                    await this._loadUserData(data.user.uid, data.profile);
                    if (Router.currentRoute === 'profile') {
                        const profContainer = document.getElementById('profilePageContainer');
                        if (profContainer && profContainer.classList.contains('active')) {
                            renderProfilePage();
                        }
                    }
                    return;
                }
            }
        } catch (e) {
            console.warn('Auth session check error:', e);
        }

        this._user = null;
        this._authResolved = true;
        this._notifyListeners();

        if (Router.currentRoute === 'profile') {
            const profContainer = document.getElementById('profilePageContainer');
            if (profContainer && profContainer.classList.contains('active')) {
                if (this.isGuest()) renderProfilePage();
                else renderAuthPage();
            }
        }
    },

    _notifyListeners() {
        this._listeners.forEach(fn => {
            try { fn(this._user); } catch (e) { console.error('Auth listener error:', e); }
        });
    },

    onAuthStateChanged(fn) {
        this._listeners.push(fn);
        if (this._authResolved) fn(this._user);
    },

    isAuthenticated() {
        return !!this._user;
    },

    isGuest() {
        return this._isGuest;
    },

    setGuest(val) {
        this._isGuest = Boolean(val);
        if (val) {
            localStorage.setItem('vakdab_guest', '1');
            this._user = null;
        } else {
            localStorage.removeItem('vakdab_guest');
        }
        this._notifyListeners();
    },

    getUser() {
        return this._user;
    },

    getAuthToken() {
        return localStorage.getItem(TOKEN_KEY) || '';
    },

    async _loadUserData(uid, preloadedProfile = null) {
        if (this._loadingData) return;
        this._loadingData = true;
        try {
            const res = await fetch('/api/user/data', {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.profile || preloadedProfile) {
                    const prof = data.profile || preloadedProfile;
                    const merged = Object.assign(getDefaultProfile(), prof);
                    if (this._user?.displayName && (!merged.realName || merged.realName === 'Користувач')) {
                        merged.realName = stripNicknamePrefix(this._user.displayName);
                    }
                    if (this._user?.photoURL && !merged.avatar) {
                        merged.avatar = this._user.photoURL;
                    }
                    Storage._setProfile(merged);
                } else if (this._user?.displayName) {
                    const p = getDefaultProfile();
                    p.realName = stripNicknamePrefix(this._user.displayName);
                    p.nickname = normalizeNickname(this._user.displayName, '@user');
                    if (this._user.photoURL) p.avatar = this._user.photoURL;
                    Storage._setProfile(p);
                }

                if (Array.isArray(data.history)) Storage._setHistory(data.history);
                if (Array.isArray(data.bookmarks)) Storage._setBookmarks(data.bookmarks);
                if (data.likes && typeof data.likes === 'object') Storage._setLikes(data.likes);
                if (data.watchTime) Storage._setWatchTime(data.watchTime);
                if (data.stickers) Storage._setStickers(Object.assign(getDefaultStickers(), data.stickers));
            }
        } catch (e) {
            console.warn('Error loading user data:', e);
        } finally {
            this._loadingData = false;
        }
    },

    async login(email, password) {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!data.success) {
                return { success: false, error: data.error || 'Невірний email або пароль' };
            }
            localStorage.setItem(TOKEN_KEY, data.token);
            this._user = data.user;
            this._isGuest = false;
            localStorage.removeItem('vakdab_guest');
            this._authResolved = true;
            this._notifyListeners();
            await this._loadUserData(data.user.uid, data.profile);
            showToast(`Привіт, ${data.user.displayName || 'користувач'}!`);
            if (Router.currentRoute === 'profile') renderProfilePage();
            return { success: true, user: data.user };
        } catch (e) {
            return { success: false, error: e.message || 'Помилка мережі' };
        }
    },

    async register(email, password, displayName) {
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, displayName })
            });
            const data = await res.json();
            if (!data.success) {
                return { success: false, error: data.error || 'Помилка реєстрації' };
            }
            localStorage.setItem(TOKEN_KEY, data.token);
            this._user = data.user;
            this._isGuest = false;
            localStorage.removeItem('vakdab_guest');
            this._authResolved = true;
            this._notifyListeners();
            await this._loadUserData(data.user.uid, data.profile);
            showToast('Акаунт успішно зареєстровано!');
            if (Router.currentRoute === 'profile') renderProfilePage();
            return { success: true, user: data.user };
        } catch (e) {
            return { success: false, error: e.message || 'Помилка реєстрації' };
        }
    },

    async quickLogin(provider, nickname) {
        try {
            const res = await fetch('/api/auth/quick-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, nickname, name: nickname })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Помилка швидкого входу');
            localStorage.setItem(TOKEN_KEY, data.token);
            this._user = data.user;
            this._isGuest = false;
            localStorage.removeItem('vakdab_guest');
            this._authResolved = true;
            this._notifyListeners();
            await this._loadUserData(data.user.uid, data.profile);
            showToast(`Вхід виконано (${provider}): ${data.user.displayName}`);
            if (Router.currentRoute === 'profile') renderProfilePage();
            return { success: true, user: data.user };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async signInWithGoogle() {
        try {
            const res = await fetch('/api/auth/google/url');
            const data = await res.json();
            if (data.configured && data.url) {
                const width = 520, height = 640;
                const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
                const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);
                window.open(data.url, 'vakdab_oauth', `width=${width},height=${height},left=${left},top=${top}`);
                return { success: true };
            } else {
                const name = prompt('GOOGLE_CLIENT_ID ще не додано у .env.\nВведіть нікнейм або імʼя для тестування входу через Google:', 'Google Користувач');
                if (!name) return { success: false, error: 'Вхід скасовано' };
                return await this.quickLogin('google', name);
            }
        } catch (e) {
            console.warn('Google sign-in error:', e);
            return { success: false, error: e.message };
        }
    },

    async signInWithDiscord() {
        try {
            const res = await fetch('/api/auth/discord/url');
            const data = await res.json();
            if (data.configured && data.url) {
                const width = 520, height = 680;
                const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
                const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);
                window.open(data.url, 'vakdab_oauth', `width=${width},height=${height},left=${left},top=${top}`);
                return { success: true };
            } else {
                const name = prompt('DISCORD_CLIENT_ID ще не додано у .env.\nВведіть ваш Discord нікнейм для тестування входу:', 'DiscordAnime');
                if (!name) return { success: false, error: 'Вхід скасовано' };
                return await this.quickLogin('discord', name);
            }
        } catch (e) {
            console.warn('Discord sign-in error:', e);
            return { success: false, error: e.message };
        }
    },

    async signInWithTelegram(telegramData = null) {
        try {
            if (telegramData) {
                const res = await fetch('/api/auth/telegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(telegramData)
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Помилка перевірки Telegram');
                localStorage.setItem(TOKEN_KEY, data.token);
                this._user = data.user;
                this._isGuest = false;
                localStorage.removeItem('vakdab_guest');
                this._authResolved = true;
                this._notifyListeners();
                await this._loadUserData(data.user.uid, data.profile);
                showToast('Вхід через Telegram успішний');
                if (Router.currentRoute === 'profile') renderProfilePage();
                return { success: true };
            }

            const username = prompt('Введіть ваш Telegram @username для входу на сайті:', '@animer');
            if (!username) return { success: false, error: 'Вхід скасовано' };
            const clean = username.replace(/^@+/, '').trim();
            return await this.quickLogin('telegram', clean);
        } catch (e) {
            console.warn('Telegram sign-in error:', e);
            return { success: false, error: e.message };
        }
    },

    async logout() {
        if (Storage._syncTimer) {
            clearTimeout(Storage._syncTimer);
            Storage._syncTimer = null;
        }

        showToast('Збереження даних і вихід...');

        try {
            await this.syncUserData();
        } catch (e) {
            console.warn('Logout: sync error', e.message);
        }

        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: getAuthHeaders()
            });
        } catch (e) {}

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('vakdab_guest');
        this._user = null;
        this._authResolved = true;
        this._welcomeShown = false;
        this._isGuest = false;
        Storage.clear();
        this._notifyListeners();

        showToast('Ви вийшли з акаунту');
        Router.showProfile();
        return { success: true };
    },

    handleExit() {
        if (this.isGuest()) {
            this._isGuest = false;
            localStorage.removeItem('vakdab_guest');
            Storage.clear();
            this._notifyListeners();
            showToast('Гостьовий сеанс завершено');
            Router.showProfile();
        } else {
            this.logout().catch(e => console.warn('Logout error:', e));
        }
    },

    hasPasswordProvider() {
        return this._user?.provider === 'local';
    },

    providerLabel() {
        if (this.isGuest() || !this.isAuthenticated()) return 'Гість';
        const p = this._user?.provider;
        if (p === 'google') return 'Google';
        if (p === 'telegram') return 'Telegram';
        if (p === 'discord') return 'Discord';
        if (p === 'local') return 'Email і пароль';
        return 'Акаунт';
    },

    async sendPasswordReset() {
        showToast('Скидання пароля — зверніться до підтримки VakDab');
        return { success: true };
    },

    async deleteAccount() {
        try {
            const res = await fetch('/api/auth/account', {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Не вдалося видалити акаунт');
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem('vakdab_guest');
            this._user = null;
            this._authResolved = true;
            this._isGuest = false;
            Storage.clear();
            this._notifyListeners();
            showToast('Акаунт успішно видалено');
            Router.showProfile();
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async syncUserData(options = {}) {
        if (!this.isAuthenticated()) return { ok: false, error: 'not-authenticated' };
        const scope = options.scope || 'all';
        const scopeSet = new Set(String(scope).split(',').filter(Boolean));
        const hasScope = key => scope === 'all' || scopeSet.has(key);

        const payload = {};
        if (hasScope('profile')) payload.profile = Storage.getProfile();
        if (hasScope('history')) payload.history = Storage.getHistory();
        if (hasScope('bookmarks')) payload.bookmarks = Storage.getBookmarks();
        if (hasScope('likes')) payload.likes = Storage.getLikes();
        if (hasScope('watchTime')) payload.watchTime = Storage.getWatchTime() || 0;
        if (hasScope('stickers')) {
            payload.stickers = Storage.getStickers();
            payload.stickersUpdatedAt = Storage.getStickersTS();
        }
        if (hasScope('history') || hasScope('bookmarks') || hasScope('watchTime')) {
            const xp = calcTotalXP();
            payload.xp = xp;
            payload.level = getLevel(xp);
        }

        try {
            const res = await fetch('/api/user/sync', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            return { ok: true, data };
        } catch (e) {
            console.warn('Sync error:', e.message);
            return { ok: false, error: e.message };
        }
    }
};

export { Auth };
