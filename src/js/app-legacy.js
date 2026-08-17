import { FIREBASE_CONFIG, initializeApp, getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile, setPersistence, browserLocalPersistence, signInAnonymously, sendPasswordResetEmail, deleteUser, getFirestore, doc, getDoc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, addDoc, collection, query, where, orderBy, limit, onSnapshot } from './config/firebase.js';
import { PROXY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, HIKKA_API, HIKKA_CORS_PROXY, MIKAI_BASE, GENRE_MAP } from './config/constants.js';
import { safeQuery, safeQueryAll } from './utils/dom.js';
import { getProxyUrl, isEmbedUrl } from './utils/image.js';
import './utils/string.js';

let playerPageAnimeuaSeasons = null;
let externalSourceCache = {};
const PROFILE_STICKER_SLOTS = 8;

        // ====================================================================
        //  ІНІЦІАЛІЗАЦІЯ FIREBASE
        // ====================================================================
        let firebaseApp = null;
        let auth = null;
        let db = null;
        let firebaseInitialized = false;

        try {
            firebaseApp = initializeApp(FIREBASE_CONFIG);
            auth = getAuth(firebaseApp);
            // browserLocalPersistence — сесія зберігається в браузері (localStorage)
            setPersistence(auth, browserLocalPersistence).catch(e => console.warn('Persistence error:', e));
            db = getFirestore(firebaseApp);
            firebaseInitialized = true;
            /* console.log removed */
        } catch (e) {
            console.warn('Firebase init error:', e.message);
            firebaseInitialized = false;
        }

        // ====================================================================
        //  СИСТЕМА АВТОРИЗАЦІЇ
        // ====================================================================
        const Auth = {
            _user: null,
            _listeners: [],
            _initialized: false,
            _googleProvider: null,
            _isGuest: false,
            _loadingData: false,
            _authResolved: false,

            init() {
                if (!firebaseInitialized) {
                    console.warn('Firebase not available, auth disabled');
                    return;
                }
                if (this._initialized) return;
                this._initialized = true;
                // Відновити guest стан з localStorage
                this._isGuest = localStorage.getItem('vakdab_guest') === '1';
                this._googleProvider = new GoogleAuthProvider();
                // ВИПРАВЛЕННЯ 1: примусовий вибір акаунта при вході через Google
                // prompt select_account прибрано — Google може входити автоматично якщо вже є сесія
                onAuthStateChanged(auth, async (user) => {
                    if (user && this._user && this._user.uid !== user.uid) {
                        this._welcomeShown = false;
                    }
                    if (user && !user.isAnonymous) this._isGuest = false;
                    this._user = user;
                    this._authResolved = true;
                    this._notifyListeners();
                    if (user) {
                        // РЕНДЕРИМО ПРОФІЛЬ ОДРАЗУ з поточними localStorage даними
                        // — не чекаємо _loadUserData (який може висіти на Firestore)
                        if (Router.currentRoute === 'profile') {
                            const profContainer = document.getElementById('profilePageContainer');
                            if (profContainer && profContainer.classList.contains('active')) {
                                renderProfilePage();
                            }
                        }
                        if (!this._welcomeShown) {
                            this._welcomeShown = true;
                            showToast('Привіт, ' + (user.displayName || user.email || 'користувач'));
                        }
                        // Завантажуємо з Firestore в фоні — оновимо профіль коли дані прийдуть
                        try {
                            await this._loadUserData(user.uid);
                            if (Router.currentRoute === 'profile') {
                                const profContainer = document.getElementById('profilePageContainer');
                                if (profContainer && profContainer.classList.contains('active')) {
                                    renderProfilePage();
                                }
                            }
                        } catch (e) {
                            console.warn('Background load failed, using local data:', e.message);
                        }
                    } else {
                        this._welcomeShown = false;
                        // Не затираємо відновлений гостьовий режим формою входу після null-user callback.
                        if (Router.currentRoute === 'profile') {
                            const profContainer = document.getElementById('profilePageContainer');
                            if (profContainer && profContainer.classList.contains('active')) {
                                if (this.isGuest()) renderProfilePage();
                                else renderAuthPage();
                            }
                        }
                    }
                });
            },

            _notifyListeners() {
                this._listeners.forEach(fn => fn(this._user));
            },

            onAuthStateChanged(fn) {
                this._listeners.push(fn);
                if (this._user !== null) fn(this._user);
            },

            isAuthenticated() {
                return !!this._user && firebaseInitialized;
            },

            isGuest() {
                return this._isGuest;
            },

            setGuest(val) {
                this._isGuest = val;
                if (val) localStorage.setItem('vakdab_guest', '1');
                else localStorage.removeItem('vakdab_guest');
                this._notifyListeners();
            },

            getUser() {
                return this._user;
            },

            async _loadUserData(uid) {
                if (!firebaseInitialized || !db) return;
                if (this._loadingData) return;
                this._loadingData = true;
                // Timeout 5с — не висіти вічно якщо Firestore недоступний
                const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Firestore timeout')), 5000));
                // Для існуючого акаунта не читаємо великі localStorage history/sticker packs наперед.
                // Guest snapshot потрібен лише у гілці створення нового user document нижче.
                // Завантажуємо з Firestore. НЕ очищаємо localStorage спереду —
                // якщо завантаження впаде, локальні дані залишаться.
                try {
                    const docRef = doc(db, 'users', uid);
                    const docSnap = await Promise.race([getDoc(docRef), timeout]);
                    if (docSnap.exists()) {
                        // Існуючий юзер — завантажуємо його дані з Firestore
                        const data = docSnap.data();
                        /* console.log removed */
                        /* console.log removed */
                        /* console.log removed */
                        if (data.profile) {
                            const mergedProfile = Object.assign(getDefaultProfile(), data.profile);
                            // Доповнюємо Google displayName/photoURL якщо в Firestore порожньо
                            if ((!mergedProfile.nickname || mergedProfile.nickname === 'Користувач') && this._user && this._user.displayName) {
                                mergedProfile.nickname = this._user.displayName;
                            }
                            if (!mergedProfile.avatar && this._user && this._user.photoURL) {
                                mergedProfile.avatar = this._user.photoURL;
                            }
                            Storage._setProfile(mergedProfile);
                        } else if (this._user && this._user.displayName) {
                            const p = getDefaultProfile();
                            p.nickname = this._user.displayName;
                            if (this._user.photoURL) p.avatar = this._user.photoURL;
                            Storage._setProfile(p);
                        } else {
                            Storage._setProfile(getDefaultProfile());
                        }
                        if (data.history) Storage._setHistory(data.history);
                        if (data.bookmarks) Storage._setBookmarks(data.bookmarks);
                        if (data.likes) Storage._setLikes(data.likes);
                        if (data.watchTime) Storage._setWatchTime(data.watchTime);
                        // Захист від race condition: якщо локальні наліпки новіші за те, що в Firestore
                        // (наприклад юзер додав наліпку і одразу перезавантажив сторінку до завершення синку) —
                        // НЕ затираємо їх застарілими даними з хмари, а навпаки — доштовхуємо локальні нагору.
                        const remoteStickersTS = data.stickersUpdatedAt || 0;
                        const localStickersTS = Storage.getStickersTS();
                        if (localStickersTS > remoteStickersTS) {
                            Storage._debounceSync('stickers');
                        } else if (data.stickers) {
                            Storage._setStickers(Object.assign(getDefaultStickers(), data.stickers));
                        }
                    } else {
                        // Новий юзер — переносимо ГОСТЕВІ дані (не чужі!). Читаємо їх лише тут,
                        // бо для існуючого акаунта це була б зайва важка JSON-операція.
                        const guestData = {
                            profile: Storage.getProfile(),
                            history: Storage.getHistory(),
                            bookmarks: Storage.getBookmarks(),
                            likes: Storage.getLikes(),
                            watchTime: Storage.getWatchTime(),
                            stickers: Storage.getStickers()
                        };
                        if (guestData.profile && guestData.profile.nickname && guestData.profile.nickname !== 'Користувач') {
                            Storage._setProfile(guestData.profile);
                        } else if (this._user && this._user.displayName) {
                            const p = getDefaultProfile();
                            p.nickname = this._user.displayName;
                            if (this._user.photoURL) p.avatar = this._user.photoURL;
                            Storage._setProfile(p);
                        } else {
                            Storage._setProfile(getDefaultProfile());
                        }
                        if (guestData.history && guestData.history.length) Storage._setHistory(guestData.history);
                        if (guestData.bookmarks && guestData.bookmarks.length) Storage._setBookmarks(guestData.bookmarks);
                        if (guestData.likes && Object.keys(guestData.likes).length) Storage._setLikes(guestData.likes);
                        if (guestData.watchTime) Storage._setWatchTime(guestData.watchTime);
                        if (guestData.stickers && (guestData.stickers.singles.length || guestData.stickers.sets.length)) Storage._setStickers(guestData.stickers);
                        await this._createUserDoc(uid);
                    }
                } catch (e) {
                    console.warn('Error loading user data:', e);
                    // При помилці — створюємо мінімальний профіль
                    if (this._user && this._user.displayName) {
                        const p = getDefaultProfile();
                        p.nickname = this._user.displayName;
                        if (this._user.photoURL) p.avatar = this._user.photoURL;
                        Storage._setProfile(p);
                    } else {
                        Storage._setProfile(getDefaultProfile());
                    }
                                } finally {
                    this._loadingData = false;
                }
            },

            async _createUserDoc(uid) {
                if (!firebaseInitialized || !db) return;
                try {
                    let profile = Storage.getProfile() || getDefaultProfile();
                    // Доповнюємо з Google дані
                    if (this._user && this._user.displayName && (!profile.nickname || profile.nickname === 'Користувач')) {
                        profile.nickname = this._user.displayName;
                    }
                    if (this._user && this._user.photoURL && !profile.avatar) {
                        profile.avatar = this._user.photoURL;
                    }
                    Storage._setProfile(profile);
                    const docRef = doc(db, 'users', uid);
                    // Стискаємо фото для Firestore
                    const profileSync = JSON.parse(JSON.stringify(profile));
                    if (profileSync.avatar && profileSync.avatar.length > 100000) profileSync.avatar = '';
                    if (profileSync.banner && profileSync.banner.length > 100000) profileSync.banner = '';
                    const createHistory = Storage.getHistory().slice(-100).map(h => {
                        if (h.poster && h.poster.startsWith('data:')) return { ...h, poster: '' };
                        return h;
                    });
                    const createBookmarks = Storage.getBookmarks().map(b => {
                        if (b.poster && b.poster.startsWith('data:')) return { ...b, poster: '' };
                        return b;
                    });
                    await setDoc(docRef, {
                        profile: profileSync,
                        history: createHistory,
                        bookmarks: createBookmarks,
                        likes: Storage.getLikes(),
                        watchTime: Storage.getWatchTime() || 0,
                        stickers: Storage.getStickers(),
                        stickersUpdatedAt: Storage.getStickersTS(),
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                } catch (e) {
                    console.warn('Error creating user doc:', e);
                }
            },

            async login(email, password) {
                if (!firebaseInitialized || !auth) {
                    return { success: false, error: 'Firebase not available' };
                }
                try {
                    const cred = await signInWithEmailAndPassword(auth, email, password);
                    // onAuthStateChanged() є єдиним власником завантаження профілю.
                    // Не викликаємо _loadUserData та renderProfilePage вдруге після email login.
                    this._user = cred.user;
                    showToast('Успішний вхід');
                    return { success: true };
                } catch (e) {
                    console.warn('Login error:', e);
                    return { success: false, error: e.message };
                }
            },

            async register(email, password, displayName) {
                if (!firebaseInitialized || !auth) {
                    return { success: false, error: 'Firebase not available' };
                }
                try {
                    const cred = await createUserWithEmailAndPassword(auth, email, password);
                    this._user = cred.user;
                    if (displayName) {
                        await updateProfile(cred.user, { displayName });
                    }
                    const profile = getDefaultProfile();
                    profile.nickname = displayName || email.split('@')[0] || 'Користувач';
                    Storage._setProfile(profile);
                    // Явно створюємо документ в Firestore — не покладаємося тільки на onAuthStateChanged
                    // (може бути race condition якщо _loadingData вже true)
                    this._createUserDoc(cred.user.uid).catch(e => console.warn('Register _createUserDoc:', e.message));
                    this._notifyListeners();
                    showToast('Акаунт створено');
                    if (Router.currentRoute === 'profile') renderProfilePage();
                    return { success: true };
                } catch (e) {
                    console.warn('Register error:', e);
                    return { success: false, error: e.message };
                }
            },

            async signInWithGoogle() {
                if (!firebaseInitialized || !auth || !this._googleProvider) {
                    return { success: false, error: 'Firebase not available' };
                }
                try {
                    const result = await signInWithPopup(auth, this._googleProvider);
                    this._user = result.user;
                    this._notifyListeners();
                    showToast('Вхід через Google...');
                    // _loadUserData викличеться через onAuthStateChanged — не дублюємо
                    return { success: true };
                } catch (e) {
                    console.warn('Google sign-in error:', e);
                    return { success: false, error: e.message };
                }
            },

            async logout() {
                if (!firebaseInitialized || !auth) {
                    return { success: false, error: 'Firebase not available' };
                }
                // 1. Скасувати відкладений debounce-таймер
                if (Storage._syncTimer) {
                    clearTimeout(Storage._syncTimer);
                    Storage._syncTimer = null;
                }

                showToast('Збереження даних і вихід...');

                // 2. СПОЧАТКУ синхронізуємо — чекаємо завершення (max 6с)
                // Storage.clear() викликається ТІЛЬКИ після запису в Firestore
                try {
                    const timeoutP = new Promise(r => setTimeout(r, 6000));
                    await Promise.race([this.syncUserData(), timeoutP]);
                    /* console.log removed */
                } catch(e) {
                    console.warn('Logout: sync error', e.message);
                }

                // 3. ТІЛЬКИ ПІСЛЯ синхронізації очищаємо стан і localStorage
                this._user = null;
                this._authResolved = true;
                this._welcomeShown = false;
                this._isGuest = false;
                Storage.clear();
                this._notifyListeners();

                // 4. Виходимо з Firebase Auth
                try { await signOut(auth); } catch(e) { console.error("Silent error:", e); }

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
                    showToast('Гостевий сеанс завершено');
                    Router.showProfile();
                } else {
                    // Юзер — повний logout
                    this.logout().catch(e => console.warn('Logout error:', e));
                }
            },

            // Чи ввійшов юзер через email/пароль (а не Google/анонімно) — для показу "Змінити пароль"
            hasPasswordProvider() {
                if (!this.isAuthenticated()) return false;
                return (this._user.providerData || []).some(p => p.providerId === 'password');
            },

            providerLabel() {
                if (this.isGuest() || !this.isAuthenticated()) return 'Гість';
                if ((this._user.providerData || []).some(p => p.providerId === 'google.com')) return 'Google';
                if (this.hasPasswordProvider()) return 'Email і пароль';
                return 'Акаунт';
            },

            async sendPasswordReset() {
                if (!firebaseInitialized || !auth || !this._user?.email) {
                    return { success: false, error: 'Пошта акаунту недоступна' };
                }
                try {
                    await sendPasswordResetEmail(auth, this._user.email);
                    return { success: true };
                } catch (e) {
                    console.warn('Password reset error:', e);
                    return { success: false, error: e.message };
                }
            },

            // Повне і незворотнє видалення акаунту: документ у Firestore + сам обліковий запис Firebase + локальні дані.
            async deleteAccount() {
                if (!firebaseInitialized || !auth || !this._user) {
                    return { success: false, error: 'Акаунт недоступний' };
                }
                const uid = this._user.uid;
                try {
                    try { await deleteDoc(doc(db, 'users', uid)); } catch (e) { console.warn('Delete user doc failed:', e.message); }
                    await deleteUser(auth.currentUser);
                    this._user = null;
                    this._authResolved = true;
                    this._welcomeShown = false;
                    this._isGuest = false;
                    Storage.clear();
                    this._notifyListeners();
                    return { success: true };
                } catch (e) {
                    console.warn('Delete account error:', e);
                    if (e.code === 'auth/requires-recent-login') {
                        return { success: false, error: 'requires-recent-login' };
                    }
                    return { success: false, error: e.message };
                }
            },

            async syncUserData(options = {}) {
                if (!firebaseInitialized || !db || !this._user) return { ok: false, error: 'no-auth' };
                if (!this.isAuthenticated()) return { ok: false, error: 'not-authenticated' };
                const uid = this._user.uid;
                const docRef = doc(db, 'users', uid);
                const scope = options.scope || 'all';
                const scopeSet = new Set(String(scope).split(',').filter(Boolean));
                const hasScope = key => scope === 'all' || scopeSet.has(key);
                const profile = hasScope('profile') ? Storage.getProfile() : null;
                const history = hasScope('history') ? Storage.getHistory() : [];
                const bookmarks = hasScope('bookmarks') ? Storage.getBookmarks() : [];
                const likes = hasScope('likes') ? Storage.getLikes() : {};
                const watchTime = hasScope('watchTime') ? (Storage.getWatchTime() || 0) : 0;
                const stickers = hasScope('stickers') ? Storage.getStickers() : null;
                // Clean profile - strip base64, keep Cloudinary URLs
                const cleanProfile = JSON.parse(JSON.stringify(profile || {}));
                if (cleanProfile.avatar && cleanProfile.avatar.startsWith('data:')) {
                    cleanProfile.avatar = '';
                }
                if (cleanProfile.banner && cleanProfile.banner.startsWith('data:')) {
                    cleanProfile.banner = '';
                }
                // BUG FIX: Strip base64 posters from history/bookmarks — they blow up the 1MB Firestore limit
                const trimHistory = history.slice(-200).map(h => {
                    if (h.poster && h.poster.startsWith('data:')) return { ...h, poster: '' };
                    return h;
                });
                const cleanBookmarks = bookmarks.map(b => {
                    if (b.poster && b.poster.startsWith('data:')) return { ...b, poster: '' };
                    return b;
                });
                // Для звичайних змін не відправляємо весь users-документ. Це особливо важливо
                // для великих sticker packs і довгої history на мобільних пристроях.
                if (scope !== 'all') {
                    const partialPayload = { updatedAt: serverTimestamp() };
                    if (hasScope('profile')) partialPayload.profile = cleanProfile;
                    if (hasScope('history')) partialPayload.history = trimHistory;
                    if (hasScope('bookmarks')) partialPayload.bookmarks = cleanBookmarks;
                    if (hasScope('likes')) partialPayload.likes = likes;
                    if (hasScope('watchTime')) partialPayload.watchTime = watchTime;
                    if (hasScope('stickers')) {
                        partialPayload.stickers = stickers;
                        partialPayload.stickersUpdatedAt = Storage.getStickersTS();
                    }
                    if (hasScope('history') || hasScope('bookmarks') || hasScope('watchTime')) {
                        const partialXp = calcTotalXP();
                        partialPayload.xp = partialXp;
                        partialPayload.level = getLevel(partialXp);
                    }
                    try {
                        await setDoc(docRef, partialPayload, { merge: true });
                        return { ok: true, scope };
                    } catch (e) {
                        console.error('[Firestore] Partial sync FAILED:', scope, e.code, e.message);
                        return { ok: false, error: e.message };
                    }
                }
                /* console.log removed */
                /* console.log removed */
                // Спроба 1: повні дані
                const _xp = calcTotalXP();
                const _lv = getLevel(_xp);
                try {
                    await setDoc(docRef, {
                        profile: cleanProfile,
                        history: trimHistory,
                        bookmarks: cleanBookmarks,
                        likes: likes,
                        watchTime: watchTime,
                        stickers: stickers,
                        stickersUpdatedAt: Storage.getStickersTS(),
                        xp: _xp,
                        level: _lv,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                    /* console.log removed */
                    return { ok: true };
                } catch (e) {
                    console.error('[Firestore] Sync FAILED (full):', e.code, e.message);
                }
                // Спроба 2: менше історії (можливо документ > 1MB)
                try {
                    await setDoc(docRef, {
                        profile: cleanProfile,
                        history: trimHistory.slice(-50),
                        bookmarks: cleanBookmarks,
                        likes: likes,
                        watchTime: watchTime,
                        stickers: stickers,
                        stickersUpdatedAt: Storage.getStickersTS(),
                        xp: _xp,
                        level: _lv,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                    /* console.log removed */
                    return { ok: true };
                } catch (e) {
                    console.error('[Firestore] Sync FAILED (trimmed):', e.code, e.message);
                }
                // Спроба 3: ТІЛЬКИ профіль (БЕЗ перезапису avatar/banner!)
                // ВАЖЛИВО: не пишемо avatar: '' — це зітре Cloudinary URL!
                try {
                    await setDoc(docRef, {
                        profile: cleanProfile,
                        watchTime: watchTime,
                        stickers: stickers,
                        stickersUpdatedAt: Storage.getStickersTS(),
                        xp: _xp,
                        level: _lv,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                    /* console.log removed */
                    return { ok: true };
                } catch (e2) {
                    console.error('[Firestore] Sync FAILED (profile only):', e2.code, e2.message);
                    return { ok: false, error: e2.message };
                }
            }
        };

        // ====================================================================
        //  СХОВИЩЕ
        // ====================================================================
        const Storage = {
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
                    const raw = localStorage.getItem('vakdab_stickers');
                    if (raw === this._stickersRaw && this._stickersCache) return this._stickersCache;
                    const source = raw ? JSON.parse(raw) : null;
                    const parsed = source && typeof source === 'object' && !Array.isArray(source)
                        ? Object.assign(getDefaultStickers(), source)
                        : getDefaultStickers();
                    parsed.singles = Array.isArray(parsed.singles) ? parsed.singles.filter(Boolean) : [];
                    parsed.sets = Array.isArray(parsed.sets) ? parsed.sets.filter(Boolean) : [];
                    parsed.medals = Array.isArray(parsed.medals) ? parsed.medals.filter(m => typeof m === 'string' || typeof m === 'number').slice(0, PROFILE_STICKER_SLOTS) : [];
                    parsed.colors = parsed.colors && typeof parsed.colors === 'object' && !Array.isArray(parsed.colors) ? parsed.colors : {};
                    // Міграція старого формату (nickBadge/medals зберігали номер варіанта напряму)
                    if (typeof parsed.nickBadge === 'number') parsed.nickBadge = 'v:' + parsed.nickBadge;
                    if (parsed.nickBadge !== null && typeof parsed.nickBadge !== 'string') parsed.nickBadge = null;
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

        function getDefaultStickers() {
            return { singles: [], sets: [], nickBadge: null, medals: [], colors: {} };
        }

        // ====================================================================
        //  ДОПОМІЖНІ ФУНКЦІЇ
        // ====================================================================
        function applyTheme(theme) {
            if (theme === 'dark') {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            const settingsBtn = document.getElementById('settingsThemeBtn');
            if (settingsBtn) {
                const icon = theme === 'dark' ? 'fa-moon' : 'fa-sun';
                const label = theme === 'dark' ? 'Темна тема' : 'Світла тема';
                settingsBtn.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
            }
        }

        function toggleTheme() {
            const next = Storage.getTheme() === 'dark' ? 'light' : 'dark';
            Storage.setTheme(next);
            applyTheme(next);
            showToast(next === 'dark' ? 'Темний режим' : 'Світлий режим');
            if (Router.currentRoute === 'settings') {
                renderSettingsPage();
            }
        }

        // Колір теми (Налаштування → Зовнішній вигляд) — монохромні варіанти акценту
        function applyThemeVariant(profile) {
            document.body.classList.remove('theme-variant-graphite', 'theme-variant-white', 'theme-variant-lavender', 'theme-variant-ocean');
            const v = profile?.themeVariant;
            if (v === 'graphite') document.body.classList.add('theme-variant-graphite');
            else if (v === 'white') document.body.classList.add('theme-variant-white');
            else if (v === 'lavender') document.body.classList.add('theme-variant-lavender');
            else if (v === 'ocean') document.body.classList.add('theme-variant-ocean');
        }

        // Генерує накладні частинки для "Ефектів профілю" (дощ / сніг / іскри)
        function buildEffectOverlayHtml(type) {
            const rand = (min, max) => Math.random() * (max - min) + min;
            let n = 18,
                cls = 'drop';
            if (type === 'snow') { n = 16;
                cls = 'flake'; } else if (type === 'sparks') { n = 14;
                cls = 'spark'; } else if (type === 'hearts') { n = 12;
                cls = 'heart'; } else if (type === 'bubbles') { n = 12;
                cls = 'bubble'; }
            let items = '';
            for (let i = 0; i < n; i++) {
                const left = rand(0, 100).toFixed(1);
                const delay = rand(0, 3).toFixed(2);
                const dur = type === 'sparks' ? rand(1.4, 2.6).toFixed(2) : rand(1.1, 2.4).toFixed(2);
                if (type === 'sparks') {
                    const top = rand(0, 100).toFixed(1);
                    items +=
                        `<span class="spark" style="left:${left}%;top:${top}%;animation-delay:${delay}s;animation-duration:${dur}s;"></span>`;
                } else {
                    items +=
                        `<span class="${cls}" style="left:${left}%;animation-delay:${delay}s;animation-duration:${dur}s;"></span>`;
                }
            }
            return `<div class="effect-overlay effect-overlay--${type}">${items}</div>`;
        }

        function showToast(msg) {
            const toast = document.getElementById('toast');
            if (!toast) return;
            toast.textContent = msg;
            toast.classList.add('show');
            clearTimeout(toast._timeout);
            toast._timeout = setTimeout(() => toast.classList.remove('show'), 2200);
        }
        function showToastProgress(msg) {
            const toast = document.getElementById('toast');
            if (!toast) return;
            toast.textContent = msg;
            toast.classList.add('show');
            clearTimeout(toast._timeout);
            toast._timeout = setTimeout(() => toast.classList.remove('show'), 150000);
        }

        // ====================================================================
        //  API ФУНКЦІЇ
        // ====================================================================
        // ====================================================================
        //  ДІАГНОСТИКА — зберігаємо дані парсингу у Firestore
        // ====================================================================
        async function saveParseDiagnostic({ url, ua, platform, playerUrls, allRawSources, rawHtml }) {
            try {
                if (!firebaseInitialized || !db) {
                    console.warn('[diagnostic] Firebase not initialized, skipping');
                    return;
                }
                const id = `${Date.now()}_${Math.floor(Math.random()*10000)}`;
                const rawSnippet = (rawHtml && rawHtml.slice(0, 20000)) || '';
                const payload = {
                    url,
                    ua,
                    platform,
                    playerUrls: playerUrls || [],
                    allRawSources: allRawSources ? allRawSources.slice(0, 20) : [],
                    rawSnippet,
                    createdAt: new Date().toISOString()
                };
                await setDoc(doc(db, 'diagnostics', id), payload);
                /* console.log removed */
            } catch (e) {
                console.warn('[diagnostic] saveParseDiagnostic error:', e);
            }
        }

        function detectDeviceInfo(ua) {
            ua = ua || '';
            let type = 'ПК', osVersion = '';
            if (/Android/i.test(ua)) {
                const verM = ua.match(/Android\s([\d.]+)/i);
                osVersion = verM ? verM[1] : 'невідома';
                const isTV = /\bTV\b/i.test(ua) || (!/Mobile/i.test(ua) && !/Tablet/i.test(ua));
                type = isTV ? 'Android TV' : 'Android Phone';
            } else if (/iPad/i.test(ua)) {
                type = 'iPad';
                const verM = ua.match(/OS\s([\d_]+)/i);
                osVersion = verM ? verM[1].replace(/_/g, '.') : 'невідома';
            } else if (/iPhone/i.test(ua)) {
                type = 'iPhone';
                const verM = ua.match(/OS\s([\d_]+)/i);
                osVersion = verM ? verM[1].replace(/_/g, '.') : 'невідома';
            } else if (/Windows|Macintosh|Linux/i.test(ua)) {
                type = 'ПК';
                osVersion = '';
            } else {
                type = 'Невідомий пристрій';
            }
            return { type, osVersion };
        }

        async function fetchUA(url, retries = 2, _diagRef = null, forceUA = 'desktop') {
            if (url && url.startsWith('http://')) url = 'https://' + url.slice(7);
            const proxyUrl = getProxyUrl(url, forceUA);
            const doFetch = async () => {
                const controller = new AbortController();
                // 20с timeout — достатньо для повільних з'єднань
                const timer = setTimeout(() => controller.abort(), 20000);
                try {
                    const resp = await fetch(proxyUrl, {
                        mode: 'cors',
                        credentials: 'omit',
                        cache: 'no-cache',
                        signal: controller.signal
                    });
                    clearTimeout(timer);
                    if (_diagRef) {
                        _diagRef.httpStatus = resp.status;
                        _diagRef.contentType = resp.headers.get('content-type') || 'невідомо';
                        _diagRef.cfCacheStatus = resp.headers.get('cf-cache-status') || 'невідомо (заголовок недоступний)';
                        _diagRef.cfRay = resp.headers.get('cf-ray') || null;
                        _diagRef.usedCloudflareWorker = true;
                    }
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    let html = await resp.text();
                    // Видаляємо рекламні скрипти та трекери
                    html = html.replace(/<script[^>]*>.*?<\/script>/gi, (match) => {
                        if (match.includes('ad') || match.includes('track') || match.includes('ga.js') ||
                            match.includes('analytics') || match.includes('doubleclick') || match.includes('yandex') || match.includes('google') || match.includes('facebook') || match.includes('tiktok')) return '';
                        return match;
                    });
                    html = html.replace(/<iframe[^>]*src=["']?[^"']*(?:ad|banner|track|yandex|google|doubleclick)[^"']*["']?[^>]*>.*?<\/iframe>/gi, '');
                    // Видаляємо div контейнери з рекламою
                    html = html.replace(/<div[^>]*(?:id|class)=["']?[^"']*(?:ad|banner|advertisement|advert)[^"']*["']?[^>]*>.*?<\/div>/gi, '');
                    // Видаляємо скрипти, які завантажують рекламу динамічно
                    html = html.replace(/<script[^>]*src=["']?[^"']*(?:ads|banner|adv|tracking)[^"']*["']?[^>]*>.*?<\/script>/gi, '');
                    // Видаляємо data атрибути для реклами
                    html = html.replace(/data-ad[^=]*="[^"]*"/gi, '');
                    html = html.replace(/data-banner[^=]*="[^"]*"/gi, '');
                    // Видаляємо style теги з рекламою
                    html = html.replace(/<style[^>]*>.*?(?:ad|banner|advertisement).*?<\/style>/gi, '');
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    doc._rawHtml = html;
                    // TODO: дебаг для Android — прибрати після підтвердження фіксу
                    console.log('[fetchUA]', url, 'HTML length:', html.length, 'has iframe:', html.includes('iframe'));
                    return doc;
                } catch (e) {
                    clearTimeout(timer);
                    // AbortError від таймауту — не показувати як "Fetch is aborted"
                    if (e && (e.name === 'AbortError' || (e.message && (e.message.includes('aborted') || e.message.includes('Fetch is aborted'))))) {
                        throw new Error('Час очікування вичерпано. Перевірте з\'єднання.');
                    }
                    throw e;
                }
            };
            try {
                return await doFetch();
            } catch (e) {
                if (_diagRef && !_diagRef.corsError) {
                    _diagRef.corsError = /Failed to fetch|CORS|NetworkError/i.test(e.message || '');
                }
                // Retry тільки якщо не скасовано плеєром (playerPageAborted)
                if (retries > 0 && !(e && e._playerAborted)) {
                    await new Promise(r => setTimeout(r, 800));
                    return fetchUA(url, retries - 1, _diagRef, forceUA);
                }
                throw e;
            }
        }

        // Hikka API adapter. Старі назви функцій збережені для сумісності UI.
        const CATALOG_POSTER_FALLBACK = './android-chrome-512x512.png';
        function normalizeAnimeUrl(href = '') {
            const value = String(href || '').trim();
            if (!value) return '';
            try { return new URL(value, HIKKA_API).href; } catch { return ''; }
        }
        function normalizePosterUrl(src = '', fallback = CATALOG_POSTER_FALLBACK) {
            const value = String(src || '').trim();
            return /^https?:\/\//i.test(value) ? value : fallback;
        }
        function normalizeGenreList(values) {
            const result=[]; const seen=new Set();
            for (const value of (Array.isArray(values) ? values : [values])) {
                const label=String(typeof value==='object' ? (value?.name_ua || value?.name || '') : value || '').trim();
                const key=label.toLocaleLowerCase('uk-UA');
                if(label && !seen.has(key)){seen.add(key);result.push(label);}
            }
            return result;
        }
        function normalizeSynopsisText(value) {
            return String(value || '')
                .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
                .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
                .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
                .replace(/<[^>]+>/g, '')
                .replace(/\\r?\\n/g, '\n')
                .replace(/\r\n?/g, '\n')
                .replace(/[ \t]+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        }
        function hikkaType(item={}) {
            return item.media_type==='movie' ? 'movie' : (item.media_type==='ova'||item.media_type==='ona' ? 'ova' : 'tv');
        }
        function animeTypeLabel(type = 'tv') {
            return type === 'movie' ? 'Фільм' : type === 'ova' ? 'OVA' : 'Серіал';
        }
        function extractExternalAnimeIds(item = {}) {
            const external = Array.isArray(item.external) ? item.external : [];
            const fromUrl = (pattern) => {
                const hit = external.map(x => String(x?.url || '')).map(url => url.match(pattern)).find(Boolean);
                return hit ? Number(hit[1]) : null;
            };
            const malId = Number(item.mal_id || item.malId || fromUrl(/myanimelist\.net\/anime\/(\d+)/i) || 0) || null;
            const anilistId = Number(item.anilist_id || item.anilistId || fromUrl(/anilist\.co\/anime\/(\d+)/i) || 0) || null;
            return { ...(malId ? { mal_id: malId } : {}), ...(anilistId ? { anilist_id: anilistId } : {}) };
        }
        function hikkaItem(item={}, endpoint = 'anime') {
            const title=item.title_ua || item.title_en || item.title_ja || item.name_ua || item.name_en || 'Без назви';
            const contentType = endpoint === 'manga' ? 'manga' : endpoint === 'novel' ? 'novel' : hikkaType(item);
            const contentTypeLabel = contentType === 'manga' ? 'Манґа' : contentType === 'novel' ? 'Ранобе' : contentType === 'movie' ? 'Фільм' : contentType === 'ova' ? 'OVA' : 'Серіал';
            return { ...item, mal_id:item.mal_id || item.slug?.hashCode?.() || Date.now(), title,
                originalTitle:item.title_en || item.title_ja || item.name_en || '', url:`${HIKKA_API}/${endpoint}/${item.slug}`,
                images:{jpg:{large_image_url:item.image || CATALOG_POSTER_FALLBACK, image_url:item.image || CATALOG_POSTER_FALLBACK}},
                genres:normalizeGenreList(item.genres), type:contentType, typeLabel:contentTypeLabel,
                synopsis:normalizeSynopsisText(item.synopsis_ua || item.synopsis_en || ''), from:'hikka' };
        }
        function hikkaRequest(url, options = {}) {
            return fetch(`${HIKKA_CORS_PROXY}${encodeURIComponent(url)}`, {
                ...options,
                headers: { Accept: 'application/json', ...(options.headers || {}) }
            });
        }

        async function hikkaCatalog(type='anime', page=1, body={}) {
            const endpoint=type==='manga'?'manga':type==='novel'?'novel':'anime';
            const apiUrl = `${HIKKA_API}/${endpoint}?page=${Math.max(1,page)}&size=24`;
            const res=await hikkaRequest(apiUrl, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
            if(!res.ok) throw new Error(`Hikka API: HTTP ${res.status}`);
            const data=await res.json(); return (data.list || []).map(item => hikkaItem(item, endpoint));
        }
        async function fetchHikkaMain(page) { return hikkaCatalog('anime', page, {only_translated:true, sort:['score:desc','scored_by:desc']}); }
        async function searchHikka(query, page) { return hikkaCatalog('anime', page, {query:String(query||'').trim(), only_translated:true}); }
        async function fetchHikkaByCategory(categorySlug, page) {
            const body = String(categorySlug).startsWith('format:')
                ? { media_type: [String(categorySlug).slice(7)], only_translated: true }
                : { genres: [categorySlug], only_translated: true };
            return hikkaCatalog('anime', page, body);
        }
        async function fetchHikkaTop100() { return hikkaCatalog('anime', 1, {sort:['score:desc','scored_by:desc'], only_translated:true}); }
        async function fetchHikkaByGenre(genreSlug, page) { return fetchHikkaByCategory(genreSlug, page); }

        // Hikka є єдиним джерелом каталогу та інформації. Mikai використовується
        // як proxy-джерело озвучок, сезонів і ASHDI no-ad embed-посилань.
        async function fetchAnimeLite(animeUrl) {
            const match = String(animeUrl || '').match(/\/anime\/([^\/?#]+)/i);
            const slug = match?.[1] || String(animeUrl || '').split('/').filter(Boolean).pop();
            if (!slug) throw new Error('Не знайдено Hikka slug');
            const res = await hikkaRequest(`${HIKKA_API}/anime/${encodeURIComponent(slug)}`);
            if (!res.ok) throw new Error(`Hikka API: HTTP ${res.status}`);
            const d = await res.json();
            return {
                episodes: Number(d.episodes_total || d.episodes_released || 0) || null,
                synopsis: normalizeSynopsisText(d.synopsis_ua || d.synopsis_en || '')
            };
        }

        function getExternalWatchUrl(hikkaAnime = {}, hostPattern) {
            const external = Array.isArray(hikkaAnime.external) ? hikkaAnime.external : [];
            return external.find(item => item?.type === 'watch' && hostPattern.test(item.url || ''))?.url || '';
        }
        function getMikaiUrl(hikkaAnime = {}) {
            return getExternalWatchUrl(hikkaAnime, /^https?:\/\/(?:www\.)?mikai\.me\/anime\//i);
        }
        function getAnimeOnUrl(hikkaAnime = {}) {
            return getExternalWatchUrl(hikkaAnime, /^https?:\/\/(?:www\.)?animeon\.club\/anime\//i);
        }
        function getAnimeOnId(animeOnUrl = '') {
            const match = String(animeOnUrl).match(/\/anime\/(\d+)(?:[-/]|$)/i);
            return match?.[1] || '';
        }
        async function fetchAnimeOnJson(url) {
            const proxyUrl = getProxyUrl(url, 'desktop');
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 25000);
            try {
                const res = await fetch(proxyUrl, {
                    mode: 'cors', credentials: 'omit', cache: 'no-cache', signal: controller.signal,
                    headers: { Accept: 'application/json' }
                });
                if (!res.ok) throw new Error(`AnimeON API: HTTP ${res.status}`);
                return await res.json();
            } finally { clearTimeout(timer); }
        }
        async function loadAnimeOnSeasons(animeOnUrl) {
            const animeId = getAnimeOnId(animeOnUrl);
            if (!animeId) return { seasons: {}, dubLogos: {}, subtitleLogos: {} };
            const data = await fetchAnimeOnJson(`https://animeon.club/api/player/${animeId}/translations`);
            const translations = Array.isArray(data?.translations) ? data.translations : [];
            const ranked = translations.slice().sort((a, b) => {
                const an = String(a?.translation?.name || ''), bn = String(b?.translation?.name || '');
                const preferred = name => /fanvox|hajime|робота голосом|одноголос/i.test(name) ? 1 : 0;
                return preferred(bn) - preferred(an) ||
                    Math.max(...(b?.player || []).map(x => Number(x?.episodesCount) || 0), 0) -
                    Math.max(...(a?.player || []).map(x => Number(x?.episodesCount) || 0), 0);
            });
            const selected = ranked.find(x => (x?.player || []).some(p => Number(p?.episodesCount) > 0)) || ranked[0];
            const translation = selected?.translation;
            const player = (selected?.player || []).slice().sort((a, b) => (Number(b?.episodesCount) || 0) - (Number(a?.episodesCount) || 0))[0];
            if (!translation || !player) return { seasons: {}, dubLogos: {}, subtitleLogos: {} };
            const episodesData = await fetchAnimeOnJson(`https://animeon.club/api/player/${animeId}/episodes?take=100&skip=-1&playerId=${encodeURIComponent(player.id)}&translationId=${encodeURIComponent(translation.id)}&includeAlternative=true`);
            const episodeRefs = Array.isArray(episodesData?.episodes) ? episodesData.episodes : [];
            const loaded = await Promise.all(episodeRefs.map(async ref => {
                try {
                    const episode = await fetchAnimeOnJson(`https://animeon.club/api/player/${encodeURIComponent(ref.id)}/episode`);
                    const file = String(episode?.videoUrl || '').trim();
                    return file ? { episode: String(ref.episode), file, dub: translation.name, provider: 'AnimeON', label: translation.name } : null;
                } catch { return null; }
            }));
            const list = loaded.filter(Boolean).sort((a, b) => Number(a.episode) - Number(b.episode));
            const logo = translation.studios?.[0]?.avatar?.preview ? `https://animeon.club/api/uploads/images/${translation.studios[0].avatar.preview}` : '';
            return {
                seasons: list.length ? { '1': { [translation.name || 'AnimeON']: list } } : {},
                dubLogos: logo ? { [translation.name || 'AnimeON']: logo } : {},
                subtitleLogos: {}
            };
        }

        function resolveMikaiNuxtPayload(payload) {
            const memo = new Map();
            const resolving = new Set();
            const resolveRef = (index) => {
                if (!Number.isInteger(index) || index < 0 || index >= payload.length) return index;
                if (memo.has(index)) return memo.get(index);
                if (resolving.has(index)) return null;
                resolving.add(index);
                const raw = payload[index];
                let value;
                if (typeof raw === 'number') value = raw;
                else if (Array.isArray(raw)) {
                    const tag = typeof raw[0] === 'string' ? raw[0] : '';
                    if (['ShallowReactive', 'Reactive', 'Set', 'Date', 'URL'].includes(tag) && raw.length > 1) {
                        value = resolveRef(raw[1]);
                    } else {
                        value = raw.map(item => typeof item === 'number' ? resolveRef(item) : item);
                    }
                } else if (raw && typeof raw === 'object') {
                    value = {};
                    Object.entries(raw).forEach(([key, item]) => {
                        value[key] = typeof item === 'number' ? resolveRef(item) : item;
                    });
                } else value = raw;
                resolving.delete(index);
                memo.set(index, value);
                return value;
            };
            return payload.map((_, index) => resolveRef(index));
        }

        function addNoAdsQuery(url) {
            if (!url) return '';
            return `${url}${url.includes('?') ? '&' : '?'}nopl`;
        }

        async function fetchMikaiHtml(mikaiUrl) {
            const proxyUrl = getProxyUrl(mikaiUrl, 'desktop');
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 25000);
            try {
                const res = await fetch(proxyUrl, {
                    mode: 'cors',
                    credentials: 'omit',
                    cache: 'no-cache',
                    signal: controller.signal,
                    headers: { Accept: 'text/html,application/xhtml+xml' }
                });
                if (!res.ok) throw new Error(`Mikai proxy: HTTP ${res.status}`);
                return await res.text();
            } finally {
                clearTimeout(timer);
            }
        }

        function getMikaiTeamLogoUrl(team) {
            const avatarUid = team?.avatarUid || team?.avatar?.uid || team?.avatar?.id || team?.teams?.[0]?.avatarUid || '';
            return avatarUid ? `https://images.mikai.me/avatar/medium/${encodeURIComponent(avatarUid)}.webp` : '';
        }

        function parseMikaiSeasonsFromHtml(html) {
            const match = String(html || '').match(/<script[^>]+id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
            if (!match) throw new Error('Mikai Nuxt payload не знайдено');
            let payload;
            try { payload = JSON.parse(match[1]); } catch { throw new Error('Mikai Nuxt payload пошкоджений'); }
            const resolved = resolveMikaiNuxtPayload(payload);
            const playerGroups = [];
            resolved.forEach(value => {
                if (Array.isArray(value?.players)) playerGroups.push(...value.players);
            });
            const dubs = new Map();
            const dubLogos = {};
            const subtitleLogos = {};
            playerGroups.forEach(group => {
                if (!group || !Array.isArray(group.providers)) return;
                const teamName = String(group.team?.name || 'Озвучка').trim();
                const logoUrl = getMikaiTeamLogoUrl(group.team);
                if (logoUrl) {
                    (group.isSubs ? subtitleLogos : dubLogos)[teamName] = logoUrl;
                }
                if (group.isSubs) return;
                group.providers.filter(provider => String(provider?.name || '').toUpperCase() === 'ASHDI').forEach(provider => {
                    const episodes = dubs.get(teamName) || new Map();
                    (provider.episodes || []).forEach(ep => {
                        const number = String(ep?.number ?? '').trim();
                        const playLink = String(ep?.playLink || '').trim();
                        if (!number || !playLink) return;
                        const previous = episodes.get(number);
                        if (!previous || String(ep?.createdAt || '') > String(previous.createdAt || '')) {
                            episodes.set(number, {
                                title: `Серія ${number}`,
                                season: '1',
                                episode: number,
                                file: addNoAdsQuery(playLink),
                                dub: teamName,
                                teamLogo: logoUrl,
                                provider: 'ASHDI',
                                createdAt: ep?.createdAt || ''
                            });
                        }
                    });
                    dubs.set(teamName, episodes);
                });
            });
            const dubObject = {};
            [...dubs.entries()].sort(([a], [b]) => a.localeCompare(b, 'uk')).forEach(([team, episodes]) => {
                const list = [...episodes.values()].sort((a, b) => Number(a.episode) - Number(b.episode));
                if (list.length) dubObject[team] = list;
            });
            return {
                seasons: Object.keys(dubObject).length ? { '1': dubObject } : {},
                dubLogos,
                subtitleLogos
            };
        }

        const ashdiPlaybackCache = new Map();
        async function resolveAshdiPlaybackUrl(ashdiPageUrl) {
            if (!ashdiPageUrl) throw new Error('Порожній ASHDI URL');
            const cached = ashdiPlaybackCache.get(ashdiPageUrl);
            if (cached) return cached;
            const html = await fetchMikaiHtml(ashdiPageUrl);
            const matches = String(html).replace(/\\u002F/g, '/').match(/https?:\/\/[^"'<>\s]+\.m3u8(?:\?[^"'<>\s]*)?/gi) || [];
            const manifest = matches.find(url => /ashdi\.vip|video\d+/i.test(url)) || matches[0];
            if (!manifest) throw new Error('ASHDI m3u8 manifest не знайдено');
            const proxiedManifest = getProxyUrl(manifest, 'desktop');
            ashdiPlaybackCache.set(ashdiPageUrl, proxiedManifest);
            return proxiedManifest;
        }

        function inferAnimeSeasonNumber(data = {}, ...sources) {
            const explicit = [data.season_number, data.seasonNumber, data.season?.number, data.season?.season_number]
                .map(Number).find(n => Number.isInteger(n) && n > 0 && n < 100);
            if (explicit) return String(explicit);
            const text = [
                data.title_ua, data.title_en, data.title_ja, data.name_ua, data.name_en,
                data.slug, data.url, ...sources
            ].filter(Boolean).join(' ');
            const match = String(text).match(/(?:\bseason\s*|\bсезон\s*|\bсезона\s*|\bсезону\s*)(\d{1,2})/i) ||
                String(text).match(/\b(\d{1,2})(?:st|nd|rd|th|-й|-я|-е)?\s*season\b/i) ||
                String(text).match(/\bs(\d{1,2})(?:\b|[-_])/i);
            const number = Number(match?.[1]);
            return Number.isInteger(number) && number > 0 && number < 100 ? String(number) : '1';
        }
        async function loadMikaiSeasons(mikaiUrl) {
            if (!mikaiUrl) return { seasons: {}, dubLogos: {}, subtitleLogos: {} };
            const html = await fetchMikaiHtml(mikaiUrl);
            return parseMikaiSeasonsFromHtml(html);
        }
        function pickPreferredDub(seasonData = {}) {
            const dubs = Object.keys(seasonData || {});
            return dubs.find(dub => /робота голосом/i.test(dub)) ||
                dubs.slice().sort((a, b) => (seasonData[b]?.length || 0) - (seasonData[a]?.length || 0))[0] || '';
        }

        async function loadHikkaDetail(animeUrl) {
            const match = String(animeUrl || '').match(/\/anime\/([^\/?#]+)/i);
            const slug = match?.[1] || String(animeUrl || '').split('/').filter(Boolean).pop();
            if (!slug) throw new Error('Не знайдено Hikka slug');
            const res = await hikkaRequest(`${HIKKA_API}/anime/${encodeURIComponent(slug)}`);
            if (!res.ok) throw new Error(`Hikka API: HTTP ${res.status}`);
            const d = await res.json();
            const item = hikkaItem(d);
            const total = Number(d.episodes_total || d.episodes_released || 0);
            const mikaiUrl = getMikaiUrl(d);
            const animeOnUrl = getAnimeOnUrl(d);
            let seasons = {};
            let dubLogos = {};
            let subtitleLogos = {};
            if (mikaiUrl) {
                try {
                    const mikaiData = await loadMikaiSeasons(mikaiUrl);
                    seasons = mikaiData.seasons || {};
                    const sourceSeason = inferAnimeSeasonNumber(d, mikaiUrl, animeUrl);
                    if (sourceSeason !== '1' && seasons['1']) seasons = { [sourceSeason]: seasons['1'] };
                    dubLogos = mikaiData.dubLogos || {};
                    subtitleLogos = mikaiData.subtitleLogos || {};
                } catch (error) { console.warn('[Mikai] Не вдалося завантажити ASHDI:', error); }
            }
            if (!Object.keys(seasons).length && animeOnUrl) {
                try {
                    const animeOnData = await loadAnimeOnSeasons(animeOnUrl);
                    seasons = animeOnData.seasons || {};
                    dubLogos = animeOnData.dubLogos || {};
                    subtitleLogos = animeOnData.subtitleLogos || {};
                } catch (error) { console.warn('[AnimeON] Не вдалося завантажити епізоди:', error); }
            }
            return {
                ...item,
                title: d.title_ua || d.title_en || item.title,
                originalTitle: d.title_en || d.title_ja || '',
                year: d.year || '',
                synopsis: normalizeSynopsisText(d.synopsis_ua || d.synopsis_en || ''),
                score: d.score || d.native_score || null,
                rating: d.score || d.native_score || null,
                runtimeMinutes: d.duration || 0,
                totalEpisodes: total,
                seasons,
                dubLogos,
                subtitleLogos,
                mikaiUrl,
                animeOnUrl,
                from: mikaiUrl ? 'hikka+mikai+ashdi' : animeOnUrl ? 'hikka+animeon+ashdi' : 'hikka',
                externalIds: extractExternalAnimeIds(d)
            };
        }

        // Об'єднує дані аніме з Hikka постерами та озвучками від інших джерел
        function unifyAnimeDataWithExternalDubs(hikkaData, externalSeasons, providerName) {
            if (!hikkaData) return externalSeasons;

            // Зберігаємо постер та інформацію з Hikka
            const unifiedData = {
                ...hikkaData,
                seasons: externalSeasons || {}
            };

            // Переконуємось що постер завжди з Hikka
            if (hikkaData.images?.jpg?.large_image_url) {
                unifiedData.images = {
                    jpg: {
                        large_image_url: hikkaData.images.jpg.large_image_url,
                        image_url: hikkaData.images.jpg.large_image_url
                    }
                };
            }

            return unifiedData;
        }

        // Оптимізація: кешування результатів для швидшого переключення джерел
        const sourceCache = {};
        function getCachedSource(provider, title) {
            const key = `${provider}:${title}`;
            return sourceCache[key];
        }
        function setCachedSource(provider, title, data) {
            const key = `${provider}:${title}`;
            sourceCache[key] = data;
        }

        async function switchProviderSource(providerName) {
            if (providerName === playerPageCurrentSource) return;
            const prevSource = playerPageCurrentSource;
            playerPageCurrentSource = providerName;
            updateSourceChip();
            buildBottomSheetData();

            if (providerName === 'Основне') {
                playerPageAnime.seasons = playerPageAnimeuaSeasons || {};
                refreshAfterSourceSwitch();
                showToast('Джерело: Основне');
                return;
            }

            showToast(`Шукаю озвучки ${providerName}...`);
            try {
                let sourceData = externalSourceCache[providerName];
                if (!sourceData) {
                    sourceData = playerPageAnime?.mikaiUrl
                        ? await loadMikaiSeasons(playerPageAnime.mikaiUrl)
                        : await loadAnimeOnSeasons(playerPageAnime?.animeOnUrl || getAnimeOnUrl(playerPageAnime));
                    externalSourceCache[providerName] = sourceData;
                }
                const mikaiData = sourceData;
                playerPageAnime.seasons = mikaiData.seasons || {};
                playerPageAnime.dubLogos = mikaiData.dubLogos || {};
                playerPageAnime.subtitleLogos = mikaiData.subtitleLogos || {};
                refreshAfterSourceSwitch();
                showToast(`${providerName}: ASHDI без реклами`);
            } catch (e) {
                console.warn('[switchProviderSource]', providerName, e);
                showToast(`${providerName}: ${e.message || 'недоступно'}`);
                playerPageCurrentSource = prevSource;
                updateSourceChip();
                buildBottomSheetData();
            }
        }

        function refreshAfterSourceSwitch() {
            const seasons = Object.keys(playerPageAnime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
            playerPageCurrentSeason = seasons[0] || '1';
            playerPageCurrentDub = pickPreferredDub(playerPageAnime.seasons[playerPageCurrentSeason]);
            buildSeasonRow(seasons);
            buildEpisodeViews();
            updateFilterChip();
            buildBottomSheetData();
            if (seasons.length === 0) {
                document.getElementById('episodeViewGrid').innerHTML =
                    '<div class="episode-empty"><i class="fas fa-search"></i> Серії не знайдені на цьому джерелі.</div>';
            }
        }

        function extractPlayerIframeUrls(doc) {
            const selectors = ['.video-responsive iframe', '.player-responsive iframe', '#player iframe',
                '.pmovie__player iframe', 'iframe[src]', 'iframe[data-src]',
                // мобільна версія hikka.io / mikai.me верстає плеєр в інших контейнерах
                '[class*="player"] iframe', '[class*="video"] iframe',
                'iframe[src*="ashdi"]', 'iframe[src*="vidmoly"]',
                'iframe[data-src*="ashdi"]', 'iframe[data-src*="vidmoly"]'
            ];
            const urls = [];
            for (const sel of selectors) {
                safeQueryAll(sel, doc).forEach(el => {
                    let src = el.getAttribute('src') || el.getAttribute('data-src');
                    if (!src || src === 'about:blank') return;
                    if (src.startsWith('//')) src = 'https:' + src;
                    if (!src.startsWith('http')) src = HIKKA_API + src;
                    urls.push(src);
                });
            }
            const scripts = safeQueryAll('script:not([src])', doc);
            for (const s of scripts) {
                const matches = s.textContent.matchAll(/(?:playerUrl|iframeUrl|src)\s*[:=]\s*['"]([^'"]+)['"]/g);
                for (const match of matches) {
                    let url = match[1];
                    if (url.includes('ashdi.vip') || url.includes('vidmoly') || url.includes('player')) {
                        if (url.startsWith('//')) url = 'https:' + url;
                        if (!url.startsWith('http')) url = HIKKA_API + url;
                        urls.push(url);
                    }
                }
            }
            // Fallback: якщо DOM-парсинг нічого не знайшов (мобільна версія сторінки
            // інколи віддає плеєр у сирому вигляді, який DOMParser не будує правильно) —
            // шукаємо iframe src/data-src прямо в raw HTML через regex.
            if (urls.length === 0) {
                const rawHtml = doc._rawHtml || '';
                const iframeRegex = /iframe[^>]+(?:src|data-src)=["']([^"']*(?:ashdi\.vip|vidmoly|player)[^"']*)["']/gi;
                let m;
                while ((m = iframeRegex.exec(rawHtml)) !== null) {
                    let url = m[1];
                    if (url.startsWith('//')) url = 'https:' + url;
                    if (!url.startsWith('http')) url = HIKKA_API + url;
                    if (!urls.includes(url)) urls.push(url);
                }
            }
            return [...new Set(urls)];
        }

        function extractSourcesFromText(text, providerName) {
            let sources = [];
            // Покращений regex для Playerjs file:'[...]'
            let jsonMatch = null;
            const _pjsM = text.match(/Playerjs\s*\(\s*\{[\s\S]*?file\s*:\s*'(\[[\s\S]*?\])'\s*[,\n]/);
            if (_pjsM) { jsonMatch = [null, _pjsM[1]]; }
            if (!jsonMatch) {
                const _fmA = text.match(/file\s*:\s*'(\[[\s\S]+?\])'/i);
                const _fmB = text.match(/file\s*:\s*"(\[[\s\S]+?\])"/i);
                if (_fmA) jsonMatch = [null, _fmA[1]];
                else if (_fmB) jsonMatch = [null, _fmB[1]];
            }
            if (!jsonMatch) {
                jsonMatch = text.match(/playlist\s*:\s*(\[[\s\S]+?\])/i);
            }
            if (jsonMatch) {
                try {
                    let raw = jsonMatch[1].trim();
                    if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) raw = raw
                        .slice(1, -1);
                    if (raw.startsWith('{') && raw.endsWith('}')) raw = `[${raw}]`;
                    const clean = raw.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}');
                    const arr = JSON.parse(clean);
                    const walk = (items, dub, season) => {
                        dub = dub || '';
                        season = season || '1';
                        items.forEach(item => {
                            if (item.folder || item.playlist) {
                                let nd = dub,
                                    ns = season;
                                const ft = item.title || '';
                                const sm = ft.match(/[Сс]езон\s*(\d+)/);
                                if (sm) { ns = sm[1]; if (ft.trim().toLowerCase() !== `сезон ${ns}`.toLowerCase()) nd =
                                        ft.replace(/[Сс]езон\s*\d+/g, '').replace(/\//g, '').trim() || dub; } else if (
                                    ft) nd = ft;
                                walk(item.folder || item.playlist, nd, ns);
                            } else if (item.file) {
                                const epT = item.title || 'Серія';
                                let fd = dub || providerName || 'UA',
                                    fs = season;
                                const esm = epT.match(/[Сс]езон\s*(\d+)/);
                                if (esm) fs = esm[1];
                                const epm = epT.match(/(\d+)\s*[Сс]ері[яіяа]|[Сс]ері[яіяа]\s*(\d+)|[Еe]п\.?\s*(\d+)/);
                                sources.push({ label: epT, file: item.file, provider: providerName, dub: fd.trim(),
                                    season: fs, episode: epm ? (epm[1] || epm[2] || epm[3]) : '1' });
                            }
                        });
                    };
                    if (Array.isArray(arr)) walk(arr);
                    else if (arr.file) sources.push({ label: arr.title || 'Озвучка', file: arr.file,
                        provider: providerName, dub: providerName || 'UA', season: '1', episode: '1' });
                } catch (e) { console.warn('JSON parse error', e); }
            }
            if (sources.length === 0) {
                // Деякі версії плеєра віддають прямий mp4, а не m3u8. Раніше такі
                // джерела губились і на Android виходило «серій немає».
                const urlMatches = [...text.matchAll(/https?:\/\/[^\s\'"<>]+\.(?:m3u8|mp4)(?:\?[^\s\'"<>]*)?/gi)];
                urlMatches.forEach((m, idx) => {
                    const file = m[0].replace(/\\\//g, '/');
                    if (!sources.some(s => s.file === file)) sources.push({ label: `Потік ${idx + 1}`, file,
                        provider: providerName, dub: providerName || 'UA', season: '1', episode: String(idx + 1) });
                });
            }
            // Нормалізуємо дублікати та биті пробіли в URL, які часто приходять
            // з HTML-атрибутів на мобільній версії джерела.
            sources = sources.filter(s => s && typeof s.file === 'string' && /^https?:\/\//i.test(s.file))
                .map(s => ({ ...s, file: s.file.trim().replace(/\\\//g, '/') }))
                .filter((s, i, arr) => arr.findIndex(x => x.file === s.file && x.episode === s.episode && x.dub === s.dub) === i);
            return sources;
        }


        // ====================================================================
        //  ПЛЕЄР — ПОВНИЙ КАСТОМНИЙ ПЛЕЄР З КОНТРОЛЯМИ
        // ====================================================================
        (function injectPlayerStyles() {
            if (document.getElementById('lampa-player-styles')) return;
            const s = document.createElement('style');
            s.id = 'lampa-player-styles';
            s.textContent = `
                .lampa-player-container {
                    width: 100%;
                    aspect-ratio: 16/9;
                    background: #000;
                    position: relative;
                    border-radius: 12px;
                    overflow: hidden;
                    cursor: pointer;
                    user-select: none;
                }
                .lampa-player-container video {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    display: block;
                }
                .lampa-player-container iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                    position: absolute;
                    top: 0; left: 0;
                }
                .lp-spinner {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.45);
                    z-index: 10;
                    pointer-events: none;
                    transition: opacity 0.3s;
                }
                .lp-spinner.hidden { opacity: 0; pointer-events: none; }
                .lp-spinner-ring {
                    width: 48px;
                    height: 48px;
                    border: 4px solid rgba(255,255,255,0.2);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: lp-spin 0.8s linear infinite;
                }
                @keyframes lp-spin { to { transform: rotate(360deg); } }
                .lp-controls {
                    position: absolute;
                    bottom: 0; left: 0; right: 0;
                    padding: 10px 14px 12px;
                    background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
                    z-index: 20;
                    transition: opacity 0.3s;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .lp-controls.hidden { opacity: 0; pointer-events: none; }
                .lp-progress-wrap {
                    width: 100%;
                    height: 4px;
                    background: rgba(255,255,255,0.25);
                    border-radius: 4px;
                    cursor: pointer;
                    position: relative;
                }
                .lp-progress-wrap:hover { height: 6px; }
                .lp-progress-fill {
                    height: 100%;
                    background: #fff;
                    border-radius: 4px;
                    pointer-events: none;
                    transition: width 0.1s linear;
                    position: relative;
                }
                .lp-progress-fill::after {
                    content: '';
                    position: absolute;
                    right: -5px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 12px;
                    height: 12px;
                    background: #fff;
                    border-radius: 50%;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .lp-progress-wrap:hover .lp-progress-fill::after { opacity: 1; }
                .lp-bottom-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .lp-btn {
                    background: none;
                    border: none;
                    color: #fff;
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0.9;
                    transition: opacity 0.15s, transform 0.1s;
                    flex-shrink: 0;
                }
                .lp-btn:hover { opacity: 1; transform: scale(1.1); }
                .lp-btn svg { width: 20px; height: 20px; fill: #fff; }
                .lp-select { background: rgba(20,20,26,.78); color: #fff; border: 1px solid rgba(255,255,255,.22); border-radius: 6px; padding: 4px 5px; font-size: 11px; min-height: 28px; }
                .lp-select:focus { outline: 2px solid rgba(255,255,255,.55); outline-offset: 1px; }
                .lampa-player-container:fullscreen, .lampa-player-container:-webkit-full-screen { width: 100vw; height: 100vh; max-width: none; max-height: none; aspect-ratio: auto; border-radius: 0; }
                .lampa-player-container:fullscreen video, .lampa-player-container:-webkit-full-screen video { object-fit: contain; }
                @media (max-width: 600px) { .lp-select { font-size: 10px; padding-inline: 2px; } .lp-controls { padding: 8px 8px 10px; } }
                .lp-time {
                    font-size: 12px;
                    color: rgba(255,255,255,0.85);
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .lp-spacer { flex: 1; }
                .lp-center-play {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 15;
                    pointer-events: none;
                }
                .lp-center-play-btn {
                    width: 64px;
                    height: 64px;
                    background: rgba(0,0,0,0.55);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transform: scale(0.7);
                    transition: opacity 0.25s, transform 0.25s;
                    backdrop-filter: blur(4px);
                }
                .lp-center-play-btn.show {
                    opacity: 1;
                    transform: scale(1);
                }
                .lp-center-play-btn svg { width: 28px; height: 28px; fill: #fff; }
                .lp-error { position:absolute; inset:0; z-index:20; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:24px; text-align:center; color:#fff; background:rgba(10,10,14,.88); font-size:13px; }
                .lp-error strong { font-size:16px; }
                .lp-error span { max-width:420px; opacity:.78; line-height:1.45; }
            `;
            document.head.appendChild(s);
        })();

        // SVG icons
        const LP_ICONS = {
            play: `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`,
            pause: `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
            volOn: `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
            volOff: `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
            fsEnter: `<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`,
            fsExit: `<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`
        };

        function lpFmtTime(sec) {
            if (!isFinite(sec) || sec < 0) return '0:00';
            const total = Math.floor(sec);
            const h = Math.floor(total / 3600);
            const m = Math.floor((total % 3600) / 60);
            const s = total % 60;
            return h > 0 ? h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') : m + ':' + String(s).padStart(2, '0');
        }

        class LampaPlayer {
            constructor(container, options) {
                this.container = container;
                this.options = options || {};
                this.hls = null;
                this.state = { playing: false, currentTime: 0, duration: 0, volume: 0.8, muted: false, fullscreen: false, loading: true, src: null, speed: 1 };
                this.videoRef = null;
                this.containerRef = null;
                this._controlsTimer = null;
                this._centerTimer = null;
                this._init();
            }

            _init() {
                this.container.innerHTML = '';
                const wrap = document.createElement('div');
                wrap.className = 'lampa-player-container';
                this.containerRef = wrap;

                // Video element
                const v = document.createElement('video');
                v.setAttribute('crossorigin', 'anonymous');
                v.setAttribute('playsinline', '');
                v.controls = false;
                v.preload = 'metadata';
                v.poster = normalizePosterUrl(this.options.poster);
                this.videoRef = v;
                wrap.appendChild(v);

                // Spinner
                const spinner = document.createElement('div');
                spinner.className = 'lp-spinner';
                spinner.innerHTML = '<div class="lp-spinner-ring"></div>';
                this._spinner = spinner;
                wrap.appendChild(spinner);

                // Center play/pause flash
                const centerPlay = document.createElement('div');
                centerPlay.className = 'lp-center-play';
                centerPlay.innerHTML = `<div class="lp-center-play-btn" id="lpCenterBtn">${LP_ICONS.play}</div>`;
                this._centerBtn = centerPlay.querySelector('#lpCenterBtn');
                wrap.appendChild(centerPlay);

                // Controls
                const controls = document.createElement('div');
                controls.className = 'lp-controls';
                const LP_CHEVRON = '<svg class="lp-chevron" viewBox="0 0 24 24" width="10" height="10"><path d="M7 14l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                const LP_CHECK = '<svg class="lp-check" viewBox="0 0 24 24" width="14" height="14"><path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                const lpSpeedOption = (value, label, active) => `<button type="button" class="${active ? 'is-active' : ''}" data-speed="${value}" role="menuitemradio" aria-checked="${active}"><span>${label}</span>${LP_CHECK}</button>`;
                controls.innerHTML = `
                    <div class="lp-progress-wrap" id="lpProgress">
                        <div class="lp-progress-fill" id="lpProgressFill" style="width:0%"></div>
                    </div>
                    <div class="lp-bottom-row">
                        <button class="lp-btn" id="lpPlayBtn" title="Play/Pause">${LP_ICONS.play}</button>
                        <span class="lp-time" id="lpTime">0:00 / 0:00</span>
                        <div class="lp-spacer"></div>
                        <div class="lp-settings-wrap">
                            <div class="lp-menu-wrap">
                                <button class="lp-control-pill" id="lpSpeedBtn" title="Швидкість відтворення" aria-haspopup="true" aria-expanded="false">
                                    <span class="lp-pill-label" id="lpSpeedLabel">1x</span>${LP_CHEVRON}
                                </button>
                                <div class="lp-popover lp-speed-menu" id="lpSpeedMenu" role="menu" aria-hidden="true">
                                    <div class="lp-popover-label">Швидкість</div>
                                    ${lpSpeedOption('0.75', '0.75x', false)}
                                    ${lpSpeedOption('1', '1x', true)}
                                    ${lpSpeedOption('1.25', '1.25x', false)}
                                    ${lpSpeedOption('1.5', '1.5x', false)}
                                    ${lpSpeedOption('2', '2x', false)}
                                </div>
                            </div>
                            <div class="lp-menu-wrap" id="lpQualityWrap">
                                <button class="lp-control-pill lp-quality-pill" id="lpQualityBtn" title="Якість відео" aria-haspopup="true" aria-expanded="false">
                                    <span class="lp-pill-label" id="lpQualityLabel">Авто</span>${LP_CHEVRON}
                                </button>
                                <div class="lp-popover lp-quality-menu" id="lpQualityMenu" role="menu" aria-hidden="true"></div>
                            </div>
                        </div>
                        <button class="lp-btn" id="lpVolBtn" title="Mute">${LP_ICONS.volOn}</button>
                    </div>
                `;
                this._controls = controls;
                wrap.appendChild(controls);

                this.container.appendChild(wrap);
                this._bindEvents();
                this._showControls();
            }

            _bindEvents() {
                const v = this.videoRef;
                const wrap = this.containerRef;

                v.addEventListener('play', () => {
                    this.state.playing = true;
                    this._updatePlayBtn();
                });
                v.addEventListener('pause', () => {
                    this.state.playing = false;
                    this._updatePlayBtn();
                });
                const syncTimeState = () => {
                    this.state.currentTime = Number.isFinite(v.currentTime) ? v.currentTime : 0;
                    this.state.duration = Number.isFinite(v.duration) ? v.duration : 0;
                    this._updateProgress();
                };
                v.addEventListener('loadedmetadata', syncTimeState);
                v.addEventListener('durationchange', syncTimeState);
                v.addEventListener('timeupdate', syncTimeState);
                v.addEventListener('waiting', () => {
                    this.state.loading = true;
                    this._spinner.classList.remove('hidden');
                });
                v.addEventListener('playing', () => {
                    this.state.loading = false;
                    this._spinner.classList.add('hidden');
                    this._clearPlaybackError();
                });
                v.addEventListener('canplay', () => {
                    this.state.loading = false;
                    this._spinner.classList.add('hidden');
                    this._clearPlaybackError();
                });
                v.addEventListener('error', () => {
                    this.state.loading = false;
                    this._spinner.classList.add('hidden');
                });
                v.addEventListener('ended', () => {
                    this.state.playing = false;
                    this._updatePlayBtn();
                });

                // Click on wrap — toggle play, show controls
                wrap.addEventListener('click', e => {
                    if (e.target.closest('.lp-controls')) return;
                    this._flashCenter();
                    this.togglePlay();
                    this._showControls();
                });
                wrap.addEventListener('dblclick', e => {
                    if (e.target.closest('.lp-controls')) return;
                    this.toggleFullscreen();
                });
                wrap.addEventListener('mousemove', () => this._showControls());
                wrap.addEventListener('touchstart', () => this._showControls(), { passive: true });

                // Play button
                const playBtn = wrap.querySelector('#lpPlayBtn');
                if (playBtn) playBtn.addEventListener('click', e => { e.stopPropagation(); this._flashCenter(); this.togglePlay(); });

                // Progress bar seek
                const progress = wrap.querySelector('#lpProgress');
                if (progress) {
                    const seek = e => {
                        const rect = progress.getBoundingClientRect();
                        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        if (v.duration) v.currentTime = pct * v.duration;
                    };
                    let dragging = false;
                    progress.addEventListener('mousedown', e => { dragging = true; seek(e); e.preventDefault(); });
                    document.addEventListener('mousemove', e => { if (dragging) seek(e); });
                    document.addEventListener('mouseup', () => { dragging = false; });
                    progress.addEventListener('touchstart', e => { seek(e.touches[0]); }, { passive: true });
                    progress.addEventListener('touchmove', e => { seek(e.touches[0]); }, { passive: true });
                }

                // Volume — mute/unmute toggle only (no slider)
                const volBtn = wrap.querySelector('#lpVolBtn');
                v.volume = this.state.volume ?? 1;
                if (volBtn) volBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    v.muted = !v.muted;
                    this.state.muted = v.muted;
                    this._updateVolBtn();
                });

                // Playback speed and quality menus — class-based, animated.
                const speedBtn = wrap.querySelector('#lpSpeedBtn');
                const speedMenu = wrap.querySelector('#lpSpeedMenu');
                const speedLabel = wrap.querySelector('#lpSpeedLabel');
                const qualityBtn = wrap.querySelector('#lpQualityBtn');
                const qualityMenu = wrap.querySelector('#lpQualityMenu');
                const qualityLabel = wrap.querySelector('#lpQualityLabel');

                const setMenuOpen = (menu, btn, open) => {
                    if (!menu || !btn) return;
                    menu.classList.toggle('is-open', open);
                    menu.setAttribute('aria-hidden', String(!open));
                    btn.setAttribute('aria-expanded', String(open));
                    btn.classList.toggle('is-open', open);
                };
                const isMenuOpen = (menu) => menu && menu.classList.contains('is-open');
                const closePlayerMenus = () => {
                    setMenuOpen(speedMenu, speedBtn, false);
                    setMenuOpen(qualityMenu, qualityBtn, false);
                };

                if (speedBtn && speedMenu) speedBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    const willOpen = !isMenuOpen(speedMenu);
                    setMenuOpen(qualityMenu, qualityBtn, false);
                    setMenuOpen(speedMenu, speedBtn, willOpen);
                });
                if (qualityBtn && qualityMenu) qualityBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    const willOpen = !isMenuOpen(qualityMenu);
                    setMenuOpen(speedMenu, speedBtn, false);
                    this._refreshQualityMenu();
                    setMenuOpen(qualityMenu, qualityBtn, willOpen);
                });

                speedMenu?.querySelectorAll('[data-speed]').forEach(option => option.addEventListener('click', e => {
                    e.stopPropagation();
                    const rate = Number(option.dataset.speed) || 1;
                    v.playbackRate = rate;
                    this.state.speed = rate;
                    if (speedLabel) speedLabel.textContent = rate + 'x';
                    speedMenu.querySelectorAll('[data-speed]').forEach(o => {
                        const a = Number(o.dataset.speed) === rate;
                        o.classList.toggle('is-active', a);
                        o.setAttribute('aria-checked', String(a));
                    });
                    closePlayerMenus();
                }));
                qualityMenu?.addEventListener('click', e => {
                    const option = e.target.closest('[data-quality-index]');
                    if (!option) return;
                    e.stopPropagation();
                    const idx = Number(option.dataset.qualityIndex);
                    if (this.hls) this.hls.currentLevel = idx;
                    if (qualityLabel) qualityLabel.textContent = option.dataset.qualityLabel || 'Авто';
                    qualityMenu.querySelectorAll('[data-quality-index]').forEach(o => {
                        const a = o === option;
                        o.classList.toggle('is-active', a);
                        o.setAttribute('aria-checked', String(a));
                    });
                    closePlayerMenus();
                });
                document.addEventListener('click', closePlayerMenus);
                this._closePlayerMenus = closePlayerMenus;
                this._refreshQualityMenu();

                // Fullscreen — single button lives in the video topbar (works for both
                // the custom player and iframe-based sources).

                const syncFullscreenState = () => {
                    this.state.fullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
                    const pageFs = document.getElementById('playerFullscreenBtn');
                    if (pageFs) {
                        pageFs.innerHTML = this.state.fullscreen ? LP_ICONS.fsExit : LP_ICONS.fsEnter;
                        pageFs.title = this.state.fullscreen ? 'Вийти з повного екрана' : 'Повний екран';
                        pageFs.setAttribute('aria-label', pageFs.title);
                        pageFs.classList.toggle('is-fullscreen', this.state.fullscreen);
                    }
                };
                document.addEventListener('fullscreenchange', syncFullscreenState);
                document.addEventListener('webkitfullscreenchange', syncFullscreenState);

                // Keyboard
                this._onKeyDown = e => {
                    const modal = document.getElementById('playerPageModal');
                    if (!modal || modal.style.display === 'none' || modal.style.display === '') return;
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                    if (e.code === 'Space') { e.preventDefault(); this._flashCenter(); this.togglePlay(); this._showControls(); }
                    else if (e.code === 'ArrowRight') { e.preventDefault(); if (v.duration) v.currentTime = Math.min(v.duration, v.currentTime + 10); this._showControls(); }
                    else if (e.code === 'ArrowLeft') { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 10); this._showControls(); }
                    else if (e.code === 'KeyF') { e.preventDefault(); this.toggleFullscreen(); }
                    else if (e.code === 'KeyM') { e.preventDefault(); v.muted = !v.muted; this.state.muted = v.muted; this._updateVolBtn(); }
                };
                document.addEventListener('keydown', this._onKeyDown);
            }

            _refreshQualityMenu() {
                const menu = this.containerRef?.querySelector('#lpQualityMenu');
                const labelEl = this.containerRef?.querySelector('#lpQualityLabel');
                if (!menu) return;
                const checkSvg = '<svg class="lp-check" viewBox="0 0 24 24" width="14" height="14"><path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                const mkBtn = (idx, label, active) => `<button type="button" class="${active ? 'is-active' : ''}" data-quality-index="${idx}" data-quality-label="${label}" role="menuitemradio" aria-checked="${active}"><span>${label}</span>${checkSvg}</button>`;
                const levels = this.hls?.levels || [];
                if (!levels.length) {
                    menu.innerHTML = '<div class="lp-popover-label">Якість</div>' + mkBtn(-1, 'Авто', true);
                    if (labelEl) labelEl.textContent = 'Авто';
                    return;
                }
                const unique = [];
                levels.forEach((level, index) => {
                    const label = level.height ? `${level.height}p` : `Рівень ${index + 1}`;
                    if (!unique.some(item => item.label === label)) unique.push({ label, index });
                });
                unique.sort((a, b) => parseInt(b.label) - parseInt(a.label));
                menu.innerHTML = '<div class="lp-popover-label">Якість</div>' +
                    mkBtn(-1, 'Авто', true) +
                    unique.map(item => mkBtn(item.index, item.label, false)).join('');
                if (labelEl) labelEl.textContent = 'Авто';
            }

            _updatePlayBtn() {
                const btn = this.containerRef?.querySelector('#lpPlayBtn');
                if (btn) btn.innerHTML = this.state.playing ? LP_ICONS.pause : LP_ICONS.play;
            }

            _updateVolBtn() {
                const btn = this.containerRef?.querySelector('#lpVolBtn');
                const v = this.videoRef;
                if (btn) btn.innerHTML = (v && (v.muted || v.volume === 0)) ? LP_ICONS.volOff : LP_ICONS.volOn;
            }

            _updateProgress() {
                const fill = this.containerRef?.querySelector('#lpProgressFill');
                const time = this.containerRef?.querySelector('#lpTime');
                const v = this.videoRef;
                if (fill && v && v.duration) {
                    fill.style.width = (v.currentTime / v.duration * 100) + '%';
                }
                if (time && v) {
                    time.textContent = lpFmtTime(v.currentTime) + ' / ' + lpFmtTime(v.duration);
                }
            }

            _showControls() {
                const c = this._controls;
                if (!c) return;
                c.classList.remove('hidden');
                clearTimeout(this._controlsTimer);
                if (this.state.playing) {
                    this._controlsTimer = setTimeout(() => c.classList.add('hidden'), 3000);
                }
            }

            _flashCenter() {
                const btn = this._centerBtn;
                if (!btn) return;
                btn.innerHTML = this.state.playing ? LP_ICONS.pause : LP_ICONS.play;
                btn.classList.add('show');
                clearTimeout(this._centerTimer);
                this._centerTimer = setTimeout(() => btn.classList.remove('show'), 600);
            }

            loadSource(src, animeTitle, episodeTitle) {
                if (isEmbedUrl(src)) {
                    this.container.innerHTML = '';
                    const iframe = document.createElement('iframe');
                    iframe.src = src;
                    iframe.setAttribute('allowfullscreen', '');
                    iframe.setAttribute('allow', 'autoplay; fullscreen');
                    iframe.style.cssText = 'width:100%;height:100%;border:none;position:absolute;top:0;left:0;';
                    const wrap = document.createElement('div');
                    wrap.className = 'lampa-player-container';
                    wrap.style.cssText = 'width:100%;aspect-ratio:16/9;background:#000;position:relative;border-radius:12px;overflow:hidden;';
                    wrap.appendChild(iframe);
                    this.container.appendChild(wrap);
                    this.containerRef = wrap;
                    if (this.hls) { this.hls.destroy(); this.hls = null; }
                    this.videoRef = null;
                    this.state.loading = false;
                    return;
                }

                if (!this.videoRef) this._init();
                // Ensure https
                if (src && src.startsWith('http://')) src = 'https://' + src.slice(7);
                this.state.src = src;
                this._clearPlaybackError();
                const v = this.videoRef;
                this.state.loading = true;
                this.state.playing = false;
                this._spinner.classList.remove('hidden');
                this._updatePlayBtn();

                if (this.hls) { this.hls.destroy(); this.hls = null; }
                v.pause();
                if (!src) { this.state.loading = false; return; }

                const proxyUrl = (typeof getProxyUrl === 'function' && !src.startsWith(PROXY_URL)) ? getProxyUrl(src) : src;
                const isHlsSource = /\.m3u8(?:[?#]|$)/i.test(src);

                const _startHls = () => {
                    const hls = new Hls({
                        enableWorker: false,
                        lowLatencyMode: false,
                        backBufferLength: 90,
                        maxBufferLength: 30,
                        xhrSetup: function(xhr) { xhr.withCredentials = false; }
                    });
                    this.hls = hls;
                    hls.loadSource(proxyUrl);
                    hls.attachMedia(v);
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        this._refreshQualityMenu();
                        this.state.loading = false;
                        this._spinner.classList.add('hidden');
                        v.play().catch(() => {});
                    });
                    hls.on(Hls.Events.ERROR, (ev, ed) => {
                        if (ed && ed.fatal) {
                            console.warn('[HLS fatal]', ed.type, ed.details);
                            hls.destroy(); this.hls = null;
                            this.state.loading = false;
                            this._spinner.classList.add('hidden');
                            v.src = proxyUrl; v.load();
                            v.play().catch(() => {});
                        }
                    });
                    v.addEventListener('error', () => this._showPlaybackError('Потік пошкоджений, заблокований або несумісний із цим пристроєм.'), { once: true });
                };

                if (!isHlsSource) {
                    // MP4 та інші browser-native формати не треба проганяти через HLS.js.
                    v.src = proxyUrl;
                    v.load();
                    v.addEventListener('canplay', () => { this.state.loading = false; this._spinner.classList.add('hidden'); }, { once: true });
                    v.addEventListener('error', () => this._showPlaybackError('Відеофайл не вдалося відкрити на цьому пристрої.'), { once: true });
                    v.play().catch(() => {});
                } else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                    _startHls();
                } else if (v.canPlayType('application/vnd.apple.mpegurl') !== '' || v.canPlayType('audio/mpegurl') !== '') {
                    v.src = proxyUrl; v.load();
                    v.addEventListener('canplay', () => { this.state.loading = false; this._spinner.classList.add('hidden'); }, { once: true });
                    v.play().catch(() => {});
                } else {
                    const sc = document.createElement('script');
                    sc.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js';
                    sc.onload = () => {
                        if (Hls.isSupported()) _startHls();
                        else { v.src = proxyUrl; v.load(); v.play().catch(() => {}); this.state.loading = false; this._spinner.classList.add('hidden'); }
                    };
                    sc.onerror = () => { v.src = proxyUrl; v.load(); this.state.loading = false; this._spinner.classList.add('hidden'); };
                    document.head.appendChild(sc);
                }
            }

            _clearPlaybackError() {
                this.containerRef?.querySelector('.lp-error')?.remove();
            }

            _showPlaybackError(message) {
                this.state.loading = false;
                this._spinner?.classList.add('hidden');
                if (!this.containerRef || this.containerRef.querySelector('.lp-error')) return;
                const error = document.createElement('div');
                error.className = 'lp-error';
                error.innerHTML = `<strong>Не вдалося запустити відео</strong><span>${message}</span>`;
                this.containerRef.appendChild(error);
            }

            togglePlay() {
                if (!this.videoRef) return;
                const v = this.videoRef;
                if (v.paused) v.play().catch(() => {}); else v.pause();
            }

            toggleFullscreen() {
                const target = (this.containerRef && document.body.contains(this.containerRef))
                    ? this.containerRef : this.container;
                if (!target) return;
                if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                    const request = target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen;
                    if (request) Promise.resolve(request.call(target)).catch(() => {});
                    else if (this.videoRef?.webkitEnterFullscreen) this.videoRef.webkitEnterFullscreen();
                } else {
                    if (document.exitFullscreen) document.exitFullscreen();
                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                }
            }

            destroy() {
                clearTimeout(this._controlsTimer);
                if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
                if (this._closePlayerMenus) document.removeEventListener('click', this._closePlayerMenus);
                clearTimeout(this._centerTimer);
                if (this.hls) { this.hls.destroy(); this.hls = null; }
                if (this.videoRef) { this.videoRef.pause(); this.videoRef.removeAttribute('src'); this.videoRef.load(); }
                if (this.container) this.container.innerHTML = '';
                this.videoRef = null;
                this.containerRef = null;
                this._controls = null;
                this._spinner = null;
            }
        }


                // ====================================================================
        //  ГЕРО БАНЕР
        // ====================================================================
        let heroItems = [],
            heroPool = [],
            heroSeenUrls = new Set(),
            heroCurrentIndex = 0,
            heroRotationTimer = null,
            heroJustSwiped = false;

        async function buildHeroBanner() {
            const wrapper = document.getElementById('heroWrapper');
            if (!wrapper) return;

            // Паралельно завантажуємо обидва джерела — не чекаємо одне на одне
            const [topResult, mainResult] = await Promise.allSettled([
                fetchHikkaTop100(),
                fetchHikkaMain(1)
            ]);

            const topAnime = topResult.status === 'fulfilled' ? (topResult.value || []) : [];
            const ordinaryAnime = mainResult.status === 'fulfilled' ? (mainResult.value || []) : [];

            heroPool = [...topAnime, ...ordinaryAnime]
                .filter(item => item?.url && item.images?.jpg?.large_image_url)
                .filter((item, index, list) => list.findIndex(other => other.url === item.url) === index);
            heroSeenUrls = new Set();
            heroItems = takeHeroBatch();

            if (heroItems.length === 0) {
                console.warn('Hero: no items loaded');
                wrapper.style.display = 'none';
                return;
            }
            if (Router.currentRoute !== 'main') {
                wrapper.style.display = 'none';
                return;
            }

            wrapper.style.display = 'block';
            heroCurrentIndex = 0;
            initHeroSwipe();

            // Показуємо перший слайд ОДРАЗУ з тим що є, не чекаємо деталей
            renderHeroSlide(heroItems[0]);
            buildHeroIndicators();
            startHeroRotation();

            // Деталі завантажуємо у фоні — оновимо слайд коли прийдуть
            loadHeroItemDetails(0).then(() => {
                if (heroCurrentIndex === 0) renderHeroSlide(heroItems[0]);
            }).catch(() => {});

            // Preload деталі наступного слайду у фоні
            if (heroItems.length > 1) {
                loadHeroItemDetails(1).catch(() => {});
            }
        }

        function takeHeroBatch() {
            const available = heroPool.filter(item => item?.url && !heroSeenUrls.has(item.url));
            const batch = [...available].sort(() => Math.random() - 0.5).slice(0, 8);
            batch.forEach(item => heroSeenUrls.add(item.url));
            return batch;
        }

        async function loadNextHeroBatch() {
            stopHeroRotation();
            let nextBatch = takeHeroBatch();
            if (nextBatch.length < 8 && heroSeenUrls.size >= heroPool.length) {
                heroSeenUrls = new Set();
                nextBatch = takeHeroBatch();
            }
            if (!nextBatch.length) return;
            heroItems = nextBatch;
            heroCurrentIndex = 0;
            renderHeroSlide(heroItems[0]);
            buildHeroIndicators();
            startHeroRotation();
            loadHeroItemDetails(0).then(() => {
                if (heroCurrentIndex === 0) renderHeroSlide(heroItems[0]);
            }).catch(() => {});
            if (heroItems.length > 1) loadHeroItemDetails(1).catch(() => {});
        }

        async function loadHeroItemDetails(idx) {
            if (idx < 0 || idx >= heroItems.length) return;
            const item = heroItems[idx];
            if (item.detailsLoaded) return;
            // Timeout 6с щоб не зависати якщо сайт відповідає повільно
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000));
            try {
                const detail = await Promise.race([loadHikkaDetail(item.url), timeoutPromise]);
                item.genres = detail.genres || [];
                item.totalEpisodes = detail.totalEpisodes || 0;
                item.synopsis = detail.synopsis || '';
                item.year = detail.year || item.year || '';
                item.detailsLoaded = true;
                item.rating = (7 + Math.random() * 2.5).toFixed(1);
            } catch (e) {
                console.warn('Hero details fallback:', item.title, e.message);
                item.genres = item.genres || ['Аніме'];
                item.totalEpisodes = item.totalEpisodes || 0;
                item.synopsis = item.synopsis || 'Натисніть «Дивитися», щоб перейти до перегляду.';
                item.rating = item.rating || (7 + Math.random() * 2.5).toFixed(1);
                item.detailsLoaded = true;
            }
        }

        function renderHeroSlide(item) {
            const container = document.getElementById('heroSlidesContainer');
            if (!container || !item) return;
            const poster = item.images?.jpg?.large_image_url || '';
            const rawTitle = item.title || 'Без назви';
            const title = rawTitle.length > 38 ? rawTitle.substring(0, 38) + '…' : rawTitle;
            const genres = item.genres || ['Аніме'];
            const rating = item.rating || (7 + Math.random() * 2.5).toFixed(1);
            const year = item.year || '';
            const episodes = item.totalEpisodes || 0;
            const synopsis = item.synopsis || '';

            const metaParts = [];
            if (year) metaParts.push(year);
            if (episodes > 0) metaParts.push(episodes + ' еп.');
            const metaHtml = metaParts.length > 0
                ? `<span class="hero-info-separator">·</span><span class="hero-meta">${metaParts.join(' <span class="hero-meta-dot"></span> ')}</span>`
                : '';

            const heroSynopsis = synopsis.trim().replace(/\s+/g, ' ');
            const synopsisHtml = heroSynopsis
                ? `<div class="hero-slide-desc">${heroSynopsis.substring(0, 170)}${heroSynopsis.length > 170 ? '…' : ''}</div>`
                : '';

            const slide = document.createElement('div');
            slide.className = 'hero-slide active';
            slide.dataset.url = item.url;

            // Fallback poster — якщо зображення не завантажилось
            const safePoster = poster || '';
            const bgStyle = safePoster
                ? `background-image: url('${safePoster}');`
                : 'background: linear-gradient(135deg, #1a1a1a, #2d2d2d);';

            slide.innerHTML = `
                <div class="hero-slide-bg" id="heroBg_${Date.now()}" style="${bgStyle}"></div>
                <div class="hero-slide-overlay"></div>
                <div class="hero-slide-content">
                    <div class="hero-slide-title">${title}</div>
                    ${synopsisHtml}
                    <div class="hero-slide-tags">
                        ${genres.slice(0, 3).map(g => `<span class="hero-tag genre-tag">${g}</span>`).join('')}
                    </div>
                    <div class="hero-info-pill hero-rating-row hero-rating-row--bottom">
                        <span class="hero-rating-badge"><span class="star">★</span> ${rating}</span>
                        ${metaHtml}
                    </div>
                </div>
            `;

            // Preload poster image — якщо не завантажиться, фон лишається градієнтом
            if (safePoster) {
                const img = new Image();
                img.onload = () => {
                    const bg = slide.querySelector('.hero-slide-bg');
                    if (bg) bg.style.backgroundImage = `url('${safePoster}')`;
                };
                img.onerror = () => {
                    const bg = slide.querySelector('.hero-slide-bg');
                    if (bg) bg.style.background = 'linear-gradient(135deg, #1a1a1a, #2d2d2d)';
                };
                img.src = safePoster;
            }

            container.innerHTML = '';
            container.appendChild(slide);

            // Весь слайд клікабельний — відкриває аніме. Свайп (не тап) перемикає слайди, не відкриваючи сторінку.
            slide.addEventListener('click', () => {
                if (heroJustSwiped) { heroJustSwiped = false; return; }
                if (item.url) openPlayerPage(item.url);
            });
        }

        function buildHeroIndicators() {
            const dotsContainer = document.getElementById('heroDots');
            if (!dotsContainer) return;
            dotsContainer.innerHTML = '';
            heroItems.forEach((_, idx) => {
                const dot = document.createElement('div');
                dot.className = 'hero-dot' + (idx === heroCurrentIndex ? ' active' : '');
                dot.addEventListener('click', () => goToSlide(idx));
                dotsContainer.appendChild(dot);
            });
        }

        function updateHeroIndicators() {
            const dots = document.querySelectorAll('.hero-dot');
            dots.forEach((dot, idx) => {
                dot.classList.toggle('active', idx === heroCurrentIndex);
            });
        }

        async function goToSlide(idx) {
            if (idx < 0 || idx >= heroItems.length) return;
            if (idx === heroCurrentIndex) return;
            heroCurrentIndex = idx;
            // Показуємо слайд одразу — не чекаємо деталей
            renderHeroSlide(heroItems[idx]);
            updateHeroIndicators();
            resetHeroTimer();
            // Деталі завантажуємо у фоні — оновимо слайд коли прийдуть
            if (!heroItems[idx].detailsLoaded) {
                loadHeroItemDetails(idx).then(() => {
                    if (heroCurrentIndex === idx) renderHeroSlide(heroItems[idx]);
                }).catch(() => {});
            }
            // Preload наступного слайду
            const nextIdx = (idx + 1) % heroItems.length;
            if (!heroItems[nextIdx].detailsLoaded) {
                loadHeroItemDetails(nextIdx).catch(() => {});
            }
        }

        function nextSlide() {
            if (heroCurrentIndex >= heroItems.length - 1) {
                loadNextHeroBatch().catch(() => {});
                return;
            }
            goToSlide(heroCurrentIndex + 1);
        }

        function prevSlide() {
            goToSlide((heroCurrentIndex - 1 + heroItems.length) % heroItems.length);
        }

        // Гортання пальцем замість стрілок — свайп вліво/вправо перемикає слайди
        function initHeroSwipe() {
            const wrapper = document.getElementById('heroWrapper');
            if (!wrapper || wrapper.dataset.swipeInit) return;
            wrapper.dataset.swipeInit = '1';
            let startX = 0, startY = 0, tracking = false;
            wrapper.addEventListener('touchstart', (e) => {
                if (!e.touches.length) return;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                tracking = true;
            }, { passive: true });
            wrapper.addEventListener('touchend', (e) => {
                if (!tracking || !e.changedTouches.length) return;
                tracking = false;
                const dx = e.changedTouches[0].clientX - startX;
                const dy = e.changedTouches[0].clientY - startY;
                if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
                    heroJustSwiped = true;
                    if (dx < 0) nextSlide(); else prevSlide();
                }
            }, { passive: true });
        }

        let heroProgressInterval = null;
        const HERO_SLIDE_DURATION = 6000;

        function startHeroRotation() {
            stopHeroRotation();
            if (heroItems.length < 2) return;
            const fill = document.getElementById('heroProgressFill');
            let elapsed = 0;
            if (fill) fill.style.width = '0%';
            heroProgressInterval = setInterval(() => {
                elapsed += 50;
                if (fill) fill.style.width = (elapsed / HERO_SLIDE_DURATION * 100) + '%';
            }, 50);
            heroRotationTimer = setTimeout(nextSlide, HERO_SLIDE_DURATION);
        }

        function stopHeroRotation() {
            if (heroRotationTimer) { clearTimeout(heroRotationTimer); heroRotationTimer = null; }
            if (heroProgressInterval) { clearInterval(heroProgressInterval); heroProgressInterval = null; }
            const fill = document.getElementById('heroProgressFill');
            if (fill) fill.style.width = '0%';
        }

        function resetHeroTimer() {
            stopHeroRotation();
            startHeroRotation();
        }


        // --- Anime Specific Comments Logic ---
        function _timeAgoUk(ts) {
            if (!ts) return 'щойно';
            const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
            if (diffSec < 60) return 'щойно';
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin} хв тому`;
            const diffH = Math.floor(diffMin / 60);
            if (diffH < 24) return `${diffH} год тому`;
            const diffD = Math.floor(diffH / 24);
            return `${diffD} дн тому`;
        }

        // Гарантує анонімну Firebase-сесію для гостей, щоб читання Firestore
        // (рейтинги/відгуки) не впиралось у permission-denied без входу.
        async function ensureFirebaseGuestAuth() {
            try {
                if (!auth) return false;
                if ((Auth.isAuthenticated && Auth.isAuthenticated()) || auth.currentUser) return true;
                await signInAnonymously(auth);
                return true;
            } catch (e) {
                console.warn('Anonymous guest auth failed:', e.code || e);
                return false;
            }
        }

        // Initialize Lucide icons if not already done
        if (window.lucide) {
            lucide.createIcons();
        }



        // ====================================================================
        //  ГОДИННИК
        // ====================================================================
        let clockTimer = null;

        function updateClock() {
            const clock = document.getElementById('agnativeTopnavClock');
            if (!clock) return;
            const d = new Date();
            clock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        }

        function startClock() {
            updateClock();
            if (clockTimer) return;
            clockTimer = setInterval(updateClock, 20000);
        }

        // ====================================================================
        //  ЛІВЕ МЕНЮ
        // ====================================================================
        const leftdock = null; // removed
        const leftdockOverlay = null; // removed


        function toggleLeftdock(force) {
            Router.goTo('genres');
        }

        function showLeftdock() {}

        function hideLeftdock() {}
        /* leftdock removed */

        function iconCircleLetter(label) {
            const letter = (label || '?').trim().charAt(0).toUpperCase();
            return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><text x="12" y="17" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" stroke="none">${letter}</text></svg>`;
        }

        function iconHomeSvg() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11l2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6"/></svg>`; }

        function iconProfileSvg() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`; }

        function iconSettingsSvg() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`; }

        function loadGenres() { return Object.entries(GENRE_MAP).map(([name, slug]) => ({ slug, name })).sort((a, b) => a.name
                .localeCompare(b.name, 'uk')); }

        async function buildLeftdock() {
            const inner = document.getElementById('leftdockInner');
            if (!inner) return;
            let html = '';
            html += `<div class="agnative-leftdock__case">`;
            html += `
`;
            html += `</div><div class="agnative-leftdock__split"></div><div class="agnative-leftdock__case">`;
            try {
                const genres = loadGenres();
                genres.forEach(g => {
                    html += `
                  <div class="agnative-leftdock__item selector genre-item-dock" data-action="genre-${g.slug}" data-selector="true" tabindex="0" data-genre="${g.slug}" data-name="${g.name}">
                    <div class="menu__ico">${iconCircleLetter(g.name.charAt(0))}</div><div class="menu__text">${g.name}</div>
                  </div>`;
                });
            } catch (e) { console.warn('Помилка рендеру жанрів у меню:', e); }
            html += `</div><div class="agnative-leftdock__split"></div><div class="agnative-leftdock__case">`;
            html += `
            <div class="agnative-leftdock__item selector" data-action="settings" data-selector="true" tabindex="0">
              <div class="menu__ico">${iconSettingsSvg()}</div><div class="menu__text">Налаштування</div>
            </div>`;
            html += `</div>`;
            inner.innerHTML = html;
            inner.querySelectorAll('.agnative-leftdock__item.selector').forEach(btn => {
                const action = btn.dataset.action;
                btn.addEventListener('click', () => {
                    handleLeftdockAction(action);
                    hideLeftdock(true);
                });
                btn.addEventListener('keydown', e => { if (e.key === 'Enter') { handleLeftdockAction(action);
                        hideLeftdock(true); } });
            });
            syncLeftdockActive();
        }

        function handleLeftdockAction(action) {
            if (!action) return;
            if (action === 'profile') {
                Router.goTo('profile');
            } else if (action === 'main') {
                Router.goTo('main');
            } else if (action.startsWith('genre-')) {
                const slug = action.replace('genre-', '');
                const name = loadGenres().find(g => g.slug === slug)?.name || slug;
                Router.goTo('genre', { slug, name });
            } else if (action === 'settings') {
                Router.goTo('settings');
            }
        }

        function syncLeftdockActive() {}

        // ====================================================================
        //  РОУТЕР
        // ====================================================================
        const Router = {
            currentRoute: 'main',
            params: {},

            init() {
                window.addEventListener('hashchange', () => this.handleRoute());
                this.handleRoute();
            },

            handleRoute() {
                const hash = window.location.hash.slice(1) || 'main';
                const parts = hash.split('?');
                const route = parts[0];
                const query = parts[1] || '';
                const params = Object.fromEntries(new URLSearchParams(query));
                this.currentRoute = route;
                this.params = params;
                this.navigate(route, params);
            },

            navigate(route, params) {
                document.getElementById('genreSectionsContainer').style.display = 'none';
                document.getElementById('animeContainer').style.display = 'none';
                document.getElementById('paginationRow').innerHTML = '';
                document.getElementById('profilePageContainer').classList.remove('active');
                document.getElementById('profilePageContainer').style.display = 'none';
                document.getElementById('genrePageContainer').classList.remove('active');
                document.getElementById('genrePageContainer').style.display = 'none';
                document.getElementById('searchPageContainer').classList.remove('active');
                document.getElementById('searchPageContainer').style.display = 'none';
                document.getElementById('settingsPageContainer').classList.remove('active');
                document.getElementById('settingsPageContainer').style.display = 'none';
                document.getElementById('ratingPageContainer').classList.remove('active');
                document.getElementById('ratingPageContainer').style.display = 'none';
                document.getElementById('genresPageContainer').classList.remove('active');
                document.getElementById('genresPageContainer').style.display = 'none';
                document.getElementById('schedulePageContainer').classList.remove('active');
                document.getElementById('schedulePageContainer').style.display = 'none';
                document.getElementById('stickersPageContainer').classList.remove('active');
                document.getElementById('stickersPageContainer').style.display = 'none';

                const hero = document.getElementById('heroWrapper');
                const actions = document.getElementById('actionsRow');
                const logo = document.querySelector('.logo');
                const searchBtn = document.querySelector('.search-circle-btn');

                if (route === 'main') {
                    hero.style.display = 'block';
                    actions.style.display = 'flex';
                    if (logo) logo.style.display = 'flex';
                    if (searchBtn) searchBtn.style.display = 'flex';
                } else {
                    hero.style.display = 'none';
                    actions.style.display = 'none';
                    if (logo) logo.style.display = 'none';
                    if (searchBtn) searchBtn.style.display = 'none';
                }

                document.querySelectorAll('.agnative-leftdock__item.selector').forEach(el => el.classList.remove(
                'is-active'));

                if (route === 'main') {
                    document.querySelector('.agnative-leftdock__item.selector[data-action="main"]')?.classList.add(
                        'is-active');
                    this.showMain();
                } else if (route === 'profile') {
                    document.querySelector('.agnative-leftdock__item.selector[data-action="profile"]')?.classList.add(
                        'is-active');
                    this.showProfile();
                } else if (route === 'genre') {
                    const slug = params.slug || '';
                    const name = params.name || slug;
                    document.querySelector(`.agnative-leftdock__item.selector[data-action="genre-${slug}"]`)?.classList
                        .add('is-active');
                    this.showGenre(slug, name);
                } else if (route === 'search') {
                    document.querySelector('.agnative-leftdock__item.selector[data-action="main"]')?.classList.add(
                        'is-active');
                    this.showSearch();
                } else if (route === 'settings') {
                    document.querySelector('.agnative-leftdock__item.selector[data-action="settings"]')?.classList.add(
                        'is-active');
                    this.showSettings(params.tab);
                } else if (route === 'genres') {
                    this.showGenres();
                } else if (route === 'rating') {
                    this.showRating();
                } else if (route === 'schedule') {
                    this.showSchedule();
                } else if (route === 'stickers') {
                    this.showStickers();
                } else if (route.startsWith('anime/')) {
                    // Deep-link для Telegram: #anime/<Hikka ID>.
                    // Використовуємо той самий openPlayerPage(), що й звичайні картки.
                    this.showMain();
                    const animeIdMatch = route.match(/^anime\/([A-Za-z0-9][A-Za-z0-9-]{1,180})$/);
                    if (animeIdMatch) {
                        const animeUrl = `${HIKKA_API}/anime/${animeIdMatch[1]}`;
                        setTimeout(() => openPlayerPage(animeUrl, { fromDeepLink: true }), 150);
                    } else {
                        setTimeout(() => {
                            this.goTo('main');
                            showToast('Аніме не знайдено');
                        }, 0);
                    }
                } else if (route === 'filter') {
                    this.showFilter();
                } else {
                    window.location.hash = 'main';
                }
            },

            showMain() {
                document.getElementById('genreSectionsContainer').style.display = 'flex';
                document.getElementById('animeContainer').style.display = 'none';
                document.getElementById('paginationRow').innerHTML = '';
                if (!document.getElementById('genreSectionsContainer').hasChildNodes() ||
                    document.getElementById('genreSectionsContainer').querySelector('.loader')) {
                    loadAndDisplayGenreSections();
                }
                currentTab = 'main';
                currentSearchQuery = '';
                currentCategory = '';
                currentPage = 1;
                document.querySelectorAll('.action-pill').forEach(p => p.classList.remove('active-pill'));
                const si = document.getElementById('searchPageInput');
                if (si) si.value = '';
                const cb = document.getElementById('searchPageClearBtn');
                if (cb) cb.classList.remove('visible');
                document.getElementById('animeContainer').style.display = 'none';
                document.getElementById('paginationRow').innerHTML = '';
                syncLeftdockActive();
            },

            showProfile() {
                const container = document.getElementById('profilePageContainer');
                container.style.display = 'block';
                container.classList.add('active');
                if (!Auth._authResolved) {
                    // Firebase ще не перевірив сесію — показуємо заглушку
                    container.innerHTML = '<div class="loader" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:50vh;gap:1rem;"><i class="fas fa-spinner fa-pulse" style="font-size:2rem;"></i><p>Перевірка сесії...</p></div>';
                    // Fallback: якщо Firebase не відповів за 3 секунди — показуємо сторінку
                    setTimeout(() => {
                        if (!Auth._authResolved && Router.currentRoute === 'profile') {
                            Auth._authResolved = true;
                            if (Auth.isAuthenticated() || Auth.isGuest()) {
                                renderProfilePage();
                            } else {
                                renderAuthPage();
                            }
                        }
                    }, 1500);
                } else if (Auth.isAuthenticated() || Auth.isGuest()) {
                    renderProfilePage();
                } else {
                    renderAuthPage();
                }
                syncLeftdockActive();
            },

            showGenre(slug, name) {
                const container = document.getElementById('genrePageContainer');
                container.style.display = 'block';
                container.classList.add('active');
                renderGenrePage(slug, name);
            },

            showGenres() {
                const container = document.getElementById('genresPageContainer');
                container.style.display = 'block';
                container.classList.add('active');
                renderGenresPage();
            },

            showSchedule() {
                const container = document.getElementById('schedulePageContainer');
                container.style.display = 'block';
                container.classList.add('active');
                renderSchedulePage();
            },
            showStickers() {
                const container = document.getElementById('stickersPageContainer');
                if (container) {
                    container.style.display = 'block';
                    container.classList.add('active');
                }
                renderStickersPage();
                syncLeftdockActive();
            },

            showFilter() {
                const container = document.getElementById('genrePageContainer');
                container.style.display = 'block';
                container.classList.add('active');
                renderFilterPage();
            },

            showSearch() {
                const container = document.getElementById('searchPageContainer');
                if (container) {
                    container.style.display = 'block';
                    container.classList.add('active');
                }
                renderSearchPage();
            },

            showSettings(tab) {
                const container = document.getElementById('settingsPageContainer');
                if (container) {
                    container.style.display = 'block';
                    container.classList.add('active');
                }
                renderSettingsPage(tab);
            },

            showRating() {
                const container = document.getElementById('ratingPageContainer');
                if (container) {
                    container.style.display = 'block';
                    container.classList.add('active');
                }
                initRatingPage();
            },

            goTo(route, params = {}) {
                const query = new URLSearchParams(params).toString();
                window.location.hash = query ? route + '?' + query : route;
            }
        };

        // === Rating list ===
        let ratingLoaded = false;

        // ====================================================================
        //  XP / LEVEL SYSTEM
        // ====================================================================
        function _getDailyXPBonus() {
            try { return parseInt(localStorage.getItem('vakdab_daily_xp_total') || '0', 10) || 0; }
            catch { return 0; }
        }
        function _addDailyXPBonus(amount) {
            const cur = _getDailyXPBonus();
            const next = cur + amount;
            try { localStorage.setItem('vakdab_daily_xp_total', String(next)); } catch {}
            return next;
        }
        const XP_RULES = Object.freeze({ episode: 25, minute: 1, bookmark: 15, achievement: 75 });
        function calculateBaseXP({ episodes = 0, watchSeconds = 0, bookmarks = 0, posts = 0, ratings = 0 } = {}) {
            const safeEpisodes = Math.max(0, Math.floor(Number(episodes) || 0));
            const watchMinutes = Math.max(0, Math.floor((Number(watchSeconds) || 0) / 60));
            const safeBookmarks = Math.max(0, Math.floor(Number(bookmarks) || 0));
            const safePosts = Math.max(0, Math.floor(Number(posts) || 0));
            const safeRatings = Math.max(0, Math.floor(Number(ratings) || 0));
            const baseXP = safeEpisodes * XP_RULES.episode + watchMinutes * XP_RULES.minute + safeBookmarks * XP_RULES.bookmark;
            let totalXP = baseXP;
            for (let pass = 0; pass < ACHIEVEMENTS.length + 2; pass++) {
                const achStats = { episodes: safeEpisodes, watchMinutes, bookmarks: safeBookmarks, xp: totalXP, level: getLevel(totalXP), posts: safePosts, ratings: safeRatings };
                const earnedCount = ACHIEVEMENTS.filter(a => achStats[a.field] >= a.need).length;
                const nextXP = baseXP + earnedCount * XP_RULES.achievement;
                if (nextXP === totalXP) break;
                totalXP = nextXP;
            }
            return totalXP;
        }
        function calcTotalXP() {
            const history = Storage.getHistory() || [];
            const bookmarks = Storage.getBookmarks() || [];
            return calculateBaseXP({ episodes: history.length, watchSeconds: Storage.getWatchTime() || 0, bookmarks: bookmarks.length, posts: DailyStats.getTotalPosts(), ratings: DailyStats.getTotalRatings() }) + _getDailyXPBonus();
        }
        function getLevel(xp) {
            return Math.floor(Math.sqrt(xp / 50)) + 1;
        }
        function getXPForLevel(level) {
            return Math.pow(level - 1, 2) * 50;
        }
        function getXPProgress(xp) {
            const level = getLevel(xp);
            const currentLevelXP = getXPForLevel(level);
            const nextLevelXP = getXPForLevel(level + 1);
            const into = xp - currentLevelXP;
            const needed = nextLevelXP - currentLevelXP;
            return { level, pct: needed > 0 ? Math.min(100, Math.round(into / needed * 100)) : 100, into, needed };
        }

        const DAILY_TASK_POOL = [
            { id: 'dt1', field: 'episodesToday', target: 1, xp: 35, desc: 'Перегляньте 1 серію сьогодні' },
            { id: 'dt2', field: 'episodesToday', target: 2, xp: 50, desc: 'Подивіться 2 серії за день' },
            { id: 'dt3', field: 'episodesToday', target: 3, xp: 65, desc: 'Перегляньте 3 серії аніме' },
            { id: 'dt4', field: 'episodesToday', target: 4, xp: 80, desc: 'Марафон: 4 серії' },
            { id: 'dt5', field: 'episodesToday', target: 5, xp: 95, desc: 'Погляньте 5 серій' },
            { id: 'dt6', field: 'episodesToday', target: 6, xp: 110, desc: 'Продовжте перегляд: 6 серії' },
            { id: 'dt7', field: 'episodesToday', target: 7, xp: 125, desc: 'Наздожени тиждень: 7 серій' },
            { id: 'dt8', field: 'episodesToday', target: 8, xp: 140, desc: 'Занурся в аніме: 8 серій' },
            { id: 'dt9', field: 'episodesToday', target: 10, xp: 170, desc: 'Подвійна серія: 10 серії' },
            { id: 'dt10', field: 'episodesToday', target: 12, xp: 200, desc: 'Марафонець: 12 серій' },
            { id: 'dt11', field: 'episodesToday', target: 15, xp: 245, desc: 'Легенда дня: 15 серій' },
            { id: 'dt12', field: 'minutesToday', target: 10, xp: 23, desc: 'Дивіться аніме 10 хвилин' },
            { id: 'dt13', field: 'minutesToday', target: 15, xp: 27, desc: 'Проведіть за переглядом 15 хв' },
            { id: 'dt14', field: 'minutesToday', target: 20, xp: 31, desc: 'Насолоджуйтесь переглядом 20 хвилин' },
            { id: 'dt15', field: 'minutesToday', target: 30, xp: 39, desc: 'Півгодини аніме: 30 хв' },
            { id: 'dt16', field: 'minutesToday', target: 45, xp: 51, desc: 'Занурся на 45 хвилин' },
            { id: 'dt17', field: 'minutesToday', target: 60, xp: 63, desc: 'Годинка аніме: 60 хвилин' },
            { id: 'dt18', field: 'minutesToday', target: 75, xp: 75, desc: 'Довгий перегляд: 75 хвилин' },
            { id: 'dt19', field: 'minutesToday', target: 90, xp: 87, desc: 'Вечір аніме: 90 хвилин' },
            { id: 'dt20', field: 'minutesToday', target: 120, xp: 111, desc: 'Марафон часу: 120 хвилин' },
            { id: 'dt21', field: 'minutesToday', target: 150, xp: 135, desc: 'Справжній фанат: 150 хвилин' },
            { id: 'dt22', field: 'minutesToday', target: 180, xp: 159, desc: 'Аніме-день: 180 хвилин' },
            { id: 'dt23', field: 'bookmarksToday', target: 1, xp: 25, desc: 'Додайте 1 аніме в закладки' },
            { id: 'dt24', field: 'bookmarksToday', target: 2, xp: 35, desc: 'Збережіть 2 тайтли на потім' },
            { id: 'dt25', field: 'bookmarksToday', target: 3, xp: 45, desc: 'Поповніть закладки: 3 аніме' },
            { id: 'dt26', field: 'bookmarksToday', target: 4, xp: 55, desc: 'Знайдіть і збережіть 4 аніме' },
            { id: 'dt27', field: 'bookmarksToday', target: 5, xp: 65, desc: 'Складіть список: 5 закладок' },
            { id: 'dt28', field: 'bookmarksToday', target: 6, xp: 75, desc: 'Розширте бібліотеку: 6 закладок' },
            { id: 'dt29', field: 'bookmarksToday', target: 8, xp: 95, desc: 'Плануй перегляд: 8 закладок' },
            { id: 'dt30', field: 'bookmarksToday', target: 10, xp: 115, desc: 'Колекціонер: 10 закладок' },
            { id: 'dt31', field: 'postsToday', target: 1, xp: 32, desc: 'Напишіть 1 повідомлення в спільноті' },
            { id: 'dt32', field: 'postsToday', target: 2, xp: 44, desc: 'Поділіться думкою 2 раз(и)' },
            { id: 'dt33', field: 'postsToday', target: 3, xp: 56, desc: 'Будьте активні: 3 пост(и)' },
            { id: 'dt34', field: 'postsToday', target: 4, xp: 68, desc: 'Спілкуйтесь: 4 повідомлення' },
            { id: 'dt35', field: 'postsToday', target: 5, xp: 80, desc: 'Розкажіть про аніме: 5 пост(и)' },
            { id: 'dt36', field: 'postsToday', target: 6, xp: 92, desc: 'Станьте частиною спільноти: 6 пост(и)' },
            { id: 'dt37', field: 'postsToday', target: 8, xp: 116, desc: 'Голос спільноти: 8 повідомлення' },
            { id: 'dt38', field: 'postsToday', target: 10, xp: 140, desc: 'Активіст дня: 10 пост(и)' },
            { id: 'dt39', field: 'likesToday', target: 1, xp: 20, desc: 'Оцініть 1 аніме' },
            { id: 'dt40', field: 'likesToday', target: 2, xp: 28, desc: 'Постав лайк 2 тайтлам' },
            { id: 'dt41', field: 'likesToday', target: 3, xp: 36, desc: 'Поділись враженням: 3 оцінки' },
            { id: 'dt42', field: 'likesToday', target: 4, xp: 44, desc: 'Оціни перегляди: 4 аніме' },
            { id: 'dt43', field: 'likesToday', target: 5, xp: 52, desc: 'Критик дня: 5 оцінки' },
            { id: 'dt44', field: 'likesToday', target: 6, xp: 60, desc: 'Твоя думка важлива: 6 оцінки' },
            { id: 'dt45', field: 'likesToday', target: 8, xp: 76, desc: 'Рейтинг спільноти: 8 оцінки' },
            { id: 'dt46', field: 'likesToday', target: 10, xp: 92, desc: 'Знавець аніме: 10 оцінок' },
            { id: 'dt47', field: 'searchesToday', target: 1, xp: 17, desc: 'Знайдіть 1 аніме через пошук' },
            { id: 'dt48', field: 'searchesToday', target: 2, xp: 24, desc: 'Скористайтесь пошуком 2 раз(и)' },
            { id: 'dt49', field: 'searchesToday', target: 3, xp: 31, desc: 'Досліджуй каталог: 3 пошуки' },
            { id: 'dt50', field: 'searchesToday', target: 4, xp: 38, desc: 'Шукай нове: 4 запити' },
            { id: 'dt51', field: 'searchesToday', target: 5, xp: 45, desc: 'Знайди перлину: 5 пошуки' },
            { id: 'dt52', field: 'searchesToday', target: 6, xp: 52, desc: 'Розширюй горизонти: 6 пошуків' },
            { id: 'dt53', field: 'searchesToday', target: 8, xp: 66, desc: 'Дослідник дня: 8 пошуків' },
            { id: 'dt54', field: 'searchesToday', target: 10, xp: 80, desc: 'Мисливець за аніме: 10 пошуків' },
            { id: 'dt55', field: 'uniqueAnimeToday', target: 1, xp: 32, desc: 'Відкрийте 1 різних аніме' },
            { id: 'dt56', field: 'uniqueAnimeToday', target: 2, xp: 44, desc: 'Погляньте на 2 нових тайтли' },
            { id: 'dt57', field: 'uniqueAnimeToday', target: 3, xp: 56, desc: 'Дослідіть 3 різних аніме' },
            { id: 'dt58', field: 'uniqueAnimeToday', target: 4, xp: 68, desc: 'Спробуйте 4 нові тайтли' },
            { id: 'dt59', field: 'uniqueAnimeToday', target: 5, xp: 80, desc: 'Розширте кругозір: 5 аніме' },
            { id: 'dt60', field: 'uniqueAnimeToday', target: 6, xp: 92, desc: 'Різноманітність: 6 тайтли' },
            { id: 'dt61', field: 'uniqueAnimeToday', target: 8, xp: 116, desc: 'Гурман аніме: 8 тайтлів' },
            { id: 'dt62', field: 'uniqueAnimeToday', target: 10, xp: 140, desc: 'Колекція вражень: 10 тайтлів' },
            { id: 'dt63', field: 'uniqueAnimeToday', target: 15, xp: 200, desc: 'Всеїдний глядач: 15 тайтлів' },
            { id: 'dt64', field: 'loginToday', target: 1, xp: 10, desc: 'Заходь у застосунок сьогодні' },
            { id: 'dt65', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії' },
            { id: 'dt66', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій' },
            { id: 'dt67', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин' },
            { id: 'dt68', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв' },
            { id: 'dt69', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок' },
            { id: 'dt70', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень' },
            { id: 'dt71', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок' },
            { id: 'dt72', field: 'searchesToday', target: 12, xp: 100, desc: 'Головний дослідник: 12 пошуків' },
            { id: 'dt73', field: 'uniqueAnimeToday', target: 20, xp: 280, desc: 'Енциклопедист аніме: 20 тайтлів' },
            { id: 'dt74', field: 'episodesToday', target: 2, xp: 40, desc: 'Розігрів: 2 серії' },
            { id: 'dt75', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії #2' },
            { id: 'dt76', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій #2' },
            { id: 'dt77', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин #2' },
            { id: 'dt78', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв #2' },
            { id: 'dt79', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок #2' },
            { id: 'dt80', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень #2' },
            { id: 'dt81', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок #2' },
            { id: 'dt82', field: 'searchesToday', target: 12, xp: 100, desc: 'Головний дослідник: 12 пошуків #2' },
            { id: 'dt83', field: 'uniqueAnimeToday', target: 20, xp: 280, desc: 'Енциклопедист аніме: 20 тайтлів #2' },
            { id: 'dt84', field: 'episodesToday', target: 2, xp: 40, desc: 'Розігрів: 2 серії #2' },
            { id: 'dt85', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії #3' },
            { id: 'dt86', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій #3' },
            { id: 'dt87', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин #3' },
            { id: 'dt88', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв #3' },
            { id: 'dt89', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок #3' },
            { id: 'dt90', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень #3' },
            { id: 'dt91', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок #3' },
            { id: 'dt92', field: 'searchesToday', target: 12, xp: 100, desc: 'Головний дослідник: 12 пошуків #3' },
            { id: 'dt93', field: 'uniqueAnimeToday', target: 20, xp: 280, desc: 'Енциклопедист аніме: 20 тайтлів #3' },
            { id: 'dt94', field: 'episodesToday', target: 2, xp: 40, desc: 'Розігрів: 2 серії #3' },
            { id: 'dt95', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії #4' },
            { id: 'dt96', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій #4' },
            { id: 'dt97', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин #4' },
            { id: 'dt98', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв #4' },
            { id: 'dt99', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок #4' },
            { id: 'dt100', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень #4' },
            { id: 'dt101', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок #4' },
        ];

        // ====================================================================
        //  DAILY STATS / TASKS TRACKING
        // ====================================================================
        function _todayStr() {
            const d = new Date();
            return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
        }
        function _loadDailyState() {
            let st;
            try { st = JSON.parse(localStorage.getItem('vakdab_daily_state') || 'null'); } catch { st = null; }
            const today = _todayStr();
            if (!st || st.date !== today) {
                // Новий день — новий випадковий набір з 10 завдань, стата обнуляється
                const pool = [...DAILY_TASK_POOL];
                for (let i = pool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [pool[i], pool[j]] = [pool[j], pool[i]];
                }
                st = {
                    date: today,
                    taskIds: pool.slice(0, 10).map(t => t.id),
                    stats: { episodesToday: 0, minutesToday: 0, bookmarksToday: 0, postsToday: 0, likesToday: 0, searchesToday: 0, uniqueAnime: [] },
                    completed: []
                };
                localStorage.setItem('vakdab_daily_state', JSON.stringify(st));
            }
            return st;
        }
        function _saveDailyState(st) {
            localStorage.setItem('vakdab_daily_state', JSON.stringify(st));
        }
        function _getTotalCounter(key) {
            try { return parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch { return 0; }
        }
        function _incTotalCounter(key, by = 1) {
            const v = _getTotalCounter(key) + by;
            try { localStorage.setItem(key, String(v)); } catch {}
            return v;
        }
        const DailyStats = {
            increment(field, amount = 1) {
                const st = _loadDailyState();
                st.stats[field] = (st.stats[field] || 0) + amount;
                _saveDailyState(st);
                this._checkCompletion(st);
            },
            addUniqueAnime(animeUrl) {
                if (!animeUrl) return;
                const st = _loadDailyState();
                if (!Array.isArray(st.stats.uniqueAnime)) st.stats.uniqueAnime = [];
                if (!st.stats.uniqueAnime.includes(animeUrl)) st.stats.uniqueAnime.push(animeUrl);
                st.stats.uniqueAnimeToday = st.stats.uniqueAnime.length;
                _saveDailyState(st);
                this._checkCompletion(st);
            },
            getTotalPosts() { return _getTotalCounter('vakdab_total_posts'); },
            addTotalPost() { return _incTotalCounter('vakdab_total_posts'); },
            getTotalRatings() { return _getTotalCounter('vakdab_total_ratings'); },
            addTotalRating() { return _incTotalCounter('vakdab_total_ratings'); },
            _checkCompletion(st) {
                let earned = 0, xpGain = 0;
                DAILY_TASK_POOL.forEach(t => {
                    if (!st.taskIds.includes(t.id)) return;
                    if (st.completed.includes(t.id)) return;
                    const val = st.stats[t.field] || 0;
                    if (val >= t.target) {
                        st.completed.push(t.id);
                        xpGain += t.xp;
                        earned++;
                    }
                });
                if (earned > 0) {
                    _saveDailyState(st);
                    _addDailyXPBonus(xpGain);
                    if (Auth.isAuthenticated()) Auth.syncUserData().catch(() => {});
                    showToast(`Завдання виконано! +${xpGain} XP`);
                    if (document.getElementById('rgDailyTasks')) _renderDailyTasks();
                    if (Router.currentRoute === 'rating') loadMyStats();
                }
            }
        };

        function _renderDailyTasks() {
            const el = document.getElementById('rgDailyTasks');
            if (!el) return;
            const st = _loadDailyState();
            const tasks = DAILY_TASK_POOL.filter(t => st.taskIds.includes(t.id));
            const rows = tasks.map(t => {
                const val  = st.stats[t.field] || 0;
                const done = st.completed.includes(t.id);
                const pct  = Math.min(100, Math.round((val / t.target) * 100));
                return `<div class="dt-item ${done ? 'done' : ''}">
                    <div class="dt-check">${done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>
                    <div class="dt-body">
                        <div class="dt-desc">${t.desc}</div>
                        <div class="dt-bar-wrap"><div class="dt-bar" style="width:${pct}%"></div></div>
                        <div class="dt-meta"><span>${Math.min(val, t.target)}/${t.target}</span><span class="dt-xp">+${t.xp} XP</span></div>
                    </div>
                </div>`;
            }).join('');
            const doneCount = tasks.filter(t => st.completed.includes(t.id)).length;
            el.innerHTML = `
                <div class="rg-daily-wrap">
                    <div class="rg-daily-header">
                        <span>Щоденні завдання</span>
                        <span class="rg-daily-count">${doneCount}/${tasks.length}</span>
                    </div>
                    <div class="dt-list">${rows}</div>
                </div>`;
        }

        const ACHIEVEMENTS = [
            { id: 'ep1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Перший перегляд', req: '1 сер.', need: 1, field: 'episodes' },
            { id: 'ep5', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Розігрів', req: '5 сер.', need: 5, field: 'episodes' },
            { id: 'ep10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: '10 серій', req: '10 сер.', need: 10, field: 'episodes' },
            { id: 'ep25', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Уже втягнувся', req: '25 сер.', need: 25, field: 'episodes' },
            { id: 'ep50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: '50 серій', req: '50 сер.', need: 50, field: 'episodes' },
            { id: 'ep100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: '100 серій', req: '100 сер.', need: 100, field: 'episodes' },
            { id: 'ep250', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Справжній фанат', req: '250 сер.', need: 250, field: 'episodes' },
            { id: 'ep500', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: '500 серій', req: '500 сер.', need: 500, field: 'episodes' },
            { id: 'ep1000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Легенда серій', req: '1000 сер.', need: 1000, field: 'episodes' },
            { id: 'ep2000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Аніме-безсмертний', req: '2000 сер.', need: 2000, field: 'episodes' },
            { id: 'h1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: 'Перша хвилина', req: '1 хв', need: 1, field: 'watchMinutes' },
            { id: 'h5', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '5 хвилин', req: '5 хв', need: 5, field: 'watchMinutes' },
            { id: 'h10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '10 хвилин', req: '10 хв', need: 10, field: 'watchMinutes' },
            { id: 'h24', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '24 хвилини', req: '24 хв', need: 24, field: 'watchMinutes' },
            { id: 'h50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '50 хвилин', req: '50 хв', need: 50, field: 'watchMinutes' },
            { id: 'h100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '100 хвилин', req: '100 хв', need: 100, field: 'watchMinutes' },
            { id: 'h200', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '200 хвилин', req: '200 хв', need: 200, field: 'watchMinutes' },
            { id: 'h500', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '500 хвилин', req: '500 хв', need: 500, field: 'watchMinutes' },
            { id: 'h1000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '1000 хвилин', req: '1000 хв', need: 1000, field: 'watchMinutes' },
            { id: 'h2000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: 'Володар часу', req: '2000 хв', need: 2000, field: 'watchMinutes' },
            { id: 'bm1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: 'Перша закладка', req: '1 зак.', need: 1, field: 'bookmarks' },
            { id: 'bm5', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: '5 закладок', req: '5 зак.', need: 5, field: 'bookmarks' },
            { id: 'bm10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: '10 закладок', req: '10 зак.', need: 10, field: 'bookmarks' },
            { id: 'bm20', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: '20 закладок', req: '20 зак.', need: 20, field: 'bookmarks' },
            { id: 'bm50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: '50 закладок', req: '50 зак.', need: 50, field: 'bookmarks' },
            { id: 'bm100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: 'Колекціонер', req: '100 зак.', need: 100, field: 'bookmarks' },
            { id: 'bm200', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: 'Бібліотекар аніме', req: '200 зак.', need: 200, field: 'bookmarks' },
            { id: 'xp100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Перші кроки', req: '100 XP', need: 100, field: 'xp' },
            { id: 'xp500', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Досвідчений', req: '500 XP', need: 500, field: 'xp' },
            { id: 'xp1000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Про', req: '1000 XP', need: 1000, field: 'xp' },
            { id: 'xp2500', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Майстер XP', req: '2500 XP', need: 2500, field: 'xp' },
            { id: 'xp5000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Елітний гравець', req: '5000 XP', need: 5000, field: 'xp' },
            { id: 'xp10000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Легенда платформи', req: '10000 XP', need: 10000, field: 'xp' },
            { id: 'lvl5', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: '5 рівень', req: 'Lv.5', need: 5, field: 'level' },
            { id: 'lvl10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: '10 рівень', req: 'Lv.10', need: 10, field: 'level' },
            { id: 'lvl20', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: '20 рівень', req: 'Lv.20', need: 20, field: 'level' },
            { id: 'lvl30', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: '30 рівень', req: 'Lv.30', need: 30, field: 'level' },
            { id: 'lvl50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: 'Максимальний рівень', req: 'Lv.50', need: 50, field: 'level' },
            { id: 'post1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Перший пост', req: '1 пост.', need: 1, field: 'posts' },
            { id: 'post10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Активний учасник', req: '10 пост.', need: 10, field: 'posts' },
            { id: 'post25', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Голос спільноти', req: '25 пост.', need: 25, field: 'posts' },
            { id: 'post50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Душа компанії', req: '50 пост.', need: 50, field: 'posts' },
            { id: 'post100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Легенда чату', req: '100 пост.', need: 100, field: 'posts' },
            { id: 'like1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Перша оцінка', req: '1 оцін.', need: 1, field: 'ratings' },
            { id: 'like10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Критик', req: '10 оцін.', need: 10, field: 'ratings' },
            { id: 'like25', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Знавець смаку', req: '25 оцін.', need: 25, field: 'ratings' },
            { id: 'like50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Головний рецензент', req: '50 оцін.', need: 50, field: 'ratings' },
            { id: 'like100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Оракул рейтингів', req: '100 оцін.', need: 100, field: 'ratings' },
        ]

        function getUserRankInfo(episodes, watchMinutes) {
            if (watchMinutes >= 2000) return { label: 'Легенда аніме',  color: 'var(--accent)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>' };
            if (watchMinutes >= 1000) return { label: 'Майстер',        color: 'var(--text)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>' };
            if (watchMinutes >= 500)  return { label: 'Ветеран',        color: 'var(--text-secondary)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>' };
            if (watchMinutes >= 200)  return { label: 'Досвідчений',    color: 'var(--text-secondary)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7L12 3 4 7m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 0v10M4 7v10l8 4"/></svg>' };
            if (watchMinutes >= 60)   return { label: 'Початківець',    color: 'var(--text-muted)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' };
            return                        { label: 'Новачок',        color: 'var(--text-muted)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' };
        }

        function initRatingPage() {
            const wrap = document.getElementById('ratingPageContainer');
            if (!wrap || wrap.dataset.init) return;
            wrap.dataset.init = '1';

            wrap.innerHTML = `
                <div class="rg-main-tabs" id="rgMainTabs">
                    <button class="rg-main-tab active" data-panel="rating">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        Рейтинг
                    </button>
                    <button class="rg-main-tab" data-panel="community">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Спільнота
                    </button>
                </div>

                <div class="rg-tab-panel active" id="rgPanelRating">
                    <div id="rgMyStats"></div>
                    <div id="rgDailyTasks"></div>
                    <div id="rgAchievements"></div>
                    <div class="rg-lb-title">Глобальний рейтинг</div>
                    <div class="rg-sort-tabs" id="rgSortTabs">
                        <button class="rg-sort-tab active" data-sort="xp">За XP</button>
                        <button class="rg-sort-tab" data-sort="episodes">За серіями</button>
                        <button class="rg-sort-tab" data-sort="minutes">За хвилинами</button>
                        <button class="rg-sort-tab" data-sort="bookmarks">За закладками</button>
                    </div>
                    <div id="rgLeaderboard">
                        <div style="display:flex;justify-content:center;padding:24px;"><svg style="width:22px;height:22px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9"/></svg></div>
                    </div>
                </div>

                <div class="rg-tab-panel" id="rgPanelCommunity"></div>
            `;

            wrap.querySelectorAll('.rg-main-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    wrap.querySelectorAll('.rg-main-tab').forEach(b => b.classList.remove('active'));
                    wrap.querySelectorAll('.rg-tab-panel').forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    const id = 'rgPanel' + btn.dataset.panel.charAt(0).toUpperCase() + btn.dataset.panel.slice(1);
                    const panel = document.getElementById(id);
                    if (panel) panel.classList.add('active');

                    if (btn.dataset.panel === 'community') {
                        document.body.classList.add('community-active');
                        const nav = document.getElementById('bottomNav');
                        if (nav) nav.classList.add('hidden-nav');
                        initCommunity();
                        setTimeout(() => {
                            const msgs = document.getElementById('comMessages');
                            if (msgs) msgs.scrollTop = msgs.scrollHeight;
                        }, 500);
                    }
                    if (btn.dataset.panel === 'rating') {
                        document.body.classList.remove('community-active');
                        const nav = document.getElementById('bottomNav');
                        if (nav) nav.classList.remove('hidden-nav');
                        loadMyStats();
                        _renderDailyTasks();
                        loadLeaderboard();
                    }
                });
            });

            wrap.querySelectorAll('.rg-sort-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.classList.contains('active')) return;
                    wrap.querySelectorAll('.rg-sort-tab').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    _lbSortKey = btn.dataset.sort;
                    const lb = document.getElementById('rgLeaderboard');
                    if (lb && _lbUsersCache.length) renderLeaderboard(lb, _lbUsersCache, _lbSortKey);
                });
            });

            loadMyStats();
            _renderDailyTasks();
            loadLeaderboard();
        }

        function loadMyStats() {
            const statsEl = document.getElementById('rgMyStats');
            const achEl   = document.getElementById('rgAchievements');
            if (!statsEl || !achEl) return;

            const profile    = getProfile();
            const history    = Storage.getHistory()   || [];
            const bookmarks  = Storage.getBookmarks() || [];
            const watchSec   = Storage.getWatchTime() || 0;
            const watchMinutes = Math.floor(watchSec / 60);
            const episodes   = history.length;
            const rankInfo   = getUserRankInfo(episodes, watchMinutes);
            const totalXP    = calcTotalXP();
            const xpLvl      = getLevel(totalXP);
            const achStats   = { episodes, watchMinutes, bookmarks: bookmarks.length, xp: totalXP, level: xpLvl, posts: DailyStats.getTotalPosts(), ratings: DailyStats.getTotalRatings() };
            const earnedIds  = new Set(ACHIEVEMENTS.filter(a => achStats[a.field] >= a.need).map(a => a.id));
            const xpProg     = getXPProgress(totalXP);

            const avatarGifClass = isGifUrl(profile.avatar) ? ' class="is-gif"' : '';
            const avHtml = profile.avatar
                ? `<img src="${profile.avatar}" alt=""${avatarGifClass}>`
                : `<span>${(profile.nickname || '?')[0].toUpperCase()}</span>`;

            statsEl.innerHTML = `
                <div class="rg-my-stats">
                    <div class="rg-stats-top">
                        <div class="rg-stats-avatar">${avHtml}</div>
                        <div>
                            <div class="rg-stats-name">${profile.nickname || 'Гість'}</div>
                            <div class="rg-stats-rank-badge" style="background:var(--accent);color:var(--accent-text);">${rankInfo.icon || ''}${rankInfo.label} · Lv.${xpProg.level}</div>
                        </div>
                    </div>
                    <div class="rg-xp-bar-wrap" style="margin:10px 0 4px;">
                        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px;">
                            <span>${totalXP} XP</span><span>Lv.${xpProg.level + 1} за ${xpProg.needed - xpProg.into} XP</span>
                        </div>
                        <div style="height:6px;border-radius:3px;background:var(--border,rgba(128,128,128,.2));overflow:hidden;">
                            <div style="height:100%;width:${xpProg.pct}%;background:var(--accent);border-radius:3px;transition:width .3s;"></div>
                        </div>
                    </div>
                    <div class="rg-stats-grid">
                        <div class="rg-stat-cell"><div class="rg-stat-val">${episodes}</div><div class="rg-stat-label">Серій</div></div>
                        <div class="rg-stat-cell"><div class="rg-stat-val">${watchMinutes}</div><div class="rg-stat-label">Хвилин</div></div>
                        <div class="rg-stat-cell"><div class="rg-stat-val">${earnedIds.size}</div><div class="rg-stat-label">Досягнень</div></div>
                    </div>
                    <div class="rg-xp-rules">XP: 25 за серію · 1 за хвилину · 15 за закладку · 75 за досягнення</div>
                </div>`;

            achEl.innerHTML = `
                <div class="rg-achievements">
                    <div class="rg-section-label">Досягнення</div>
                    <div class="rg-ach-scroll">
                        ${ACHIEVEMENTS.map(a => `
                            <div class="rg-ach-item ${earnedIds.has(a.id) ? 'earned' : 'locked'}" title="${a.req}">
                                <span class="rg-ach-icon">${a.icon}</span>
                                <span class="rg-ach-name">${a.name}</span>
                                <span class="rg-ach-req">${a.req}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }

        let _lbSortKey = 'xp';
        let _lbUsersCache = [];

        const TOP_BADGES = Object.freeze({ p1: 'src/assets/rating/top-1.png', p2: 'src/assets/rating/top-2.png', p3: 'src/assets/rating/top-3.png' });
        const LB_SORT_CONFIG = {
            xp:        { unit: 'XP',    getVal: u => u.xp },
            episodes:  { unit: 'сер.',  getVal: u => u.episodes },
            minutes:   { unit: 'хв',    getVal: u => u.minutes },
            bookmarks: { unit: 'зак.',  getVal: u => u.bookmarks }
        };

        async function loadLeaderboard() {
            const lb = document.getElementById('rgLeaderboard');
            if (!lb) return;

            const spinner = `<div style="display:flex;justify-content:center;padding:24px;"><svg style="width:22px;height:22px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9"/></svg></div>`;
            lb.className = '';
            lb.innerHTML = spinner;

            const showFallback = (msg) => {
                const profile = getProfile();
                const xp = calcTotalXP();
                const lv = getLevel(xp);
                const gifCls = isGifUrl(profile.avatar) ? ' class="is-gif"' : '';
                const av = profile.avatar ? `<img src="${profile.avatar}" alt=""${gifCls}>` : `<span>${(profile.nickname||'?')[0].toUpperCase()}</span>`;
                lb.innerHTML = `
                    <div class="rg-lb-list">
                        <div class="rg-lb-item is-me">
                            <div class="rg-lb-num" style="color:var(--accent);font-weight:800;">#1</div>
                            <div class="rg-lb-avatar">${av}</div>
                            <div class="rg-lb-info">
                                <div class="rg-lb-name">${profile.nickname||'Ти'} <span style="font-size:9px;color:var(--accent);font-weight:700;">YOU</span></div>
                                <div class="rg-lb-rank">Lv.${lv}</div>
                            </div>
                            <div class="rg-lb-score">${xp} <span class="unit">XP</span></div>
                        </div>
                    </div>
                    <p style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:8px;">${msg}</p>`;
            };

            // Чекаємо ініціалізацію Firebase (до 6 сек), не блокуючи інший код
            let waited = 0;
            while ((!firebaseInitialized || !db) && waited < 6000) {
                await new Promise(res => setTimeout(res, 250));
                waited += 250;
            }

            if (!firebaseInitialized || !db) {
                showFallback('Firebase недоступний. Перевірте з\'єднання.');
                return;
            }
            // КРИТИЧНО: чекаємо поки Firebase РЕАЛЬНО визначить сесію (_authResolved),
            // інакше вже залогінений через Google юзер на мить виглядає як "не автентифікований"
            // (onAuthStateChanged ще не встиг відпрацювати) і потрапляє у гостьову гілку нижче.
            waited = 0;
            while (!Auth._authResolved && waited < 4000) {
                await new Promise(res => setTimeout(res, 150));
                waited += 150;
            }
            // Гостям (справді неавторизованим) намагаємось видати анонімний Firebase-сеанс,
            // щоб рейтинг був доступний без входу
            if (!Auth.isAuthenticated()) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {
                    console.warn('Anonymous sign-in failed:', e.code);
                    showFallback('Глобальний рейтинг тимчасово доступний лише для авторизованих. Увійдіть через Google.');
                    return;
                }
            }

            try {
                const { collection, query, limit, getDocs, onSnapshot } =
                    await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js');
                // Без orderBy — не потребує Firestore composite index. Сортуємо на клієнті.
                const q = query(collection(db, 'users'), limit(500));
                const tp = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000));
                const snap = await Promise.race([getDocs(q), tp]);

                const mapUsers = (snapshot) => {
                    let arr = [];
                    snapshot.forEach(d => {
                        const data = d.data();
                        arr.push({
                            uid: d.id,
                            name: data.profile?.nickname || data.profile?.name || 'Аніматор',
                            avatar: data.profile?.avatar || '',
                            episodes: Array.isArray(data.history) ? data.history.length : 0,
                            minutes: Math.floor((data.watchTime || 0) / 60),
                            bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.length : 0,
                            xp: calculateBaseXP({ episodes: Array.isArray(data.history) ? data.history.length : 0, watchSeconds: data.watchTime || 0, bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.length : 0 }),
                            level: getLevel(calculateBaseXP({ episodes: Array.isArray(data.history) ? data.history.length : 0, watchSeconds: data.watchTime || 0, bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.length : 0 }))
                        });
                    });
                    return arr;
                };

                let users = mapUsers(snap);
                if (!users.length) {
                    showFallback('Рейтинг з\'явиться після реєстрації користувачів.');
                    return;
                }
                _lbUsersCache = users;
                renderLeaderboard(lb, users, _lbSortKey);

                if (window._lbUnsub) { window._lbUnsub(); window._lbUnsub = null; }
                window._lbUnsub = onSnapshot(q, (snap2) => {
                    const u = mapUsers(snap2);
                    if (u.length) {
                        _lbUsersCache = u;
                        renderLeaderboard(lb, u, _lbSortKey);
                    }
                }, (err) => console.warn('LB snapshot error:', err));

            } catch(e) {
                console.warn('loadLeaderboard error:', e.message);
                showFallback('Помилка завантаження: ' + e.message);
            }
        }

        function renderLeaderboard(lb, users, sortKey) {
            sortKey = sortKey || _lbSortKey || 'xp';
            const cfg = LB_SORT_CONFIG[sortKey] || LB_SORT_CONFIG.xp;
            const sorted = [...users].sort((a, b) => cfg.getVal(b) - cfg.getVal(a));

            const myUid = Auth.isAuthenticated() ? Auth._user?.uid : null;
            let html = '';

            if (sorted.length >= 3) {
                const order  = [sorted[1], sorted[0], sorted[2]];
                const cls    = ['p2', 'p1', 'p3'];
                html += '<div class="rg-podium">';
                order.forEach((u, i) => {
                    const gifCls = isGifUrl(u.avatar) ? ' class="is-gif"' : '';
                    const av = u.avatar ? `<img src="${u.avatar}" alt=""${gifCls}>` : `<span>${u.name[0].toUpperCase()}</span>`;
                    html += `<div class="rg-podium-item ${cls[i]}" style="animation-delay:${i*0.08}s">
                        <img class="rg-podium-badge" src="${TOP_BADGES[cls[i]]}" alt="Топ ${cls[i] === 'p1' ? '1' : cls[i] === 'p2' ? '2' : '3'}" loading="lazy">
                        <div class="rg-podium-avatar">${av}</div>
                        <div class="rg-podium-name">${u.name}</div>
                        <div class="rg-podium-score">${cfg.getVal(u)} ${cfg.unit}</div>
                        <div class="rg-podium-bar"></div>
                    </div>`;
                });
                html += '</div>';
            }

            html += '<div class="rg-lb-list">';
            sorted.slice(3).forEach((u, i) => {
                const isMe = u.uid === myUid;
                const gifCls = isGifUrl(u.avatar) ? ' class="is-gif"' : '';
                const av   = u.avatar ? `<img src="${u.avatar}" alt=""${gifCls}>` : `<span>${u.name[0].toUpperCase()}</span>`;
                const ri   = getUserRankInfo(u.episodes, u.minutes);
                html += `<div class="rg-lb-item ${isMe ? 'is-me' : ''}" style="animation-delay:${Math.min(i*0.02, 0.4)}s">
                    <div class="rg-lb-num">${i + 4}</div>
                    <div class="rg-lb-avatar">${av}</div>
                    <div class="rg-lb-info">
                        <div class="rg-lb-name">${u.name}${isMe ? ' <span style="font-size:9px;color:var(--accent);font-weight:700;">YOU</span>' : ''}</div>
                        <div class="rg-lb-rank" style="color:${ri.color}">Lv.${u.level} · ${ri.label}</div>
                    </div>
                    <div class="rg-lb-score">${cfg.getVal(u)} <span class="unit">${cfg.unit}</span></div>
                </div>`;
            });
            html += '</div>';
            lb.className = '';
            lb.innerHTML = html;
        }

        // ─────────────────────────────────────────────────
        //  Community Chat (Telegram-style)
        // ─────────────────────────────────────────────────
        let comUnsub = null;
        let comPostType = 'text';
        let comFilterType = 'text';
        let editingMsgId = null;
        let _comMsgsCache = [];
        let replyingTo = null;
        let _refreshComposeExtra = null;

        function _renderReplyBanner() {
            const wrap = document.getElementById('comReplyBannerWrap');
            if (!wrap) return;
            if (!replyingTo) { wrap.innerHTML = ''; return; }
            wrap.innerHTML = `
                <div class="com-reply-banner">
                    <div class="com-reply-banner-bar"></div>
                    <div class="com-reply-banner-info">
                        <b>Відповідь ${escapeHtml(replyingTo.authorName || 'Аніматор')}</b>
                        <span>${escapeHtml(replyingTo.text || 'медіа-повідомлення')}</span>
                    </div>
                    <button type="button" class="com-reply-cancel" id="comReplyCancelBtn">&times;</button>
                </div>`;
            document.getElementById('comReplyCancelBtn')?.addEventListener('click', () => {
                replyingTo = null;
                _renderReplyBanner();
            });
        }

        function _setReplyTo(m) {
            replyingTo = { id: m.id, authorName: m.authorName || 'Аніматор', text: (m.text || (m.media?.length ? '📎 медіа' : (m.animeData ? '🎬 ' + m.animeData.title : (m.achData ? '🏆 ' + m.achData.name : '')))).slice(0, 100) };
            _renderReplyBanner();
            document.getElementById('comInput')?.focus();
        }

        function _uniqueCommunityAuthors() {
            const seen = new Map();
            _comMsgsCache.forEach(m => {
                if (m.authorName && !seen.has(m.authorName)) seen.set(m.authorName, m.authorPhoto || '');
            });
            return Array.from(seen.entries()).map(([name, photo]) => ({ name, photo }));
        }

        function _highlightMentions(escapedText) {
            const authors = _uniqueCommunityAuthors();
            if (!authors.length || !escapedText) return escapedText;
            const names = authors.map(a => a.name).sort((a, b) => b.length - a.length);
            const pattern = names.map(n => n.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&')).join('|');
            if (!pattern) return escapedText;
            const re = new RegExp('@(' + pattern + ')\\b', 'g');
            return escapedText.replace(re, '<span class="com-mention">@$1</span>');
        }

        function getMyEarnedAchievements() {
            const history   = Storage.getHistory()   || [];
            const bookmarks = Storage.getBookmarks() || [];
            const watchSec  = Storage.getWatchTime() || 0;
            const episodes  = history.length;
            const totalXP   = calcTotalXP();
            const xpLvl     = getLevel(totalXP);
            const achStats  = { episodes, watchMinutes: Math.floor(watchSec / 60), bookmarks: bookmarks.length, xp: totalXP, level: xpLvl, posts: DailyStats.getTotalPosts(), ratings: DailyStats.getTotalRatings() };
            return ACHIEVEMENTS.filter(a => achStats[a.field] >= a.need);
        }

        let modernCommunityUnsub = null;
        let modernCommunityPosts = [];
        let modernCommunityFilter = 'all';
        let modernCommunityView = 'categories';
        let modernCommunityCategoryId = null;
        let modernCommunityTopicId = null;
        let modernCommunityComposerMode = 'text';
        let modernCommunityReplyTo = null;
        let modernCommunityMediaFiles = [];
        const MODERN_COMMUNITY_CATEGORIES = [
            { id: 'anime', icon: '◈', title: 'Аніме та манґа', description: 'Серії, персонажі, теорії та манґа', topics: [
                { id: 'episodes', title: 'Обговорення серій', description: 'Враження, спойлери та найкращі моменти' },
                { id: 'characters', title: 'Персонажі та теорії', description: 'Розбираємо героїв, сюжети й фанатські теорії' },
                { id: 'manga', title: 'Манґа та ранобе', description: 'Першоджерела, глави та екранізації' }
            ]},
            { id: 'season', icon: '✦', title: 'Сезон і новинки', description: 'Нові релізи, розклад і очікувані тайтли', topics: [
                { id: 'new-season', title: 'Новинки сезону', description: 'Що виходить зараз і що варто додати до списку' },
                { id: 'schedule', title: 'Розклад виходу', description: 'Дати серій, переноси та спільний перегляд' }
            ]},
            { id: 'recommendations', icon: '♡', title: 'Рекомендації', description: 'Знаходь наступне аніме для перегляду', topics: [
                { id: 'what-to-watch', title: 'Що подивитися?', description: 'Поради під настрій, жанр або вільний вечір' },
                { id: 'ratings', title: 'Оцінки та рейтинги', description: 'Ділимось враженнями й порівнюємо улюблені тайтли' }
            ]},
            { id: 'community', icon: '✧', title: 'Спільнота', description: 'Знайомства, питання та допомога', topics: [
                { id: 'introductions', title: 'Знайомства', description: 'Розкажи про себе та свої улюблені тайтли' },
                { id: 'help', title: 'Питання та допомога', description: 'Попроси пораду або допоможи іншому учаснику' }
            ]}
        ];
        function modernCommunityCategory(id) { return MODERN_COMMUNITY_CATEGORIES.find(item => item.id === id) || null; }
        function modernCommunityTopic(categoryId, topicId) { return modernCommunityCategory(categoryId)?.topics.find(item => item.id === topicId) || null; }
        function modernCommunityLegacyTopic(post) {
            const kind = post.communityCategory || (post.animeData ? 'recommend' : 'discussion');
            return kind === 'recommend' ? 'what-to-watch' : kind === 'question' ? 'help' : 'episodes';
        }
        function modernCommunityDate(value) {
            try {
                const date = value?.toDate ? value.toDate() : new Date(value || 0);
                if (!date || Number.isNaN(date.getTime()) || date.getTime() < 1000) return 'Щойно';
                const now = new Date();
                const sameDay = date.toDateString() === now.toDateString();
                if (sameDay) return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
                const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
                if (date.toDateString() === yesterday.toDateString()) return `Вчора, ${date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
                return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
            } catch (_) { return 'Щойно'; }
        }
        function modernCommunityAuthor(post) {
            const name = post.authorName || 'Аніме ентузіаст';
            const photo = post.authorPhoto || '';
            return photo
                ? `<img src="${escapeHtml(photo)}" alt="" loading="lazy" onerror="this.style.display='none'">`
                : `<span>${escapeHtml(name.slice(0, 1).toUpperCase())}</span>`;
        }
        function modernCommunityPostCard(post) {
            const kind = post.communityCategory || (post.animeData ? 'recommend' : 'discussion');
            const label = kind === 'recommend' ? 'Рекомендація' : kind === 'question' ? 'Питання' : 'Обговорення';
            const topic = modernCommunityTopic(post.communityCategoryId, post.communityTopicId);
            const topicLabel = topic?.title || modernCommunityTopic('anime', modernCommunityLegacyTopic(post))?.title || label;
            const anime = post.animeData?.title ? `<div class="modern-community-anime-card">${post.animeData.poster ? `<img src="${escapeHtml(post.animeData.poster)}" alt="" loading="lazy">` : `<span class="modern-community-anime-icon">◈</span>`}<div><small>Рекомендація аніме</small><b>${escapeHtml(post.animeData.title)}</b>${post.animeData.synopsis ? `<p>${escapeHtml(post.animeData.synopsis)}</p>` : ''}${post.animeData.url ? `<a href="${escapeHtml(post.animeData.url)}" target="_blank" rel="noopener">Відкрити тайтл ›</a>` : ''}</div></div>` : '';
            const media = Array.isArray(post.media) && post.media.length ? `<div class="modern-community-media-grid">${post.media.map(item => item.type === 'video' ? `<video src="${escapeHtml(item.url)}" controls preload="metadata"></video>` : `<img src="${escapeHtml(item.url)}" alt="Медіа публікації" loading="lazy">`).join('')}</div>` : '';
            const reply = post.replyTo?.text ? `<div class="modern-community-reply-quote"><b>Відповідь ${escapeHtml(post.replyTo.authorName || 'учаснику')}</b><span>${escapeHtml(post.replyTo.text)}</span></div>` : '';
            const text = post.text ? `<p>${escapeHtml(post.text).replace(/\n/g, '<br>')}</p>` : '';
            const reactions = Object.entries(post.reactions || {}).filter(([, uids]) => Array.isArray(uids) && uids.length).map(([emoji, uids]) => `<button type="button" class="modern-community-reaction${Auth.isAuthenticated() && uids.includes(Auth._user?.uid) ? ' is-mine' : ''}" data-community-action="reaction" data-emoji="${escapeHtml(emoji)}" data-post-id="${escapeHtml(post.id)}">${emoji} <span>${uids.length}</span></button>`).join('');
            return `<article class="modern-community-post"><div class="modern-community-post-top"><div class="modern-community-avatar">${modernCommunityAuthor(post)}</div><div class="modern-community-author"><b>${escapeHtml(post.authorName || 'Аніме ентузіаст')}</b><span>${modernCommunityDate(post.createdAt)}</span></div><span class="modern-community-tag">${escapeHtml(topicLabel)}</span></div>${reply}${text}${media}${anime}<div class="modern-community-post-actions"><button type="button" class="modern-community-action" data-community-action="reaction" data-emoji="♡" data-post-id="${escapeHtml(post.id)}">♡ Реакція</button><button type="button" class="modern-community-action" data-community-action="reply" data-post-id="${escapeHtml(post.id)}">↩ Відповісти</button>${reactions}</div></article>`;
        }
        function renderModernCommunityFeed() {
            const feed = document.getElementById('modernCommunityFeed');
            if (!feed) return;
            const posts = modernCommunityPosts.filter(post => {
                if (modernCommunityView !== 'group' || !modernCommunityTopicId) return true;
                return (post.communityTopicId || modernCommunityLegacyTopic(post)) === modernCommunityTopicId;
            });
            const count = document.getElementById('modernCommunityCount');
            if (count) count.textContent = `${posts.length} публікацій`;
            feed.innerHTML = posts.length ? posts.map(modernCommunityPostCard).join('') : `<div class="modern-community-empty"><div class="modern-community-empty-icon">✦</div><h3>Група ще чекає на першу розмову</h3><p>Створи перше повідомлення в цій темі та започаткуй обговорення.</p></div>`;
            feed.querySelectorAll('[data-community-action="reply"]').forEach(btn => btn.addEventListener('click', () => { const post = modernCommunityPosts.find(item => item.id === btn.dataset.postId); if (!post) return; modernCommunityReplyTo = { id: post.id, authorName: post.authorName || 'учаснику', text: (post.text || post.animeData?.title || 'публікації').slice(0, 120) }; const banner = document.getElementById('modernCommunityReplyBanner'); if (banner) { banner.innerHTML = `<b>Відповідь ${escapeHtml(modernCommunityReplyTo.authorName)}</b><span>${escapeHtml(modernCommunityReplyTo.text)}</span><button type="button" data-community-cancel-reply>×</button>`; banner.hidden = false; } document.getElementById('modernCommunityComposer')?.focus(); }));
            feed.querySelectorAll('[data-community-action="reaction"]').forEach(btn => btn.addEventListener('click', async () => { if (!Auth.isAuthenticated() || !db) return showToast('Увійди, щоб реагувати на публікації'); const { updateDoc, doc, arrayUnion, arrayRemove } = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js'); const post = modernCommunityPosts.find(item => item.id === btn.dataset.postId); if (!post) return; const emoji = btn.dataset.emoji || '♡'; const mine = Array.isArray(post.reactions?.[emoji]) && post.reactions[emoji].includes(Auth._user.uid); try { await updateDoc(doc(db, 'community_posts', post.id), { [`reactions.${emoji}`]: mine ? arrayRemove(Auth._user.uid) : arrayUnion(Auth._user.uid) }); } catch (error) { console.warn('Community reaction failed:', error); showToast('Не вдалося додати реакцію'); } }));
        }
        function renderModernCommunityNavigation() {
            const nav = document.getElementById('modernCommunityNav');
            const heading = document.getElementById('modernCommunityHeading');
            if (!nav || !heading) return;
            const category = modernCommunityCategory(modernCommunityCategoryId);
            const topic = modernCommunityTopic(modernCommunityCategoryId, modernCommunityTopicId);
            if (modernCommunityView === 'categories') {
                heading.innerHTML = `<div><span class="modern-community-eyebrow">EXPLORE COMMUNITY</span><h2>Категорії</h2><p>Обери напрям, щоб побачити тематичні групи.</p></div>`;
                nav.innerHTML = `<div class="modern-community-category-grid">${MODERN_COMMUNITY_CATEGORIES.map(item => `<button type="button" class="modern-community-category-card" data-community-category="${item.id}"><span class="modern-community-category-icon">${item.icon}</span><span><strong>${item.title}</strong><small>${item.description}</small><em>${item.topics.length} теми <b>›</b></em></span></button>`).join('')}</div>`;
            } else if (modernCommunityView === 'topics') {
                heading.innerHTML = `<div><button type="button" class="modern-community-back" data-community-view="categories">‹ Категорії</button><span class="modern-community-eyebrow">${category?.title || 'CATEGORY'}</span><h2>Теми</h2><p>${category?.description || 'Обери тему для переходу в групу.'}</p></div>`;
                nav.innerHTML = `<div class="modern-community-topic-list">${(category?.topics || []).map(item => `<button type="button" class="modern-community-topic-row" data-community-topic="${item.id}"><span class="modern-community-topic-number">#</span><span><strong>${item.title}</strong><small>${item.description}</small></span><b>›</b></button>`).join('')}</div>`;
            } else {
                heading.innerHTML = `<div><div class="modern-community-breadcrumb"><button type="button" data-community-view="categories">Категорії</button><span>›</span><button type="button" data-community-view="topics">${category?.title || 'Теми'}</button></div><span class="modern-community-eyebrow">TOPIC GROUP</span><h2>${topic?.title || 'Обговорення'}</h2><p>${topic?.description || 'Розмова учасників VakDab.'}</p></div>`;
                nav.innerHTML = `<div class="modern-community-group-banner"><span class="modern-community-group-icon">${category?.icon || '✦'}</span><div><strong>Група «${topic?.title || 'Обговорення'}»</strong><small>Публікації цієї теми зібрані в одній стрічці.</small></div><button type="button" class="modern-community-back" data-community-view="topics">‹ Усі теми</button></div>`;
            }
            renderModernCommunityFeed();
        }
        function initModernCommunity() {
            const panel = document.getElementById('rgPanelCommunity');
            if (!panel || panel.dataset.modernInit) return;
            panel.dataset.modernInit = '1';
            const user = Auth.isAuthenticated() ? Auth._user : null;
            const profile = getProfile();
            const topicOptions = MODERN_COMMUNITY_CATEGORIES.flatMap(category => category.topics.map(topic => `<option value="${category.id}:${topic.id}">${category.title} · ${topic.title}</option>`)).join('');
            panel.innerHTML = `<section class="modern-community-page"><div class="modern-community-hero"><div><span class="modern-community-eyebrow">VAKDAB COMMUNITY</span><h1>Місце, де аніме оживає в розмовах</h1><p>Обирай категорію, заходь у свою тему та спілкуйся в окремій групі без зайвого шуму.</p><button type="button" class="modern-community-categories-button" data-community-view="categories">⌘ Категорії <span>Переглянути всі розділи</span></button></div><div class="modern-community-hero-art"><span>✦</span><span>◈</span><span>✧</span></div></div>${user ? `<form class="modern-community-composer" id="modernCommunityForm"><div class="modern-community-avatar">${profile.avatar ? `<img src="${escapeHtml(profile.avatar)}" alt="">` : `<span>${escapeHtml((profile.nickname || 'К').slice(0, 1).toUpperCase())}</span>`}</div><div class="modern-community-composer-main"><div id="modernCommunityReplyBanner" class="modern-community-reply-banner" hidden></div><textarea id="modernCommunityComposer" maxlength="1000" rows="2" placeholder="Поділись думкою у вибраній темі..."></textarea><div id="modernCommunityAnimeFields" class="modern-community-anime-fields" hidden><input id="modernCommunityAnimeTitle" type="text" maxlength="120" placeholder="Назва аніме"><input id="modernCommunityAnimeUrl" type="url" placeholder="Посилання на аніме (необов’язково)"><input id="modernCommunityAnimePoster" type="url" placeholder="URL постера (необов’язково)"></div><div id="modernCommunityMediaPreview" class="modern-community-media-preview"></div><div class="modern-community-composer-bottom"><select id="modernCommunityTopicSelect" aria-label="Тема публікації">${topicOptions}</select><div class="modern-community-composer-tools"><button type="button" class="modern-community-tool" data-community-mode="recommend">Рекомендувати аніме</button><label class="modern-community-tool">Фото/відео<input id="modernCommunityMediaInput" type="file" accept="image/*,video/*" multiple hidden></label><button type="submit">Опублікувати</button></div></div></div></form>` : `<div class="modern-community-login"><div><b>Приєднуйся до розмови</b><span>Увійди, щоб створювати публікації та зберігати улюблені обговорення.</span></div><button type="button" id="modernCommunityLogin">Увійти</button></div>`}<div id="modernCommunityHeading" class="modern-community-section-heading"></div><div id="modernCommunityNav"></div><div class="modern-community-feed-heading"><span class="modern-community-eyebrow">TOPIC FEED</span><span class="modern-community-count" id="modernCommunityCount">0 публікацій</span></div><div id="modernCommunityFeed" class="modern-community-feed"><div class="modern-community-empty"><div class="modern-community-empty-icon">◌</div><p>Завантажую стрічку...</p></div></div></section>`;
            renderModernCommunityNavigation();
            panel.addEventListener('click', event => {
                const categoryButton = event.target.closest('[data-community-category]');
                const topicButton = event.target.closest('[data-community-topic]');
                const viewButton = event.target.closest('[data-community-view]');
                if (categoryButton) { modernCommunityCategoryId = categoryButton.dataset.communityCategory; modernCommunityTopicId = null; modernCommunityView = 'topics'; renderModernCommunityNavigation(); }
                else if (topicButton) { modernCommunityTopicId = topicButton.dataset.communityTopic; modernCommunityView = 'group'; renderModernCommunityNavigation(); const select = document.getElementById('modernCommunityTopicSelect'); if (select) select.value = `${modernCommunityCategoryId}:${modernCommunityTopicId}`; }
                else if (viewButton) { const next = viewButton.dataset.communityView; modernCommunityView = next; if (next === 'categories') { modernCommunityCategoryId = null; modernCommunityTopicId = null; } if (next === 'topics') modernCommunityTopicId = null; renderModernCommunityNavigation(); }
            });
            document.getElementById('modernCommunityLogin')?.addEventListener('click', () => Router.goTo('profile'));
            document.querySelectorAll('[data-community-mode]').forEach(button => button.addEventListener('click', () => { modernCommunityComposerMode = modernCommunityComposerMode === 'recommend' ? 'text' : 'recommend'; const fields = document.getElementById('modernCommunityAnimeFields'); if (fields) fields.hidden = modernCommunityComposerMode !== 'recommend'; button.classList.toggle('is-active', modernCommunityComposerMode === 'recommend'); }));
            document.getElementById('modernCommunityMediaInput')?.addEventListener('change', event => { modernCommunityMediaFiles = Array.from(event.target.files || []).slice(0, 4); const preview = document.getElementById('modernCommunityMediaPreview'); if (preview) preview.innerHTML = modernCommunityMediaFiles.map(file => `<span>${file.type.startsWith('video/') ? 'Відео' : 'Фото'}: ${escapeHtml(file.name)}</span>`).join(''); });
            document.getElementById('modernCommunityReplyBanner')?.addEventListener('click', event => { if (event.target.closest('[data-community-cancel-reply]')) { modernCommunityReplyTo = null; event.currentTarget.hidden = true; event.currentTarget.innerHTML = ''; } });
            document.getElementById('modernCommunityForm')?.addEventListener('submit', async event => { event.preventDefault(); const textarea = document.getElementById('modernCommunityComposer'); const text = textarea?.value.trim(); const selected = document.getElementById('modernCommunityTopicSelect')?.value || 'anime:episodes'; const [communityCategoryId, communityTopicId] = selected.split(':'); const animeTitle = document.getElementById('modernCommunityAnimeTitle')?.value.trim(); const animeUrl = document.getElementById('modernCommunityAnimeUrl')?.value.trim(); const animePoster = document.getElementById('modernCommunityAnimePoster')?.value.trim(); if ((!text && !animeTitle && !modernCommunityMediaFiles.length) || !firebaseInitialized || !db) return showToast('Додай текст, рекомендацію або медіа'); const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true; try { const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js'); const media = []; for (const file of modernCommunityMediaFiles) { const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${file.type.startsWith('video/') ? 'video' : 'image'}/upload`, { method: 'POST', body: formData }); const result = await response.json(); if (result.secure_url) media.push({ url: result.secure_url, type: file.type.startsWith('video/') ? 'video' : 'image' }); } const data = { uid: user.uid, authorName: profile.nickname || user.displayName || 'Аніме ентузіаст', authorPhoto: profile.avatar || user.photoURL || '', text, type: modernCommunityComposerMode === 'recommend' ? 'anime' : media.length ? 'media' : 'text', communityCategory: modernCommunityComposerMode === 'recommend' ? 'recommend' : 'discussion', communityCategoryId, communityTopicId, media, createdAt: serverTimestamp() }; if (animeTitle) data.animeData = { title: animeTitle, url: animeUrl, poster: animePoster, synopsis: '' }; if (modernCommunityReplyTo) data.replyTo = { id: modernCommunityReplyTo.id, authorName: modernCommunityReplyTo.authorName, text: modernCommunityReplyTo.text }; await addDoc(collection(db, 'community_posts'), data); textarea.value = ''; modernCommunityMediaFiles = []; modernCommunityReplyTo = null; modernCommunityComposerMode = 'text'; document.getElementById('modernCommunityMediaInput').value = ''; document.getElementById('modernCommunityMediaPreview').innerHTML = ''; document.getElementById('modernCommunityAnimeFields').hidden = true; document.getElementById('modernCommunityAnimeTitle').value = ''; document.getElementById('modernCommunityAnimeUrl').value = ''; document.getElementById('modernCommunityAnimePoster').value = ''; document.getElementById('modernCommunityReplyBanner').hidden = true; showToast('Публікацію додано'); } catch (error) { console.error('Modern community post failed:', error); showToast('Не вдалося опублікувати'); } finally { button.disabled = false; } });
            if (modernCommunityUnsub) modernCommunityUnsub();
            try { const q = query(collection(db, 'community_posts'), limit(60)); modernCommunityUnsub = onSnapshot(q, snapshot => { modernCommunityPosts = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)); renderModernCommunityFeed(); }, () => { const feed = document.getElementById('modernCommunityFeed'); if (feed) feed.innerHTML = `<div class="modern-community-empty"><div class="modern-community-empty-icon">✦</div><h3>Спільнота тільки починається</h3><p>Поки тут тихо. Увійди та створи перше обговорення про своє улюблене аніме.</p></div>`; }); } catch (error) { console.warn('Modern community subscription failed:', error); renderModernCommunityFeed(); }
        }
        function initCommunity() {
            initModernCommunity();
            return;
            const panel = document.getElementById('rgPanelCommunity');
            if (!panel || panel.dataset.init) return;
            panel.dataset.init = '1';

            const user    = Auth.isAuthenticated() ? Auth._user : null;
            const profile = getProfile();
            const gifCls = isGifUrl(profile.avatar) ? ' class="is-gif"' : '';
            const avHtml  = profile.avatar
                ? `<img src="${profile.avatar}" alt=""${gifCls}>`
                : `<span>${(profile.nickname || '?')[0].toUpperCase()}</span>`;

            const tabMeta = {
                text:  { placeholder: 'Написати в спільний чат...' },
                anime: { placeholder: '' },
                ach:   { placeholder: 'Короткий коментар (необов\'язково)...' }
            };

            panel.innerHTML = `
                <div class="com-chat-wrap">
                    <div class="com-chat-header" id="comChatHeader" title="Інформація про групу">
                        <div class="com-chat-header-icon">💬</div>
                        <div class="com-chat-header-info">
                            <div class="com-chat-header-title">VakDab</div>
                            <div class="com-chat-header-sub"><span class="com-chat-header-dot"></span>Живе спілкування фанатів аніме</div>
                        </div>
                        <div class="com-chat-header-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg></div>
                    </div>
                    <div class="com-filter-tabs" id="comFilterTabs">
                        <button class="com-filter-tab active" data-type="text">Думка</button>
                        <button class="com-filter-tab" data-type="anime">Рекомендація</button>
                        <button class="com-filter-tab" data-type="ach">Досягнення</button>
                    </div>
                    <div class="com-messages" id="comMessages">
                        <div class="com-feed-empty">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            <p>Завантаження...</p>
                        </div>
                    </div>

                    ${user ? `
                    <div class="com-compose-extra" id="comComposeExtra"></div>
                    <div id="comReplyBannerWrap"></div>
                    <div class="com-input-wrap" style="position:relative;">
                        <div id="comMentionDropdown"></div>
                        <input type="file" id="comMediaInput" accept="image/*,video/*" style="display:none" multiple>
                        <div class="com-msg-avatar" style="flex-shrink:0;margin-bottom:5px;">${avHtml}</div>
                        <div class="com-input-box">
                            <button class="com-attach-btn" id="comAttachBtn" title="Додати фото/відео">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                            </button>
                            <textarea id="comInput" placeholder="Написати в спільний чат..." maxlength="500" rows="1"></textarea>
                        </div>
                        <button class="com-send-btn" id="comSendBtn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </button>
                    </div>
                    <div class="com-media-preview" id="comMediaPreview"></div>
                    ` : `
                    <div class="com-login-wall">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>
                        <p>Увійдіть в акаунт, щоб бачити повідомлення та писати в спільноті</p>
                        <button onclick="Router.goTo('profile')">Увійти</button>
                    </div>
                    `}
                </div>
            `;

            panel.querySelectorAll('.com-filter-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.classList.contains('active')) return;
                    panel.querySelectorAll('.com-filter-tab').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    comFilterType = btn.dataset.type;
                    comPostType = btn.dataset.type;
                    replyingTo = null;
                    _renderReplyBanner();
                    _renderComMessages(user);
                    if (_refreshComposeExtra) _refreshComposeExtra();
                });
            });

            if (user) _setupCompose(user);
            _subscribeToChat(user);

            document.getElementById('comChatHeader')?.addEventListener('click', () => openGroupInfo(user));
            _ensureGroupSettings(user).then(() => _subscribeGroupSettings());
            _subscribeMyMembership(user);
            _subscribeGroupMembers();
        }

        function _setupCompose(user) {
            const inp        = document.getElementById('comInput');
            const sendBtn    = document.getElementById('comSendBtn');
            const attachBtn  = document.getElementById('comAttachBtn');
            const mediaInput = document.getElementById('comMediaInput');
            const mediaPreview = document.getElementById('comMediaPreview');
            const extraBox   = document.getElementById('comComposeExtra');
            const mentionBox = document.getElementById('comMentionDropdown');

            if (!inp || !sendBtn) return;

            let pendingMedia = [];
            let pendingAnime = null;
            let pendingAchievement = null;
            let animeSearchTimer = null;

            function updateInputVisibility() {
                if (comPostType === 'anime') {
                    inp.style.display = 'none';
                    if (attachBtn) attachBtn.style.display = 'none';
                } else {
                    inp.style.display = '';
                    if (attachBtn) attachBtn.style.display = comPostType === 'text' ? '' : 'none';
                    const ph = { text: 'Написати в спільний чат...', ach: 'Короткий коментар (необов\'язково)...' };
                    inp.placeholder = ph[comPostType] || ph.text;
                }
            }

            function refreshExtra() {
                updateInputVisibility();
                if (!extraBox) return;
                if (comPostType === 'anime') {
                    if (pendingAnime) {
                        extraBox.innerHTML = `
                            <div class="com-anime-selected">
                                <img src="${pendingAnime.poster || ''}" alt="" onerror="this.style.display='none'">
                                <div class="com-anime-selected-info">
                                    <div class="com-anime-selected-title">${escapeHtml(pendingAnime.title)}</div>
                                    <div class="com-anime-selected-desc">${escapeHtml(pendingAnime.synopsis || 'Опис відсутній')}</div>
                                </div>
                                <button class="com-anime-clear" id="comAnimeClear" title="Прибрати">&times;</button>
                            </div>`;
                        document.getElementById('comAnimeClear')?.addEventListener('click', () => {
                            pendingAnime = null;
                            refreshExtra();
                        });
                    } else {
                        extraBox.innerHTML = `
                            <div class="com-anime-search">
                                <input type="text" id="comAnimeSearchInput" placeholder="Введи назву аніме, щоб знайти і порекомендувати...">
                                <div class="com-anime-results" id="comAnimeResults"></div>
                            </div>`;
                        const searchInp = document.getElementById('comAnimeSearchInput');
                        const resultsBox = document.getElementById('comAnimeResults');
                        searchInp?.addEventListener('input', () => {
                            clearTimeout(animeSearchTimer);
                            const q = searchInp.value.trim();
                            if (q.length < 2) { resultsBox.innerHTML = ''; return; }
                            animeSearchTimer = setTimeout(async () => {
                                resultsBox.innerHTML = `<div style="display:flex;justify-content:center;padding:10px;"><svg style="width:16px;height:16px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9"/></svg></div>`;
                                try {
                                    const list = await searchHikka(q, 1);
                                    if (!list || !list.length) {
                                        resultsBox.innerHTML = `<p style="font-size:11.5px;color:var(--text-muted);text-align:center;padding:6px 0;">Нічого не знайдено</p>`;
                                        return;
                                    }
                                    resultsBox.innerHTML = list.slice(0, 6).map((item, i) => `
                                        <div class="com-anime-result-item" data-idx="${i}">
                                            <img src="${item.images?.jpg?.large_image_url || ''}" alt="" onerror="this.style.display='none'">
                                            <span>${escapeHtml(item.title || 'Без назви')}</span>
                                        </div>`).join('');
                                    resultsBox.querySelectorAll('.com-anime-result-item').forEach((el, i) => {
                                        el.addEventListener('click', async () => {
                                            const item = list[i];
                                            resultsBox.innerHTML = `<div style="display:flex;justify-content:center;padding:10px;"><svg style="width:16px;height:16px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9"/></svg></div>`;
                                            let synopsis = '', poster = item.images?.jpg?.large_image_url || '';
                                            try {
                                                const detail = await loadHikkaDetail(item.url);
                                                synopsis = (detail.synopsis || '').trim();
                                                poster = detail.images?.jpg?.large_image_url || poster;
                                            } catch (e) { console.warn('Не вдалося завантажити опис аніме:', e.message); }
                                            pendingAnime = { title: item.title, url: item.url, poster, synopsis: synopsis.slice(0, 300) };
                                            refreshExtra();
                                        });
                                    });
                                } catch (e) {
                                    resultsBox.innerHTML = `<p style="font-size:11.5px;color:var(--text-muted);text-align:center;padding:6px 0;">Помилка пошуку</p>`;
                                }
                            }, 400);
                        });
                    }
                } else if (comPostType === 'ach') {
                    if (pendingAchievement) {
                        extraBox.innerHTML = `
                            <div class="com-ach-selected">
                                <span class="com-ach-selected-icon">${pendingAchievement.icon}</span>
                                <div class="com-ach-selected-info">
                                    <div class="com-ach-selected-name">${escapeHtml(pendingAchievement.name)}</div>
                                    <div class="com-ach-selected-req">${escapeHtml(pendingAchievement.req)}</div>
                                </div>
                                <button class="com-ach-clear" id="comAchClear" title="Прибрати">&times;</button>
                            </div>`;
                        document.getElementById('comAchClear')?.addEventListener('click', () => {
                            pendingAchievement = null;
                            refreshExtra();
                        });
                    } else {
                        const myEarned = getMyEarnedAchievements();
                        extraBox.innerHTML = `
                            <div class="com-ach-picker">
                                <div class="com-ach-grid" id="comAchGrid">
                                    ${myEarned.length ? myEarned.map(a => `
                                        <button class="com-ach-opt" type="button" data-id="${a.id}">
                                            <span class="com-ach-opt-icon">${a.icon}</span>
                                            <span class="com-ach-opt-name">${escapeHtml(a.name)}</span>
                                        </button>`).join('') : `<p class="com-ach-empty">У тебе поки немає досягнень для поширення</p>`}
                                </div>
                            </div>`;
                        extraBox.querySelectorAll('.com-ach-opt').forEach(btn => {
                            btn.addEventListener('click', () => {
                                const a = myEarned.find(x => x.id === btn.dataset.id);
                                if (!a) return;
                                pendingAchievement = { id: a.id, name: a.name, req: a.req, icon: a.icon };
                                refreshExtra();
                            });
                        });
                    }
                } else {
                    extraBox.innerHTML = '';
                }
            }

            function doSend() {
                if (comPostType === 'anime' && !pendingAnime) {
                    showToast('Спочатку обери аніме для рекомендації');
                    return;
                }
                _sendMessage(user, { media: pendingMedia, anime: pendingAnime, achievement: pendingAchievement, replyTo: replyingTo }, () => {
                    pendingMedia.length = 0;
                    pendingAnime = null;
                    pendingAchievement = null;
                    replyingTo = null;
                    _renderReplyBanner();
                    _renderMediaPreview(pendingMedia, mediaPreview);
                    refreshExtra();
                });
            }

            inp.addEventListener('input', () => {
                inp.style.height = 'auto';
                inp.style.height = Math.min(inp.scrollHeight, 110) + 'px';

                if (!mentionBox) return;
                const val = inp.value;
                const caret = inp.selectionStart;
                const upToCaret = val.slice(0, caret);
                const match = upToCaret.match(/@([\wа-яіїєА-ЯІЇЄ]*)$/);
                if (!match) { mentionBox.innerHTML = ''; return; }
                const q = match[1].toLowerCase();
                const authors = _uniqueCommunityAuthors().filter(a => a.name.toLowerCase().includes(q));
                if (!authors.length) { mentionBox.innerHTML = ''; return; }
                mentionBox.innerHTML = `<div class="com-mention-dropdown">${authors.slice(0, 6).map(a => `
                    <div class="com-mention-opt" data-name="${escapeHtml(a.name)}">${a.photo ? `<img src="${a.photo}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" alt="">` : ''}${escapeHtml(a.name)}</div>
                `).join('')}</div>`;
                mentionBox.querySelectorAll('.com-mention-opt').forEach(opt => {
                    opt.addEventListener('click', () => {
                        const name = opt.dataset.name;
                        inp.value = upToCaret.replace(/@[\wа-яіїєА-ЯІЇЄ]*$/, '@' + name + ' ') + val.slice(caret);
                        mentionBox.innerHTML = '';
                        inp.focus();
                    });
                });
            });

            document.addEventListener('click', (e) => {
                if (mentionBox && !mentionBox.contains(e.target) && e.target !== inp) mentionBox.innerHTML = '';
            });

            inp.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
            });

            if (attachBtn && mediaInput) {
                attachBtn.addEventListener('click', () => mediaInput.click());
                mediaInput.addEventListener('change', (e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach(f => {
                        if (f.size > 10 * 1024 * 1024) { showToast('Файл занадто великий (макс 10МБ)'); return; }
                        pendingMedia.push(f);
                    });
                    _renderMediaPreview(pendingMedia, mediaPreview);
                    e.target.value = '';
                });
            }

            sendBtn.addEventListener('click', doSend);

            _refreshComposeExtra = refreshExtra;
            refreshExtra();
        }

        function _renderMediaPreview(media, container) {
            if (!container) return;
            if (!media.length) { container.classList.remove('active'); container.innerHTML = ''; return; }
            container.classList.add('active');
            container.innerHTML = media.map((f, i) => {
                const url = URL.createObjectURL(f);
                const isVideo = f.type.startsWith('video/');
                return `<div class="com-media-thumb">
                    ${isVideo ? `<video src="${url}" muted></video>` : `<img src="${url}" alt="">`}
                    <button class="com-media-remove" onclick="this.parentElement.parentElement._removeIdx=${i}; this.dispatchEvent(new CustomEvent('remove'))" >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>`;
            }).join('');
            container.querySelectorAll('.com-media-remove').forEach((btn, i) => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    media.splice(i, 1);
                    _renderMediaPreview(media, container);
                });
            });
        }

        async function _sendMessage(user, extra, onSent) {
            const inp     = document.getElementById('comInput');
            const sendBtn = document.getElementById('comSendBtn');
            if (!inp) return;
            extra = extra || {};
            const pendingMedia = extra.media || [];
            const pendingAnime = comPostType === 'anime' ? extra.anime : null;
            const pendingAchievement = comPostType === 'ach' ? extra.achievement : null;
            const text = inp.value.trim();

            const hasSomethingToSend = !!text || pendingMedia.length > 0 || !!pendingAnime || !!pendingAchievement;
            if (!hasSomethingToSend) return;

            if (myMemberCache.banned) { showToast('Вас заблоковано в цій групі'); return; }
            if (groupSettingsCache.accessMode === 'admins' && !isPrivilegedRole(myMemberCache.role)) {
                showToast('У цій групі писати можуть лише адміни'); return;
            }

            sendBtn.disabled = true;
            try {
                if (!firebaseInitialized || !db) throw new Error('Firebase недоступний');
                const { addDoc, collection, serverTimestamp } =
                    await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js');
                const p = getProfile();
                const msgData = {
                    text,
                    type: comPostType || 'text',
                    uid: user.uid,
                    authorName: p.nickname || user.displayName || user.email?.split('@')[0] || 'Аніматор',
                    authorPhoto: p.avatar || user.photoURL || '',
                    watermark: (p.nickname || user.displayName || user.email?.split('@')[0] || 'VakDab'),
                    createdAt: serverTimestamp()
                };

                if (extra.replyTo) {
                    msgData.replyTo = {
                        id: extra.replyTo.id || '',
                        authorName: extra.replyTo.authorName || 'Аніматор',
                        text: (extra.replyTo.text || '').slice(0, 100)
                    };
                }

                if (pendingAnime) {
                    msgData.animeData = {
                        title: pendingAnime.title || '',
                        url: pendingAnime.url || '',
                        poster: pendingAnime.poster || '',
                        synopsis: (pendingAnime.synopsis || '').slice(0, 300)
                    };
                }
                if (pendingAchievement) {
                    msgData.achData = {
                        id: pendingAchievement.id || '',
                        name: pendingAchievement.name || '',
                        req: pendingAchievement.req || '',
                        icon: pendingAchievement.icon || ''
                    };
                }

                if (pendingMedia && pendingMedia.length > 0) {
                    msgData.media = [];
                    for (const f of pendingMedia) {
                        try {
                            const formData = new FormData();
                            formData.append('file', f);
                            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
                            const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${f.type.startsWith('video/') ? 'video' : 'image'}/upload`, {
                                method: 'POST', body: formData
                            });
                            const result = await resp.json();
                            if (result.secure_url) {
                                msgData.media.push({ url: result.secure_url, type: f.type.startsWith('video/') ? 'video' : 'image' });
                            }
                        } catch(e) { console.error('Media upload failed:', e); }
                    }
                }

                await addDoc(collection(db, 'community_posts'), msgData);
                DailyStats.increment('postsToday', 1);
                DailyStats.addTotalPost();
                inp.value = '';
                inp.style.height = 'auto';
                comPostType = 'text';
                const inp2 = document.getElementById('comInput');
                if (inp2) inp2.placeholder = 'Написати в спільноті...';
                if (onSent) onSent();
            } catch(e) {
                showToast('Помилка: ' + e.message);
            } finally {
                sendBtn.disabled = false;
            }
        }

        const REACTION_EMOJIS = ['👍','❤️','😂','😮','😢','🔥'];
        const COM_TYPE_ICONS = {
            anime: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
            ach:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>'
        };
        const COM_TYPE_LABELS = { anime: 'Рекомендація', ach: 'Досягнення' };

        function _renderComMessages(currentUser) {
            const box = document.getElementById('comMessages');
            if (!box) return;
            const filtered = comFilterType === 'text'
                ? _comMsgsCache
                : _comMsgsCache.filter(m => (m.type || 'text') === comFilterType);

            if (!filtered.length) {
                const emptyLabels = { text: 'Ще немає повідомлень у спільному чаті. Напиши першим!', anime: 'Ще немає рекомендацій. Поділись улюбленим аніме!', ach: 'Ще немає досягнень у стрічці. Поділись своїм!' };
                box.innerHTML = `<div class="com-feed-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <p>${emptyLabels[comFilterType] || emptyLabels.text}</p>
                </div>`;
                return;
            }

            const myUid = currentUser ? currentUser.uid : null;
            let lastDate = null;
            let html = '';
            filtered.forEach(m => {
                const date = m.createdAt?.toDate ? m.createdAt.toDate() : null;
                const isMe = currentUser && m.uid === currentUser.uid;

                if (date) {
                    const dayStr = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
                    if (dayStr !== lastDate) {
                        lastDate = dayStr;
                        html += `<div class="com-date-sep"><span class="com-date-sep-text">${dayStr}</span></div>`;
                    }
                }

                const gifCls = isGifUrl(m.authorPhoto) ? ' class="is-gif"' : '';
                const av = m.authorPhoto
                    ? `<img src="${m.authorPhoto}" alt=""${gifCls} onerror="this.style.display='none'">`
                    : `<span>${(m.authorName || '?')[0].toUpperCase()}</span>`;
                const timeStr = date ? date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '';
                const typeTag = m.type && COM_TYPE_LABELS[m.type]
                    ? `<div class="com-msg-type">${COM_TYPE_ICONS[m.type] || ''}${COM_TYPE_LABELS[m.type]}</div>`
                    : '';

                let mediaHtml = '';
                if (m.media && Array.isArray(m.media) && m.media.length > 0) {
                    mediaHtml = m.media.map(md => {
                        if (md.type === 'video') {
                            return `<div class="com-msg-media"><video src="${md.url}" controls playsinline></video></div>`;
                        }
                        return `<div class="com-msg-media"><img src="${md.url}" alt="" loading="lazy"></div>`;
                    }).join('');
                }

                let animeCardHtml = '';
                if (m.animeData && m.animeData.title) {
                    const ad = m.animeData;
                    animeCardHtml = `<div class="com-anime-card" data-url="${escapeHtml(ad.url || '')}">
                        <img src="${ad.poster || ''}" alt="" onerror="this.style.display='none'">
                        <div class="com-anime-card-info">
                            <div class="com-anime-card-title">${escapeHtml(ad.title)}</div>
                            ${ad.synopsis ? `<div class="com-anime-card-desc">${escapeHtml(ad.synopsis)}</div>` : ''}
                            <div class="com-anime-card-cta">Дізнатись більше →</div>
                        </div>
                    </div>`;
                }

                let achCardHtml = '';
                if (m.achData && m.achData.name) {
                    const ad = m.achData;
                    achCardHtml = `<div class="com-ach-card">
                        <span class="com-ach-card-icon">${ad.icon || ''}</span>
                        <div>
                            <div class="com-ach-card-name">${escapeHtml(ad.name)}</div>
                            <div class="com-ach-card-req">${escapeHtml(ad.req || '')}</div>
                        </div>
                    </div>`;
                }

                let replyQuoteHtml = '';
                if (m.replyTo && m.replyTo.text) {
                    replyQuoteHtml = `<div class="com-msg-reply-quote">
                        <span class="com-msg-reply-name">${escapeHtml(m.replyTo.authorName || 'Аніматор')}</span>
                        <span class="com-msg-reply-text">${escapeHtml(m.replyTo.text)}</span>
                    </div>`;
                }

                const watermark = m.watermark
                    ? `<div class="com-msg-watermark">${escapeHtml(m.watermark)}</div>`
                    : '';

                const editedTag = m.edited ? `<span class="com-msg-edited-tag">змінено</span>` : '';

                let bodyHtml;
                if (editingMsgId === m.id) {
                    bodyHtml = `<div class="com-msg-edit-box">
                        <textarea class="com-msg-edit-input">${escapeHtml(m.text || '')}</textarea>
                        <div class="com-msg-edit-actions">
                            <button type="button" class="com-msg-edit-cancel">Скасувати</button>
                            <button type="button" class="com-msg-edit-save">Зберегти</button>
                        </div>
                    </div>`;
                } else {
                    const textHtml = m.text ? `<div class="com-msg-text">${_highlightMentions(escapeHtml(m.text))}</div>` : '';
                    bodyHtml = `${typeTag}${replyQuoteHtml}${mediaHtml}${animeCardHtml}${achCardHtml}${textHtml}`;
                }

                let reactionsHtml = '';
                if (m.reactions) {
                    const pills = Object.entries(m.reactions)
                        .filter(([, uids]) => Array.isArray(uids) && uids.length > 0)
                        .map(([emoji, uids]) => {
                            const mine = myUid && uids.includes(myUid);
                            return `<button type="button" class="com-reaction-pill${mine ? ' mine-reacted' : ''}" data-emoji="${emoji}">${emoji}<span class="cnt">${uids.length}</span></button>`;
                        }).join('');
                    if (pills) reactionsHtml = `<div class="com-msg-reactions">${pills}</div>`;
                }

                html += `<div class="com-msg ${isMe ? 'mine' : ''}" data-id="${m.id}">
                    <div class="com-msg-avatar">${av}</div>
                    <div class="com-msg-col">
                        <div class="com-msg-name">${m.authorName || 'Аніматор'}</div>
                        <div class="com-msg-bubble">
                            ${bodyHtml}
                        </div>
                        ${reactionsHtml}
                        ${watermark}
                        <div class="com-msg-time">${timeStr}${editedTag}</div>
                    </div>
                </div>`;
            });

            const wasAtBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
            box.innerHTML = html;
            if (wasAtBottom) box.scrollTop = box.scrollHeight;

            box.querySelectorAll('.com-anime-card').forEach(card => {
                card.addEventListener('click', () => {
                    const url = card.dataset.url;
                    if (url) openPlayerPage(url);
                });
            });

            box.querySelectorAll('.com-reaction-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    const msgEl = pill.closest('.com-msg');
                    if (msgEl) _toggleReaction(msgEl.dataset.id, pill.dataset.emoji, currentUser);
                });
            });

            box.querySelectorAll('.com-msg-bubble').forEach(bubble => {
                let pressTimer = null;
                let startX = 0, startY = 0;
                const clearPress = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
                bubble.addEventListener('pointerdown', (e) => {
                    if (e.target.closest('.com-msg-edit-box') || e.target.closest('.com-anime-card')) return;
                    startX = e.clientX; startY = e.clientY;
                    clearPress();
                    pressTimer = setTimeout(() => {
                        const msgEl = bubble.closest('.com-msg');
                        const id = msgEl?.dataset.id;
                        const m = _comMsgsCache.find(x => x.id === id);
                        if (m) _showMsgContextMenu(m, currentUser, e.clientX, e.clientY);
                    }, 450);
                });
                bubble.addEventListener('pointermove', (e) => {
                    if (pressTimer && (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10)) clearPress();
                });
                ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => bubble.addEventListener(ev, clearPress));
                bubble.addEventListener('contextmenu', (e) => {
                    if (e.target.closest('.com-msg-edit-box') || e.target.closest('.com-anime-card')) return;
                    e.preventDefault();
                    const msgEl = bubble.closest('.com-msg');
                    const id = msgEl?.dataset.id;
                    const m = _comMsgsCache.find(x => x.id === id);
                    if (m) _showMsgContextMenu(m, currentUser, e.clientX, e.clientY);
                });
            });

            box.querySelectorAll('.com-msg-edit-cancel').forEach(btn => {
                btn.addEventListener('click', () => {
                    editingMsgId = null;
                    _renderComMessages(currentUser);
                });
            });
            box.querySelectorAll('.com-msg-edit-save').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const msgEl = btn.closest('.com-msg');
                    const id = msgEl?.dataset.id;
                    const ta = msgEl?.querySelector('.com-msg-edit-input');
                    const newText = ta ? ta.value.trim() : '';
                    if (!newText) { showToast('Повідомлення не може бути порожнім'); return; }
                    try {
                        await updateDoc(doc(db, 'community_posts', id), {
                            text: newText, edited: true, editedAt: serverTimestamp()
                        });
                        editingMsgId = null;
                    } catch (err) { showToast('Помилка редагування: ' + err.message); }
                });
            });
        }

        async function _toggleReaction(msgId, emoji, currentUser) {
            if (!currentUser) { showToast('Увійдіть, щоб реагувати'); return; }
            const m = _comMsgsCache.find(x => x.id === msgId);
            const already = !!(m?.reactions?.[emoji] || []).includes(currentUser.uid);
            try {
                await updateDoc(doc(db, 'community_posts', msgId), {
                    [`reactions.${emoji}`]: already ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
                });
            } catch (e) { showToast('Помилка: ' + e.message); }
        }

        function _closeMsgContextMenu() {
            document.getElementById('comCtxOverlay')?.remove();
            document.querySelector('.com-ctx-menu')?.remove();
        }

        function _showMsgContextMenu(m, currentUser, x, y) {
            _closeMsgContextMenu();
            const isMe = currentUser && m.uid === currentUser.uid;
            const canModerate = isMe || isPrivilegedRole(myMemberCache.role);
            const overlay = document.createElement('div');
            overlay.className = 'com-ctx-overlay';
            overlay.id = 'comCtxOverlay';
            const menu = document.createElement('div');
            menu.className = 'com-ctx-menu';
            menu.innerHTML = `
                <div class="com-ctx-emojis">
                    ${REACTION_EMOJIS.map(em => `<button type="button" class="com-ctx-emoji-btn" data-emoji="${em}">${em}</button>`).join('')}
                </div>
                <div class="com-ctx-actions">
                    <button type="button" class="com-ctx-action" data-action="reply">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                        Відповісти
                    </button>
                    ${isMe ? `<button type="button" class="com-ctx-action" data-action="edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        Редагувати
                    </button>` : ''}
                    ${canModerate ? `<button type="button" class="com-ctx-action com-ctx-danger" data-action="delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Видалити
                    </button>` : ''}
                </div>`;
            document.body.appendChild(overlay);
            document.body.appendChild(menu);

            requestAnimationFrame(() => {
                const rect = menu.getBoundingClientRect();
                let left = x - rect.width / 2;
                let top = y - rect.height - 12;
                left = Math.max(10, Math.min(left, window.innerWidth - rect.width - 10));
                if (top < 10) top = y + 12;
                top = Math.max(10, Math.min(top, window.innerHeight - rect.height - 10));
                menu.style.left = left + 'px';
                menu.style.top = top + 'px';
                menu.classList.add('show');
            });

            overlay.addEventListener('click', _closeMsgContextMenu);
            menu.querySelectorAll('.com-ctx-emoji-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    await _toggleReaction(m.id, btn.dataset.emoji, currentUser);
                    _closeMsgContextMenu();
                });
            });
            menu.querySelector('[data-action="reply"]')?.addEventListener('click', () => {
                _setReplyTo(m);
                _closeMsgContextMenu();
            });
            menu.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
                editingMsgId = m.id;
                _renderComMessages(currentUser);
                _closeMsgContextMenu();
            });
            menu.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
                _closeMsgContextMenu();
                if (!confirm('Видалити це повідомлення?')) return;
                try { await deleteDoc(doc(db, 'community_posts', m.id)); } catch (e) { showToast('Помилка: ' + e.message); }
            });
        }

        // ====================================================================
        //  GROUP MODULE — Telegram-2026-style group management for the
        //  Dumbka/VakDab community. Firestore-backed:
        //   groupSettings/dumbka  { name, description, avatar, accessMode, ownerId }
        //   users/{uid}.role      'owner' | 'admin' | 'member'
        //   users/{uid}.banned    true/false (blocked from posting)
        // ====================================================================
        const GROUP_DOC_ID = 'dumbka';
        let groupSettingsCache = { name: 'VakDab', description: 'Живе спілкування фанатів аніме', avatar: '💬', accessMode: 'all', ownerId: '' };
        let myMemberCache = { role: 'member', banned: false };
        let groupMembersCache = [];
        let groupUnsub = null, membersUnsub = null, myMemberUnsub = null;

        function isPrivilegedRole(role) { return role === 'owner' || role === 'admin'; }

        async function _ensureGroupSettings(currentUser) {
            try {
                const ref = doc(db, 'groupSettings', GROUP_DOC_ID);
                const snap = await getDoc(ref);
                if (!snap.exists()) {
                    await setDoc(ref, {
                        name: 'VakDab',
                        description: 'Живе спілкування фанатів аніме',
                        avatar: '💬',
                        accessMode: 'all',
                        ownerId: currentUser ? currentUser.uid : '',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                    if (currentUser) {
                        await setDoc(doc(db, 'users', currentUser.uid), { role: 'owner' }, { merge: true });
                    }
                }
            } catch (e) { console.warn('Group settings init failed:', e); }
        }

        function _subscribeGroupSettings() {
            if (groupUnsub) { groupUnsub(); groupUnsub = null; }
            groupUnsub = onSnapshot(doc(db, 'groupSettings', GROUP_DOC_ID), snap => {
                if (snap.exists()) {
                    groupSettingsCache = Object.assign({}, groupSettingsCache, snap.data());
                    _updateGroupHeaderUI();
                }
            });
        }

        function _subscribeMyMembership(currentUser) {
            if (myMemberUnsub) { myMemberUnsub(); myMemberUnsub = null; }
            if (!currentUser) { myMemberCache = { role: 'member', banned: false }; return; }
            myMemberUnsub = onSnapshot(doc(db, 'users', currentUser.uid), snap => {
                const d = snap.exists() ? snap.data() : {};
                myMemberCache = { role: d.role || 'member', banned: !!d.banned };
            });
        }

        function _subscribeGroupMembers() {
            if (membersUnsub) { membersUnsub(); membersUnsub = null; }
            const q = query(collection(db, 'users'), limit(500));
            membersUnsub = onSnapshot(q, snap => {
                groupMembersCache = snap.docs.map(d => {
                    const data = d.data();
                    return {
                        uid: d.id,
                        name: data.profile?.nickname || data.profile?.name || 'Аніматор',
                        avatar: data.profile?.avatar || '',
                        role: data.role || 'member',
                        banned: !!data.banned
                    };
                });
                const btn = document.getElementById('grpMembersBtn');
                if (btn) { const c = btn.querySelector('.grp-action-row-count'); if (c) c.textContent = groupMembersCache.length; }
            });
        }

        function _updateGroupHeaderUI() {
            const titleEl = document.querySelector('.com-chat-header-title');
            const subEl = document.querySelector('.com-chat-header-sub');
            const iconEl = document.querySelector('.com-chat-header-icon');
            if (titleEl) titleEl.textContent = groupSettingsCache.name || 'VakDab';
            if (subEl) subEl.innerHTML = `<span class="com-chat-header-dot"></span>${escapeHtml(groupSettingsCache.description || '')}`;
            if (iconEl) {
                if (groupSettingsCache.avatar && groupSettingsCache.avatar.startsWith('http')) {
                    const gifCls = isGifUrl(groupSettingsCache.avatar) ? ' class="is-gif"' : '';
                    iconEl.innerHTML = `<img src="${groupSettingsCache.avatar}" alt=""${gifCls} style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                } else {
                    iconEl.textContent = groupSettingsCache.avatar || '💬';
                }
            }
        }

        function _closeGroupSheets() {
            document.getElementById('grpInfoOverlay')?.remove();
            document.getElementById('grpEditOverlay')?.remove();
            document.getElementById('grpMembersOverlay')?.remove();
            document.querySelector('.grp-member-ctx')?.remove();
        }

        function openGroupInfo(currentUser) {
            _closeGroupSheets();
            const privileged = isPrivilegedRole(myMemberCache.role);
            const overlay = document.createElement('div');
            overlay.className = 'grp-sheet-overlay';
            overlay.id = 'grpInfoOverlay';
            const grpGifCls = (groupSettingsCache.avatar && groupSettingsCache.avatar.startsWith('http') && isGifUrl(groupSettingsCache.avatar)) ? ' class="is-gif"' : '';
            const avatarHtml = (groupSettingsCache.avatar && groupSettingsCache.avatar.startsWith('http'))
                ? `<img src="${groupSettingsCache.avatar}" alt=""${grpGifCls}>`
                : `<span>${groupSettingsCache.avatar || '💬'}</span>`;

            overlay.innerHTML = `
                <div class="grp-sheet" id="grpInfoSheet">
                    <div class="grp-sheet-handle"></div>
                    <div class="grp-info-header">
                        <div class="grp-info-avatar">${avatarHtml}${privileged ? `<button class="grp-avatar-edit" id="grpAvatarEditBtn" title="Змінити аватар"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button>` : ''}</div>
                        <div class="grp-info-name" id="grpInfoName">${escapeHtml(groupSettingsCache.name || 'VakDab')}</div>
                        <div class="grp-info-desc" id="grpInfoDesc">${escapeHtml(groupSettingsCache.description || '')}</div>
                        <div class="grp-info-stats">${groupMembersCache.length || 0} учасників</div>
                    </div>
                    ${privileged ? `<button class="grp-action-row" id="grpEditBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                        <span>Редагувати групу</span>
                    </button>` : ''}
                    <button class="grp-action-row" id="grpMembersBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        <span>Учасники</span>
                        <span class="grp-action-row-count">${groupMembersCache.length || 0}</span>
                    </button>
                    ${privileged ? `
                    <div class="grp-access-section">
                        <div class="grp-access-title">Хто може писати</div>
                        <div class="grp-access-toggle" id="grpAccessToggle">
                            <button class="grp-access-opt${groupSettingsCache.accessMode !== 'admins' ? ' active' : ''}" data-mode="all">Всі учасники</button>
                            <button class="grp-access-opt${groupSettingsCache.accessMode === 'admins' ? ' active' : ''}" data-mode="admins">Тільки адміни</button>
                        </div>
                    </div>` : ''}
                </div>`;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('open'));
            overlay.addEventListener('click', e => { if (e.target === overlay) _closeGroupSheets(); });

            document.getElementById('grpEditBtn')?.addEventListener('click', () => _openEditGroupModal());
            document.getElementById('grpAvatarEditBtn')?.addEventListener('click', () => _openEditGroupModal());
            document.getElementById('grpMembersBtn')?.addEventListener('click', () => _openMembersList(currentUser));
            overlay.querySelectorAll('.grp-access-opt').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const mode = btn.dataset.mode;
                    if (mode === groupSettingsCache.accessMode) return;
                    try {
                        await updateDoc(doc(db, 'groupSettings', GROUP_DOC_ID), { accessMode: mode, updatedAt: serverTimestamp() });
                        showToast(mode === 'admins' ? 'Тепер писати можуть лише адміни' : 'Писати можуть усі учасники');
                    } catch (e) { showToast('Помилка: ' + e.message); }
                });
            });
        }

        function _openEditGroupModal() {
            const overlay = document.createElement('div');
            overlay.className = 'grp-sheet-overlay open';
            overlay.id = 'grpEditOverlay';
            const currentEmoji = (groupSettingsCache.avatar || '').startsWith('http') ? '💬' : (groupSettingsCache.avatar || '💬');
            overlay.innerHTML = `
                <div class="grp-sheet" id="grpEditSheet">
                    <div class="grp-sheet-handle"></div>
                    <div class="grp-edit-title">Редагувати групу</div>
                    <label class="grp-field-label">Назва групи</label>
                    <input type="text" class="grp-field-input" id="grpEditName" maxlength="60" value="${escapeHtml(groupSettingsCache.name || '')}">
                    <label class="grp-field-label">Опис</label>
                    <textarea class="grp-field-input" id="grpEditDesc" maxlength="160" rows="2">${escapeHtml(groupSettingsCache.description || '')}</textarea>
                    <label class="grp-field-label">Емодзі-іконка групи</label>
                    <input type="text" class="grp-field-input" id="grpEditAvatar" maxlength="4" value="${escapeHtml(currentEmoji)}">
                    <div class="grp-edit-actions">
                        <button class="grp-btn-secondary" id="grpEditCancel">Скасувати</button>
                        <button class="grp-btn-primary" id="grpEditSave">Зберегти</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            document.getElementById('grpEditCancel').addEventListener('click', () => overlay.remove());
            document.getElementById('grpEditSave').addEventListener('click', async () => {
                const name = document.getElementById('grpEditName').value.trim() || 'VakDab';
                const desc = document.getElementById('grpEditDesc').value.trim();
                const avatar = document.getElementById('grpEditAvatar').value.trim() || '💬';
                try {
                    await updateDoc(doc(db, 'groupSettings', GROUP_DOC_ID), { name, description: desc, avatar, updatedAt: serverTimestamp() });
                    showToast('Групу оновлено');
                    overlay.remove();
                    _closeGroupSheets();
                } catch (e) { showToast('Помилка: ' + e.message); }
            });
        }

        function _openMembersList(currentUser) {
            const overlay = document.createElement('div');
            overlay.className = 'grp-sheet-overlay open';
            overlay.id = 'grpMembersOverlay';
            const privileged = isPrivilegedRole(myMemberCache.role);
            const rolesOrder = { owner: 0, admin: 1, member: 2 };
            const sorted = [...groupMembersCache].sort((a, b) => (rolesOrder[a.role] ?? 2) - (rolesOrder[b.role] ?? 2) || a.name.localeCompare(b.name));
            const roleBadge = r => r === 'owner' ? '<span class="grp-role-badge owner">👑 Власник</span>' : r === 'admin' ? '<span class="grp-role-badge admin">⭐ Адмін</span>' : '';

            overlay.innerHTML = `
                <div class="grp-sheet grp-sheet-tall" id="grpMembersSheet">
                    <div class="grp-sheet-handle"></div>
                    <div class="grp-edit-title">Учасники · ${sorted.length}</div>
                    <div class="grp-members-list">
                        ${sorted.map(m => {
                            const memGifCls = isGifUrl(m.avatar) ? ' class="is-gif"' : '';
                            return `
                            <div class="grp-member-row" data-uid="${m.uid}">
                                <div class="grp-member-avatar">${m.avatar ? `<img src="${m.avatar}" alt=""${memGifCls}>` : `<span>${escapeHtml((m.name || '?')[0].toUpperCase())}</span>`}</div>
                                <div class="grp-member-info">
                                    <div class="grp-member-name">${escapeHtml(m.name)}${m.banned ? ' <span class="grp-banned-tag">заблок.</span>' : ''}</div>
                                    ${roleBadge(m.role)}
                                </div>
                                ${(privileged && m.uid !== currentUser?.uid && m.role !== 'owner') ? `<button class="grp-member-menu-btn" data-uid="${m.uid}">⋮</button>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            overlay.querySelectorAll('.grp-member-menu-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const uid = btn.dataset.uid;
                    const m = groupMembersCache.find(x => x.uid === uid);
                    if (m) _showMemberActionMenu(m, currentUser, btn);
                });
            });
        }

        function _showMemberActionMenu(member, currentUser, anchorBtn) {
            document.querySelector('.grp-member-ctx')?.remove();
            const isOwnerMe = myMemberCache.role === 'owner';
            const menu = document.createElement('div');
            menu.className = 'grp-member-ctx';
            const isAdmin = member.role === 'admin';
            menu.innerHTML = `
                ${isOwnerMe ? `<button data-action="${isAdmin ? 'demote' : 'promote'}">${isAdmin ? 'Зняти адміна' : 'Призначити адміном'}</button>` : ''}
                <button data-action="${member.banned ? 'unban' : 'ban'}" class="grp-ctx-danger">${member.banned ? 'Розблокувати' : 'Заблокувати'}</button>`;
            document.body.appendChild(menu);
            const rect = anchorBtn.getBoundingClientRect();
            let top = rect.bottom + 6;
            let left = rect.right - 180;
            left = Math.max(10, Math.min(left, window.innerWidth - 190));
            top = Math.min(top, window.innerHeight - 100);
            menu.style.top = top + 'px';
            menu.style.left = left + 'px';
            requestAnimationFrame(() => menu.classList.add('show'));

            const closeMenu = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeMenu, true); } };
            setTimeout(() => document.addEventListener('click', closeMenu, true), 0);

            menu.querySelectorAll('button[data-action]').forEach(b => {
                b.addEventListener('click', async () => {
                    const action = b.dataset.action;
                    try {
                        if (action === 'promote') await updateDoc(doc(db, 'users', member.uid), { role: 'admin' });
                        if (action === 'demote') await updateDoc(doc(db, 'users', member.uid), { role: 'member' });
                        if (action === 'ban') await updateDoc(doc(db, 'users', member.uid), { banned: true });
                        if (action === 'unban') await updateDoc(doc(db, 'users', member.uid), { banned: false });
                        showToast('Готово');
                    } catch (e) { showToast('Помилка: ' + e.message); }
                    menu.remove();
                });
            });
        }

        function _subscribeToChat(currentUser) {
            const box = document.getElementById('comMessages');
            if (!box) return;
            if (comUnsub) { comUnsub(); comUnsub = null; }

            try {
                if (!firebaseInitialized || !db) throw new Error('no db');
                import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js').then(({ collection, query, orderBy, limit, onSnapshot }) => {
                    const q = query(collection(db, 'community_posts'), orderBy('createdAt', 'asc'), limit(80));
                    comUnsub = onSnapshot(q, snap => {
                        _comMsgsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                        _renderComMessages(currentUser);
                    }, () => {
                        box.innerHTML = `<div class="com-feed-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/></svg><p>Не вдалося завантажити чат</p></div>`;
                    });
                });
            } catch(e) {
                if (box) box.innerHTML = `<div class="com-feed-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/></svg><p>Спільнота недоступна без підключення</p></div>`;
            }
        }

        async function loadRatingPage() { initRatingPage(); }
        async function loadRatingList() { initRatingPage(); }

        function escapeHtml(str) {
            return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
        }


        // ====================================================================
        //  ОСНОВНИЙ КОНТЕНТ
        // ====================================================================
        let currentTab = 'main',
            currentPage = 1,
            currentSearchQuery = '',
            currentCategory = '';

        async function fetchContent() {
            if (currentTab === 'top100') { return await fetchHikkaTop100(); }
            if (currentSearchQuery) { return await searchHikka(currentSearchQuery, currentPage); }
            if (currentCategory) { return await fetchHikkaByCategory(currentCategory, currentPage); }
            return await fetchHikkaMain(currentPage);
        }

        function showSkeleton() {
            const container = document.getElementById('animeContainer');
            if (!container) return;
            if (currentTab === 'top100') {
                container.classList.add('popular-list');
                container.classList.remove('anime-grid');
                container.style.display = '';
                let html = '';
                for (let i = 0; i < 6; i++) {
                    html += `
                    <div class="popular-card">
                        <div class="popular-card__poster-wrap"><div class="popular-card__poster skeleton"></div></div>
                        <div class="popular-card__title">&nbsp;</div>
                        <div class="popular-card__desc-skel skeleton"></div>
                        <div class="popular-card__desc-skel skeleton" style="width:70%;"></div>
                    </div>`;
                }
                container.innerHTML = html;
                return;
            }
            container.classList.remove('popular-list');
            container.classList.add('anime-grid');
            container.style.display = 'grid';
            const cols = 2;
            let html = '';
            for (let i = 0; i < cols * 3; i++) {
                html += `<div class="anime-card"><div class="anime-poster skeleton" style="padding-top: 140%;"></div></div>`;
            }
            container.innerHTML = html;
        }

        async function loadContent() {
            const container = document.getElementById('animeContainer');
            if (!container) return;
            if (Router.currentRoute !== 'main') return;
            document.getElementById('genreSectionsContainer').style.display = 'none';
            document.getElementById('animeContainer').style.display = 'grid';
            document.getElementById('profilePageContainer').classList.remove('active');
            document.getElementById('profilePageContainer').style.display = 'none';
            document.getElementById('genrePageContainer').classList.remove('active');
            document.getElementById('genrePageContainer').style.display = 'none';
            document.getElementById('searchPageContainer').classList.remove('active');
            document.getElementById('searchPageContainer').style.display = 'none';
            document.getElementById('settingsPageContainer').classList.remove('active');
            document.getElementById('settingsPageContainer').style.display = 'none';
            showSkeleton();
            try {
                const list = await fetchContent();
                renderCards(list);
            } catch (err) {
                container.innerHTML =
                    `<div class="loader"><i class="fas fa-exclamation-triangle"></i> Помилка: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadContent()">Спробувати знову</button></div>`;
            }
        }

        let popularRenderGen = 0;

        function renderPopularCards(list) {
            const container = document.getElementById('animeContainer');
            container.classList.add('popular-list');
            container.classList.remove('anime-grid');
            container.style.display = '';
            const gen = ++popularRenderGen;
            container.innerHTML = list.map((a, idx) => {
                const poster = a.images?.jpg?.large_image_url || '';
                const title = a.title || 'Без назви';
                const shortSynopsis = (a.synopsis || '').trim();
                const descHtml = shortSynopsis
                    ? `<div class="popular-card__desc">${escapeHtml(shortSynopsis.length > 130 ? shortSynopsis.slice(0,130)+'…' : shortSynopsis)}</div>`
                    : `<div class="popular-card__desc popular-card__desc--empty"></div>`;
                return `
            <div class="popular-card" data-url="${a.url}" data-idx="${idx}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${idx*0.03}s">
              <div class="popular-card__poster-wrap">
                <div class="popular-card__poster">
                  <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='data:image/svg+xml,...'">
                  <span class="popular-card__type" data-role="type" hidden></span>
                </div>
                <div class="popular-card__rank popular-card__rank--loading"><i class="fas fa-spinner fa-pulse"></i></div>
              </div>
              <div class="popular-card__title">${title}</div>
              ${descHtml}
            </div>`;
            }).join('');
            container.querySelectorAll('.popular-card').forEach(card => {
                card.addEventListener('click', () => openPlayerPage(card.dataset.url));
                card.addEventListener('keydown', e => { if (e.key === 'Enter') openPlayerPage(card.dataset.url); });
            });
            renderPagination();
            loadPopularCardDetails(list, gen);
        }

        async function loadPopularCardDetails(list, gen) {
            const container = document.getElementById('animeContainer');
            const CONCURRENCY = 4;
            let cursor = 0;
            async function worker() {
                while (cursor < list.length) {
                    const i = cursor++;
                    const item = list[i];
                    if (gen !== popularRenderGen) return;
                    const card = container?.querySelector(`.popular-card[data-idx="${i}"]`);
                    if (!card) continue;
                    const badge = card.querySelector('.popular-card__rank');
                    const descEl = card.querySelector('.popular-card__desc');
                    try {
                        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 9000));
                        const detail = await Promise.race([fetchAnimeLite(item.url), timeoutPromise]);
                        if (gen !== popularRenderGen) return;
                        if (badge) {
                            badge.classList.remove('popular-card__rank--loading');
                            badge.textContent = detail.episodes != null ? detail.episodes : '–';
                        }
                        if (descEl && detail.synopsis) {
                            descEl.classList.remove('popular-card__desc--empty');
                            descEl.textContent = detail.synopsis.length > 130 ? detail.synopsis.slice(0, 130) + '…' : detail.synopsis;
                        } else if (descEl && !descEl.textContent.trim()) {
                            descEl.textContent = 'Опис відсутній.';
                        }
                    } catch (e) {
                        if (gen !== popularRenderGen) return;
                        if (badge) {
                            badge.classList.remove('popular-card__rank--loading');
                            badge.textContent = '–';
                        }
                        if (descEl && !descEl.textContent.trim()) {
                            descEl.textContent = 'Опис відсутній.';
                        }
                    }
                }
            }
            await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, worker));
        }

        const ANIME_CARD_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><rect width="300" height="420" fill="#2a2a2a"/><text x="150" y="215" font-family="sans-serif" font-size="42" fill="#666" text-anchor="middle">?</text></svg>`
        );

        // ====================================================================
        //  Лінива TMDB-енріхментація метаданих — універсальна
        //  для всіх .anime-card на сайті. Постери завжди залишаються Hikka.
        //  Вантажимо TMDB лише коли картка реально потрапляє у видиму область,
        //  щоб не робити тисячі зайвих запитів і не підвішувати сторінку.
        // ====================================================================
        const animeCardDataMap = new Map();
        function registerAnimeCardData(list) {
            (list || []).forEach(a => { if (a && a.url) animeCardDataMap.set(a.url, a); });
        }

        const TMDB_ENRICH_CONCURRENCY = 3;
        let tmdbEnrichActive = 0;
        const tmdbEnrichQueue = [];

        function queueTmdbEnrich(card) {
            if (!card || card.dataset.tmdbEnriched) return;
            card.dataset.tmdbEnriched = 'pending';
            tmdbEnrichQueue.push(card);
            pumpTmdbEnrichQueue();
        }

        function pumpTmdbEnrichQueue() {
            while (tmdbEnrichActive < TMDB_ENRICH_CONCURRENCY && tmdbEnrichQueue.length) {
                const card = tmdbEnrichQueue.shift();
                tmdbEnrichActive++;
                runTmdbEnrichJob(card).finally(() => {
                    tmdbEnrichActive--;
                    pumpTmdbEnrichQueue();
                });
            }
        }

        async function runTmdbEnrichJob(card) {
            const item = animeCardDataMap.get(card.dataset.url);
            if (!item) { card.dataset.tmdbEnriched = 'failed'; return; }
            try {
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000));
                const info = await Promise.race([fetchTmdbCardInfo(item), timeoutPromise]);
                if (!document.body.contains(card)) return;
                // Підміняємо постер лише після суворого збігу TMDB.
                // Якщо TMDB нічого не знайшов, картка безпечно лишається з Hikka.
                const image = card.querySelector('img');
                const verifiedImage = card.classList.contains('wide-card') ? (info?.frame || info?.poster) : info?.poster;
                if (image && verifiedImage) {
                    image.src = verifiedImage;
                    image.dataset.tmdbArtwork = 'true';
                    image.classList.add('img--loaded');
                }
                const typeBadge = card.querySelector('[data-role="type"]');
                if (typeBadge && item.typeLabel) {
                    typeBadge.textContent = item.typeLabel;
                    typeBadge.hidden = false;
                }
                card.dataset.tmdbType = info?.type || '';
                card.dataset.tmdbEnriched = 'done';
            } catch (e) {
                console.error('TMDB card enrichment failed', { url: card?.dataset?.url, error: e });
                card.dataset.tmdbEnriched = 'failed';
            }
        }

        let animeCardObserver = null;
        function getAnimeCardObserver() {
            if (animeCardObserver) return animeCardObserver;
            animeCardObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    animeCardObserver.unobserve(entry.target);
                    queueTmdbEnrich(entry.target);
                });
            }, { root: null, rootMargin: '250px', threshold: 0.01 });
            return animeCardObserver;
        }

        // TMDB додає тип і wide-карткам landscape artwork; portrait-картки мають fallback Hikka.
        function observeAnimeCardsForTmdb(container) {
            if (!container || Router.currentRoute !== 'main' || typeof IntersectionObserver === 'undefined') return;
            const observer = getAnimeCardObserver();
            container.querySelectorAll('.anime-card, .wide-card').forEach(card => observer.observe(card));
        }

        function renderCards(list) {
            const container = document.getElementById('animeContainer');
            if (!container) return;
            if (!list.length) {
                container.classList.remove('popular-list');
                container.classList.add('anime-grid');
                container.style.display = 'grid';
                container.innerHTML = `
              <div class="loader" style="grid-column:1/-1;text-align:center;">
                <i class="fas fa-search" style="font-size:2.5rem;display:block;margin-bottom:0.8rem;color:var(--text-muted);"></i>
                <p style="font-size:1rem;margin-bottom:0.5rem;">Нічого не знайдено</p>
                <p style="font-size:0.8rem;color:var(--text-muted);">Спробуйте змінити пошуковий запит або фільтри</p>
              </div>`;
                document.getElementById('paginationRow').innerHTML = '';
                return;
            }
            if (currentTab === 'top100') {
                renderPopularCards(list);
                return;
            }
            container.classList.remove('popular-list');
            container.classList.add('anime-grid');
            container.style.display = 'grid';
            registerAnimeCardData(list);
            container.innerHTML = list.map((a, idx) => {
                const poster = a.images?.jpg?.large_image_url || '';
                const title = a.title || 'Без назви';
                return `
            <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${idx*0.03}s">
              <div class="anime-poster">
                <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='${ANIME_CARD_PLACEHOLDER}'">
                <span class="anime-card-type" data-role="type">${escapeHtml(a.typeLabel || animeTypeLabel(a.type))}</span>
              </div>
              <div class="anime-title-under">${title}</div>
            </div>`;
            }).join('');
            container.querySelectorAll('.anime-card').forEach(card => {
                card.addEventListener('click', () => openPlayerPage(card.dataset.url));
                card.addEventListener('keydown', e => { if (e.key === 'Enter') openPlayerPage(card.dataset.url); });
            });
            renderPagination();
            observeAnimeCardsForTmdb(container);
        }

        function renderPagination() {
            const row = document.getElementById('paginationRow');
            if (!row) return;
            const prevDisabled = currentPage <= 1 ? 'disabled' : '';
            row.innerHTML = `
            <button class="btn-outline" onclick="changePage(${currentPage-1})" ${prevDisabled}><i class="fas fa-chevron-left"></i> Назад</button>
            <span class="page-indicator">Сторінка ${currentPage}</span>
            <button class="btn-outline" onclick="changePage(${currentPage+1})">Вперед <i class="fas fa-chevron-right"></i></button>
          `;
        }

        window.changePage = (p) => {
            if (p < 1) return;
            currentPage = p;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loadContent();
        };

        function showTop100() {
            currentTab = 'top100';
            currentPage = 1;
            currentSearchQuery = '';
            currentCategory = '';
            document.querySelectorAll('.action-pill').forEach(p => p.classList.remove('active-pill'));
            document.getElementById('top100Btn')?.classList.add('active-pill');
            if (Router.currentRoute === 'main') loadContent();
            syncLeftdockActive();
            showToast('Популярні аніме');
        }

        function openRandomAnime() {
            fetchHikkaTop100().then(list => list[0] && openPlayerPage(list[0].url)).catch(() => showToast('Не вдалося завантажити каталог'));
            showToast('Випадкове аніме');
        }

        // ====================================================================
        //  ЖАНРОВІ СЕКЦІЇ (ПАРАЛЕЛЬНЕ ЗАВАНТАЖЕННЯ)
        // ====================================================================
        const genreList = Object.entries(GENRE_MAP).map(([name, slug]) => ({ name, slug }));
        let homeSectionsRequestId = 0;
        let homeCatalogRequestId = 0;

        // Homepage artwork comes from Hikka. Preload only lightweight
        // metadata for the first visible cards; posters are never replaced.
        async function preloadHomepageTmdbGroups(groups, limit = 6) {
            const visible = groups.flatMap(group => (group || []).slice(0, limit));
            let cursor = 0;
            const worker = async () => {
                while (cursor < visible.length) {
                    const item = visible[cursor++];
                    try {
                        const info = await fetchTmdbCardInfo(item);
                        if (info?.type) item.tmdbType = info.type;
                    } catch (e) {
                        console.error('Homepage TMDB preload failed', { title: item?.title, error: e });
                    }
                }
            };
            await Promise.all(Array.from({ length: Math.min(4, visible.length) }, worker));
        }

        let homeCatalogPage = 1;
        let homeCatalogItems = [];
        let homeCatalogLoading = false;
        let homeCatalogTotal = 0;
        let homeCatalogMode = 'anime';
        let homeCatalogQuery = '';
        let homeCatalogSort = 'score';
        let homeCatalogView = 'grid';
        let homeCatalogPreset = 'all';

        const HOME_CATALOG_MODES = [
            { key: 'anime', label: 'Аніме', icon: 'fa-photo-film' },
            { key: 'manga', label: 'Манґа', icon: 'fa-palette' },
            { key: 'novel', label: 'Ранобе', icon: 'fa-book-open' }
        ];
        const HOME_CATALOG_PRESETS = [
            { key: 'all', label: 'Усі' },
            { key: 'finished', label: 'Нещодавно завершені' },
            { key: 'ongoing', label: 'Онґоїнг' }
        ];

        function homeCatalogRequestBody() {
            const body = {};
            if (homeCatalogQuery) body.query = homeCatalogQuery;
            if (homeCatalogSort === 'score') body.sort = ['score:desc', 'scored_by:desc'];
            if (homeCatalogSort === 'newest') body.sort = ['start_date:desc'];
            if (homeCatalogSort === 'title') body.sort = ['title_ua:asc'];
            return body;
        }

        function getHomeCatalogVisibleItems() {
            const items = [...homeCatalogItems];
            const filtered = homeCatalogMode === 'anime' && homeCatalogPreset !== 'all'
                ? items.filter(item => homeCatalogPreset === 'finished' ? ['finished', 'released', 'completed'].includes(item.status) : item.status === homeCatalogPreset)
                : items;
            return filtered.sort((a, b) => {
                if (homeCatalogSort === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'uk');
                if (homeCatalogSort === 'newest') return Number(b.year || 0) - Number(a.year || 0);
                return (Number(b.score || b.native_score || 0) - Number(a.score || a.native_score || 0));
            });
        }

        async function fetchHomeCatalogPage(page) {
            const endpoint = homeCatalogMode === 'manga' ? 'manga' : homeCatalogMode === 'novel' ? 'novel' : 'anime';
            const apiUrl = `${HIKKA_API}/${endpoint}?page=${Math.max(1, page)}&size=24`;
            const response = await hikkaRequest(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(homeCatalogRequestBody()) });
            if (!response.ok) throw new Error(`Hikka API: HTTP ${response.status}`);
            const data = await response.json();
            homeCatalogTotal = Number(data.pagination?.total || data.total || data.count || 0);
            return (data.list || []).map(item => hikkaItem(item, endpoint));
        }

        function formatHomeCatalogNumber(value) {
            return new Intl.NumberFormat('uk-UA').format(Number(value) || 0).replace(/\u00a0/g, ' ');
        }

        function homeCatalogCountText(visibleCount) {
            return `Знайдено ${formatHomeCatalogNumber(homeCatalogTotal || visibleCount)} результатів`;
        }

        function homeCatalogCardHtml(a) {
            const poster = a.images?.jpg?.large_image_url || ANIME_CARD_PLACEHOLDER;
            const title = a.title || 'Без назви';
            const type = a.typeLabel || animeTypeLabel(a.type);
            const status = statusLabelUa(a.status);
            const meta = [type, a.year, status].filter(Boolean).join(' · ');
            return `<article class="home-catalog-card" data-url="${escapeHtml(String(a.url || ''))}" tabindex="0" role="button" aria-label="${escapeHtml(title)}">
                <div class="home-catalog-card__poster">
                    <img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy" onload="this.classList.add('img--loaded')" onerror="this.onerror=null;this.src='${ANIME_CARD_PLACEHOLDER}'">
                    ${status ? `<span class="home-catalog-card__status">${escapeHtml(status)}</span>` : ''}
                    <span class="home-catalog-card__play"><i class="fas fa-play"></i></span>
                </div>
                <div class="home-catalog-card__title">${escapeHtml(title)}</div>
                <div class="home-catalog-card__meta">${escapeHtml(meta || 'Аніме')}</div>
            </article>`;
        }

        function bindHomeCatalogCards(root) {
            root?.querySelectorAll('.home-catalog-card:not([data-bound])').forEach(card => {
                card.dataset.bound = '1';
                const open = () => {
                    if (!card.dataset.url) return;
                    if (homeCatalogMode !== 'anime') { showToast('Плеєр доступний для аніме-контенту'); return; }
                    openPlayerPage(card.dataset.url);
                };
                card.addEventListener('click', open);
                card.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
                });
            });
        }

        function buildHomeCatalogSectionHtml(items) {
            const activeMode = HOME_CATALOG_MODES.find(mode => mode.key === homeCatalogMode) || HOME_CATALOG_MODES[0];
            const visibleItems = getHomeCatalogVisibleItems();
            return `<section class="home-catalog-section" id="homeCatalogSection">
                <div class="home-catalog-heading">
                    <div><span class="home-catalog-kicker">HIKKA</span><h2>Каталог ${escapeHtml(activeMode.label.toLowerCase())}</h2></div>
                    <span class="home-catalog-count" id="homeCatalogCount">${homeCatalogCountText(visibleItems.length)}</span>
                </div>
                <nav class="home-catalog-tabs" id="homeCatalogTabs" aria-label="Тип каталогу">
                    ${HOME_CATALOG_MODES.map(mode => `<button class="home-catalog-tab${mode.key === homeCatalogMode ? ' active' : ''}" type="button" data-catalog-mode="${mode.key}"><i class="fas ${mode.icon}"></i><span>${mode.label}</span></button>`).join('')}
                </nav>
                <div class="home-catalog-search-row">
                    <label class="home-catalog-search"><i class="fas fa-search"></i><input id="homeCatalogSearch" type="search" value="${escapeHtml(homeCatalogQuery)}" placeholder="Введіть назву ${activeMode.label.toLowerCase()}..." autocomplete="off"></label>
                </div>
                <div class="home-catalog-controls">
                    <label class="home-catalog-sort"><select id="homeCatalogSort" aria-label="Сортування"><option value="score"${homeCatalogSort === 'score' ? ' selected' : ''}>За оцінкою</option><option value="newest"${homeCatalogSort === 'newest' ? ' selected' : ''}>Новіші</option><option value="title"${homeCatalogSort === 'title' ? ' selected' : ''}>За назвою</option></select><i class="fas fa-arrow-up-wide-short"></i></label>
                    <div class="home-catalog-view-toggle" role="group" aria-label="Вигляд каталогу"><button type="button" class="home-catalog-view${homeCatalogView === 'grid' ? ' active' : ''}" data-catalog-view="grid" aria-label="Сітка"><i class="fas fa-grip"></i></button><button type="button" class="home-catalog-view${homeCatalogView === 'list' ? ' active' : ''}" data-catalog-view="list" aria-label="Список"><i class="fas fa-list"></i></button></div>
                    <div class="home-catalog-quick-actions" role="group" aria-label="Швидкі дії каталогу">
                        <button class="home-catalog-filter-btn home-catalog-schedule-btn" id="homeCatalogScheduleBtn" type="button"><i class="fas fa-calendar-days"></i><span>Розклад виходу</span></button>
                        <button class="home-catalog-filter-btn" id="homeCatalogFilterBtn" type="button"><i class="fas fa-filter"></i><span>Фільтри</span></button>
                    </div>
                </div>
                <div class="home-catalog-presets" id="homeCatalogPresets">${HOME_CATALOG_PRESETS.map(preset => `<button type="button" class="home-catalog-preset${preset.key === homeCatalogPreset ? ' active' : ''}" data-catalog-preset="${preset.key}">${preset.label}</button>`).join('')}</div>
                <div class="home-catalog-results-label" id="homeCatalogResultsLabel">${homeCatalogCountText(visibleItems.length)}</div>
                <div class="home-catalog-grid${homeCatalogView === 'list' ? ' is-list' : ''}" id="homeCatalogGrid">${visibleItems.length ? visibleItems.map(homeCatalogCardHtml).join('') : '<div class="home-catalog-empty">Каталог тимчасово недоступний.</div>'}</div>
                <button class="home-catalog-more" id="homeCatalogMoreBtn" type="button"><i class="fas fa-plus"></i> Продовжити</button>
            </section>`;
        }

        function renderHomeCatalogGrid() {
            const grid = document.getElementById('homeCatalogGrid');
            const count = document.getElementById('homeCatalogCount');
            const number = document.getElementById('homeCatalogResultNumber');
            if (!grid) return;
            const visibleItems = getHomeCatalogVisibleItems();
            grid.classList.toggle('is-list', homeCatalogView === 'list');
            grid.innerHTML = visibleItems.length ? visibleItems.map(homeCatalogCardHtml).join('') : '<div class="home-catalog-empty">Нічого не знайдено за цими параметрами.</div>';
            bindHomeCatalogCards(grid);
            if (count) count.textContent = homeCatalogCountText(visibleItems.length);
            const label = document.getElementById('homeCatalogResultsLabel');
            if (label) label.textContent = homeCatalogCountText(visibleItems.length);
            if (number) number.textContent = formatHomeCatalogNumber(homeCatalogTotal || visibleItems.length);
        }

        function bindHomeCatalogMenu(root) {
            const tabs = root.querySelectorAll('[data-catalog-mode]');
            tabs.forEach(tab => tab.addEventListener('click', async () => {
                if (tab.dataset.catalogMode === homeCatalogMode || homeCatalogLoading) return;
                homeCatalogMode = tab.dataset.catalogMode;
                homeCatalogQuery = '';
                homeCatalogPreset = 'all';
                await reloadHomeCatalog();
            }));
            root.querySelector('#homeCatalogSort')?.addEventListener('change', async event => {
                homeCatalogSort = event.target.value;
                await reloadHomeCatalog();
            });
            root.querySelectorAll('[data-catalog-view]').forEach(button => button.addEventListener('click', () => {
                homeCatalogView = button.dataset.catalogView;
                root.querySelectorAll('[data-catalog-view]').forEach(item => item.classList.toggle('active', item === button));
                renderHomeCatalogGrid();
            }));
            root.querySelectorAll('[data-catalog-preset]').forEach(button => button.addEventListener('click', async () => {
                homeCatalogPreset = button.dataset.catalogPreset;
                root.querySelectorAll('[data-catalog-preset]').forEach(item => item.classList.toggle('active', item === button));
                renderHomeCatalogGrid();
            }));
            let searchTimer = null;
            root.querySelector('#homeCatalogSearch')?.addEventListener('input', event => {
                clearTimeout(searchTimer);
                homeCatalogQuery = event.target.value.trim();
                searchTimer = setTimeout(() => reloadHomeCatalog(), 450);
            });
            root.querySelector('#homeCatalogScheduleBtn')?.addEventListener('click', () => {
                Router.goTo('schedule');
            });
            root.querySelector('#homeCatalogFilterBtn')?.addEventListener('click', () => {
                Router.goTo('genres');
                showToast('Розширені фільтри відкрито');
            });
        }

        function updateHomeCatalogModeLabels() {
            const mode = HOME_CATALOG_MODES.find(item => item.key === homeCatalogMode) || HOME_CATALOG_MODES[0];
            const title = document.querySelector('#homeCatalogSection h2');
            const search = document.getElementById('homeCatalogSearch');
            if (title) title.textContent = `Каталог ${mode.label.toLowerCase()}`;
            if (search) search.placeholder = `Введіть назву ${mode.label.toLowerCase()}...`;
            document.querySelectorAll('[data-catalog-mode]').forEach(tab => tab.classList.toggle('active', tab.dataset.catalogMode === homeCatalogMode));
        }

        async function reloadHomeCatalog() {
            const grid = document.getElementById('homeCatalogGrid');
            if (!grid || homeCatalogLoading) return;
            const requestId = ++homeCatalogRequestId;
            updateHomeCatalogModeLabels();
            homeCatalogLoading = true;
            homeCatalogPage = 1;
            grid.innerHTML = '<div class="loader home-catalog-loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>';
            try {
                const nextItems = await fetchHomeCatalogPage(1);
                if (requestId !== homeCatalogRequestId) return;
                homeCatalogItems = nextItems;
                renderHomeCatalogGrid();
                const button = document.getElementById('homeCatalogMoreBtn');
                if (button) { button.disabled = false; button.innerHTML = '<i class="fas fa-plus"></i> Продовжити'; }
            } catch (error) {
                if (requestId !== homeCatalogRequestId) return;
                grid.innerHTML = `<div class="home-catalog-empty">Не вдалося завантажити каталог. Спробуйте ще раз.</div>`;
                showToast('Помилка завантаження каталогу');
            } finally {
                if (requestId === homeCatalogRequestId) homeCatalogLoading = false;
            }
        }

        async function loadHomeCatalogMore() {
            if (homeCatalogLoading) return;
            const button = document.getElementById('homeCatalogMoreBtn');
            if (!button) return;
            homeCatalogLoading = true;
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Завантаження...';
            try {
                const nextPage = homeCatalogPage + 1;
                const nextItems = await fetchHomeCatalogPage(nextPage);
                const existing = new Set(homeCatalogItems.map(item => item.url));
                homeCatalogItems.push(...nextItems.filter(item => item.url && !existing.has(item.url)));
                homeCatalogPage = nextPage;
                renderHomeCatalogGrid();
                if (!nextItems.length || nextItems.length < 24) button.remove();
                else { button.disabled = false; button.innerHTML = '<i class="fas fa-plus"></i> Продовжити'; }
            } catch (error) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-rotate-right"></i> Спробувати ще';
                showToast('Не вдалося завантажити наступну сторінку каталогу');
            } finally { homeCatalogLoading = false; }
        }
        window.loadHomeCatalogMore = loadHomeCatalogMore;

        async function loadAndDisplayGenreSections() {
            const requestId = ++homeSectionsRequestId;
            const container = document.getElementById('genreSectionsContainer');
            if (!container) return;
            container.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження каталогу...</div>';
            container.style.display = 'flex';
            homeCatalogPage = 1;
            homeCatalogItems = [];
            homeCatalogLoading = false;

            try {
                const catalogItems = await fetchHomeCatalogPage(1).catch(error => {
                    console.error('Помилка завантаження каталогу:', error);
                    homeCatalogTotal = 0;
                    return [];
                });
                if (requestId !== homeSectionsRequestId) return;
                homeCatalogItems = catalogItems.filter(item => item?.url);
                const html = buildHomeCatalogSectionHtml(homeCatalogItems);
                container.innerHTML = html;
                bindHomeCatalogCards(container);
                bindHomeCatalogMenu(container);
                document.getElementById('homeCatalogMoreBtn')?.addEventListener('click', loadHomeCatalogMore);


            } catch (err) {
                console.error('Помилка завантаження головної сторінки:', err);
                container.innerHTML = `<div class="loader"><i class="fas fa-exclamation-triangle"></i> Помилка: ${escapeHtml(err.message || 'невідома помилка')}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadAndDisplayGenreSections()">Спробувати знову</button></div>`;
            }
        }

        function statusLabelUa(status) {
            const map = { ongoing: 'Онгоінг', released: 'Вийшло', finished: 'Завершено', completed: 'Завершено', anons: 'Анонс' };
            if (!status) return '';
            return map[status] || (status.charAt(0).toUpperCase() + status.slice(1));
        }

        function buildAnimeCarouselSectionHtml(sectionId, name, items, variant) {
            if (!items || items.length === 0) return '';
            const isWide = variant === 'wide';
            const cardsHtml = items.map(a => {
                const poster = a.images?.jpg?.large_image_url || ANIME_CARD_PLACEHOLDER;
                const title = a.title || 'Без назви';
                if (!isWide) {
                    const type = '';
                    return `
                            <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}">
                              <div class="anime-poster">
                                <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='${ANIME_CARD_PLACEHOLDER}'">
                                <span class="anime-card-type" data-role="type" ${type ? '' : 'hidden'}>${type}</span>
                              </div>
                              <div class="anime-title-under">${title}</div>
                            </div>
                          `;
                }
                const badges = [];
                if (a.typeLabel) badges.push(`<span class="wide-card__badge">${a.typeLabel}</span>`);
                const statusText = statusLabelUa(a.status);
                if (statusText) badges.push(`<span class="wide-card__badge wide-card__badge--status">${statusText}</span>`);
                if (a.epLabel) badges.push(`<span class="wide-card__badge wide-card__badge--ep">${a.epLabel}</span>`);
                const progressHtml = (a.progress != null)
                    ? `<div class="wide-card__progress"><div class="wide-card__progress-fill" style="width:${Math.min(a.progress, 100)}%"></div></div>`
                    : '';
                return `
                            <div class="wide-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}">
                              <div class="wide-card__frame">
                                <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='${ANIME_CARD_PLACEHOLDER}'">
                                ${badges.length ? `<div class="wide-card__badges">${badges.join('')}</div>` : ''}
                                <div class="wide-card__play"><i class="fas fa-play"></i></div>
                                ${progressHtml}
                                <div class="wide-card__title">${title}</div>
                              </div>
                            </div>
                          `;
            }).join('');
            return `
                    <div class="genre-section" id="${sectionId}">
                      <div class="genre-title">
                        <span class="genre-name">${name}</span>
                      </div>
                      <div class="genre-carousel-wrapper">
                        <button class="carousel-btn carousel-btn-left" data-target="${sectionId}" aria-label="Вліво"><i class="fas fa-chevron-left"></i></button>
                        <div class="genre-carousel${isWide ? ' genre-carousel--wide' : ''}" id="${sectionId}-carousel">
                          ${cardsHtml}
                        </div>
                        <button class="carousel-btn carousel-btn-right" data-target="${sectionId}" aria-label="Вправо"><i class="fas fa-chevron-right"></i></button>
                      </div>
                    </div>
                  `;
        }

        function buildPopularVerticalSectionHtml(items) {
            if (!items || items.length === 0) return '';
            const top = items.slice(0, 10);
            const cardsHtml = top.map((a, idx) => {
                const poster = a.images?.jpg?.large_image_url || ANIME_CARD_PLACEHOLDER;
                const title = a.title || 'Без назви';
                return `
                    <div class="popular-card popular-card--compact" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${idx*0.03}s">
                      <div class="popular-card__poster-wrap">
                        <div class="popular-card__poster">
                          <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add(\'img--loaded\')" onerror="this.src=\'${ANIME_CARD_PLACEHOLDER}\'">
                        </div>
                        <div class="popular-card__rank">${idx + 1}</div>
                      </div>
                      <div class="popular-card__title">${title}</div>
                    </div>
                  `;
            }).join('');
            return `
                    <div class="genre-section" id="genre-popular">
                      <div class="genre-title genre-title--row">
                        <span class="genre-name">Популярні</span>
                        <button class="genre-title-link" id="homePopularShowAllBtn" type="button">Показати всі</button>
                      </div>
                      <div class="popular-list popular-list--home">
                        ${cardsHtml}
                      </div>
                    </div>
                  `;
        }

        function buildHistoryCarouselSectionHtml() {
            const history = Storage.getHistory() || [];
            if (!history.length) return '';
            const seen = new Set();
            const items = [];
            for (const h of history) {
                const key = h.animeId || h.url;
                if (!key || seen.has(key)) continue;
                seen.add(key);
                let epLabel = '';
                if (h.episode) epLabel = h.season ? `С${h.season} · Е${h.episode}` : `Е${h.episode}`;
                items.push({
                    url: h.url,
                    title: h.title,
                    images: { jpg: { large_image_url: h.poster || '' } },
                    epLabel,
                    progress: typeof h.progress === 'number' ? h.progress : null
                });
                if (items.length >= 20) break;
            }
            if (!items.length) return '';
            return buildAnimeCarouselSectionHtml('history-watched', 'Ви дивилися', items, 'wide');
        }


        async function openScheduleItemInPlayer(title, el) {
            if (!title) return;
            const englishTitle = el?.dataset?.titleEn || '';
            const scheduleSlug = el?.dataset?.slug || '';
            if (el && el.classList.contains('schedule-item--loading')) return; // вже вантажиться
            if (el) el.classList.add('schedule-item--loading');
            try {
                let results = await searchHikka(title, 1);
                if ((!results || !results.length) && englishTitle && englishTitle !== title) results = await searchHikka(englishTitle, 1);
                if (results && results.length) {
                    openPlayerPage(results[0].url);
                } else if (scheduleSlug) {
                    // AnimeOn і Hikka часто використовують той самий ID/slug — не втрачаємо тайтл через різницю назв.
                    searchHikka(scheduleSlug || title, 1).then(found => found[0] && openPlayerPage(found[0].url));
                } else {
                    showToast(`Не знайшли «${title}» — спробуйте пошук вручну`);
                    searchPageState.query = title;
                    searchPageState.page = 1;
                    Router.goTo('search');
                }
            } catch (err) {
                showToast('Помилка пошуку: ' + err.message);
            } finally {
                if (el) el.classList.remove('schedule-item--loading');
            }
        }

        // ====================================================================
        //  СТОРІНКА ПОШУКУ
        // ====================================================================
        let searchPageState = { query: '', page: 1, list: [], loading: false };

        function renderSearchPage() {
            const container = document.getElementById('searchPageContainer');
            if (!container) return;
            const initialQuery = searchPageState.query || '';
            container.innerHTML = `
            <div class="search-page-header">
              <h2>Пошук аніме</h2>
            </div>
            <div class="search-page-input-wrap">
              <i class="fas fa-search"></i>
              <input type="text" id="searchPageInput" placeholder="Назва аніме..." autocomplete="off" value="${initialQuery}" />
              <button class="search-page-clear" id="searchPageClearBtn" aria-label="Очистити"><i class="fas fa-times-circle"></i></button>
            </div>
            <div id="searchResultsContainer" class="search-results-grid">
              ${initialQuery ? '<div class="loader"><i class="fas fa-spinner fa-pulse"></i> Пошук...</div>' : `
                <div class="search-empty">
                  <i class="fas fa-search"></i>
                  <p>Введіть назву аніме для пошуку</p>
                  <p class="sub">Наприклад: "Атака титанів", "Наруто", "Сяючі"</p>
                </div>
              `}
            </div>
            <div class="pagination-row" id="searchPagePagination"></div>
          `;
            const input = document.getElementById('searchPageInput');
            const clearBtn = document.getElementById('searchPageClearBtn');
            if (input) {
                let searchPageDebounce;
                input.addEventListener('input', () => {
                    const q = input.value.trim();
                    if (clearBtn) {
                        if (q.length > 0) clearBtn.classList.add('visible');
                        else clearBtn.classList.remove('visible');
                    }
                    clearTimeout(searchPageDebounce);
                    if (q.length >= 2) {
                        searchPageDebounce = setTimeout(() => {
                            searchPageState.query = q;
                            searchPageState.page = 1;
                            performSearchPage();
                        }, 350);
                    } else if (q.length === 0) {
                        searchPageState.query = '';
                        searchPageState.list = [];
                        const results = document.getElementById('searchResultsContainer');
                        if (results) {
                            results.innerHTML = `
                        <div class="search-empty">
                          <i class="fas fa-search"></i>
                          <p>Введіть назву аніме для пошуку</p>
                          <p class="sub">Наприклад: "Атака титанів", "Наруто", "Сяючі"</p>
                        </div>
                      `;
                        }
                        document.getElementById('searchPagePagination').innerHTML = '';
                    }
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const q = input.value.trim();
                        if (q.length >= 2) {
                            searchPageState.query = q;
                            searchPageState.page = 1;
                            performSearchPage();
                        }
                    }
                });
                if (initialQuery.length >= 2) {
                    performSearchPage();
                }
            }
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    const inp = document.getElementById('searchPageInput');
                    if (inp) {
                        inp.value = '';
                        inp.focus();
                        searchPageState.query = '';
                        searchPageState.list = [];
                        const results = document.getElementById('searchResultsContainer');
                        if (results) {
                            results.innerHTML = `
                        <div class="search-empty">
                          <i class="fas fa-search"></i>
                          <p>Введіть назву аніме для пошуку</p>
                          <p class="sub">Наприклад: "Атака титанів", "Наруто", "Сяючі"</p>
                        </div>
                      `;
                        }
                        document.getElementById('searchPagePagination').innerHTML = '';
                        clearBtn.classList.remove('visible');
                    }
                });
            }
            syncLeftdockActive();
        }

        async function performSearchPage() {
            const results = document.getElementById('searchResultsContainer');
            const pagination = document.getElementById('searchPagePagination');
            if (!results) return;
            const query = searchPageState.query.trim();
            if (!query || query.length < 2) return;
            DailyStats.increment('searchesToday', 1);
            searchPageState.loading = true;
            results.innerHTML = '<div class="loader" style="grid-column:1/-1;"><i class="fas fa-spinner fa-pulse"></i> Пошук...</div>';
            pagination.innerHTML = '';
            try {
                const list = await searchHikka(query, searchPageState.page);
                searchPageState.list = list;
                searchPageState.loading = false;
                if (!list.length) {
                    results.innerHTML = `
                <div class="search-empty" style="grid-column:1/-1;">
                  <i class="fas fa-search" style="font-size:2rem;"></i>
                  <p>Нічого не знайдено за запитом "${query}"</p>
                  <p class="sub">Спробуйте змінити пошуковий запит</p>
                </div>
              `;
                    pagination.innerHTML = '';
                    return;
                }
                results.innerHTML = list.map((a, idx) => {
                    const poster = a.images?.jpg?.large_image_url || '';
                    const title = a.title || 'Без назви';
                    return `
                <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${idx*0.03}s">
                  <div class="anime-poster">
                    <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='data:image/svg+xml,...'">
                  </div>
                  <div class="anime-title-under">${title}</div>
                </div>
              `;
                }).join('');
                results.querySelectorAll('.anime-card').forEach(card => {
                    card.addEventListener('click', () => openPlayerPage(card.dataset.url));
                    card.addEventListener('keydown', e => { if (e.key === 'Enter') openPlayerPage(card.dataset
                            .url); });
                });
                const prevDisabled = searchPageState.page <= 1 ? 'disabled' : '';
                pagination.innerHTML = `
              <button class="btn-outline" onclick="changeSearchPage(${searchPageState.page-1})" ${prevDisabled}><i class="fas fa-chevron-left"></i> Назад</button>
              <span class="page-indicator">Сторінка ${searchPageState.page}</span>
              <button class="btn-outline" onclick="changeSearchPage(${searchPageState.page+1})">Вперед <i class="fas fa-chevron-right"></i></button>
            `;
            } catch (err) {
                searchPageState.loading = false;
                results.innerHTML = `
              <div class="loader" style="grid-column:1/-1;">
                <i class="fas fa-exclamation-triangle"></i> Помилка: ${err.message}
                <br><button class="btn-outline" style="margin-top:1rem;" onclick="performSearchPage()">Спробувати знову</button>
              </div>
            `;
                pagination.innerHTML = '';
            }
        }

        window.changeSearchPage = (p) => {
            if (p < 1) return;
            searchPageState.page = p;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            performSearchPage();
        };

        // ====================================================================
        //  СТОРІНКА НАЛАШТУВАНЬ
        // ====================================================================
        // Стан сторінки Налаштувань — яка вкладка активна, чи відкрито прев'ю
        let settingsState = { tab: 'profile', previewOpen: true };

        const PROFILE_EFFECTS = [
            { id: 'none', label: 'Немає', icon: 'fa-ban' },
            { id: 'rain', label: 'Дощ', icon: 'fa-cloud-rain' },
            { id: 'snow', label: 'Сніг', icon: 'fa-snowflake' },
            { id: 'sparks', label: 'Іскри', icon: 'fa-star' },
            { id: 'hearts', label: 'Серця', icon: 'fa-heart' },
            { id: 'bubbles', label: 'Бульбашки', icon: 'fa-circle' }
        ];
        const PROFILE_ATMOSPHERES = [
            { id: 'none', label: 'Немає', icon: 'fa-ban' },
            { id: 'night', label: 'Ніч', icon: 'fa-moon' },
            { id: 'light', label: 'Світло', icon: 'fa-lightbulb' },
            { id: 'fog', label: 'Туман', icon: 'fa-smog' },
            { id: 'aurora', label: 'Північне сяйво', icon: 'fa-wand-magic-sparkles' },
            { id: 'sunset', label: 'Захід сонця', icon: 'fa-sun' }
        ];
        const AVATAR_DECORATIONS = [
            { id: 'none', label: 'Немає', icon: 'fa-ban' },
            { id: 'glow', label: 'Сяйво', icon: 'fa-certificate' },
            { id: 'double', label: 'Подвійне кільце', icon: 'fa-circle-notch' },
            { id: 'dashed', label: 'Пунктир', icon: 'fa-dot-circle' },
            { id: 'halo', label: 'Гало', icon: 'fa-sun' },
            { id: 'diamond', label: 'Діамант', icon: 'fa-gem' }
        ];
        const TAB_STYLE_OPTIONS = [
            { id: 'none', label: 'Немає', icon: 'fa-ban' },
            { id: 'underline', label: 'Підкреслення', icon: 'fa-minus' },
            { id: 'pills', label: 'Пігулки', icon: 'fa-capsules' },
            { id: 'neon', label: 'Неон', icon: 'fa-bolt' },
            { id: 'glass', label: 'Скло', icon: 'fa-gem' }
        ];
        const BANNER_EFFECTS = [
            { id: 'none', label: 'Оригінал', icon: 'fa-image' },
            { id: 'grayscale', label: 'Чорно-біле', icon: 'fa-circle-half-stroke' },
            { id: 'contrast', label: 'Контраст', icon: 'fa-bolt' },
            { id: 'muted', label: 'Приглушені', icon: 'fa-cloud' },
            { id: 'sepia', label: 'Сепія', icon: 'fa-sun' },
            { id: 'invert', label: 'Інверсія', icon: 'fa-circle-notch' },
            { id: 'blur', label: 'Розмиття', icon: 'fa-water' },
            { id: 'grain', label: 'Гранж', icon: 'fa-braille' },
            { id: 'fog', label: 'Дим', icon: 'fa-smog' }
        ];
        const THEME_VARIANTS = [
            { id: 'none', label: 'Немає', color: 'transparent' },
            { id: 'default', label: 'Чорний', color: '#0b0b0b' },
            { id: 'graphite', label: 'Графіт', color: '#4a4a4a' },
            { id: 'white', label: 'Білий', color: '#ffffff' },
            { id: 'lavender', label: 'Лавандовий', color: '#8d5bd1' },
            { id: 'ocean', label: 'Океан', color: '#277fa8' }
        ];

        function buildOptionGridHtml(groupName, options, current) {
            return '<div class="settings-option-grid">' +
                options.map(o => `
                  <button class="settings-option-item${o.id === current ? ' active' : ''}" data-group="${groupName}" data-value="${o.id}">
                    <i class="fas ${o.icon}"></i><span>${o.label}</span>
                  </button>`).join('') +
                '</div>';
        }

        function buildThemeSwatchesHtml(current) {
            return '<div class="settings-swatch-row">' +
                THEME_VARIANTS.map(v => `
                  <div class="settings-swatch${v.id === current ? ' active' : ''}" data-group="themeVariant" data-value="${v.id}">
                    <span class="settings-swatch-check"><i class="fas fa-check-circle"></i></span>
                    <span class="settings-swatch-dot" style="background:${v.color};"></span>
                    <span class="settings-swatch-bar" style="background:${v.color};"></span>
                    <span class="settings-swatch-label">${v.label}</span>
                  </div>`).join('') +
                '</div>';
        }

        function renderSettingsPreviewPanel(profile) {
            const panel = document.getElementById('settingsPreviewPanel');
            if (!panel) return;
            const bannerEffectClass = (profile.bannerEffect && profile.bannerEffect !== 'none') ? ` banner-effect-${profile.bannerEffect}` : '';
            const decorationClass = (profile.avatarDecoration && profile.avatarDecoration !== 'none') ? ` avatar-decoration-${profile.avatarDecoration}` : '';
            const stickerData = Storage.getStickers();
            const nickBadge = stickerData.nickBadge ? `<span class="settings-preview-nick-badge">${renderStickerFaceByKey(stickerData, stickerData.nickBadge)}</span>` : '';
            const avatarMarkup = profile.avatarVideo ? profileMediaMarkup(profile.avatarVideo, '', 'video avatar', profile.avatarVideoSettings) : (profile.avatar ? profileMediaMarkup(profile.avatar, '', 'avatar') : `<span class="settings-preview-avatar-fallback">${escapeHtml((profile.nickname || 'К').charAt(0).toUpperCase())}</span>`);
            panel.innerHTML = `
              <div class="settings-preview-profile">
                <div class="profile-banner settings-preview-banner${bannerEffectClass}">
                  ${profile.bannerVideo ? profileMediaMarkup(profile.bannerVideo, 'preview-banner-img', 'video banner', profile.bannerVideoSettings) : (profile.banner ? profileMediaMarkup(profile.banner, 'preview-banner-img', 'banner') : '')}
                  ${profile.atmosphere && profile.atmosphere !== 'none' ? `<div class="atmosphere-${profile.atmosphere}"></div>` : ''}
                  ${profile.effect && profile.effect !== 'none' ? buildEffectOverlayHtml(profile.effect) : ''}
                  <div class="profile-banner-overlay"></div>
                </div>
                <div class="settings-preview-info">
                  <div class="settings-preview-avatar-wrap${decorationClass}"><div class="profile-avatar">${avatarMarkup}</div></div>
                  <div class="settings-preview-nick-row"><strong>${escapeHtml(profile.nickname || 'Користувач')}</strong>${nickBadge}</div>
                  <div class="settings-preview-handle">@${escapeHtml((profile.nickname || 'user').toLowerCase().replace(/\s/g, '_'))}</div>
                  <div class="settings-preview-bio${profile.bioBold ? ' is-bold' : ''}">${escapeHtml(profile.bio || 'Опис профілю не додано')}</div>
                  <button type="button" class="settings-preview-bio-btn"><i class="fas fa-align-left"></i> Опис профілю</button>
                  <div class="settings-preview-tabs profile-tabs profile-tabs--${profile.tabStyle || 'underline'}"><span class="profile-tab active">Профіль</span><span class="profile-tab">Статистика</span><span class="profile-tab">Досягнення</span></div>
                </div>
              </div>
            `;
        }

        function buildProfileTabHtml(profile, isDark) {
            return `
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-lock"></i>
                <div>
                  <div class="label">Приватність</div>
                  <div class="desc">Приховати статистику та історію переглядів від інших</div>
                </div>
              </div>
              <label class="settings-switch">
                <input type="checkbox" id="settingsPrivacyToggle" ${profile.private ? 'checked' : ''}>
                <span class="settings-switch-slider"></span>
              </label>
            </div>

            <div class="settings-section-title">Основне</div>
            <div class="settings-hint-text">Зміни зберігаються автоматично.</div>
            <div class="settings-field">
              <label class="settings-field-label">Нікнейм</label>
              <input type="text" id="settingsNicknameInput" maxlength="24" value="${escapeHtml(profile.nickname)}">
              <span class="settings-field-hint" id="settingsNicknameCount">${profile.nickname.length}/24</span>
            </div>
            <div class="settings-field">
              <label class="settings-field-label">Ім'я</label>
              <input type="text" id="settingsRealNameInput" maxlength="40" placeholder="Необов'язково" value="${escapeHtml(profile.realName || '')}">
            </div>
            <div class="settings-field">
              <label class="settings-field-label">Дата народження</label>
              <div class="settings-date-row">
                <input type="date" id="settingsBirthdateInput" value="${profile.birthdate || ''}">
                <button class="settings-date-clear" id="settingsBirthdateClear" title="Очистити"><i class="fas fa-times"></i></button>
              </div>
            </div>
            <div class="settings-card settings-card--nested">
              <div class="settings-card-left">
                <i class="fas fa-birthday-cake"></i>
                <div>
                  <div class="label">Показувати день народження</div>
                  <div class="desc">День і місяць (без року). Інші зможуть привітати.</div>
                </div>
              </div>
              <label class="settings-switch">
                <input type="checkbox" id="settingsShowBirthdayToggle" ${profile.showBirthdate ? 'checked' : ''}>
                <span class="settings-switch-slider"></span>
              </label>
            </div>
          `;
        }

        function buildSecurityTabHtml() {
            const authed = Auth.isAuthenticated();
            const guest = Auth.isGuest();
            const user = Auth.getUser();
            const provider = Auth.providerLabel();
            const email = authed && user?.email ? user.email : (guest ? 'Гостьовий режим — дані лише на цьому пристрої' : 'Ви не увійшли');
            const device = detectDeviceInfo(navigator.userAgent);
            const lastLogin = authed && user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString('uk-UA') : '—';
            const canResetPassword = authed && Auth.hasPasswordProvider();

            return `
            <div class="settings-card" style="opacity:${authed || guest ? 1 : 0.6};pointer-events:${authed || guest ? 'auto' : 'none'};">
              <div class="settings-card-left">
                <i class="fas fa-id-badge"></i>
                <div>
                  <div class="label">${email}</div>
                  <div class="desc">Спосіб входу: ${provider}</div>
                </div>
              </div>
            </div>

            ${canResetPassword ? `
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-key"></i>
                <div>
                  <div class="label">Пароль</div>
                  <div class="desc">Надіслати лист для зміни пароля на ${escapeHtml(user.email)}</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsResetPasswordBtn"><i class="fas fa-envelope"></i> Надіслати</button>
            </div>` : ''}

            <div class="settings-section-title">Цей пристрій</div>
            <div class="settings-card" style="opacity:0.6;pointer-events:none;">
              <div class="settings-card-left">
                <i class="fas fa-desktop"></i>
                <div>
                  <div class="label">${device.type}${device.osVersion ? ' · ' + device.osVersion : ''}</div>
                  <div class="desc">Останній вхід: ${lastLogin}</div>
                </div>
              </div>
            </div>

            ${authed || guest ? `
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-right-from-bracket"></i>
                <div>
                  <div class="label">Вийти з акаунту</div>
                  <div class="desc">${guest ? 'Завершити гостьовий сеанс' : 'Дані буде синхронізовано перед виходом'}</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsLogoutBtn"><i class="fas fa-right-from-bracket"></i> Вийти</button>
            </div>` : ''}

            ${authed && !guest ? `
            <div class="settings-section-title">Небезпечна зона</div>
            <div class="settings-card settings-card--danger">
              <div class="settings-card-left">
                <i class="fas fa-triangle-exclamation"></i>
                <div>
                  <div class="label">Видалити акаунт</div>
                  <div class="desc">Незворотньо видаляє акаунт і всі дані з сервера</div>
                </div>
              </div>
              <button class="settings-toggle-btn settings-toggle-btn--danger" id="settingsDeleteAccountBtn"><i class="fas fa-trash"></i> Видалити</button>
            </div>` : ''}
          `;
        }

        function buildSiteTabHtml(isDark) {
            const nextIcon = isDark ? 'fa-sun' : 'fa-moon';
            const nextLabel = isDark ? 'Світла тема' : 'Темна тема';
            const history = Storage.getHistory();
            const bookmarks = Storage.getBookmarks();
            return `
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-circle-half-stroke"></i>
                <div>
                  <div class="label">Тема інтерфейсу</div>
                  <div class="desc">${isDark ? 'Темна тема' : 'Світла тема'} — ${isDark ? 'нічний режим' : 'денний режим'}</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsThemeBtn">
                <i class="fas ${nextIcon}"></i> ${nextLabel}
              </button>
            </div>

            <div class="settings-section-title">Дані</div>
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-download"></i>
                <div>
                  <div class="label">Експортувати мої дані</div>
                  <div class="desc">Профіль, історія (${history.length}) і закладки (${bookmarks.length}) у файл JSON</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsExportDataBtn"><i class="fas fa-file-arrow-down"></i> Завантажити</button>
            </div>
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-clock-rotate-left"></i>
                <div>
                  <div class="label">Очистити історію переглядів</div>
                  <div class="desc">${history.length} записів буде видалено</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsClearHistoryBtn"><i class="fas fa-broom"></i> Очистити</button>
            </div>
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-bookmark"></i>
                <div>
                  <div class="label">Очистити закладки</div>
                  <div class="desc">${bookmarks.length} тайтлів буде видалено зі списку</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsClearBookmarksBtn"><i class="fas fa-broom"></i> Очистити</button>
            </div>

            <div class="settings-section-title">Про сайт</div>
            <div class="settings-card" style="opacity:0.6;pointer-events:none;">
              <div class="settings-card-left">
                <i class="fas fa-globe"></i>
                <div>
                  <div class="label">Джерело даних</div>
                  <div class="desc">hikka.io + mikai.me</div>
                </div>
              </div>
              <span style="font-size:0.75rem;color:var(--text-muted);"><i class="fas fa-check"></i></span>
            </div>
            <div class="settings-card" style="opacity:0.6;pointer-events:none;">
              <div class="settings-card-left">
                <i class="fas fa-language"></i>
                <div>
                  <div class="label">Мова інтерфейсу</div>
                  <div class="desc">Українська (завжди)</div>
                </div>
              </div>
              <span style="font-size:0.75rem;color:var(--text-muted);"><i class="fas fa-flag"></i></span>
            </div>
          `;
        }

        function buildBannerFilterStripHtml(profile) {
            const src = profile.bannerVideo || profile.banner || '';
            const current = profile.bannerEffect || 'none';
            return '<div class="banner-filter-strip">' + BANNER_EFFECTS.map(o => `
                <button class="banner-filter-chip${o.id === current ? ' active' : ''}" data-group="bannerEffect" data-value="${o.id}">
                  <span class="banner-filter-thumb banner-filter-thumb--${o.id}">${src ? (isVideoUrl(src) ? `<video src="${escapeHtml(src)}" muted loop autoplay playsinline></video>` : `<img src="${escapeHtml(src)}" alt="${o.label}">`) : ''}</span>
                  <span class="banner-filter-label">${o.label}</span>
                </button>`).join('') + '</div>';
        }

        function buildStickerSummaryHtml() {
            const s = Storage.getStickers();
            return `
            <div class="settings-sticker-summary">
              <div class="settings-sticker-summary-row">
                <span class="settings-sticker-summary-label">Наліпка біля ніку</span>
                ${s.nickBadge !== null ? `<span class="settings-sticker-mini">${renderStickerFaceByKey(s, s.nickBadge)}</span>` : `<span class="settings-sticker-summary-empty">Не встановлено</span>`}
              </div>
              <button class="settings-media-btn" id="settingsOpenStickersBtn" style="margin-top:0.9rem;width:100%;justify-content:center;">
                <i class="fas fa-icons"></i> Керувати наліпкою біля ніку
              </button>
            </div>`;
        }

        function buildAppearanceTabHtml(profile) {
            const bannerSrc = profile.banner || '';
            const bannerVideoSrc = profile.bannerVideo || '';
            const avatarSrc = profile.avatar || '';
            const avatarVideoSrc = profile.avatarVideo || '';
            return `
            <div class="appearance-intro">
              <div class="appearance-intro-icon"><i class="fas fa-palette"></i></div>
              <div><h3>Налаштуйте свій профіль</h3><p>Змініть банер, аватар, кольори та ефекти. Усі зміни зберігаються автоматично.</p></div>
            </div>
            <div class="appearance-section-card">
            <div class="settings-section-title">Опис профілю</div>
            <div class="settings-field">
              <textarea id="settingsBioInput" maxlength="160" rows="3">${escapeHtml(profile.bio || '')}</textarea>
                <div class="settings-bio-tools">
                  <button type="button" class="settings-bio-bold-btn${profile.bioBold ? ' active' : ''}" id="settingsBioBoldBtn" aria-pressed="${profile.bioBold ? 'true' : 'false'}"><i class="fas fa-bold"></i> Жирний текст</button>
                  <span class="settings-bio-tool-hint">Перемикає жирний опис у профілі та прев’ю.</span>
                </div>
                <span class="settings-field-hint">До 160 символів. Зміни зберігаються автоматично.</span>
              </div>

            <div class="appearance-media-grid">
            <div class="appearance-media-block">
            <div class="settings-section-title">Банер</div>
            <div class="settings-media-card settings-media-card--banner">
              <div class="settings-media-preview--banner" id="settingsBannerPreview">
                ${bannerVideoSrc ? profileMediaMarkup(bannerVideoSrc, '', 'video banner', profile.bannerVideoSettings) : (bannerSrc ? profileMediaMarkup(bannerSrc, '', 'banner') : '')}
              </div>
              <div class="settings-media-actions" aria-label="Керування банером">
                <button class="settings-media-btn" id="settingsBannerUploadBtn"><i class="fas fa-camera"></i> Змінити</button>
                ${bannerVideoSrc ? `<button class="settings-media-btn settings-media-edit-video" id="settingsBannerEditVideoBtn"><i class="fas fa-sliders"></i> Редагувати відео</button>` : (bannerSrc && !isGifUrl(bannerSrc) ? `<button class="settings-media-btn settings-media-edit-image" id="settingsBannerEditImageBtn"><i class="fas fa-crop-simple"></i> Редагувати банер</button>` : '')}
                ${(bannerSrc || bannerVideoSrc) ? `<button class="settings-media-delete" id="settingsBannerRemoveBtn" title="Видалити банер"><i class="fas fa-trash"></i></button>` : ''}
              </div>
            </div>
            <div class="settings-hint-text">JPG, PNG, WebP, GIF, MP4, WebM, MOV · відео до 50 МБ</div>
            </div>
            <div class="appearance-media-block">
            <div class="settings-section-title">Аватар</div>
            <div class="settings-media-card settings-media-card--avatar">
              <div class="settings-media-preview--avatar" id="settingsAvatarPreview">${avatarVideoSrc ? profileMediaMarkup(avatarVideoSrc, '', 'video avatar', profile.avatarVideoSettings) : (avatarSrc ? profileMediaMarkup(avatarSrc, '', 'avatar') : '<i class="fas fa-user"></i>')}</div>
              <div class="settings-media-actions">
                <button class="settings-media-btn" id="settingsAvatarUploadBtn"><i class="fas fa-camera"></i> Змінити</button>
                ${avatarVideoSrc ? `<button class="settings-media-btn settings-media-edit-video" id="settingsAvatarEditVideoBtn"><i class="fas fa-sliders"></i> Редагувати відео</button>` : (avatarSrc && !isGifUrl(avatarSrc) ? `<button class="settings-media-btn settings-media-edit-image" id="settingsAvatarEditImageBtn"><i class="fas fa-crop-simple"></i> Редагувати аватарку</button>` : '')}
                ${(avatarSrc || avatarVideoSrc) ? `<button class="settings-media-delete" id="settingsAvatarRemoveBtn" title="Видалити аватар"><i class="fas fa-trash"></i></button>` : ''}
              </div>
            </div>
            <div class="settings-hint-text">JPG, PNG, WebP, GIF, MP4, WebM, MOV · відео до 50 МБ</div>
            </div>
            </div>
            </div>

            <div class="appearance-section-card appearance-preview-card">
            <button class="settings-preview-toggle-btn" id="settingsPreviewToggleBtn">
              <i class="fas fa-eye${settingsState.previewOpen ? '-slash' : ''}"></i> ${settingsState.previewOpen ? "Сховати прев'ю" : "Прев'ю"}
            </button>
            <div class="settings-preview-panel" id="settingsPreviewPanel" style="display:${settingsState.previewOpen ? 'block' : 'none'};"></div>
            </div>

            <div class="appearance-section-card">
            <div class="settings-section-title">Наліпка біля ніку</div>
            ${buildStickerSummaryHtml()}

            <div class="settings-section-title">Фільтр банера</div>
            <div class="settings-hint-text" style="margin-top:-0.5rem;">Свій колір, чорно-біле чи будь-який інший стиль — оберіть, як показувати ваш банер.</div>
            ${buildBannerFilterStripHtml(profile)}

            <div class="settings-section-title">Ефекти профілю</div>
            ${buildOptionGridHtml('effect', PROFILE_EFFECTS, profile.effect)}

            <div class="settings-section-title">Атмосфера профілю</div>
            ${buildOptionGridHtml('atmosphere', PROFILE_ATMOSPHERES, profile.atmosphere)}

            <div class="settings-section-title">Декорація аватара</div>
            ${buildOptionGridHtml('avatarDecoration', AVATAR_DECORATIONS, profile.avatarDecoration)}

            <div class="settings-section-title">Колір теми</div>
            ${buildThemeSwatchesHtml(profile.themeVariant)}

            <div class="settings-section-title">Стиль табів</div>
            ${buildOptionGridHtml('tabStyle', TAB_STYLE_OPTIONS, profile.tabStyle)}
            </div>
          `;
        }

        function wireProfileTab() {
            const privacyToggle = document.getElementById('settingsPrivacyToggle');
            if (privacyToggle) privacyToggle.addEventListener('change', () => {
                const p = getProfile();
                p.private = privacyToggle.checked;
                saveProfile(p);
                showToast(privacyToggle.checked ? 'Профіль приховано' : 'Профіль відкрито');
            });

            const nickInput = document.getElementById('settingsNicknameInput');
            const nickCount = document.getElementById('settingsNicknameCount');
            if (nickInput) {
                nickInput.addEventListener('input', () => {
                    if (nickCount) nickCount.textContent = `${nickInput.value.length}/24`;
                });
                nickInput.addEventListener('change', () => {
                    const val = nickInput.value.trim();
                    const p = getProfile();
                    if (!val) { nickInput.value = p.nickname; return; }
                    p.nickname = val;
                    saveProfile(p);
                    if (Router.currentRoute === 'profile') renderProfilePage();
                });
            }

            const nameInput = document.getElementById('settingsRealNameInput');
            if (nameInput) nameInput.addEventListener('change', () => {
                const p = getProfile();
                p.realName = nameInput.value.trim();
                saveProfile(p);
            });

            const birthInput = document.getElementById('settingsBirthdateInput');
            const birthClear = document.getElementById('settingsBirthdateClear');
            if (birthInput) birthInput.addEventListener('change', () => {
                const p = getProfile();
                p.birthdate = birthInput.value;
                saveProfile(p);
            });
            if (birthClear) birthClear.addEventListener('click', () => {
                if (birthInput) birthInput.value = '';
                const p = getProfile();
                p.birthdate = '';
                saveProfile(p);
            });

            const birthdayToggle = document.getElementById('settingsShowBirthdayToggle');
            if (birthdayToggle) birthdayToggle.addEventListener('change', () => {
                const p = getProfile();
                p.showBirthdate = birthdayToggle.checked;
                saveProfile(p);
            });
        }

        function wireSecurityTab() {
            document.getElementById('settingsResetPasswordBtn')?.addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                btn.disabled = true;
                const res = await Auth.sendPasswordReset();
                btn.disabled = false;
                showToast(res.success ? 'Лист надіслано на вашу пошту' : 'Помилка: ' + res.error);
            });

            document.getElementById('settingsLogoutBtn')?.addEventListener('click', () => {
                if (!confirm('Вийти з акаунту?')) return;
                Auth.handleExit();
            });

            document.getElementById('settingsDeleteAccountBtn')?.addEventListener('click', async () => {
                if (!confirm('Ви дійсно хочете видалити акаунт? Усі дані на сервері буде втрачено назавжди.')) return;
                const typed = prompt('Для підтвердження введіть слово ВИДАЛИТИ великими літерами:');
                if (typed !== 'ВИДАЛИТИ') { showToast('Скасовано'); return; }
                showToast('Видалення акаунту...');
                const res = await Auth.deleteAccount();
                if (res.success) {
                    showToast('Акаунт видалено');
                    Router.showProfile();
                } else if (res.error === 'requires-recent-login') {
                    showToast('З міркувань безпеки увійдіть ще раз і повторіть видалення');
                } else {
                    showToast('Помилка: ' + res.error);
                }
            });
        }

        function wireSiteTab() {
            const themeBtn = document.getElementById('settingsThemeBtn');
            if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

            document.getElementById('settingsExportDataBtn')?.addEventListener('click', () => {
                const data = {
                    exportedAt: new Date().toISOString(),
                    profile: getProfile(),
                    history: Storage.getHistory(),
                    bookmarks: Storage.getBookmarks(),
                    likes: Storage.getLikes(),
                    watchTimeSeconds: Storage.getWatchTime()
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'monoanime-data-' + new Date().toISOString().slice(0, 10) + '.json';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                showToast('Дані завантажено');
            });

            document.getElementById('settingsClearHistoryBtn')?.addEventListener('click', () => {
                if (!confirm('Очистити всю історію переглядів? Це незворотньо.')) return;
                Storage.setHistory([]);
                if (Auth.isAuthenticated()) Auth.syncUserData().catch(() => {});
                showToast('Історію очищено');
                renderSettingsPage();
            });

            document.getElementById('settingsClearBookmarksBtn')?.addEventListener('click', () => {
                if (!confirm('Очистити всі закладки?')) return;
                Storage.setBookmarks([]);
                if (Auth.isAuthenticated()) Auth.syncUserData().catch(() => {});
                showToast('Закладки очищено');
                renderSettingsPage();
            });
        }

        function wireAppearanceTab(profile) {
            const bioInput = document.getElementById('settingsBioInput');
            if (bioInput) bioInput.addEventListener('change', () => {
                const p = getProfile();
                p.bio = bioInput.value.trim() || p.bio;
                saveProfile(p);
                if (settingsState.previewOpen) renderSettingsPreviewPanel(p);
                if (Router.currentRoute === 'profile') renderProfilePage();
            });
            document.getElementById('settingsBioBoldBtn')?.addEventListener('click', () => {
                const p = getProfile();
                p.bioBold = !p.bioBold;
                saveProfile(p);
                const btn = document.getElementById('settingsBioBoldBtn');
                if (btn) {
                    btn.classList.toggle('active', p.bioBold);
                    btn.setAttribute('aria-pressed', p.bioBold ? 'true' : 'false');
                }
                if (settingsState.previewOpen) renderSettingsPreviewPanel(p);
                if (Router.currentRoute === 'profile') renderProfilePage();
                showToast(p.bioBold ? 'Жирний опис увімкнено' : 'Жирний опис вимкнено');
            });

            document.getElementById('settingsBannerUploadBtn')?.addEventListener('click', () => {
                document.getElementById('bannerFileInput').click();
            });
            document.getElementById('settingsAvatarUploadBtn')?.addEventListener('click', () => {
                document.getElementById('avatarFileInput').click();
            });
            document.getElementById('settingsBannerEditVideoBtn')?.addEventListener('click', () => {
                const p = getProfile();
                editExistingProfileVideo(p.bannerVideo, 'banner');
            });
            document.getElementById('settingsAvatarEditVideoBtn')?.addEventListener('click', () => {
                const p = getProfile();
                editExistingProfileVideo(p.avatarVideo, 'avatar');
            });
            document.getElementById('settingsBannerEditImageBtn')?.addEventListener('click', () => {
                const p = getProfile();
                editExistingProfileImage(p.banner, 'banner');
            });
            document.getElementById('settingsAvatarEditImageBtn')?.addEventListener('click', () => {
                const p = getProfile();
                editExistingProfileImage(p.avatar, 'avatar');
            });
            document.getElementById('settingsBannerRemoveBtn')?.addEventListener('click', () => {
                if (!confirm('Видалити банер?')) return;
                const p = getProfile();
                p.banner = '';
                p.bannerVideo = '';
                p.bannerVideoSettings = null;
                saveProfile(p);
                showToast('Банер видалено');
                renderSettingsPage();
                if (Router.currentRoute === 'profile') renderProfilePage();
            });
            document.getElementById('settingsAvatarRemoveBtn')?.addEventListener('click', () => {
                if (!confirm('Видалити аватар?')) return;
                const p = getProfile();
                p.avatar = '';
                p.avatarVideo = '';
                p.avatarVideoSettings = null;
                saveProfile(p);
                showToast('Аватарку видалено');
                renderSettingsPage();
                if (Router.currentRoute === 'profile') renderProfilePage();
            });

            document.getElementById('settingsOpenStickersBtn')?.addEventListener('click', () => {
                Router.goTo('stickers');
            });

            const previewBtn = document.getElementById('settingsPreviewToggleBtn');
            if (previewBtn) previewBtn.addEventListener('click', () => {
                settingsState.previewOpen = !settingsState.previewOpen;
                const panel = document.getElementById('settingsPreviewPanel');
                if (panel) panel.style.display = settingsState.previewOpen ? 'block' : 'none';
                previewBtn.innerHTML =
                    `<i class="fas fa-eye${settingsState.previewOpen ? '-slash' : ''}"></i> ${settingsState.previewOpen ? "Сховати прев'ю" : "Прев'ю"}`;
                if (settingsState.previewOpen) renderSettingsPreviewPanel(getProfile());
            });
            if (settingsState.previewOpen) renderSettingsPreviewPanel(profile);

            document.querySelectorAll('.settings-option-item, .banner-filter-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    const group = btn.dataset.group;
                    const value = btn.dataset.value;
                    const p = getProfile();
                    p[group] = value;
                    saveProfile(p);
                    document.querySelectorAll(`.settings-option-item[data-group="${group}"]`).forEach(b => b
                        .classList.toggle('active', b.dataset.value === value));
                    document.querySelectorAll(`.banner-filter-chip[data-group="${group}"]`).forEach(b => b
                        .classList.toggle('active', b.dataset.value === value));
                    if (settingsState.previewOpen) renderSettingsPreviewPanel(p);
                    if (Router.currentRoute === 'profile') renderProfilePage();
                });
            });

            document.querySelectorAll('.settings-swatch[data-group="themeVariant"]').forEach(sw => {
                sw.addEventListener('click', () => {
                    const value = sw.dataset.value;
                    const p = getProfile();
                    p.themeVariant = value;
                    saveProfile(p);
                    applyThemeVariant(p);
                    document.querySelectorAll('.settings-swatch[data-group="themeVariant"]').forEach(s => s
                        .classList.toggle('active', s.dataset.value === value));
                });
            });
        }

        const SETTINGS_TABS = [
            { id: 'profile', label: 'Профіль', icon: 'fa-user' },
            { id: 'appearance', label: 'Вигляд', icon: 'fa-palette' },
            { id: 'security', label: 'Безпека', icon: 'fa-shield-halved' },
            { id: 'site', label: 'Сайт', icon: 'fa-sliders' }
        ];

        function buildSettingsTabContent(tab, profile, isDark) {
            if (tab === 'appearance') return buildAppearanceTabHtml(profile);
            if (tab === 'security') return buildSecurityTabHtml();
            if (tab === 'site') return buildSiteTabHtml(isDark);
            return buildProfileTabHtml(profile, isDark);
        }

        function wireSettingsTab(tab, profile) {
            if (tab === 'appearance') wireAppearanceTab(profile);
            else if (tab === 'security') wireSecurityTab();
            else if (tab === 'site') wireSiteTab();
            else wireProfileTab();
        }

        function renderSettingsPage(initialTab) {
            const container = document.getElementById('settingsPageContainer');
            if (!container) return;
            if (SETTINGS_TABS.some(t => t.id === initialTab)) settingsState.tab = initialTab;
            const profile = getProfile();
            const isDark = Storage.getTheme() === 'dark';
            container.innerHTML = `
            <div class="settings-page-header"><h2>Налаштування</h2></div>
            <div class="settings-tabs" id="settingsTabs">
              ${SETTINGS_TABS.map(t => `
                <button class="settings-tab${settingsState.tab === t.id ? ' active' : ''}" data-tab="${t.id}"><i class="fas ${t.icon}"></i> ${t.label}</button>
              `).join('')}
            </div>
            <div id="settingsTabContent">${buildSettingsTabContent(settingsState.tab, profile, isDark)}</div>
          `;
            document.querySelectorAll('#settingsTabs .settings-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    if (tab.dataset.tab === settingsState.tab) return;
                    settingsState.tab = tab.dataset.tab;
                    renderSettingsPage();
                });
            });
            wireSettingsTab(settingsState.tab, profile);
            syncLeftdockActive();
        }

        // ====================================================================
        //  ПРОФІЛЬ
        // ====================================================================
        function getDefaultProfile() {
            return {
                nickname: 'Користувач',
                avatar: '',
                avatarVideo: '',
                banner: '',
                bannerVideo: '',
                bio: 'Аніме ентузіаст. Дивлюсь усе підряд — від слайс-оф-лайф до психологічного трилера.',
                bioBold: false,
                realName: '',
                birthdate: '',
                showBirthdate: true,
                private: false,
                effect: 'none',
                atmosphere: 'none',
                avatarDecoration: 'none',
                themeVariant: 'default',
                tabStyle: 'underline',
                bannerEffect: 'none'
            };
        }

        function getProfile() {
            const p = Storage.getProfile();
            const def = getDefaultProfile();
            if (!p) { Storage.setProfile(def); return def; }
            // Мердж дефолтів і нормалізація старих/пошкоджених profile fields.
            const merged = { ...def, ...p };
            ['nickname', 'avatar', 'avatarVideo', 'banner', 'bannerVideo', 'bio', 'realName', 'birthdate', 'effect', 'atmosphere', 'avatarDecoration', 'themeVariant', 'tabStyle', 'bannerEffect'].forEach(key => {
                if (typeof merged[key] !== 'string') merged[key] = def[key];
            });
            merged.nickname = merged.nickname.trim() || def.nickname;
            merged.bioBold = merged.bioBold === true;
            return merged;
        }

        function saveProfile(data) {
            Storage.setProfile(data);
        }

        function getProfileStats() {
            const history = Storage.getHistory();
            const bookmarks = Storage.getBookmarks();
            const uniqueAnime = new Set(history.map(h => h.animeId || h.title));
            const totalEpisodes = history.length;
            const totalWatchTime = Storage.getWatchTime() || history.reduce((sum, h) => sum + (h.duration || 0), 0);
            const minutes = Math.floor(totalWatchTime / 60);
            const achievements = getAchievements(history, bookmarks, uniqueAnime.size, totalEpisodes, totalWatchTime);
            return {
                viewed: totalEpisodes,
                bookmarks: bookmarks.length,
                achievements: achievements.filter(a => a.unlocked).length,
                totalAchievements: achievements.length,
                watchMinutes: minutes,
                totalWatchTime: totalWatchTime,
                uniqueAnime: uniqueAnime.size,
                achievementsList: achievements,
                history: history.slice(0, 50),
                historyCount: history.length,
                bookmarksList: bookmarks
            };
        }

        function getMedalWordForm(n) {
            const lastTwo = n % 100;
            const lastOne = n % 10;
            if (lastTwo >= 11 && lastTwo <= 19) return 'медалей';
            if (lastOne === 1) return 'медаль';
            if (lastOne >= 2 && lastOne <= 4) return 'медалі';
            return 'медалей';
        }

        function getAchievements(history, bookmarks, uniqueCount, totalEpisodes, totalWatchTime) {
            const xp = calcTotalXP();
            const lvl = getLevel(xp);
            const stats = {
                episodes: totalEpisodes,
                watchMinutes: Math.floor((Number(totalWatchTime) || 0) / 60),
                bookmarks: bookmarks.length,
                xp: xp,
                level: lvl,
                posts: DailyStats.getTotalPosts(),
                ratings: DailyStats.getTotalRatings()
            };
            return ACHIEVEMENTS.map(a => {
                const val = stats[a.field] || 0;
                return {
                    id: a.id,
                    name: a.name,
                    description: a.req,
                    unlocked: val >= a.need,
                    progress: Math.min(Math.floor(val / a.need * 100), 100),
                    icon: a.icon
                };
            });
        }


        // Стиснення зображення перед збереженням (щоб Firestore не падав)
        // Upload image to Cloudinary, return URL
        async function uploadToCloudinary(file, maxW, maxH, quality) {
            // Compress image locally, returns a Blob
            const compressedBlob = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        let w = img.width, hh = img.height;
                        if (w > maxW) { hh = hh * (maxW / w); w = maxW; }
                        if (hh > maxH) { w = w * (maxH / hh); hh = maxH; }
                        canvas.width = Math.round(w);
                        canvas.height = Math.round(hh);
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        // toBlob is async and returns Blob, not dataURL
                        canvas.toBlob(blob => {
                            if (blob) resolve(blob);
                            else reject(new Error('Canvas toBlob failed'));
                        }, 'image/jpeg', quality);
                    };
                    img.onerror = () => reject(new Error('Image load failed'));
                    img.src = ev.target.result;
                };
                reader.onerror = () => reject(new Error('FileReader failed'));
                reader.readAsDataURL(file);
            });

            // Upload Blob to Cloudinary
            const formData = new FormData();
            formData.append('file', compressedBlob, 'upload.jpg');
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
            const resp = await fetch(uploadUrl, { method: 'POST', body: formData, mode: 'cors', credentials: 'omit' });
            if (!resp.ok) {
                const errText = await resp.text().catch(() => '');
                throw new Error('Cloudinary upload failed: ' + resp.status + ' ' + errText.substring(0,100));
            }
            const data = await resp.json();
            if (!data.secure_url) throw new Error('Cloudinary: no secure_url in response');
            /* console.log removed */
            return data.secure_url;
        }

        // Checks if a URL points to a GIF (by extension or query param).
        function isGifUrl(url) {
            if (!url || typeof url !== 'string') return false;
            const lower = url.toLowerCase();
            return lower.endsWith('.gif') || lower.includes('.gif?') || lower.includes('.gif/');
        }

        // Applies 'is-gif' class to an <img> inside a given container if the src is a GIF.
        function applyGifClass(container, imgSelector) {
            if (!container) return;
            const img = container.querySelector(imgSelector || 'img');
            if (img && img.src && isGifUrl(img.src)) {
                img.classList.add('is-gif');
            }
        }

        // Uploads a file/blob to Cloudinary AS-IS, no canvas resize/compression.
        // Used for GIFs so the animation survives (canvas would flatten it to 1 frame).
        async function uploadRawToCloudinary(fileOrBlob, filename, resourceType = 'image') {
            const formData = new FormData();
            formData.append('file', fileOrBlob, filename || (resourceType === 'video' ? 'upload.mp4' : 'upload.gif'));
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
            const resp = await fetch(uploadUrl, { method: 'POST', body: formData, mode: 'cors', credentials: 'omit' });
            if (!resp.ok) {
                const errText = await resp.text().catch(() => '');
                throw new Error('Cloudinary upload failed: ' + resp.status + ' ' + errText.substring(0, 100));
            }
            const data = await resp.json();
            if (!data.secure_url) throw new Error('Cloudinary: no secure_url in response');
            return data.secure_url;
        }

        async function uploadVideoToCloudinary(file, filename) {
            return uploadRawToCloudinary(file, filename || 'profile-video.mp4', 'video');
        }

        function isVideoFile(file) {
            return !!file && (String(file.type || '').startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name || ''));
        }

        function isVideoUrl(url) {
            return !!url && (/\/video\/upload\//i.test(url) || /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(url));
        }

        function profileMediaTransformStyle(settings) {
            if (!settings || typeof settings !== 'object') return '';
            const numberInRange = (value, fallback, min, max) => {
                const n = Number(value);
                return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
            };
            const zoom = numberInRange(settings.zoom, 1, 1, 3);
            const x = numberInRange(settings.x, 0, -100, 100);
            const y = numberInRange(settings.y, 0, -100, 100);
            const mirrorX = settings.mirrorX ? -1 : 1;
            const mirrorY = settings.mirrorY ? -1 : 1;
            return `transform:translate(${x}%, ${y}%) scale(${(zoom * mirrorX).toFixed(4)}, ${(zoom * mirrorY).toFixed(4)});transform-origin:center center;`;
        }

        function profileMediaMarkup(url, className, alt, settings) {
            if (!url) return '';
            const safeUrl = escapeHtml(url);
            const style = escapeHtml(profileMediaTransformStyle(settings));
            const styleAttr = style ? ` style="${style}"` : '';
            if (isVideoUrl(url)) {
                return `<video class="${className}" src="${safeUrl}"${styleAttr} autoplay muted loop playsinline preload="metadata" aria-label="${escapeHtml(alt || '')}"></video>`;
            }
            return `<img class="${className}" src="${safeUrl}"${styleAttr} alt="${escapeHtml(alt || '')}" loading="lazy">`;
        }

        // Uploads an already-cropped Blob (from the image editor canvas) to Cloudinary.
        async function uploadBlobToCloudinary(blob, filename) {
            return uploadRawToCloudinary(blob, filename || 'upload.jpg');
        }

        // ====================================================================
        //  IMAGE EDITOR — fullscreen crop/position tool for avatar & banner
        //  (Telegram/Instagram-style for avatar; YouTube-style device safe-zone
        //  guide for banner). GIFs bypass this entirely to keep animation.
        // ====================================================================
        function _imgeditClamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

        function openImageEditor(file, mode, onSaved) {
            // mode: 'avatar' (1:1 circle) or 'banner' (wide rect w/ device guide)
            const objectUrl = URL.createObjectURL(file);
            const isVideo = isVideoFile(file);
            const isPng = !isVideo && (file.type === 'image/png' || String(file.name || '').toLowerCase().endsWith('.png'));
            const previousBodyOverflow = document.body.style.overflow;
            const overlay = document.createElement('div');
            overlay.className = 'imgedit-overlay';
            document.body.style.overflow = 'hidden';
            overlay.innerHTML = `
                <div class="imgedit-topbar">
                    <button class="imgedit-back" id="imgeditBack" title="Скасувати">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <button class="imgedit-save" id="imgeditSave">Зберегти</button>
                </div>
                <div class="imgedit-stage" id="imgeditStage">
                    ${isVideo ? `<video class="imgedit-img" id="imgeditImg" src="${objectUrl}" muted autoplay loop playsinline preload="metadata"></video>` : `<img class="imgedit-img" id="imgeditImg" src="${objectUrl}" alt="">`}
                    <div class="imgedit-frame" id="imgeditFrame"></div>
                    <div id="imgeditGuides"></div>
                </div>
                <div class="imgedit-bottombar">
                    ${mode === 'banner' ? `<div class="imgedit-caption">Банер профілю виглядатиме по-різному залежно від пристрою. Найбільшим він буде на комп'ютері, менший — на телефоні. Тримайте важливе ближче до центру, щоб воно не обрізалось.</div>` : `<div class="imgedit-caption">Перемістіть і масштабуйте ${isVideo ? 'відео' : 'фото'}, щоб обрати область для аватарки.</div>`}
                    <div class="imgedit-tools-row">
                        <button class="imgedit-tool-btn" id="imgeditCenterBtn" title="По центру">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
                        </button>
                        <button class="imgedit-tool-btn" id="imgeditMirrorHBtn" title="Віддзеркалити по горизонталі">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v18"/><path d="M8 6l-3 3 3 3"/><path d="M16 6l3 3-3 3"/><rect x="3" y="15" width="18" height="6" rx="1" opacity="0.3"/></svg>
                        </button>
                        <button class="imgedit-tool-btn" id="imgeditMirrorVBtn" title="Віддзеркалити по вертикалі">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h18"/><path d="M6 8l3-3 3 3"/><path d="M6 16l3 3 3-3"/><rect x="15" y="3" width="6" height="18" rx="1" opacity="0.3"/></svg>
                        </button>
                    </div>
                    <div class="imgedit-zoom-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15" y2="15"/><line x1="7" y1="10" x2="13" y2="10"/></svg>
                        <input type="range" class="imgedit-zoom-slider" id="imgeditZoom" min="100" max="300" value="100">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15" y2="15"/><line x1="10" y1="7" x2="10" y2="13"/><line x1="7" y1="10" x2="13" y2="10"/></svg>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('open'));

            const stage = overlay.querySelector('#imgeditStage');
            const mediaEl = overlay.querySelector('#imgeditImg');
            const frameEl = overlay.querySelector('#imgeditFrame');
            const guidesEl = overlay.querySelector('#imgeditGuides');
            const zoomSlider = overlay.querySelector('#imgeditZoom');
            const saveBtn = overlay.querySelector('#imgeditSave');
            const backBtn = overlay.querySelector('#imgeditBack');
            const centerBtn = overlay.querySelector('#imgeditCenterBtn');
            const mirrorHBtn = overlay.querySelector('#imgeditMirrorHBtn');
            const mirrorVBtn = overlay.querySelector('#imgeditMirrorVBtn');

            let frameW, frameH, frameX, frameY;
            let natW = 0, natH = 0;
            let baseScale = 1, scale = 1, minScale = 1;
            let tx = 0, ty = 0;
            let mirrorX = false, mirrorY = false;
            let dragging = false, dragStartX = 0, dragStartY = 0, startTx = 0, startTy = 0;

            function layoutFrame() {
                const stageRect = stage.getBoundingClientRect();
                const zoomRatio = minScale > 0 ? scale / minScale : 1;
                if (mode === 'avatar') {
                    const size = Math.min(stageRect.width, stageRect.height) * 0.72;
                    frameW = size; frameH = size;
                } else {
                    frameW = stageRect.width * 0.92;
                    frameH = Math.min(stageRect.height * 0.62, frameW * 0.24);
                }
                frameX = (stageRect.width - frameW) / 2;
                frameY = (stageRect.height - frameH) / 2;
                frameEl.style.width = frameW + 'px';
                frameEl.style.height = frameH + 'px';
                frameEl.style.left = frameX + 'px';
                frameEl.style.top = frameY + 'px';
                frameEl.classList.toggle('circle', mode === 'avatar');

                if (natW && natH && minScale > 0) {
                    minScale = Math.max(frameW / natW, frameH / natH);
                    scale = minScale * Math.max(1, zoomRatio);
                }

                if (mode === 'banner') {
                    const bands = [
                        { wRatio: 1.0, label: 'Телевізор' },
                        { wRatio: 0.72, label: "Комп'ютер" },
                        { wRatio: 0.46, label: 'Усі пристрої' }
                    ];
                    guidesEl.innerHTML = bands.map((b, i) => {
                        const w = frameW * b.wRatio;
                        const x = frameX + (frameW - w) / 2;
                        return `<div class="imgedit-grid-line" style="left:${x}px; top:${frameY}px; width:1px; height:${frameH}px;"></div>
                                <div class="imgedit-grid-line" style="left:${x + w}px; top:${frameY}px; width:1px; height:${frameH}px;"></div>
                                <div class="imgedit-grid-chip" style="left:${x + 4}px; top:${frameY + 4 + i * 16}px;">${b.label}</div>`;
                    }).join('');
                } else {
                    guidesEl.innerHTML = '';
                }
            }

            function clampPan() {
                const w = natW * scale, h = natH * scale;
                const minTx = frameX + frameW - w, maxTx = frameX;
                const minTy = frameY + frameH - h, maxTy = frameY;
                tx = _imgeditClamp(tx, Math.min(minTx, maxTx), Math.max(minTx, maxTx));
                ty = _imgeditClamp(ty, Math.min(minTy, maxTy), Math.max(minTy, maxTy));
            }

            function applyTransform() {
                const scaledW = natW * scale;
                const scaledH = natH * scale;
                const scaleX = mirrorX ? -1 : 1;
                const scaleY = mirrorY ? -1 : 1;
                // The editor image uses transform-origin: 0 0. Shift the origin
                // by the rendered dimensions before applying a negative scale,
                // otherwise iOS moves the mirrored media outside the stage.
                const renderTx = mirrorX ? tx + scaledW : tx;
                const renderTy = mirrorY ? ty + scaledH : ty;
                mediaEl.style.transform = `translate(${renderTx}px, ${renderTy}px) scale(${scale * scaleX}, ${scale * scaleY})`;
            }

            function centerImage() {
                const w = natW * scale, h = natH * scale;
                tx = frameX + (frameW - w) / 2;
                ty = frameY + (frameH - h) / 2;
                clampPan();
                applyTransform();
            }

            const handleMediaReady = () => {
                natW = isVideo ? mediaEl.videoWidth : mediaEl.naturalWidth;
                natH = isVideo ? mediaEl.videoHeight : mediaEl.naturalHeight;
                layoutFrame();
                baseScale = Math.max(frameW / natW, frameH / natH);
                minScale = baseScale;
                scale = baseScale;
                mediaEl.style.width = natW + 'px';
                mediaEl.style.height = natH + 'px';
                zoomSlider.value = 100;
                centerImage();
            };
            if (isVideo) {
                mediaEl.addEventListener('loadedmetadata', handleMediaReady, { once: true });
                if (mediaEl.readyState >= 1) handleMediaReady();
            } else mediaEl.onload = handleMediaReady;

            stage.addEventListener('pointerdown', (e) => {
                if (e.target.closest('.imgedit-tool-btn') || e.target === zoomSlider) return;
                dragging = true;
                dragStartX = e.clientX; dragStartY = e.clientY;
                startTx = tx; startTy = ty;
                stage.setPointerCapture(e.pointerId);
            });
            stage.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                tx = startTx + (e.clientX - dragStartX);
                ty = startTy + (e.clientY - dragStartY);
                clampPan();
                applyTransform();
            });
            ['pointerup', 'pointercancel'].forEach(ev => stage.addEventListener(ev, () => { dragging = false; }));

            stage.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.08 : 0.08;
                const newScale = _imgeditClamp(scale + delta * scale, minScale, minScale * 3);
                scale = newScale;
                zoomSlider.value = Math.round((scale / minScale) * 100);
                clampPan();
                applyTransform();
            }, { passive: false });

            zoomSlider.addEventListener('input', () => {
                scale = minScale * (parseFloat(zoomSlider.value) / 100);
                clampPan();
                applyTransform();
            });

            // Центрування
            centerBtn.addEventListener('click', () => centerImage());

            // Віддзеркалення по горизонталі
            mirrorHBtn.addEventListener('click', () => {
                mirrorX = !mirrorX;
                mirrorHBtn.classList.toggle('active', mirrorX);
                applyTransform();
            });

            // Віддзеркалення по вертикалі
            mirrorVBtn.addEventListener('click', () => {
                mirrorY = !mirrorY;
                mirrorVBtn.classList.toggle('active', mirrorY);
                applyTransform();
            });

            function closeEditor() {
                overlay.classList.remove('open');
                window.removeEventListener('resize', layoutFrame);
                setTimeout(() => {
                    overlay.remove();
                    URL.revokeObjectURL(objectUrl);
                    document.body.style.overflow = previousBodyOverflow;
                }, 200);
            }
            backBtn.addEventListener('click', closeEditor);

            saveBtn.addEventListener('click', () => {
                saveBtn.disabled = true;
                saveBtn.textContent = '...';
                try {
                    if (isVideo) {
                        const centeredTx = frameX + (frameW - natW * scale) / 2;
                        const centeredTy = frameY + (frameH - natH * scale) / 2;
                        const zoom = _imgeditClamp(scale / Math.max(minScale, 0.0001), 1, 3);
                        closeEditor();
                        onSaved({
                            zoom: Number(zoom.toFixed(4)),
                            x: Number((((tx - centeredTx) / Math.max(frameW, 1)) * 100).toFixed(4)),
                            y: Number((((ty - centeredTy) / Math.max(frameH, 1)) * 100).toFixed(4)),
                            mirrorX: !!mirrorX,
                            mirrorY: !!mirrorY
                        });
                        return;
                    }
                    const outScale = mode === 'avatar' ? (480 / frameW) : (Math.max(1, 1200 / frameW));
                    const outW = Math.round(frameW * outScale);
                    const outH = Math.round(frameH * outScale);
                    const canvas = document.createElement('canvas');
                    canvas.width = outW; canvas.height = outH;
                    const ctx = canvas.getContext('2d');
                    const sx = (frameX - tx) / scale;
                    const sy = (frameY - ty) / scale;
                    const sW = frameW / scale;
                    const sH = frameH / scale;

                    // Mirror the already-selected crop exactly once. The old
                    // implementation inverted both source and destination for
                    // vertical flips, which cancelled the mirror on iOS.
                    ctx.save();
                    if (mirrorX) {
                        ctx.translate(outW, 0);
                        ctx.scale(-1, 1);
                    }
                    if (mirrorY) {
                        ctx.translate(0, outH);
                        ctx.scale(1, -1);
                    }
                    ctx.drawImage(mediaEl, sx, sy, sW, sH, 0, 0, outW, outH);
                    ctx.restore();

                    // PNG зберігаємо з прозорістю, решта — JPEG
                    const format = isPng ? 'image/png' : 'image/jpeg';
                    const quality = isPng ? undefined : 0.88;
                    canvas.toBlob(blob => {
                        if (!blob) { showToast('Помилка обробки зображення'); saveBtn.disabled = false; saveBtn.textContent = 'Зберегти'; return; }
                        closeEditor();
                        onSaved(blob);
                    }, format, quality);
                } catch (err) {
                    console.error('Image editor save failed:', err);
                    showToast('Помилка кадрування');
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Зберегти';
                }
            });

            window.addEventListener('resize', () => {
                layoutFrame();
                if (natW && natH) {
                    centerImage();
                }
            });
        }

        async function editExistingProfileImage(url, mode) {
            if (!url) return;
            showToast('Підготовка редактора зображення...');
            try {
                const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
                if (!response.ok) throw new Error('Не вдалося завантажити зображення');
                const blob = await response.blob();
                const type = blob.type || 'image/jpeg';
                const extension = type === 'image/png' ? 'png' : 'jpg';
                const file = new File([blob], `${mode}.${extension}`, { type });
                openImageEditor(file, mode, async (croppedBlob) => {
                    try {
                        showToast(mode === 'avatar' ? 'Збереження аватарки...' : 'Збереження банера...');
                        const imageUrl = await uploadBlobToCloudinary(croppedBlob, `${mode}.${extension}`);
                        const profile = getProfile();
                        if (mode === 'avatar') {
                            profile.avatar = imageUrl;
                            profile.avatarVideo = '';
                            profile.avatarVideoSettings = null;
                        } else {
                            profile.banner = imageUrl;
                            profile.bannerVideo = '';
                            profile.bannerVideoSettings = null;
                        }
                        saveProfile(profile);
                        if (Router.currentRoute === 'profile') renderProfilePage();
                        if (Router.currentRoute === 'settings') renderSettingsPage();
                        showToast(mode === 'avatar' ? 'Аватарку оновлено' : 'Банер оновлено');
                    } catch (err) {
                        console.error('Edited profile image upload error:', err);
                        showToast('Не вдалося зберегти відредаговане зображення');
                    }
                });
            } catch (err) {
                console.error('Existing profile image editor error:', err);
                showToast('Не вдалося відкрити редактор зображення');
            }
        }

        async function editExistingProfileVideo(url, mode) {
            if (!url) return;
            showToast('Підготовка редактора відео...');
            try {
                const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
                if (!response.ok) throw new Error('Не вдалося завантажити відео');
                const blob = await response.blob();
                const file = new File([blob], `${mode}.mp4`, { type: blob.type || 'video/mp4' });
                openImageEditor(file, mode, (settings) => {
                    const profile = getProfile();
                    profile[mode === 'avatar' ? 'avatarVideoSettings' : 'bannerVideoSettings'] = settings;
                    saveProfile(profile);
                    if (Router.currentRoute === 'profile') renderProfilePage();
                    if (Router.currentRoute === 'settings') renderSettingsPage();
                    showToast(mode === 'avatar' ? 'Відео-аватарку оновлено' : 'Відео-банер оновлено');
                });
            } catch (err) {
                console.error('Existing profile video editor error:', err);
                showToast('Не вдалося відкрити редактор відео');
            }
        }

        function compressImage(file, maxW, maxH, quality, callback) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let w = img.width, hh = img.height;
                    if (w > maxW) { hh = hh * (maxW / w); w = maxW; }
                    if (hh > maxH) { w = w * (maxH / hh); hh = maxH; }
                    canvas.width = Math.round(w);
                    canvas.height = Math.round(hh);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    let result = canvas.toDataURL('image/jpeg', quality);
                    if (result.length > 500000) result = canvas.toDataURL('image/jpeg', 0.4);
                    if (result.length > 500000) result = canvas.toDataURL('image/jpeg', 0.2);
                    callback(result);
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }

function renderProfilePage() {
            const container = document.getElementById('profilePageContainer');
            if (!container) return;
            if (!Auth.isAuthenticated() && !Auth.isGuest()) {
                renderAuthPage();
                return;
            }
            const isGuestMode = Auth.isGuest();
            const profile = getProfile();
            const stats = getProfileStats();
            // GIF detection — use isGifUrl helper
            const activeBanner = profile.bannerVideo || profile.banner || '';
            const activeAvatar = profile.avatarVideo || profile.avatar || '';
            const isGifBanner = isGifUrl(activeBanner);
            const isGifAvatar = isGifUrl(activeAvatar);
            const bannerEffectClass = (profile.bannerEffect && profile.bannerEffect !== 'none') ? ` banner-effect-${profile.bannerEffect}` : '';
            const decorationClass = (profile.avatarDecoration && profile.avatarDecoration !== 'none') ? ` avatar-decoration-${profile.avatarDecoration}` : '';
            const tabsStyleClass = (profile.tabStyle && profile.tabStyle !== 'underline' && profile.tabStyle !== 'none') ? ` profile-tabs--${profile.tabStyle}` : '';
            const bannerClass = (isGifBanner ? 'profile-banner is-gif' : 'profile-banner') + bannerEffectClass;
            const avatarClass = isGifAvatar ? 'profile-avatar is-gif' : 'profile-avatar';
            const profileNickname = escapeHtml(profile.nickname);
            const profileHandle = escapeHtml('@' + profile.nickname.toLowerCase().replace(/\s/g, '_'));
            const profileBioText = escapeHtml(profile.bio);
            const stickerData = Storage.getStickers();
            container.innerHTML = `
            <div class="profile-wrapper">
              <div class="${bannerClass}">
                ${profile.bannerVideo ? profileMediaMarkup(profile.bannerVideo, 'profile-banner-media', 'video banner', profile.bannerVideoSettings) : (profile.banner ? `<img class="profile-banner-media" src="${escapeHtml(profile.banner)}" alt="banner" onerror="this.style.display='none'">` : '')}
                ${profile.atmosphere && profile.atmosphere !== 'none' ? `<div class="atmosphere-${profile.atmosphere}"></div>` : ''}
                ${profile.effect && profile.effect !== 'none' ? buildEffectOverlayHtml(profile.effect) : ''}
                <div class="profile-banner-overlay"></div>
              </div>
              <div class="profile-info">
                <div class="profile-avatar-wrap${decorationClass}">
                  <div class="${avatarClass}">
                    ${profile.avatarVideo ? profileMediaMarkup(profile.avatarVideo, 'profile-avatar-media', 'video avatar', profile.avatarVideoSettings) : (profile.avatar ? `<img class="profile-avatar-media" src="${escapeHtml(profile.avatar)}" alt="avatar" onerror="this.style.display='none'; this.parentElement.querySelector('.avatar-placeholder').style.display='flex'">` : '')}
                    <span class="avatar-placeholder" style="display:none;">${escapeHtml(profile.nickname.charAt(0).toUpperCase())}</span>
                  </div>
                </div>
                <div class="profile-nick-row">
                  <span class="profile-nick" id="profileNickText">${profileNickname}</span>
                  ${stickerData.nickBadge !== null ? `<span class="profile-nick-badge" title="Наліпка профілю">${renderStickerFaceByKey(stickerData, stickerData.nickBadge)}</span>` : ''}
                </div>
                <div class="profile-meta">
                  <span>${profileHandle}</span>
                </div>
                <div class="profile-bio-row">
                  <div class="profile-bio${profile.bioBold ? ' is-bold' : ''}" id="profileBioText">${profileBioText}</div>
                </div>
                <div class="profile-stats">
                  <div class="profile-stat-pill">
                    <div class="num">${stats.viewed}</div>
                    <div class="label">Переглянуто</div>
                  </div>
                  <div class="profile-stat-pill">
                    <div class="num">${stats.bookmarks}</div>
                    <div class="label">Закладки</div>
                  </div>
                  <div class="profile-stat-pill">
                    <div class="num">${stats.achievements}</div>
                    <div class="label">Досягнень</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="profile-tabs${tabsStyleClass}" id="profileTabs">
              <button class="profile-tab active" data-tab="history">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                Історія
              </button>
              <button class="profile-tab" data-tab="bookmarks">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z"/></svg>
                Закладки
              </button>
              <button class="profile-tab" data-tab="achievements">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.04 2.6a1 1 0 0 1 1.92 0l1.7 5.18a1 1 0 0 0 .95.69h5.47a1 1 0 0 1 .59 1.8l-4.43 3.22a1 1 0 0 0-.36 1.12l1.7 5.18a1 1 0 0 1-1.54 1.12l-4.42-3.22a1 1 0 0 0-1.18 0l-4.42 3.22a1 1 0 0 1-1.54-1.12l1.7-5.18a1 1 0 0 0-.36-1.12L3.3 10.27a1 1 0 0 1 .59-1.8h5.47a1 1 0 0 0 .95-.69l1.7-5.18z"/></svg>
                Досягнення
              </button>
            </div>
            <div id="profilePanels">
              <div class="profile-panel active" id="profilePanel-history">
                ${renderHistoryPanel(stats.history)}
              </div>
              <div class="profile-panel" id="profilePanel-bookmarks">
                ${renderBookmarksPanel(stats.bookmarksList)}
              </div>
              <div class="profile-panel" id="profilePanel-achievements">
                ${renderAchievementsPanel(stats.achievementsList, stats.totalWatchTime, stats.historyCount)}
              </div>
            </div>
          `;
            document.querySelectorAll('#profilePageContainer .profile-avatar-media').forEach(media => {
                media.addEventListener('error', () => {
                    media.style.display = 'none';
                    const placeholder = media.parentElement?.querySelector('.avatar-placeholder');
                    if (placeholder) placeholder.style.display = 'flex';
                });
            });
            document.querySelectorAll('#profilePageContainer .profile-banner-media').forEach(media => {
                media.addEventListener('error', () => { media.style.display = 'none'; });
            });
            document.querySelectorAll('[data-profile-url]').forEach(card => {
                const openCard = () => {
                    const url = card.dataset.profileUrl;
                    if (url) openPlayerPage(url);
                };
                card.addEventListener('click', openCard);
                card.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openCard();
                    }
                });
            });
            document.querySelectorAll('.profile-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    const target = this.dataset.tab;
                    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.profile-panel').forEach(p => p.classList.remove('active'));
                    this.classList.add('active');
                    document.getElementById('profilePanel-' + target).classList.add('active');
                });
            });
            const profileSlots = document.querySelectorAll('.profile-medal-slot');
            let selectedMedalIndex = null;
            let draggedMedalIndex = null;
            let touchDrag = null;
            let holdTimer = null;
            let suppressNextClick = false;
            const clearTouchDrag = () => {
                clearTimeout(holdTimer);
                holdTimer = null;
                document.querySelectorAll('.profile-medal-slot.is-touch-dragging,.profile-medal-slot.is-drag-over').forEach(el => el.classList.remove('is-touch-dragging','is-drag-over'));
                touchDrag = null;
            };
            const slotAtPoint = (x, y) => document.elementFromPoint(x, y)?.closest('.profile-medal-slot');
            const dropTouchSticker = (event) => {
                clearTimeout(holdTimer);
                if (!touchDrag) return clearTouchDrag();
                const target = slotAtPoint(event.clientX, event.clientY);
                const to = target ? Number(target.dataset.medalIndex) : null;
                const from = touchDrag.from;
                if (to !== null && to !== from) {
                    suppressNextClick = true;
                    moveProfileMedal(from, to);
                }
                clearTouchDrag();
            };
            const moveProfileMedal = (from, to) => {
                if (from === to || from === null || to === null) return;
                const current = Storage.getStickers();
                const keys = (current.medals || []).slice(0, PROFILE_STICKER_SLOTS);
                if (!keys[from]) return;
                while (keys.length < PROFILE_STICKER_SLOTS) keys.push(null);
                const targetWasFilled = Boolean(keys[to]);
                [keys[from], keys[to]] = [keys[to], keys[from]];
                current.medals = keys.filter(Boolean).slice(0, PROFILE_STICKER_SLOTS);
                Storage.setStickers(current);
                renderProfilePage();
                showToast(targetWasFilled ? 'Наліпки замінено' : 'Наліпку переміщено');
            };
            profileSlots.forEach(slot => {
                slot.addEventListener('pointerdown', event => {
                    const index = Number(slot.dataset.medalIndex);
                    if (!slot.classList.contains('is-filled')) return;
                    holdTimer = setTimeout(() => {
                        touchDrag = { from: index };
                        slot.classList.add('is-touch-dragging');
                        try { slot.setPointerCapture(event.pointerId); } catch {}
                    }, 300);
                });
                slot.addEventListener('pointermove', event => {
                    if (!touchDrag) return;
                    const target = slotAtPoint(event.clientX, event.clientY);
                    document.querySelectorAll('.profile-medal-slot.is-drag-over').forEach(el => el.classList.remove('is-drag-over'));
                    if (target && target.dataset.medalIndex !== String(touchDrag.from)) target.classList.add('is-drag-over');
                });
                slot.addEventListener('pointerup', dropTouchSticker);
                slot.addEventListener('pointercancel', clearTouchDrag);
                slot.addEventListener('click', () => {
                    if (suppressNextClick) { suppressNextClick = false; return; }
                    const index = Number(slot.dataset.medalIndex);
                    if (!slot.classList.contains('is-filled')) {
                        Router.goTo('stickers');
                        return;
                    }
                    if (selectedMedalIndex === null) {
                        if (slot.classList.contains('is-filled')) {
                            selectedMedalIndex = index;
                            slot.classList.add('is-selected');
                        }
                        return;
                    }
                    moveProfileMedal(selectedMedalIndex, index);
                    selectedMedalIndex = null;
                });
                slot.addEventListener('dragstart', e => {
                    draggedMedalIndex = Number(slot.dataset.medalIndex);
                    e.dataTransfer.effectAllowed = 'move';
                    slot.classList.add('is-dragging');
                });
                slot.addEventListener('dragend', () => {
                    draggedMedalIndex = null;
                    slot.classList.remove('is-dragging');
                });
                slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('is-drag-over'); });
                slot.addEventListener('dragleave', () => slot.classList.remove('is-drag-over'));
                slot.addEventListener('drop', e => {
                    e.preventDefault();
                    slot.classList.remove('is-drag-over');
                    moveProfileMedal(draggedMedalIndex, Number(slot.dataset.medalIndex));
                });
            });

            // Guest mode: ховаємо sync кнопку
            if (typeof isGuestMode !== 'undefined' && isGuestMode) {
                const syncBtn = document.getElementById('profileSyncBtn');
                if (syncBtn) syncBtn.style.display = 'none';
            }
            syncLeftdockActive();
        }

        // ====================================================================
        //  СТОРІНКА АВТОРИЗАЦІЇ
        // ====================================================================
        function renderAuthPage() {
            const container = document.getElementById('profilePageContainer');
            if (!container) return;
            container.innerHTML = `
            <div class="auth-card">
              <div class="mark"></div>
              <h1 id="authTitle">З поверненням</h1>
              <p class="sub" id="authSub">Увійдіть, щоб продовжити роботу з акаунтом.</p>

              <div class="switcher" id="authSwitcher">
                <div class="switcher-thumb"></div>
                <button type="button" class="active" data-mode="login">Вхід</button>
                <button type="button" data-mode="register">Реєстрація</button>
              </div>

              <button class="google-btn" type="button" id="authGoogleBtn">
                <svg viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.7 0-14.3 4.3-17.7 10.2z"/>
                  <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5.2c-2 1.5-4.5 2.3-7.1 2.3-5.3 0-9.6-3.6-11.2-8.4l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.1 5.2C40.8 36.4 43.5 30.7 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
                </svg>
                Продовжити через Google
              </button>

              <div class="divider">або через email</div>

              <div class="panel active" id="authPanel-login">
                <form id="authLoginForm" onsubmit="return false;">
                  <div class="field">
                    <label for="loginEmail">Email</label>
                    <input id="loginEmail" type="email" placeholder="you@example.com" required autocomplete="email">
                  </div>
                  <div class="field">
                    <label for="loginPass">Пароль</label>
                    <input id="loginPass" type="password" placeholder="••••••••" required autocomplete="current-password">
                  </div>
                  <div class="row-between">
                    <label class="remember"><input type="checkbox" id="loginRemember">Запам'ятати мене</label>
                    <a href="#" onclick="showToast('Скидання пароля — звʼяжіться з підтримкою');return false;">Забули пароль?</a>
                  </div>
                  <div class="auth-error" id="authError"></div>
                  <button class="submit-btn" type="submit" id="authLoginSubmit">Увійти</button>
                </form>
              </div>

              <div class="panel" id="authPanel-register">
                <form id="authRegisterForm" onsubmit="return false;">
                  <div class="field">
                    <label for="regName">Ім'я</label>
                    <input id="regName" type="text" placeholder="Ваше ім'я" required autocomplete="name">
                  </div>
                  <div class="field">
                    <label for="regEmail">Email</label>
                    <input id="regEmail" type="email" placeholder="you@example.com" required autocomplete="email">
                  </div>
                  <div class="field">
                    <label for="regPass">Пароль</label>
                    <input id="regPass" type="password" placeholder="Мінімум 6 символів" required autocomplete="new-password" minlength="6">
                  </div>
                  <div class="auth-error" id="authErrorReg"></div>
                  <button class="submit-btn" type="submit" id="authRegisterSubmit">Створити акаунт</button>
                </form>
              </div>

              <button class="guest-btn" type="button" id="authGuestBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21a8 8 0 0 0-16 0"/>
                  <circle cx="12" cy="8" r="4.5"/>
                </svg>
                Продовжити як гість
              </button>

              <p class="foot-note" id="authFootNote">
                Ще немає акаунта? <button type="button" id="authFootToggle">Зареєструватися</button>
              </p>
            </div>
          `;

            const switcher = document.getElementById('authSwitcher');
            const btnLogin = switcher.querySelector('[data-mode="login"]');
            const btnRegister = switcher.querySelector('[data-mode="register"]');
            const panelLogin = document.getElementById('authPanel-login');
            const panelRegister = document.getElementById('authPanel-register');
            const title = document.getElementById('authTitle');
            const sub = document.getElementById('authSub');
            const footNote = document.getElementById('authFootNote');
            const footToggle = document.getElementById('authFootToggle');

            function setAuthMode(mode) {
                btnLogin.classList.toggle('active', mode === 'login');
                btnRegister.classList.toggle('active', mode === 'register');
                switcher.classList.toggle('mode-register', mode === 'register');
                panelLogin.classList.toggle('active', mode === 'login');
                panelRegister.classList.toggle('active', mode === 'register');
                if (mode === 'login') {
                    title.textContent = 'З поверненням';
                    sub.textContent = 'Увійдіть, щоб продовжити роботу з акаунтом.';
                    footNote.innerHTML =
                        'Ще немає акаунта? <button type="button" id="authFootToggle">Зареєструватися</button>';
                } else {
                    title.textContent = 'Створити акаунт';
                    sub.textContent = 'Зареєструйтеся, щоб почати користуватися сервісом.';
                    footNote.innerHTML = 'Вже маєте акаунт? <button type="button" id="authFootToggle">Увійти</button>';
                }
                document.getElementById('authFootToggle')?.addEventListener('click', () => {
                    setAuthMode(mode === 'login' ? 'register' : 'login');
                });
                document.getElementById('authError').textContent = '';
                document.getElementById('authErrorReg').textContent = '';
            }

            btnLogin.addEventListener('click', () => setAuthMode('login'));
            btnRegister.addEventListener('click', () => setAuthMode('register'));
            footToggle.addEventListener('click', () => setAuthMode('register'));
            if (document.getElementById('authFootToggle')) {
                document.getElementById('authFootToggle').addEventListener('click', () => setAuthMode('register'));
            }

            document.getElementById('authLoginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value.trim();
                const pass = document.getElementById('loginPass').value;
                const errorEl = document.getElementById('authError');
                const submitBtn = document.getElementById('authLoginSubmit');
                errorEl.textContent = '';
                if (!email || !pass) { errorEl.textContent = 'Будь ласка, заповніть усі поля.'; return; }
                submitBtn.disabled = true;
                submitBtn.textContent = 'Вхід...';
                const result = await Auth.login(email, pass);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Увійти';
                if (!result.success) {
                    errorEl.textContent = result.error || 'Помилка входу';
                } else {
                    renderProfilePage();
                }
            });

            document.getElementById('authRegisterForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const name = document.getElementById('regName').value.trim();
                const email = document.getElementById('regEmail').value.trim();
                const pass = document.getElementById('regPass').value;
                const errorEl = document.getElementById('authErrorReg');
                const submitBtn = document.getElementById('authRegisterSubmit');
                errorEl.textContent = '';
                if (!name || !email || !pass) { errorEl.textContent = 'Будь ласка, заповніть усі поля.'; return; }
                if (pass.length < 6) { errorEl.textContent = 'Пароль має містити щонайменше 6 символів.'; return; }
                submitBtn.disabled = true;
                submitBtn.textContent = 'Створення...';
                const result = await Auth.register(email, pass, name);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Створити акаунт';
                if (!result.success) {
                    errorEl.textContent = result.error || 'Помилка реєстрації';
                } else {
                    renderProfilePage();
                }
            });

            document.getElementById('authGoogleBtn').addEventListener('click', async function() {
                this.disabled = true;
                this.textContent = 'Завантаження...';
                const result = await Auth.signInWithGoogle();
                this.disabled = false;
                this.innerHTML = `
              <svg viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.7 0-14.3 4.3-17.7 10.2z"/>
                <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5.2c-2 1.5-4.5 2.3-7.1 2.3-5.3 0-9.6-3.6-11.2-8.4l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.1 5.2C40.8 36.4 43.5 30.7 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
              </svg>
              Продовжити через Google
            `;
                if (!result.success) {
                    document.getElementById('authError').textContent = result.error || 'Помилка Google входу';
                } else {
                    renderProfilePage();
                }
            });

            document.getElementById('authGuestBtn').addEventListener('click', () => {
                Auth.setGuest(true);
                showToast('Продовжуємо як гість');
                // Не використовуємо Router.goTo — хеш вже #profile і hashchange не спрацює
                // Викликаємо showProfile напряму, який перевірить isGuest() і покаже профіль
                Router.showProfile();
            });

            syncLeftdockActive();
        }

        // ====================================================================
        //  ПАНЕЛІ ПРОФІЛЮ
        // ====================================================================
        function renderHistoryPanel(history) {
            if (!history || !history.length) {
                return `
              <div class="profile-empty">
                <i class="fas fa-history"></i>
                <p>Історія переглядів порожня</p>
              </div>
            `;
            }
            let html = `
            <div class="profile-panel-header">
              <span class="profile-panel-title">Історія перегляду</span>
              <span class="profile-panel-count">${history.length} серій</span>
            </div>
            <div class="profile-history-list">
          `;
            history.slice(0, 30).forEach(item => {
                const poster = item.poster || '';
                const rawTitle = item.title || 'Без назви';
            const title = rawTitle.length > 38 ? rawTitle.substring(0, 38) + '…' : rawTitle;
                const ep = item.episode || '?';
                const season = item.season || '';
                const time = item.timestamp ? new Date(item.timestamp).toLocaleDateString('uk-UA') : 'невідомо';
                const progress = item.progress || 0;
                let epLabel = `Серія ${ep}`;
                if (season) epLabel = `Сезон ${season}, ${epLabel}`;
                html += `
              <div class="profile-history-item" data-profile-url="${escapeHtml(item.url || '')}" role="button" tabindex="0">
                <div class="profile-thumb">
                  ${poster ? `<img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ''}
                  <span class="profile-thumb-placeholder" style="${poster?'display:none;':''}">
                    <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg>
                  </span>
                </div>
                <div class="profile-h-info">
                  <div class="profile-h-title">${escapeHtml(title)}</div>
                  <div class="profile-h-sub">
                    <span>${escapeHtml(epLabel)}</span>
                    <span class="dot"></span>
                    <span>${escapeHtml(time)}</span>
                  </div>
                </div>
                <div class="profile-h-progress">
                  <div class="profile-h-progress-fill" style="width:${Math.min(progress,100)}%"></div>
                </div>
              </div>
            `;
            });
            html += `</div>`;
            return html;
        }

        function renderBookmarksPanel(bookmarks) {
            if (!bookmarks || !bookmarks.length) {
                return `
              <div class="profile-empty">
                <i class="fas fa-bookmark"></i>
                <p>Немає збережених закладок</p>
              </div>
            `;
            }
            let html = `
            <div class="profile-panel-header">
              <span class="profile-panel-title">Закладки</span>
              <span class="profile-panel-count">${bookmarks.length}</span>
            </div>
            <div class="profile-bookmark-grid">
          `;
            bookmarks.slice(0, 30).forEach(item => {
                const poster = item.poster || '';
                const rawTitle = item.title || 'Без назви';
            const title = rawTitle.length > 38 ? rawTitle.substring(0, 38) + '…' : rawTitle;
                const sub = item.episodes || '';
                html += `
              <div class="profile-bookmark-card" data-profile-url="${escapeHtml(item.url || '')}" role="button" tabindex="0">
                <div class="profile-bm-thumb">
                  ${poster ? `<img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ''}
                  <span class="profile-bm-thumb-ph" style="${poster?'display:none;':''}">
                    <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg>
                  </span>
                </div>
                <div class="profile-bm-info">
                  <div class="profile-bm-title">${escapeHtml(title)}</div>
                  <div class="profile-bm-sub">${escapeHtml(sub || 'Збережено')}</div>
                </div>
              </div>
            `;
            });
            html += `</div>`;
            return html;
        }

        function renderAchievementsPanel(achievements, totalWatchTime, historyCount) {
            const safeAchievements = Array.isArray(achievements) ? achievements : [];
            const totalMinutes = Math.max(0, Math.floor(Number(totalWatchTime || 0) / 60));
            let html = `
            <div class="profile-watch-card">
              <div class="profile-wt-label">Загальний час перегляду аніме</div>
              <div class="profile-wt-value">${totalMinutes}<span class="profile-wt-unit">хв</span></div>
              <div class="profile-wt-sub">${Number(historyCount) || 0} серій переглянуто</div>
            </div>
            <div class="profile-panel-header">
              <span class="profile-panel-title">Досягнення</span>
              <span class="profile-panel-count">${safeAchievements.filter(a=>a && a.unlocked).length} / ${safeAchievements.length}</span>
            </div>
            <div class="profile-achievement-list">
          `;
            safeAchievements.forEach(a => {
                if (!a) return;
                const unlocked = Boolean(a.unlocked);
                const progress = Math.max(0, Math.min(Number(a.progress) || 0, 100));
                html += `
              <div class="profile-achievement ${unlocked?'':'locked'}">
                <div class="profile-ach-icon">${a.icon}</div>
                <div class="profile-ach-info">
                  <div class="profile-ach-name">${a.name}</div>
                  <div class="profile-ach-value">${a.description}</div>
                </div>
                <div class="profile-ach-badge">${unlocked ? 'Виконано' : (progress < 100 ? Math.round(progress)+'%' : 'Заблоковано')}</div>
              </div>
            `;
            });
            html += `</div>`;
            return html;
        }

        // ====================================================================
        //  РЕДАГУВАННЯ ПРОФІЛЮ
        // ====================================================================
        function profileEditNick() {
            const nickEl = document.getElementById('profileNickText');
            if (!nickEl) return;
            const current = nickEl.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = current;
            input.style.cssText =
                'font-size:20px;font-weight:700;letter-spacing:-0.5px;color:var(--text);background:var(--tag-bg);border:1px solid var(--border);border-radius:8px;padding:2px 8px;outline:none;width:180px;font-family:inherit;';
            if (document.body.classList.contains('dark-mode')) {
                input.style.background = '#1a1a1a';
                input.style.color = '#f7f7f7';
                input.style.borderColor = '#333';
            }
            nickEl.replaceWith(input);
            input.focus();
            input.select();
            const save = () => {
                const val = input.value.trim() || current;
                const span = document.createElement('span');
                span.className = 'profile-nick';
                span.id = 'profileNickText';
                span.textContent = val;
                input.replaceWith(span);
                const profile = getProfile();
                profile.nickname = val;
                saveProfile(profile);
                const meta = document.querySelector('.profile-meta');
                if (meta) {
                    const first = meta.querySelector('span:first-child');
                    if (first) first.textContent = '@' + val.toLowerCase().replace(/\s/g, '_');
                }
                if (Router.currentRoute === 'profile') renderProfilePage();
            };
            input.addEventListener('blur', save);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { input.blur(); }
                if (e.key === 'Escape') { input.value = current;
                    input.blur(); }
            });
        }

        function profileEditBio() {
            const bioEl = document.getElementById('profileBioText');
            if (!bioEl) return;
            const current = bioEl.textContent;
            const textarea = document.createElement('textarea');
            textarea.value = current;
            textarea.style.cssText =
                'font-size:13px;line-height:1.6;color:var(--text-secondary);background:var(--tag-bg);border:1px solid var(--border);border-radius:8px;padding:6px 8px;outline:none;width:100%;font-family:inherit;resize:vertical;min-height:60px;';
            if (document.body.classList.contains('dark-mode')) {
                textarea.style.background = '#1a1a1a';
                textarea.style.color = '#cfcfcf';
                textarea.style.borderColor = '#333';
            }
            bioEl.replaceWith(textarea);
            textarea.focus();
            textarea.select();
            const save = () => {
                const val = textarea.value.trim() || current;
                const div = document.createElement('div');
                div.className = 'profile-bio';
                div.id = 'profileBioText';
                div.textContent = val;
                textarea.replaceWith(div);
                const profile = getProfile();
                profile.bio = val;
                saveProfile(profile);
                if (Router.currentRoute === 'profile') renderProfilePage();
            };
            textarea.addEventListener('blur', save);
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') { textarea.value = current;
                    textarea.blur(); }
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { textarea.blur(); }
            });
        }

        document.getElementById('avatarFileInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const isVideo = isVideoFile(file);
            const isGif = !isVideo && file.type === 'image/gif';
            const maxSize = isVideo ? 50 * 1024 * 1024 : (isGif ? 10 * 1024 * 1024 : 15 * 1024 * 1024);
            if (file.size > maxSize) { showToast(isVideo ? 'Відео занадто велике (максимум 50 МБ)' : (isGif ? 'GIF занадто великий (максимум 10 МБ) — стисни його або вибери коротший' : 'Файл занадто великий (максимум 15 МБ)')); e.target.value = ''; return; }

            const doUpload = async (blobOrFile, raw, mediaType = 'image', mediaSettings = null) => {
                showToast(mediaType === 'video' ? 'Завантаження відео-аватарки...' : (isGif ? 'Завантаження GIF-аватарки...' : 'Завантаження аватарки...'));
                try {
                    const imageUrl = mediaType === 'video' ? await uploadVideoToCloudinary(blobOrFile, 'avatar.mp4') : (raw ? await uploadRawToCloudinary(blobOrFile, 'avatar.gif') : await uploadBlobToCloudinary(blobOrFile, 'avatar.jpg'));
                    const profile = getProfile();
                    if (mediaType === 'video') { profile.avatarVideo = imageUrl; profile.avatar = ''; profile.avatarVideoSettings = mediaSettings || null; }
                    else { profile.avatar = imageUrl; profile.avatarVideo = ''; profile.avatarVideoSettings = null; }
                    saveProfile(profile);
                    if (Router.currentRoute === 'profile') renderProfilePage();
                    if (Router.currentRoute === 'settings') renderSettingsPage();
                    showToast('Аватарку оновлено');
                } catch (err) {
                    console.error('Avatar upload error:', err);
                    showToast('Помилка завантаження аватарки: ' + (err.message || 'невідома помилка'));
                }
            };

            if (isVideo) {
                openImageEditor(file, 'avatar', (settings) => doUpload(file, true, 'video', settings));
            } else if (isGif) {
                // GIFs skip the cropper — canvas cropping would flatten the animation to 1 frame.
                showToast('GIF без кадрування — щоб зберегти анімацію');
                await doUpload(file, true);
            } else {
                openImageEditor(file, 'avatar', (blob) => doUpload(blob, false));
            }
            e.target.value = '';
        });

        async function removeFlatStickerBackground(blob, tolerance = 46) {
            const url = URL.createObjectURL(blob);
            try {
                const image = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = url;
                });
                const maxSide = 900;
                const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imageData.data;
                const w = canvas.width;
                const h = canvas.height;
                const sample = (x, y) => {
                    const i = (y * w + x) * 4;
                    return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
                };
                const corners = [sample(0, 0), sample(w - 1, 0), sample(0, h - 1), sample(w - 1, h - 1)];
                if (corners.some(c => c[3] < 20)) return blob;
                const average = corners.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]).map(v => v / corners.length);
                const cornerSpread = Math.max(...corners.map(c => Math.hypot(c[0] - average[0], c[1] - average[1], c[2] - average[2])));
                if (cornerSpread > tolerance * 1.5) return blob;
                const distance = (i) => Math.hypot(pixels[i] - average[0], pixels[i + 1] - average[1], pixels[i + 2] - average[2]);
                const visited = new Uint8Array(w * h);
                const queue = [];
                const enqueue = (x, y) => {
                    if (x < 0 || y < 0 || x >= w || y >= h) return;
                    const pos = y * w + x;
                    if (visited[pos]) return;
                    visited[pos] = 1;
                    queue.push(pos);
                };
                for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
                for (let y = 1; y < h - 1; y++) { enqueue(0, y); enqueue(w - 1, y); }
                for (let cursor = 0; cursor < queue.length; cursor++) {
                    const pos = queue[cursor];
                    const i = pos * 4;
                    if (distance(i) > tolerance || pixels[i + 3] < 20) continue;
                    const edge = Math.max(0, Math.min(1, (tolerance - distance(i)) / 18));
                    pixels[i + 3] = Math.round(pixels[i + 3] * edge);
                    const x = pos % w;
                    const y = Math.floor(pos / w);
                    enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1);
                }
                ctx.putImageData(imageData, 0, 0);
                return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            } finally {
                URL.revokeObjectURL(url);
            }
        }

        let stickerBackgroundRemoverPromise = null;
        async function removeStickerBackground(blob) {
            try {
                if (!stickerBackgroundRemoverPromise) {
                    stickerBackgroundRemoverPromise = import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm')
                        .then(module => module.default || module.removeBackground || module);
                }
                const removeBackground = await stickerBackgroundRemoverPromise;
                if (typeof removeBackground !== 'function') throw new Error('AI background remover недоступний');
                const config = {
                    model: 'isnet_fp16',
                    device: 'cpu',
                    output: { format: 'image/png', type: 'foreground' }
                };
                const statusMessages = [
                    'AI готує модель… це може зайняти до 1 хвилини',
                    'AI аналізує об’єкт…',
                    'AI вирізає фон…',
                    'AI створює прозорий PNG…'
                ];
                let statusIndex = 0;
                showToastProgress(statusMessages[statusIndex]);
                const statusTimer = setInterval(() => {
                    statusIndex = (statusIndex + 1) % statusMessages.length;
                    showToastProgress(statusMessages[statusIndex]);
                }, 3200);
                const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('AI-обробка перевищила 2 хвилини')), 120000));
                let result;
                try {
                    result = await Promise.race([removeBackground(blob, config), timeout]);
                } finally {
                    clearInterval(statusTimer);
                }
                if (!(result instanceof Blob) || result.size < 100) throw new Error('AI не повернув прозорий PNG');
                showToastProgress('AI фон видалено — зберігаю результат…');
                return result;
            } catch (error) {
                console.error('AI background removal failed:', error);
                stickerBackgroundRemoverPromise = null;
                throw error;
            }
        }

        document.getElementById('stickerFileInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            e.target.value = '';
            if (!file) return;
            const maxSize = 8 * 1024 * 1024;
            if (file.size > maxSize) { showToast('Файл занадто великий (максимум 8 МБ)'); return; }
            openImageEditor(file, 'avatar', async (blob) => {
                showToastProgress('AI готує видалення фону…');
                try {
                    const processedBlob = await removeStickerBackground(blob);
                    showToast('Завантаження наліпки...');
                    const imageUrl = await uploadBlobToCloudinary(processedBlob, 'sticker.png');
                    const cur = Storage.getStickers();
                    const stickerId = 'sng_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                    const stickerKey = 'img:' + stickerId;
                    cur.singles.unshift({ id: stickerId, image: imageUrl, favorite: false, addedAt: Date.now() });
                    if (!Array.isArray(cur.medals)) cur.medals = [];
                    if (!cur.medals.includes(stickerKey) && cur.medals.length < PROFILE_STICKER_SLOTS) cur.medals.push(stickerKey);
                    if (!cur.colors) cur.colors = {};
                    if (!cur.colors[stickerKey]) cur.colors[stickerKey] = '#7c8494';
                    Storage.setStickers(cur);
                    showToast(cur.medals.includes(stickerKey) ? 'Наліпку додано в профіль' : 'Наліпку додано');
                    if (window.stickersUI) window.stickersUI.step = null;
                    if (Router.currentRoute === 'stickers') window.renderStickersPage();
                    if (Router.currentRoute === 'profile') renderProfilePage();
                    if (Router.currentRoute === 'settings') renderSettingsPage();
                } catch (err) {
                    console.error('Sticker upload error:', err);
                    showToast('Помилка завантаження наліпки: ' + (err.message || 'невідома помилка'));
                }
            });
        });

        document.getElementById('bannerFileInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const isVideo = isVideoFile(file);
            const isGif = !isVideo && file.type === 'image/gif';
            const maxSize = isVideo ? 50 * 1024 * 1024 : (isGif ? 10 * 1024 * 1024 : 15 * 1024 * 1024);
            if (file.size > maxSize) { showToast(isVideo ? 'Відео занадто велике (максимум 50 МБ)' : (isGif ? 'GIF занадто великий (максимум 10 МБ) — стисни його або вибери коротший' : 'Файл занадто великий (максимум 15 МБ)')); e.target.value = ''; return; }

            const doUpload = async (blobOrFile, raw, mediaType = 'image', mediaSettings = null) => {
                showToast(mediaType === 'video' ? 'Завантаження відео-банера...' : (isGif ? 'Завантаження GIF-банера...' : 'Завантаження банера...'));
                try {
                    const imageUrl = mediaType === 'video' ? await uploadVideoToCloudinary(blobOrFile, 'banner.mp4') : (raw ? await uploadRawToCloudinary(blobOrFile, 'banner.gif') : await uploadBlobToCloudinary(blobOrFile, 'banner.jpg'));
                    const profile = getProfile();
                    if (mediaType === 'video') { profile.bannerVideo = imageUrl; profile.banner = ''; profile.bannerVideoSettings = mediaSettings || null; }
                    else { profile.banner = imageUrl; profile.bannerVideo = ''; profile.bannerVideoSettings = null; }
                    saveProfile(profile);
                    if (Router.currentRoute === 'profile') renderProfilePage();
                    if (Router.currentRoute === 'settings') renderSettingsPage();
                    showToast('Банер оновлено');
                } catch (err) {
                    console.error('Banner upload error:', err);
                    showToast('Помилка завантаження банера: ' + (err.message || 'невідома помилка'));
                }
            };

            if (isVideo) {
                openImageEditor(file, 'banner', (settings) => doUpload(file, true, 'video', settings));
            } else if (isGif) {
                showToast('GIF без кадрування — щоб зберегти анімацію');
                await doUpload(file, true);
            } else {
                openImageEditor(file, 'banner', (blob) => doUpload(blob, false));
            }
            e.target.value = '';
        });

        // ====================================================================
        //  СТОРІНКА ЖАНРУ
        // ====================================================================
        let genrePageState = { slug: '', name: '', page: 1, list: [] };

        async function renderGenresPage() {
            const container = document.getElementById('genresPageContainer');
            if (!container) return;
            const genres = loadGenres();
            let html = '<div class="genre-page-header"><h2>Жанри</h2></div>';
            html += '<div class="genres-grid">';
            genres.forEach(g => {
                const letter = g.name.charAt(0).toUpperCase();
                html += `<div class="genre-card" data-slug="${g.slug}" data-name="${g.name}">
                    <div class="genre-card__icon">${letter}</div>
                    <div class="genre-card__name">${g.name}</div>
                </div>`;
            });
            html += '</div>';
            container.innerHTML = html;
            container.querySelectorAll('.genre-card').forEach(card => {
                card.addEventListener('click', () => {
                    const slug = card.dataset.slug;
                    const name = card.dataset.name;
                    Router.goTo('genre', { slug, name });
                });
            });
        }


        async function renderGenrePage(slug, name) {
            const container = document.getElementById('genrePageContainer');
            if (!container) return;
            genrePageState.slug = slug;
            genrePageState.name = name || slug;
            genrePageState.page = 1;
            container.innerHTML = `
            <div class="genre-page-header">
              <h2>${genrePageState.name}</h2>
            </div>
            <div id="genrePageContent" class="grid-3cols">
              <div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>
            </div>
            <div class="pagination-row" id="genrePagePagination"></div>
          `;
            await loadGenrePageContent();
        }

        async function loadGenrePageContent() {
            const content = document.getElementById('genrePageContent');
            const pagination = document.getElementById('genrePagePagination');
            if (!content) return;
            content.innerHTML = '<div class="loader" style="grid-column:1/-1;"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>';
            try {
                const list = await fetchHikkaByGenre(genrePageState.slug, genrePageState.page);
                genrePageState.list = list;
                if (!list.length) {
                    content.innerHTML =
                        '<div class="loader" style="grid-column:1/-1;">Нічого не знайдено в цьому жанрі</div>';
                    pagination.innerHTML = '';
                    return;
                }
                content.innerHTML = list.map((a, idx) => {
                    const poster = a.images?.jpg?.large_image_url || '';
                    const title = a.title || 'Без назви';
                    return `
                <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${idx*0.03}s">
                  <div class="anime-poster">
                    <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='data:image/svg+xml,...'">
                  </div>
                  <div class="anime-title-under">${title}</div>
                </div>
              `;
                }).join('');
                content.querySelectorAll('.anime-card').forEach(card => {
                    card.addEventListener('click', () => openPlayerPage(card.dataset.url));
                    card.addEventListener('keydown', e => { if (e.key === 'Enter') openPlayerPage(card.dataset
                            .url); });
                });
                const prevDisabled = genrePageState.page <= 1 ? 'disabled' : '';
                pagination.innerHTML = `
              <button class="btn-outline" onclick="changeGenrePage(${genrePageState.page-1})" ${prevDisabled}><i class="fas fa-chevron-left"></i> Назад</button>
              <span class="page-indicator">Сторінка ${genrePageState.page}</span>
              <button class="btn-outline" onclick="changeGenrePage(${genrePageState.page+1})">Вперед <i class="fas fa-chevron-right"></i></button>
            `;
            } catch (err) {
                content.innerHTML =
                    `<div class="loader" style="grid-column:1/-1;"><i class="fas fa-exclamation-triangle"></i> Помилка: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadGenrePageContent()">Спробувати знову</button></div>`;
                pagination.innerHTML = '';
            }
        }

        window.changeGenrePage = (p) => {
            if (p < 1) return;
            genrePageState.page = p;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loadGenrePageContent();
        };

        // ====================================================================
        //  ФІЛЬТРИ — повна сторінка фільтра аніме (Меню → Фільтри)
        // ====================================================================
        const FILTER_STATUS_OPTIONS = [
            { key: 'anons', label: 'Анонс' },
            { key: 'released', label: 'Завершено' },
            { key: 'ongoing', label: 'Онгоінг' }
        ];
        const FILTER_TYPE_OPTIONS = [
            { key: 'tv', label: 'ТБ-серіал', functional: true },
            { key: 'movie', label: 'Фільм', functional: true },
            { key: 'ova', label: 'OVA', functional: true },
            { key: 'ona', label: 'ONA', functional: true },
            { key: 'special', label: 'Спешл', functional: true }
        ];
        const FILTER_SEASON_OPTIONS = [
            { key: 'winter', label: 'Зима' },
            { key: 'spring', label: 'Весна' },
            { key: 'summer', label: 'Літо' },
            { key: 'fall', label: 'Осінь' }
        ];
        const FILTER_AGE_OPTIONS = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
        // Реальний список команд озвучення/перекладу з hikka.io / mikai.me (для відображення;
        // застосування цього фільтра до результатів поки в розробці — джерело не віддає
        // переклад на рівні каталогу, лише всередині картки конкретного аніме)
        const FILTER_TRANSLATION_OPTIONS = [
            'FanVoxUA', 'InariDuB', 'Багатоголосий закадровий', 'Amanogawa', 'Клан Кайзоку', 'AniUA',
            'Glass moon', 'Робота Голосом', 'Субтитри', 'Flame Studio', 'AniTube', 'UAnime', 'VRdub',
            'DZUSKI', 'HATOSHI', 'SkiDub'
        ];

        let filterState = null;
        let filterResultsState = { items: [], loadingMore: false, page: 0, genrePages: {}, exhausted: false };

        function resetFilterState() {
            filterState = {
                genres: new Set(), status: 'all', types: new Set(), season: 'all', yearMin: 1970, yearMax: 2026, ratingMin: 0, ratingMax: 10, translation: '', age: new Set(), genrePanelOpen: false
            };
        }

        function buildDualRangeHtml(id, min, max, valMin, valMax, step) {
            return `
              <div class="filter-page__number-row">
                <input type="number" class="filter-page__number-box" id="${id}MinBox" value="${valMin}">
                <span class="filter-page__number-sep">—</span>
                <input type="number" class="filter-page__number-box" id="${id}MaxBox" value="${valMax}">
              </div>
              <div class="filter-page__dual-range">
                <div class="filter-page__dual-range-track"></div>
                <div class="filter-page__dual-range-fill" id="${id}Fill"></div>
                <input type="range" class="filter-page__dual-range-input" id="${id}MinSlider" min="${min}" max="${max}" step="${step}" value="${valMin}">
                <input type="range" class="filter-page__dual-range-input" id="${id}MaxSlider" min="${min}" max="${max}" step="${step}" value="${valMax}">
              </div>
            `;
        }

        function initDualRangeVisual(id, min, max) {
            const minSlider = document.getElementById(id + 'MinSlider');
            const maxSlider = document.getElementById(id + 'MaxSlider');
            const fill = document.getElementById(id + 'Fill');
            if (!minSlider || !maxSlider || !fill) return;
            const a = parseFloat(minSlider.value), b = parseFloat(maxSlider.value);
            const pctA = ((a - min) / (max - min)) * 100;
            const pctB = ((b - min) / (max - min)) * 100;
            fill.style.left = pctA + '%';
            fill.style.width = (pctB - pctA) + '%';
        }

        function updateGenreToggleLabel() {
            const el = document.getElementById('filterGenreValue');
            if (!el) return;
            const n = filterState.genres.size;
            el.innerHTML = (n === 0 ? 'Всі' : n + ' обрано') + ' <i class="fas fa-chevron-right"></i>';
        }

        function buildFilterPageHtml() {
            const genreEntries = loadGenres();
            return `
            <div class="filter-page">
              <div class="filter-page__header">
                <button class="filter-page__back" id="filterBackBtn" aria-label="Назад"><i class="fas fa-arrow-left"></i></button>
                <div>
                  <div class="filter-page__eyebrow">Каталог</div>
                  <h2 class="filter-page__title">Фільтр аніме</h2>
                </div>
              </div>

              <div class="filter-page__section">
                <button class="filter-page__genre-toggle" id="filterGenreToggle">
                  <span class="filter-page__section-title">Жанри</span>
                  <span class="filter-page__genre-toggle-value" id="filterGenreValue">Всі <i class="fas fa-chevron-right"></i></span>
                </button>
                <div class="filter-page__genre-panel" id="filterGenrePanel">
                  <div class="filter-page__checkbox-grid">
                    ${genreEntries.map(g => `
                      <label class="filter-page__checkbox">
                        <input type="checkbox" data-genre="${g.slug}">
                        <span>${g.name}</span>
                      </label>`).join('')}
                  </div>
                </div>
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Статус</div>
                <div class="filter-page__section-sub">Стан виходу аніме</div>
                <div class="filter-chip-row" id="filterStatusRow" style="margin-top:0.8rem;">
                  <button class="filter-chip active" data-status="all">Всі</button>
                  ${FILTER_STATUS_OPTIONS.map(s => `<button class="filter-chip" data-status="${s.key}">${s.label}</button>`).join('')}
                </div>
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Сезон</div>
                <div class="filter-page__section-sub">Пошук за сезоном виходу</div>
                <div class="filter-chip-row" style="margin-top:0.8rem;">
                  ${FILTER_SEASON_OPTIONS.map(s => `<button class="filter-chip" data-season="${s.key}">${s.label}</button>`).join('')}
                </div>
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Рік виходу</div>
                <div class="filter-page__section-sub">1970-2026</div>
                ${buildDualRangeHtml('filterYear', 1970, 2026, 1970, 2026, 1)}
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Тип</div>
                <div class="filter-page__section-sub">Формат аніме</div>
                <div class="filter-page__checkbox-grid" style="margin-top:0.8rem;">
                  ${FILTER_TYPE_OPTIONS.map(t => `
                    <label class="filter-page__checkbox${t.functional ? '' : ' filter-page__checkbox--soon'}">
                      <input type="checkbox" data-type="${t.key}" ${t.functional ? '' : 'disabled'}>
                      <span>${t.label}${t.functional ? '' : ' <em>(скоро)</em>'}</span>
                    </label>`).join('')}
                </div>
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Вікове обмеження</div>
                <div class="filter-page__section-sub">Рейтинг контенту</div>
                <div class="filter-page__checkbox-grid" style="margin-top:0.8rem;">
                  ${FILTER_AGE_OPTIONS.map(a => `
                    <label class="filter-page__checkbox filter-page__checkbox--soon">
                      <input type="checkbox" data-age="${a}">
                      <span>${a}</span>
                    </label>`).join('')}
                </div>
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Оцінка</div>
                <div class="filter-page__section-sub">Рейтинг MonoAnime</div>
                <label class="filter-page__checkbox" style="margin-top:0.6rem;">
                  <input type="checkbox" id="filterUseMal">
                  <span>Брати оцінку з MyAnimeList</span>
                </label>
                ${buildDualRangeHtml('filterRating', 0, 10, 0, 10, 0.1)}
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Переклад</div>
                <div class="filter-page__section-sub">Команда озвучення або субтитрів</div>
                <select class="filter-page__select" id="filterTranslation" style="margin-top:0.8rem;">
                  <option>Виберіть переклад</option>
                  ${FILTER_TRANSLATION_OPTIONS.map(t => `<option>${t}</option>`).join('')}
                </select>
                <label class="filter-page__checkbox filter-page__checkbox--soon" style="margin-top:0.8rem;">
                  <input type="checkbox" id="filterAllDubbed">
                  <span>Усі епізоди озвучені</span>
                </label>
              </div>

              <div class="filter-page__section">
                <div class="filter-page__section-title">Студія</div>
                <div class="filter-page__section-sub">Виробник тайтлу</div>
                <select class="filter-page__select" id="filterTranslation" style="margin-top:0.8rem;">
                  <option>Виберіть студію</option>
                </select>
              </div>

              <button class="btn-outline filter-page__reset-btn" id="filterResetBtn">
                <i class="fas fa-times"></i> Скинути фільтри
              </button>

              <div id="filterResultsMeta" class="filter-page__results-meta"></div>
              <div id="filterPageContent" class="grid-3cols">
                <div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>
              </div>
              <div class="pagination-row" id="filterPagePagination"></div>
            </div>
          `;
        }

        function wireFilterPageEvents(container) {
            document.getElementById('filterBackBtn')?.addEventListener('click', () => {
                if (history.length > 1) history.back(); else Router.goTo('main');
            });

            const genreToggle = document.getElementById('filterGenreToggle');
            const genrePanel = document.getElementById('filterGenrePanel');
            genreToggle?.addEventListener('click', () => {
                filterState.genrePanelOpen = !filterState.genrePanelOpen;
                genrePanel.classList.toggle('open', filterState.genrePanelOpen);
                genreToggle.classList.toggle('open', filterState.genrePanelOpen);
            });
            container.querySelectorAll('[data-genre]').forEach(cb => {
                cb.addEventListener('change', () => {
                    if (cb.checked) filterState.genres.add(cb.dataset.genre); else filterState.genres.delete(cb.dataset.genre);
                    updateGenreToggleLabel();
                    applyFilters(true);
                });
            });

            container.querySelectorAll('#filterStatusRow .filter-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    container.querySelectorAll('#filterStatusRow .filter-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    filterState.status = chip.dataset.status;
                    applyFilters(true);
                });
            });

            container.querySelectorAll('[data-type]').forEach(cb => {
                cb.addEventListener('change', () => {
                    if (cb.checked) filterState.types.add(cb.dataset.type); else filterState.types.delete(cb.dataset.type);
                    applyFilters(true);
                });
            });

            container.querySelectorAll('[data-season]').forEach(chip => chip.addEventListener('click', () => {
                container.querySelectorAll('[data-season]').forEach(c => c.classList.remove('active'));
                chip.classList.toggle('active'); filterState.season = chip.classList.contains('active') ? chip.dataset.season : 'all'; applyFilters(true);
            }));
            container.querySelectorAll('[data-age]').forEach(cb => cb.addEventListener('change', () => { if (cb.checked) filterState.age.add(cb.dataset.age); else filterState.age.delete(cb.dataset.age); applyFilters(true); }));
            const translation = document.getElementById('filterTranslation');
            translation?.addEventListener('change', () => { filterState.translation = translation.value; applyFilters(true); });
            ['filterYear','filterRating'].forEach(id => ['Min','Max'].forEach(side => document.getElementById(id + side + 'Slider')?.addEventListener('input', e => {
                const box = document.getElementById(id + side + 'Box'); if (box) box.value = e.target.value;
                filterState[id === 'filterYear' ? (side === 'Min' ? 'yearMin' : 'yearMax') : (side === 'Min' ? 'ratingMin' : 'ratingMax')] = Number(e.target.value);
                initDualRangeVisual(id, id === 'filterYear' ? 1970 : 0, id === 'filterYear' ? 2026 : 10); applyFilters(true);
            })));
            initDualRangeVisual('filterYear', 1970, 2026);
            initDualRangeVisual('filterRating', 0, 10);

            document.getElementById('filterResetBtn')?.addEventListener('click', () => {
                renderFilterPage();
            });
        }

        function renderFilterPage() {
            const container = document.getElementById('genrePageContainer');
            if (!container) return;
            resetFilterState();
            filterResultsState = { items: [], loadingMore: false, page: 0, genrePages: {}, exhausted: false };
            container.innerHTML = buildFilterPageHtml();
            wireFilterPageEvents(container);
            applyFilters(true);
        }

        async function applyFilters(reset) {
            const content = document.getElementById('filterPageContent');
            const pagination = document.getElementById('filterPagePagination');
            const meta = document.getElementById('filterResultsMeta');
            if (!content || filterResultsState.loadingMore) return;
            if (reset) {
                filterResultsState = { items: [], loadingMore: false, page: 0, genrePages: {}, exhausted: false };
                content.innerHTML = '<div class="loader" style="grid-column:1/-1;"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>';
                if (meta) meta.textContent = '';
            }
            filterResultsState.loadingMore = true;
            try {
                const effectiveGenres = new Set(filterState.genres);
                if (filterState.types.has('movie')) effectiveGenres.add('film');
                const maxTotal = 30;
                const seen = new Set(filterResultsState.items.map(i => i.url));
                let found = 0;
                const matches = (a) => {
                    if (filterState.status !== 'all' && a.status !== filterState.status) return false;
                    if (filterState.types.size && !filterState.types.has(a.type || 'tv')) return false;
                    if (filterState.genres.size && ![...(a.genres || [])].some(g => filterState.genres.has(GENRE_MAP[g] || g))) return false;
                    return true;
                };

                if (effectiveGenres.size === 0) {
                    const maxPages = 6;
                    while (filterResultsState.page < maxPages && found < maxTotal) {
                        filterResultsState.page++;
                        const pageItems = await fetchHikkaMain(filterResultsState.page);
                        if (!pageItems.length) break;
                        const matched = pageItems.filter(matches);
                        for (const m of matched) {
                            if (!seen.has(m.url)) { filterResultsState.items.push(m); seen.add(m.url); found++; }
                        }
                    }
                } else {
                    for (const slug of effectiveGenres) {
                        if (found >= maxTotal) break;
                        let fetchedThisRound = 0;
                        while (fetchedThisRound < 2 && found < maxTotal) {
                            filterResultsState.genrePages[slug] = (filterResultsState.genrePages[slug] || 0) + 1;
                            const pageItems = await fetchHikkaByGenre(slug, filterResultsState.genrePages[slug]);
                            fetchedThisRound++;
                            if (!pageItems.length) break;
                            const matched = pageItems.filter(matches);
                            for (const m of matched) {
                                if (!seen.has(m.url)) { filterResultsState.items.push(m); seen.add(m.url); found++; }
                            }
                        }
                    }
                }

                filterResultsState.exhausted = (found === 0);

                if (!filterResultsState.items.length) {
                    content.innerHTML = '<div class="loader" style="grid-column:1/-1;">Нічого не знайдено за цими фільтрами</div>';
                    pagination.innerHTML = '';
                    if (meta) meta.textContent = '';
                    return;
                }

                if (meta) meta.textContent = `Знайдено: ${filterResultsState.items.length}`;

                content.innerHTML = filterResultsState.items.map((a, idx) => {
                    const poster = a.images?.jpg?.large_image_url || '';
                    const title = a.title || 'Без назви';
                    return `
                <div class="anime-card" data-url="${a.url}" tabindex="0" role="button" aria-label="${title}" style="animation-delay:${(idx % 24)*0.03}s">
                  <div class="anime-poster">
                    <img src="${poster}" alt="${title}" loading="lazy" class="img--blur" onload="this.classList.add('img--loaded')" onerror="this.src='data:image/svg+xml,...'">
                  </div>
                  <div class="anime-title-under">${title}</div>
                </div>
              `;
                }).join('');
                content.querySelectorAll('.anime-card').forEach(card => {
                    card.addEventListener('click', () => openPlayerPage(card.dataset.url));
                    card.addEventListener('keydown', e => { if (e.key === 'Enter') openPlayerPage(card.dataset
                            .url); });
                });
                pagination.innerHTML = !filterResultsState.exhausted ?
                    `<button class="btn-outline" onclick="applyFilters(false)">Продовжити <i class="fas fa-chevron-down"></i></button>` :
                    '';
            } catch (err) {
                content.innerHTML =
                    `<div class="loader" style="grid-column:1/-1;"><i class="fas fa-exclamation-triangle"></i> Помилка: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="applyFilters(true)">Спробувати знову</button></div>`;
                pagination.innerHTML = '';
            } finally {
                filterResultsState.loadingMore = false;
            }
        }
        window.applyFilters = applyFilters;
        window.renderFilterPage = renderFilterPage;

        // ====================================================================
        //  РОЗКЛАД ВИХОДУ (дані з Mikai API)
        // ====================================================================
        const MIKAI_API_BASE = 'https://api.mikai.me/v1';
        const scheduleState = { dayOffset: 0, cache: {}, sourcePromise: null, loadingOffset: null, weekLoading: false, weekTimer: null };
        const WEEKDAY_SHORT_UA = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const MIKAI_SCHEDULE_DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        function scheduleDateForOffset(offset) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + offset);
            return d;
        }

        function formatScheduleApiDate(d) {
            const pad = n => String(n).padStart(2, '0');
            return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
        }

        function formatScheduleDisplayDate(d) {
            const pad = n => String(n).padStart(2, '0');
            return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
        }

        async function fetchScheduleByOffset(offset) {
            if (scheduleState.cache[offset]) return scheduleState.cache[offset];
            if (!scheduleState.sourcePromise) {
                scheduleState.sourcePromise = fetch(`${MIKAI_API_BASE}/schedule`, {
                    mode: 'cors',
                    credentials: 'omit',
                    cache: 'no-cache'
                }).then(async resp => {
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    const payload = await resp.json();
                    if (payload?.ok === false) throw new Error(payload.error?.message || 'Mikai API error');
                    return payload?.result || payload;
                }).catch(error => {
                    scheduleState.sourcePromise = null;
                    throw error;
                });
            }
            const schedule = await scheduleState.sourcePromise;
            const key = MIKAI_SCHEDULE_DAY_KEYS[scheduleDateForOffset(offset).getDay()];
            const data = Array.isArray(schedule?.[key]) ? schedule[key] : [];
            scheduleState.cache[offset] = data;
            return data;
        }

        function scheduleItemDate(item, offset) {
            const raw = item?.airing || item?.nextEpisodeAt || item?.airDate || item?.releaseDate || item?.releasedAt || item?.dateTime || item?.datetime;
            if (raw) {
                const normalized = String(raw).replace(' ', 'T');
                const d = new Date(normalized);
                if (!Number.isNaN(d.getTime())) return d;
            }
            const time = item?.time || item?.airTime || item?.broadcast?.time || item?.anime?.broadcast?.time;
            if (time && /^\d{1,2}:\d{2}/.test(String(time))) {
                const base = scheduleDateForOffset(offset);
                const [h, m] = String(time).split(':').map(Number);
                base.setHours(h, m, 0, 0);
                return base;
            }
            return null;
        }

        function scheduleCard(item, offset) {
            const a = item?.anime || {};
            const names = a.details?.names || {};
            const posterUid = a.media?.posterUid || '';
            const poster = posterUid ? `https://images.mikai.me/poster/small/${posterUid}.webp` : '';
            const title = names.name || names.nameNative || names.nameEnglish || 'Без назви';
            const titleEn = names.nameEnglish || names.nameNative || '';
            const date = scheduleItemDate(item, offset);
            const dateText = date ? new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date) : 'Час невідомий';
            const countdown = date && date.getTime() > Date.now() ? `<span class="schedule-countdown" data-time="${date.toISOString()}">${countdownText(date)}</span>` : '';
            return `<article class="schedule-item schedule-week-item" data-title="${escapeHtml(title)}" data-title-en="${escapeHtml(titleEn)}" data-slug="${escapeHtml(a.slug || '')}">
                <div class="schedule-item__poster"><img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.style.opacity=0"></div>
                <div class="schedule-item__info"><div class="schedule-item__title">${escapeHtml(title)}</div><div class="schedule-item__ep">${item?.episode ? `Епізод ${escapeHtml(item.episode)}` : 'Наступний епізод'} · ${escapeHtml(dateText)}</div>${countdown}</div><i class="fas fa-chevron-right schedule-item__arrow"></i>
            </article>`;
        }

        async function loadScheduleWeek() {
            const content = document.getElementById('scheduleWeekContent');
            if (!content || scheduleState.weekLoading) return;
            scheduleState.weekLoading = true;
            content.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження розкладу…</div>';
            try {
                const results = await Promise.allSettled(Array.from({ length: 7 }, (_, i) => fetchScheduleByOffset(i)));
                const sections = results.map((result, offset) => {
                    const list = result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [];
                    if (!list.length) return '';
                    const d = scheduleDateForOffset(offset);
                    const day = new Intl.DateTimeFormat('uk-UA', { weekday: 'long' }).format(d);
                    return `<section class="schedule-week-day${offset === 0 ? ' is-today' : ''}"><div class="schedule-week-day__title"><strong>${day}</strong><span>${offset === 0 ? 'Сьогодні' : formatScheduleDisplayDate(d)}</span></div><div class="schedule-week-list">${list.map(item => scheduleCard(item, offset)).join('')}</div></section>`;
                }).join('');
                content.innerHTML = sections || '<div class="loader">На найближчі дні розкладу немає</div>';
                content.querySelectorAll('.schedule-week-item').forEach(el => el.addEventListener('click', () => openScheduleItemInPlayer(el.dataset.title, el)));
                if (scheduleState.weekTimer) clearInterval(scheduleState.weekTimer);
                scheduleState.weekTimer = setInterval(() => content.querySelectorAll('.schedule-countdown').forEach(el => { const d = new Date(el.dataset.time); el.textContent = countdownText(d); }), 60000);
            } catch (e) {
                console.error('Помилка завантаження розкладу Mikai:', e);
                const details = e?.message ? ` (${escapeHtml(e.message)})` : '';
                content.innerHTML = `<div class="loader">Не вдалося завантажити розклад${details}. <button class="btn-outline" type="button" onclick="loadScheduleWeek()">Повторити</button></div>`;
            }
            finally { scheduleState.weekLoading = false; }
        }
        window.loadScheduleWeek = loadScheduleWeek;

        function renderSchedulePage() {
            const container = document.getElementById('schedulePageContainer');
            if (!container) return;
            container.innerHTML = `
                <div class="genre-page-header"><h2>Розклад виходу</h2></div>
                <p class="schedule-page-hint">Актуальний розклад онґоїнг-аніме, згрупований за днями. Час показується лише коли його повертає джерело.</p>
                <div id="scheduleWeekContent" class="schedule-week-content"></div>
            `;
            loadScheduleWeek();
        }

        async function loadScheduleDayContent(offset) {
            const content = document.getElementById('scheduleDayContent');
            if (!content) return;
            scheduleState.loadingOffset = offset;
            content.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>';
            try {
                const list = await fetchScheduleByOffset(offset);
                if (scheduleState.loadingOffset !== offset) return; // користувач вже перемкнув вкладку
                if (!list.length) {
                    content.innerHTML = '<div class="loader">На цей день розкладу немає</div>';
                    return;
                }
                content.innerHTML = list.map(item => {
                    const a = item.anime || {};
                    const poster = a.image?.preview ? `https://animeon.club/api/uploads/images/${a.image.preview}` : '';
                    const title = a.titleUa || a.titleEn || 'Без назви';
                    return `
                    <div class="schedule-item" data-title="${title.replace(/"/g, '&quot;')}" data-title-en="${(a.titleEn || '').replace(/"/g, '&quot;')}" data-slug="${(a.slug || '').replace(/"/g, '&quot;')}">
                        <div class="schedule-item__poster">
                            <img src="${poster}" alt="${title}" loading="lazy" onerror="this.style.opacity=0">
                        </div>
                        <div class="schedule-item__info">
                            <div class="schedule-item__title">${title}</div>
                            <div class="schedule-item__ep">${item.episode ? item.episode + ' серія' : ''}</div>
                        </div>
                        <i class="fas fa-chevron-right schedule-item__arrow"></i>
                    </div>`;
                }).join('');
                content.querySelectorAll('.schedule-item').forEach(el => {
                    el.addEventListener('click', () => {
                        openScheduleItemInPlayer(el.dataset.title, el);
                    });
                });
            } catch (err) {
                content.innerHTML = `<div class="loader"><i class="fas fa-exclamation-triangle"></i> Помилка завантаження: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadScheduleDayContent(${offset})">Спробувати знову</button></div>`;
            }
        }
        window.loadScheduleDayContent = loadScheduleDayContent;

        // ====================================================================
        //  ПЛЕЄР
        // ====================================================================
        let playerPageAnime = null;
        let playerPageTmdbInfo = null;
        let playerPageTmdbEpisodeMap = {};
        let playerPagePlayer = null;
        let _playerLoadController = null; // AbortController для поточного завантаження плеєра
        let playerPageCurrentSeason = '1';
        let playerPageCurrentDub = '';
        let playerPageCurrentQuality = '720p';
        let playerPageActiveEpisodeFile = null;
        let playerPagePlaybackRequest = 0;
        let playerPageCurrentAnimeUrl = null;
        let playerPageCurrentSource = 'Основне';
        let playerPageCurrentView = 'grid';
        let playerPageEpisodes = [];
        let playerPageSources = ['Основне'];
        let playerPageCurrentEpisodeNum = '1';
        let playerPageHistoryUpdated = false;
        let playerPageWatchStartTime = 0;
        let playerPageAccumulatedWatchSeconds = 0;
        let playerPageLastVideoTime = null;
        let playerPageIsPlaying = false;
        let playerPageIsOpen = false;
        let playerPagePreviousBodyOverflow = '';
        let playerPagePreviousActiveElement = null;
        let playerRatingSourceIsTmdb = false; // TMDB рейтинг має пріоритет над локальним рейтингом глядачів
        let playerJikanData = null;
        let playerCharacterItems = [];
        let playerCharacterExpanded = false;
        let playerRelatedItems = [];
        let playerMediaItems = [];
        let playerMediaExpanded = false;
        let playerCountdownTimer = null;

        const QUALITY_OPTIONS = ['Максимальна', '2160p (4K)', '1440p', '1080p', '720p', '480p', '360p'];

        function renderPlayerEpisodeError(message, diagnostics, retryUrl) {
            const grid = document.getElementById('episodeViewGrid');
            if (!grid) return;
            const device = diagnostics?.device?.type || detectDeviceInfo(navigator.userAgent).type;
            const stage = diagnostics?.failedStage || 'завантаження даних плеєра';
            const detail = diagnostics?.emptyObject ? `Не знайдено: ${diagnostics.emptyObject}.` : `Етап: ${stage}.`;
            grid.innerHTML = `<div class="episode-empty player-error-state">
                <i class="fas fa-triangle-exclamation"></i>
                <strong>${escapeHtml(message)}</strong>
                <span>${escapeHtml(detail)} Пристрій: ${escapeHtml(device)}.</span>
                <button class="btn-outline player-retry-btn" type="button"><i class="fas fa-redo"></i> Спробувати ще раз</button>
            </div>`;
            const retry = grid.querySelector('.player-retry-btn');
            retry?.addEventListener('click', () => {
                retry.disabled = true;
                retry.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Повторюємо...';
                openPlayerPage(retryUrl || playerPageCurrentAnimeUrl);
            });
        }

        async function openPlayerPage(url, options = {}) {
            const modal = document.getElementById('playerPageModal');
            if (!modal) return;
            if (!playerPageIsOpen) {
                playerPagePreviousBodyOverflow = document.body.style.overflow || '';
                playerPagePreviousActiveElement = document.activeElement;
            }
            playerPageIsOpen = true;
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            modal.setAttribute('aria-busy', 'true');
            document.documentElement.classList.add('player-page-open');
            document.body.classList.add('player-page-open');
            document.getElementById('bottomNav')?.classList.add('hidden-nav');
            // Скасувати попереднє завантаження якщо є
            if (_playerLoadController) {
                _playerLoadController.abort();
                _playerLoadController = null;
            }
            _playerLoadController = new AbortController();
            const _thisSignal = _playerLoadController.signal;

            if (playerPagePlayer) { playerPagePlayer.destroy();
                playerPagePlayer = null; }
            playerPageAnime = null;
            playerPageTmdbInfo = null;
            playerPageTmdbEpisodeMap = {};
            playerPageActiveEpisodeFile = null;
            playerPageCurrentEpisodeNum = '1';
            playerPagePlaybackRequest += 1;
            playerJikanData = null;
            playerCharacterItems = [];
            playerCharacterExpanded = false;
            playerRelatedItems = [];
            playerMediaItems = [];
            playerMediaExpanded = false;
            if (playerCountdownTimer) { clearInterval(playerCountdownTimer); playerCountdownTimer = null; }
            const infoGridReset = document.getElementById('animeInfoGrid');
            if (infoGridReset) infoGridReset.innerHTML = '<div class="anime-info-placeholder">Завантаження інформації…</div>';
            const countdownReset = document.getElementById('animeCountdown');
            if (countdownReset) countdownReset.textContent = '';
            setSectionState('relatedSection', false);
            setSectionState('mediaSection', false);
            setSectionState('mainCharactersSection', false);
            const mainCharactersMoreReset = document.getElementById('mainCharactersMoreBtn');
            if (mainCharactersMoreReset) mainCharactersMoreReset.hidden = true;
            playerPageCurrentAnimeUrl = url;
            playerPageHistoryUpdated = false;
            playerPageWatchStartTime = 0;
            playerPageAccumulatedWatchSeconds = 0;
            playerPageLastVideoTime = null;
            playerPageIsPlaying = false;
            document.getElementById('playerVideoContainer').classList.add('active');
            const posterTargets = [document.getElementById('playerPosterImg'), document.getElementById('playerHeroPoster')];
            posterTargets.forEach(img => { if (img) { img.src = CATALOG_POSTER_FALLBACK; img.alt = ''; } });
            document.getElementById('playerBlurBg').style.backgroundImage = `url(${CATALOG_POSTER_FALLBACK})`;
            document.getElementById('playerPageVideo').innerHTML = '';
            document.getElementById('episodeViewGrid').innerHTML = '';
            document.getElementById('episodeViewCompact').innerHTML = '';
            document.getElementById('episodeViewClassic').innerHTML = '';
            document.getElementById('episodePanel').classList.remove('visible');
            document.getElementById('page-episodes').classList.remove('active');
            document.getElementById('page-info').classList.add('active');
            document.getElementById('playerSynopsis').textContent = '';
            document.getElementById('synopsisMoreBtn').style.display = 'none';
            document.getElementById('playerTopbarTitle').textContent = '';
            document.getElementById('playerVideoEpisodeOverlay')?.replaceChildren();
            document.getElementById('playerVideoSeasonOverlay')?.replaceChildren();
            document.getElementById('playerKicker').style.display = '';
            const _resetLogoImg = document.getElementById('playerTitleLogo');
            if (_resetLogoImg) { _resetLogoImg.style.display = 'none'; _resetLogoImg.src = ''; }
            document.getElementById('castSection').style.display = 'none';
            document.getElementById('castList').innerHTML = '';
            const resetCastTitle = document.querySelector('#castSection .section-title');
            if (resetCastTitle) resetCastTitle.textContent = 'Актори';
            document.getElementById('mainCharactersList').innerHTML = '';
            document.getElementById('mainCharactersMoreBtn').hidden = true;
            const _resetRelatedSection = document.getElementById('relatedSeasonsSection');
            if (_resetRelatedSection) _resetRelatedSection.style.display = 'none';
            playerRatingSourceIsTmdb = false;
            updateLikeButton();
            updateDislikeButton();
            updateBookmarkButton(url);
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            modal.querySelector('.modal-content').scrollTop = 0;
            modal.focus({ preventScroll: true });
            try {
                const anime = await loadHikkaDetail(url);
                // Якщо плеєр вже закрили поки завантажувалось — не оновлювати DOM
                if (_thisSignal.aborted || modal.style.display === 'none') return;
                playerPageAnime = anime;
                playerPageAnimeuaSeasons = {};
                externalSourceCache = {};
                playerPageSources = anime.mikaiUrl ? ['Mikai / ASHDI'] : anime.animeOnUrl ? ['AnimeON / ASHDI'] : ['Основне'];
                playerPageCurrentSource = playerPageSources[0];
                const posterUrl = normalizePosterUrl(anime.images?.jpg?.large_image_url);
                document.getElementById('playerPosterImg').src = posterUrl;
                const heroPoster = document.getElementById('playerHeroPoster');
                if (heroPoster) { heroPoster.src = posterUrl; heroPoster.alt = anime.title || ''; }
                document.getElementById('playerPosterTitle').textContent = anime.title;
                document.getElementById('playerKicker').textContent = anime.originalTitle || anime.title;
                document.getElementById('playerTopbarTitle').textContent = anime.title;
                document.getElementById('playerBlurBg').style.backgroundImage = `url(${posterUrl})`;
                const totalEpisodes = Object.values(anime.seasons || {}).reduce((sum, s) => sum + Object.values(s).reduce((s2,
                    e) => Math.max(s2, e.length), 0), 0);
                document.getElementById('playerAgeBadge').textContent = anime.score || '—';
                const isMovie = playerAnimeIsMovie(anime);
                document.getElementById('playerStatusTag').textContent = isMovie ? 'Фільм' : (totalEpisodes > 0 ? 'Онгоїнг' : 'Завершено');
                const animeRuntime = formatMovieRuntime(anime.runtimeMinutes);
                document.getElementById('playerMetaLine').textContent = isMovie
                    ? `${anime.year || '—'}, Фільм${animeRuntime ? ` · ${animeRuntime}` : ''}`
                    : `${anime.year || '—'}, ${totalEpisodes} еп.`;
                document.getElementById('playerTagRow').innerHTML =
                    normalizeGenreList(anime.genres).slice(0, 4).map(g => `<span class="tag">${escapeHtml(g)}</span>`).join('');
                document.getElementById('playerEpisodeCountNum').textContent = totalEpisodes;
                const synopsisEl = document.getElementById('playerSynopsis');
                synopsisEl.textContent = anime.synopsis || 'Опис відсутній.';
                const moreBtn = document.getElementById('synopsisMoreBtn');
                setTimeout(() => {
                    if (synopsisEl.scrollHeight > synopsisEl.clientHeight + 2) {
                        moreBtn.style.display = 'block';
                    }
                }, 100);
                moreBtn.onclick = () => {
                    synopsisEl.classList.toggle('expanded');
                    moreBtn.textContent = synopsisEl.classList.contains('expanded') ? 'менше' : 'більше';
                };
                updateSourceChip();
                loadAnimeRatingAggregate(url);
                const seasons = Object.keys(anime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
                playerPageCurrentSeason = seasons[0] || '1';
                playerPageCurrentDub = pickPreferredDub(anime.seasons[playerPageCurrentSeason]);
                playerPageCurrentEpisodeNum = '1';
                playerPageCurrentQuality = '720p';
                buildSeasonRow(seasons);
                buildEpisodeViews();
                updateFilterChip();
                updatePlayFabLabel();
                document.getElementById('episodePanel').classList.add('visible');
                if (seasons.length === 0 || Object.keys(anime.seasons || {}).length === 0) {
                    renderPlayerEpisodeError('Аніме поки що не вийшло в українській озвучці.', anime._diagnostics, anime.url);
                    console.warn('No episodes found for anime:', anime.url, anime._diagnostics);
                }
                buildBottomSheetData();
                modal.setAttribute('aria-busy', 'false');
                if (window.lucide) lucide.createIcons();

                // ============================================================
                //  TMDB — заміна метаданих на офіційні (жанр/рік/опис/постер/
                //  актори/лого/віковий рейтинг). Відео залишається з Hikka/Mikai.
                // ============================================================
                (async () => {
                    try {
                        const tmdbInfo = await fetchTmdbForAnime(anime);
                        if (_thisSignal.aborted || playerPageCurrentAnimeUrl !== url) return;
                        if (!tmdbInfo) { await loadAndRenderJikanExtras(anime, null, null); return; }
                        playerPageTmdbInfo = tmdbInfo;
                        const currentSeasonNum = String(playerPageCurrentSeason || '1');
                        const currentSeasonPoster = await fetchTmdbSeasonPoster(tmdbInfo, currentSeasonNum);
                        if (_thisSignal.aborted || playerPageCurrentAnimeUrl !== url) return;
                        const details = await fetchTmdbFullDetails(tmdbInfo);
                        if (_thisSignal.aborted || playerPageCurrentAnimeUrl !== url) return;
                        if (!details) { await loadAndRenderJikanExtras(anime, tmdbInfo, null); return; }

                        // Artwork always remains from Hikka. TMDB is metadata-only.
                        const isMovie = tmdbInfo.mediaType === 'movie' || playerAnimeIsMovie(anime);
                        const hikkaPoster = posterUrl || ANIME_CARD_PLACEHOLDER;
                        const tmdbPoster = normalizePosterUrl(tmdbImgUrl(currentSeasonPoster || details.poster_path, 'w780'), hikkaPoster);
                        // Hikka є джерелом істини для назви, сезону, року, статусу, жанрів і серій.
                        // TMDB використовується лише для постера, логотипа та рейтингу.
                        const title = anime.title || details.name || details.original_name || 'Без назви';
                        const originalTitle = anime.originalTitle || details.original_name || title;
                        const year = anime.year || (details.release_date || details.first_air_date || '').slice(0, 4) || '—';
                        const numEpisodes = totalEpisodes || anime.totalEpisodes || 0;
                        const runtime = formatMovieRuntime(anime.runtimeMinutes) || formatMovieRuntime(details.runtime);
                        const hikkaStatus = statusLabelUa(anime.status);
                        const statusLabel = isMovie ? 'Фільм' : (hikkaStatus || (numEpisodes > 0 ? 'Онгоїнг' : 'Завершено'));
                        const overview = anime.synopsis || details.overview || '';
                        const ageRating = tmdbAgeRating(details);
                        const logoUrl = tmdbBestLogo(details);

                        // Постери плеєра — з TMDB, fallback залишається Hikka.
                        document.getElementById('playerPosterImg').src = tmdbPoster;
                        const heroPoster = document.getElementById('playerHeroPoster');
                        if (heroPoster) { heroPoster.src = tmdbPoster; heroPoster.alt = title || ''; }
                        const tmdbBackdrop = tmdbBestBackdrop(details);
                        document.getElementById('playerBlurBg').style.backgroundImage = `url(${tmdbBackdrop || tmdbPoster})`;
                        document.getElementById('playerPosterTitle').textContent = title;
                        document.getElementById('playerKicker').textContent = originalTitle;
                        document.getElementById('playerTopbarTitle').textContent = title;
                        document.getElementById('playerAgeBadge').textContent = ageRating || anime.score || '—';
                        document.getElementById('playerStatusTag').textContent = statusLabel;
                        document.getElementById('playerMetaLine').textContent = isMovie ? `${year}, Фільм${runtime ? ` · ${runtime}` : ''}` : `${year}, ${numEpisodes} еп.`;
                        // Не перезаписуємо жанри Hikka навіть коли TMDB повернув свої жанри.
                        document.getElementById('playerEpisodeCountNum').textContent = numEpisodes;
                        // Description comes from Hikka. TMDB is not allowed to replace it.
                        if (!String(anime.synopsis || '').trim() && overview) {
                            synopsisEl.textContent = overview;
                            moreBtn.style.display = 'none';
                            setTimeout(() => {
                                if (synopsisEl.scrollHeight > synopsisEl.clientHeight + 2) moreBtn.style.display = 'block';
                            }, 100);
                        }
                        if (details.vote_average) {
                            playerRatingSourceIsTmdb = true;
                            document.getElementById('playerRatingNum').textContent = details.vote_average.toFixed(1);
                            document.getElementById('playerRatingLabel').textContent = 'TMDB';
                        }
                        const logoImg = document.getElementById('playerTitleLogo');
                        const kickerEl = document.getElementById('playerKicker');
                        if (logoUrl && logoImg) {
                            logoImg.onerror = () => { logoImg.style.display = 'none'; if (kickerEl) kickerEl.style.display = ''; };
                            logoImg.onload = () => { logoImg.style.display = 'block'; if (kickerEl) kickerEl.style.display = 'none'; };
                            logoImg.src = logoUrl;
                        }
                        renderCast(details);
                        loadAndRenderJikanExtras(anime, tmdbInfo, details);
                    } catch (e) {
                        console.warn('TMDB metadata enrich failed', e);
                    }
                })();
            } catch (err) {
                // Якщо запит скасовано (юзер закрив плеєр або відкрив інше) — мовчки ігноруємо
                if (_thisSignal.aborted || modal.style.display === 'none') return;
                if (_thisSignal.aborted || (err && (err.name === 'AbortError' || err._playerAborted || (err.message && (err.message.includes('aborted') || err.message.includes('Fetch is aborted')))))) return;

                const isNotFound = err.message && (err.message.includes('не знайдено') || err.message.includes('404'));
                const isTimeout = err.message && err.message.includes('очікування');
                const isNetwork = err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('502') || err.message.includes('503') || err.message.includes('aborted') || err.message.includes('Fetch is aborted'));

                let userMsg, icon;
                if (isNotFound) {
                    icon = 'fa-search';
                    userMsg = 'Аніме не знайдено на джерелі';
                    document.getElementById('playerSynopsis').textContent = 'Це аніме поки що недоступне.';
                } else if (isTimeout) {
                    icon = 'fa-clock';
                    userMsg = 'Час очікування вичерпано. Перевірте з\'єднання і спробуйте ще раз.';
                    document.getElementById('playerSynopsis').textContent = userMsg;
                } else if (isNetwork) {
                    icon = 'fa-wifi';
                    userMsg = 'Помилка мережі або сервер не відповідає. Спробуйте пізніше.';
                    document.getElementById('playerSynopsis').textContent = userMsg;
                } else {
                    icon = 'fa-exclamation-circle';
                    userMsg = 'Помилка завантаження. Спробуйте пізніше.';
                    document.getElementById('playerSynopsis').textContent = userMsg;
                }
                modal.setAttribute('aria-busy', 'false');

                const diagForErr = err._diagnostics || {
                    url, ua: navigator.userAgent, device: detectDeviceInfo(navigator.userAgent),
                    httpStatus: null, contentType: null, cfCacheStatus: null, cfRay: null, usedCloudflareWorker: true, corsError: isNetwork,
                    htmlLoaded: false, htmlSize: 0, iframeCount: 0, iframeUrls: [], foundAshdi: false, foundVidmoly: false, foundPlayerjs: false,
                    foundDataSrc: false, foundDataFile: false, foundVideoTag: false, foundSourceTag: false, playerUrlsCount: 0, seasonsCount: 0,
                    episodesCount: 0, extractPlayerIframeUrlsRan: false, extractSourcesFromTextRan: false, foundM3u8: false, foundMp4: false,
                    foundPlayerjsJson: false, foundBase64Playerjs: false, jsErrors: [err.stack || err.message || String(err)],
                    failedStage: 'openPlayerPage() — необроблена помилка завантаження', emptyObject: null
                };

                if (options.fromDeepLink) {
                    closePlayerPage();
                    Router.goTo('main');
                    setTimeout(() => showToast('Аніме не знайдено'), 0);
                    return;
                }
                renderPlayerEpisodeError(userMsg, diagForErr, url);
                document.getElementById('episodePanel').classList.add('visible');
                console.error('Player load error:', err.message || err, diagForErr);
            }
        }

        // Будуємо силку на НАШ сайт (не на джерело hikka.io / mikai.me) — при відкритті вона
        // сама відкриє потрібне аніме в плеєрі, див. обробку #anime? при завантаженні сторінки.
        function buildShareUrl(animeUrl) {
            // Посилання працює на Firebase Hosting без окремого /share endpoint.
            // URLSearchParams при відкритті hash уже декодує значення один раз.
            const base = new URL('./', window.location.href);
            base.hash = `anime?url=${encodeURIComponent(animeUrl || '')}`;
            return base.href;
        }

        function shareAnime() {
            const anime = playerPageAnime;
            const url = buildShareUrl(playerPageCurrentAnimeUrl) || window.location.href;
            const title = anime?.title || 'VAKDAB';
            if (navigator.share) {
                navigator.share({ title, text: `Дивись «${title}» у VAKDAB ✨`, url }).catch(() => {});
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(() => showToast('Посилання скопійовано'))
                    .catch(() => showToast('Не вдалося скопіювати посилання'));
            } else {
                showToast('Поділитися не підтримується на цьому пристрої');
            }
        }

        function findContinueWatching(anime) {
            if (!anime || !anime.seasons) return null;
            const history = Storage.getHistory();
            const entry = history.find(h => h.url === anime.url);
            if (!entry) return null;
            const season = entry.season || '1';
            const dubs = Object.keys(anime.seasons[season] || {});
            for (const dub of dubs) {
                const eps = anime.seasons[season][dub] || [];
                const ep = eps.find(e => e.episode === entry.episode);
                if (ep) return { season, dub, ep, progress: entry.progress || 0 };
            }
            return null;
        }

        function updatePlayFabLabel() {
            const label = document.getElementById('playerPlayFabLabel');
            if (!label || !playerPageAnime) return;
            const cw = findContinueWatching(playerPageAnime);
            label.textContent = (cw && cw.progress < 95) ? 'Продовжити' : 'Дивитись';
        }

        function playFeaturedEpisode() {
            if (!playerPageAnime) { showToast('Аніме ще завантажується'); return; }
            const cw = findContinueWatching(playerPageAnime);
            if (cw && cw.progress < 95) {
                if (cw.season !== playerPageCurrentSeason || cw.dub !== playerPageCurrentDub) {
                    playerPageCurrentSeason = cw.season;
                    playerPageCurrentDub = cw.dub;
                    buildEpisodeViews();
                    updateFilterChip();
                    const row = document.getElementById('episodeSeasonRow');
                    if (row) {
                        row.querySelectorAll('.season-num').forEach(b => b.classList.toggle('active', b.dataset.season === cw.season));
                    }
                }
                playEpisode(cw.ep.file, cw.ep.episode);
                return;
            }
            const episodes = getCurrentEpisodes();
            if (!episodes.length) { showToast('Немає доступних серій'); return; }
            playEpisode(episodes[0].file, episodes[0].episode);
        }

        function updateSourceChip() {
            const label = document.getElementById('playerSourceLabel');
            if (label) label.textContent = playerPageCurrentSource || 'Джерело';
            const watchSourceValue = document.getElementById('watchSourceValue');
            if (watchSourceValue) watchSourceValue.textContent = `${playerPageCurrentSource || 'Джерело'} · ${playerPageCurrentQuality || ''}`;
        }

        function renderDubLogo(dubName) {
            const logoUrl = playerPageAnime?.dubLogos?.[dubName] ||
                playerPageAnime?.seasons?.[playerPageCurrentSeason]?.[dubName]?.find(ep => ep?.teamLogo)?.teamLogo || '';
            const fallback = escapeHtml(String(dubName || 'Оз').trim().slice(0, 2).toUpperCase());
            if (!logoUrl) return `<span class="dub-logo dub-logo-fallback" aria-hidden="true">${fallback}</span>`;
            return `<span class="dub-logo" aria-hidden="true"><img src="${escapeHtml(logoUrl)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'"><span class="dub-logo-fallback" style="display:none">${fallback}</span></span>`;
        }

        function updateFilterChip() {
            const chip = document.getElementById('playerFilterChip');
            if (chip) chip.textContent = `Сезон ${playerPageCurrentSeason} · ${playerPageCurrentDub}`;
            const watchFilterValue = document.getElementById('watchFilterValue');
            if (watchFilterValue) watchFilterValue.textContent = `Сезон ${playerPageCurrentSeason} · ${playerPageCurrentDub}`;
            const dubs = Object.keys(playerPageAnime?.seasons?.[playerPageCurrentSeason] || {}).sort();
            let formatHtml = dubs.map(d => {
                const active = d === playerPageCurrentDub ? ' active-format' : '';
                return `<span class="format-pill${active}" data-dub="${escapeHtml(d)}" aria-label="${escapeHtml(d)}" style="cursor:pointer;">${renderDubLogo(d)}<span class="dub-label">${escapeHtml(String(d).toUpperCase())}</span></span>`;
            }).join('');
            [document.getElementById('playerDubControls')].forEach(formatRow => {
                if (!formatRow) return;
                formatRow.innerHTML = formatHtml;
                formatRow.querySelectorAll('.format-pill[data-dub]').forEach(pill => {
                    pill.addEventListener('click', () => selectDubFromSheet(pill.dataset.dub));
                });
            });
            renderSeasonTabs();
        }

        function renderSeasonTabs() {
            const sectionTitle = document.getElementById('episodeSectionTitle');
            if (!sectionTitle) return;
            const seasons = Object.keys(playerPageAnime?.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
            if (seasons.length <= 1) {
                sectionTitle.textContent = `Сезон ${playerPageCurrentSeason || 1}`;
                sectionTitle.classList.add('single');
                return;
            }
            sectionTitle.classList.remove('single');
            sectionTitle.innerHTML = seasons.map(s => {
                const active = s === playerPageCurrentSeason ? ' active-season-tab' : '';
                return `<span class="season-tab${active}" data-season="${s}">Сезон ${s}</span>`;
            }).join('');
            sectionTitle.querySelectorAll('.season-tab').forEach(tab => {
                tab.addEventListener('click', () => selectSeasonFromSheet(tab.dataset.season));
            });
        }

        // ====================================================================
        //  СТОРІНКА "ДИВИТИСЯ" — окрема від інформації про аніме
        // ====================================================================
        function openWatchPage() {
            if (!playerPageAnime) { showToast('Аніме ще завантажується'); return; }
            // Episodes now live below the anime information on the same page.
            document.getElementById('page-info')?.classList.add('active');
            const episodesSection = document.querySelector('#playerPageModal #playerVideoContainer');
            if (episodesSection) episodesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const cw = findContinueWatching(playerPageAnime);
            if (cw && cw.progress < 95 && (cw.season !== playerPageCurrentSeason || cw.dub !== playerPageCurrentDub)) {
                playerPageCurrentSeason = cw.season;
                playerPageCurrentDub = cw.dub;
                buildEpisodeViews();
                updateFilterChip();
            }
        }

        function closeWatchPage() {
            // Вбудований плеєр живе на одному screen; при закритті лише очищаємо відео.
            document.getElementById('page-info')?.classList.add('active');
            if (playerPagePlayer) {
                if (playerPagePlayer._timeUpdateListener && playerPagePlayer.videoRef) {
                    playerPagePlayer.videoRef.removeEventListener('timeupdate', playerPagePlayer._timeUpdateListener);
                }
                playerPagePlayer.destroy();
                playerPagePlayer = null;
            }
            document.getElementById('playerVideoContainer').classList.remove('active');
            document.getElementById('playerPageVideo').innerHTML = '';
        }

        function buildSeasonRow(seasons) {
            const row = document.getElementById('episodeSeasonRow');
            if (!row) return;
            let html = `<span>Сезон</span>`;
            seasons.forEach(s => {
                const active = s === playerPageCurrentSeason ? ' active' : '';
                html += `<div class="season-num${active}" data-season="${s}">${s}</div>`;
            });
            row.innerHTML = html;
            row.querySelectorAll('.season-num').forEach(btn => {
                btn.addEventListener('click', () => {
                    const season = btn.dataset.season;
                    if (season === playerPageCurrentSeason) return;
                    playerPageCurrentSeason = season;
                    const dubs = Object.keys((playerPageAnime.seasons[season]) || {}).sort();
                    playerPageCurrentDub = dubs[0] || '';
                    row.querySelectorAll('.season-num').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    buildEpisodeViews();
                    refreshPlayerSeasonPoster(season);
                    updateFilterChip();
                    updatePlayFabLabel();
                    buildBottomSheetData();
                });
            });
        }

        function getCurrentEpisodes() {
            if (!playerPageAnime) return [];
            const eps = playerPageAnime.seasons?.[playerPageCurrentSeason]?.[playerPageCurrentDub] || [];
            return eps;
        }

        function getEpisodeProgress(episode) {
            const history = Storage.getHistory();
            const animeUrl = playerPageCurrentAnimeUrl;
            const found = history.find(h => h.url === animeUrl && h.episode === episode);
            return found ? Math.min(found.progress || 0, 100) : 0;
        }

        // ====================================================================
        //  TMDB — метадані та постери (постачальник картинок/оцінок), відео
        //  завжди залишається з hikka.io / mikai.me — TMDB тут лише для оформлення.
        // ====================================================================
        const TMDB_API_KEY = '38fef08bc6a49bdd5a69c336d34a7954';
        const TMDB_BASE = 'https://api.themoviedb.org/3';
        const TMDB_IMG = 'https://image.tmdb.org/t/p';
        let tmdbAnimeCache = {};

        function cleanTitleForTmdb(title) {
            return String(title || '')
                .replace(/\[[^\]]*\]/g, '')
                .replace(/[«»"'`]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function tmdbQueryVariants(anime) {
            const values = [anime?.originalTitle, anime?.title];
            try {
                const slug = decodeURIComponent(new URL(anime?.url || '').pathname.split('/').pop() || '')
                    .replace(/\.(html?|php)$/i, '').replace(/^\d+[-_]+/, '').replace(/[-_]+/g, ' ');
                values.push(slug);
            } catch { /* URL may be absent on external items */ }
            const variants = [];
            values.filter(Boolean).forEach(value => {
                const clean = cleanTitleForTmdb(value);
                if (!clean) return;
                variants.push(clean);
                variants.push(clean
                    .replace(/\b(?:сезон|season|частина|part|cour|tv|серіал)\s*\d+\b/gi, '')
                    .replace(/\b\d+\s*(?:сезон|season|частина|part|cour)\b/gi, '')
                    .replace(/\s+/g, ' ').trim());
                variants.push(clean.split(/\s+[/:|]\s+/)[0].trim());
            });
            return [...new Set(variants.filter(v => v.length >= 2))].slice(0, 6);
        }

        function tmdbImgUrl(path, size) {
            return path ? `${TMDB_IMG}/${size || 'w342'}${path}` : null;
        }

        function tmdbNormalizeTitle(value) {
            return cleanTitleForTmdb(value).toLowerCase()
                .replace(/[^a-zа-яіїєґ0-9\s]/gi, ' ')
                .replace(/\b(season|сезон|part|частина|tv|серіал|anime)\b/gi, ' ')
                .replace(/\s+/g, ' ').trim();
        }

        function tmdbCardType(hit) {
            if (!hit) return null;
            if (hit.media_type === 'movie') return 'Фільм';
            const isAnimation = (hit.genre_ids || []).includes(16);
            const isJapanese = ['ja', 'ko'].includes((hit.original_language || '').toLowerCase()) ||
                (hit.origin_country || []).some(c => ['JP', 'KR'].includes(c));
            return isAnimation && isJapanese ? 'Аніме' : 'Серіал';
        }

        function tmdbIsLikelyAnime(hit) {
            if (!hit || !(hit.genre_ids || []).includes(16)) return false;
            const language = (hit.original_language || '').toLowerCase();
            const countries = hit.origin_country || [];
            return ['ja', 'ko', 'zh'].includes(language) || countries.some(c => ['JP', 'KR', 'CN'].includes(c));
        }

        function tmdbCandidateScore(hit, query, anime = null) {
            const q = tmdbNormalizeTitle(query);
            const candidateNames = [hit?.title, hit?.name, hit?.original_name].filter(Boolean).map(tmdbNormalizeTitle);
            const originalQuery = tmdbNormalizeTitle(anime?.originalTitle || '');
            const title = tmdbNormalizeTitle(hit.title || hit.name || hit.original_name || '');
            if (!q || !title) return -1000;
            let score = 0;
            if (candidateNames.includes(originalQuery) && originalQuery) score += 35;
            if (title === q) score += 140;
            else if (title.includes(q) || q.includes(title)) score += 45;
            const qTokens = new Set(q.split(' ').filter(Boolean));
            const overlap = title.split(' ').filter(t => qTokens.has(t)).length;
            score += overlap * 10;
            if (hit.media_type === 'tv') score += 8;
            if (tmdbIsLikelyAnime(hit)) score += 35;
            if (hit.poster_path) score += 5;
            return score + Math.min(Number(hit.popularity) || 0, 20) * 0.1;
        }

        const tmdbCardFrameCache = new Map();

        async function fetchTmdbCardFrame(tmdbId, mediaType, fallbackPath) {
            const key = `${mediaType}:${tmdbId}`;
            if (tmdbCardFrameCache.has(key)) return tmdbCardFrameCache.get(key);
            let frame = fallbackPath ? tmdbImgUrl(fallbackPath, 'w780') : null;
            if (mediaType === 'tv') {
                try {
                    const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}/season/1?api_key=${TMDB_API_KEY}&language=en-US`);
                    if (res.ok) {
                        const data = await res.json();
                        const still = (data.episodes || []).find(ep => ep.still_path)?.still_path;
                        if (still) frame = tmdbImgUrl(still, 'w780');
                    }
                } catch (e) {
                    console.warn('TMDB episode frame failed', { tmdbId, error: e });
                }
            }
            tmdbCardFrameCache.set(key, frame);
            return frame;
        }

        async function fetchTmdbCardInfo(anime) {
            if (!anime || !TMDB_API_KEY) return null;
            const cacheKey = 'card:' + (anime.url || anime.title);
            if (tmdbAnimeCache[cacheKey] !== undefined) return tmdbAnimeCache[cacheKey];
            const queries = tmdbQueryVariants(anime);
            const languages = ['uk-UA', 'en-US'];
            let candidates = [];
            for (const q of queries) {
                for (const language of languages) {
                    try {
                        const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_API_KEY}&language=${language}&query=${encodeURIComponent(q)}&include_adult=false`);
                        if (!res.ok) continue;
                        const data = await res.json();
                        candidates.push(...(data.results || []).filter(r =>
                            (r.media_type === 'tv' || r.media_type === 'movie') && r.poster_path
                        ).map(r => ({ ...r, _query: q })));
                    } catch (e) {
                        console.error('TMDB card search failed', { query: q, language, error: e });
                    }
                }
            }
            if (candidates.length) {
                const unique = [...new Map(candidates.map(r => [`${r.media_type}:${r.id}`, r])).values()];
                const preferredType = anime.type === 'movie' ? 'movie' : 'tv';
                    const matching = unique
                    .filter(item => item.media_type === preferredType && tmdbIsLikelyAnime(item))
                    .sort((a, b) => tmdbCandidateScore(b, b._query, anime) - tmdbCandidateScore(a, a._query, anime));
                const hit = matching[0];
                if (hit && tmdbCandidateScore(hit, hit._query, anime) >= 45) {
                    const frame = await fetchTmdbCardFrame(hit.id, hit.media_type, hit.backdrop_path);
                    const info = {
                        poster: tmdbImgUrl(hit.poster_path, 'w500'),
                        frame,
                        rating: hit.vote_average ? Number(hit.vote_average).toFixed(1) : null,
                        type: tmdbCardType(hit),
                        mediaType: hit.media_type,
                        tmdbId: hit.id
                    };
                    tmdbAnimeCache[cacheKey] = info;
                    return info;
                }
            }
            tmdbAnimeCache[cacheKey] = null;
            return null;
        }

        async function fetchTmdbForAnime(anime) {
            if (!anime || !TMDB_API_KEY) return null;
            const cacheKey = anime.url || anime.title;
            if (tmdbAnimeCache[cacheKey] !== undefined) return tmdbAnimeCache[cacheKey];
            const queries = tmdbQueryVariants(anime);
            const languages = ['uk-UA', 'en-US', 'ru-RU'];
            const expectedType = playerAnimeIsMovie(anime) ? 'movie' : 'tv';
            let allCandidates = [];
            for (const q of queries) {
                for (const language of languages) {
                    try {
                        const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_API_KEY}&language=${language}&query=${encodeURIComponent(q)}&include_adult=false`);
                        if (!res.ok) continue;
                        const data = await res.json();
                        allCandidates.push(...(data.results || []).filter(r =>
                            r.media_type === expectedType && r.poster_path && tmdbIsLikelyAnime(r)
                        ).map(r => ({ ...r, _query: q })));
                    } catch (e) { console.warn('TMDB search failed', { query: q, language, error: e }); }
                }
            }
            const ranked = [...allCandidates.reduce((map, candidate) => {
                const key = `${candidate.media_type}:${candidate.id}`;
                const score = tmdbCandidateScore(candidate, candidate._query, anime);
                const previous = map.get(key);
                if (!previous || score > previous._tmdbScore) map.set(key, { ...candidate, _tmdbScore: score });
                return map;
            }, new Map()).values()]
                .sort((a, b) => b._tmdbScore - a._tmdbScore);
            const best = ranked[0];
            if (best && best._tmdbScore >= 45) {
                const info = { id: best.id, mediaType: best.media_type, poster: best.poster_path, backdrop: best.backdrop_path, seasonsCache: {}, seasonPosters: {} };
                tmdbAnimeCache[cacheKey] = info;
                return info;
            }
            tmdbAnimeCache[cacheKey] = null;
            return null;
        }

        async function fetchTmdbSeasonEpisodes(tmdbInfo, seasonNum) {
            if (!tmdbInfo || !tmdbInfo.id) return null;
            if (tmdbInfo.seasonsCache[seasonNum] !== undefined) return tmdbInfo.seasonsCache[seasonNum];
            try {
                const res = await fetch(`${TMDB_BASE}/tv/${tmdbInfo.id}/season/${seasonNum}?api_key=${TMDB_API_KEY}`);
                if (!res.ok) { tmdbInfo.seasonsCache[seasonNum] = null; return null; }
                const data = await res.json();
                tmdbInfo.seasonsCache[seasonNum] = data.episodes || [];
                return tmdbInfo.seasonsCache[seasonNum];
            } catch (e) { tmdbInfo.seasonsCache[seasonNum] = null; return null; }
        }
        async function fetchTmdbSeasonPoster(tmdbInfo, seasonNum) {
            if (!tmdbInfo || tmdbInfo.mediaType !== 'tv' || !tmdbInfo.id) return null;
            tmdbInfo.seasonPosters ||= {};
            if (tmdbInfo.seasonPosters[seasonNum] !== undefined) return tmdbInfo.seasonPosters[seasonNum];
            try {
                const res = await fetch(`${TMDB_BASE}/tv/${tmdbInfo.id}/season/${seasonNum}?api_key=${TMDB_API_KEY}&language=uk-UA`);
                if (!res.ok) { tmdbInfo.seasonPosters[seasonNum] = null; return null; }
                const data = await res.json();
                const poster = data.poster_path || null;
                tmdbInfo.seasonPosters[seasonNum] = poster;
                return poster;
            } catch (e) {
                tmdbInfo.seasonPosters[seasonNum] = null;
                return null;
            }
        }
        async function refreshPlayerSeasonPoster(seasonNum) {
            const tmdbInfo = playerPageTmdbInfo;
            if (!tmdbInfo || tmdbInfo.mediaType !== 'tv') return;
            const requestedSeason = String(seasonNum || '1');
            const seasonPoster = await fetchTmdbSeasonPoster(tmdbInfo, requestedSeason);
            if (String(playerPageCurrentSeason || '1') !== requestedSeason || !playerPageIsOpen) return;
            const fallback = tmdbInfo.poster ? tmdbImgUrl(tmdbInfo.poster, 'w780') : ANIME_CARD_PLACEHOLDER;
            const poster = normalizePosterUrl(tmdbImgUrl(seasonPoster, 'w780'), fallback);
            const posterEl = document.getElementById('playerPosterImg');
            const heroPoster = document.getElementById('playerHeroPoster');
            const blur = document.getElementById('playerBlurBg');
            if (posterEl) posterEl.src = poster;
            if (heroPoster) heroPoster.src = poster;
            if (blur) blur.style.backgroundImage = `url(${poster})`;
        }

        // ====================================================================
        //  TMDB — ПОВНІ МЕТАДАНІ (жанр/рік/опис/постер/актори/лого/віковий рейтинг)
        //  Відео завжди залишається з Hikka/Mikai/uaserials — TMDB тут лише дані для UI.
        // ====================================================================
        async function fetchTmdbFullDetails(tmdbInfo) {
            if (!tmdbInfo || !tmdbInfo.id) return null;
            if (tmdbInfo.fullDetails !== undefined) return tmdbInfo.fullDetails;
            try {
                const mediaPath = tmdbInfo.mediaType === 'movie' ? 'movie' : 'tv';
                const append = tmdbInfo.mediaType === 'movie' ? 'credits,images,release_dates' : 'credits,images,content_ratings';
                const res = await fetch(`${TMDB_BASE}/${mediaPath}/${tmdbInfo.id}?api_key=${TMDB_API_KEY}&language=uk-UA&append_to_response=${append}&include_image_language=uk,en,ja,null`);
                if (!res.ok) { tmdbInfo.fullDetails = null; return null; }
                const data = await res.json();
                // Якщо опис або жанри порожні українською — донасичуємо з англійської версії
                if (!data.overview || !(data.genres || []).length) {
                    try {
                        const resEn = await fetch(`${TMDB_BASE}/${mediaPath}/${tmdbInfo.id}?api_key=${TMDB_API_KEY}&language=en-US`);
                        if (resEn.ok) {
                            const dataEn = await resEn.json();
                            if (!data.overview) data.overview = dataEn.overview || '';
                            if (!(data.genres || []).length) data.genres = dataEn.genres || [];
                        }
                    } catch (e) { /* ignore */ }
                }
                tmdbInfo.fullDetails = data;
                return data;
            } catch (e) { console.warn('TMDB full details failed', e); tmdbInfo.fullDetails = null; return null; }
        }

        function tmdbBestLogo(details) {
            const logos = (details && details.images && details.images.logos) || [];
            if (!logos.length) return null;
            const pick = logos.find(l => l.iso_639_1 === 'uk') || logos.find(l => l.iso_639_1 === 'en') ||
                logos.find(l => !l.iso_639_1) || logos[0];
            return pick ? tmdbImgUrl(pick.file_path, 'w500') : null;
        }

        function tmdbAgeRating(details) {
            const ratings = (details?.content_ratings?.results || []).map(r => ({ country: r.iso_3166_1, value: r.rating }));
            const releaseRatings = (details?.release_dates?.results || []).flatMap(country =>
                (country.release_dates || []).map(r => ({ country: country.iso_3166_1, value: r.certification }))
            ).filter(r => r.value);
            const results = [...ratings, ...releaseRatings];
            const pick = results.find(r => r.country === 'UA') || results.find(r => r.country === 'US') ||
                results.find(r => r.country === 'JP') || results[0];
            return pick?.value || null;
        }

        // Кадр (backdrop) з TMDB для фону сторінки аніме — беремо найкращий за мовою/якістю,
        // фолбек на основний backdrop_path, якщо масив images.backdrops порожній.
        function tmdbBestBackdrop(details) {
            const backdrops = (details && details.images && details.images.backdrops) || [];
            if (backdrops.length) {
                const sorted = [...backdrops].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0) || (b.width || 0) - (a.width || 0));
                const pick = sorted.find(b => !b.iso_639_1) || sorted[0];
                if (pick) return tmdbImgUrl(pick.file_path, 'w1280');
            }
            if (details && details.backdrop_path) return tmdbImgUrl(details.backdrop_path, 'w1280');
            return null;
        }

        const TMDB_STATUS_LABELS = {
            'Returning Series': 'Онгоїнг',
            'Ended': 'Завершено',
            'Canceled': 'Завершено',
            'In Production': 'Готується',
            'Planned': 'Заплановано',
            'Pilot': 'Пілот'
        };

        // ====================================================================
        //  JIKAN / MAL — персонажі, сейю, зв'язки, студія, broadcast та media.
        //  Дані завжди прив'язані до MAL ID; пошук за назвою використовується
        //  тільки коли сторінка Hikka не має зовнішнього ID.
        // ====================================================================
        const JIKAN_BASE = 'https://api.jikan.moe/v4';
        const jikanCache = new Map();
        const JIKAN_STATUS_LABELS = {
            'Currently Airing': 'Онґоїнг', 'Finished Airing': 'Завершено',
            'Not yet aired': 'Майбутнє', 'Discontinued': 'Скасовано', 'On Hiatus': 'Призупинено'
        };
        const SEASON_LABELS = { winter: 'Зима', spring: 'Весна', summer: 'Літо', fall: 'Осінь' };

        async function fetchJikan(path) {
            if (jikanCache.has(path)) return jikanCache.get(path);
            const promise = fetch(`${JIKAN_BASE}${path}`, { cache: 'force-cache' }).then(r => {
                if (!r.ok) throw new Error(`Jikan HTTP ${r.status}`);
                return r.json();
            });
            jikanCache.set(path, promise);
            try { return await promise; } catch (e) { jikanCache.delete(path); throw e; }
        }

        function normalizeJikanTitle(v) {
            return String(v || '').toLowerCase().replace(/[«»'"`]/g, '')
                .replace(/\b(season|сезон|part|частина|cour|tv|серіал|anime)\s*\d*\b/gi, ' ')
                .replace(/[^a-zа-яіїєґ0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
        }

        async function resolveJikanById(malId) {
            const data = (await fetchJikan(`/anime/${malId}/full`)).data;
            if (data) data._provider = 'jikan';
            return data || null;
        }

        async function withTimeout(promise, ms, label = 'Запит перевищив час очікування') {
            let timer;
            const timeout = new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(label)), ms);
            });
            try { return await Promise.race([promise, timeout]); }
            finally { clearTimeout(timer); }
        }

        async function resolveJikanByTitle(query) {
            const result = await fetchJikan(`/anime?q=${encodeURIComponent(query)}&limit=5&sfw=true`);
            const target = normalizeJikanTitle(query);
            const candidates = (result.data || []).map(x => {
                const names = [x.title, x.title_english, x.title_japanese, ...(x.title_synonyms || [])].map(normalizeJikanTitle);
                let score = names.includes(target) ? 100 : 0;
                if (names.some(n => n && (n.includes(target) || target.includes(n)))) score += 35;
                if (x.type === 'TV') score += 4;
                return { x, score };
            }).sort((a, b) => b.score - a.score);
            const best = candidates[0];
            // Do not attach a weak unrelated title just because search returned something.
            if (!best || best.score < 35) return null;
            return resolveJikanById(best.x.mal_id);
        }

        // ====================================================================
        //  ANILIST — другий стабільний ID у пріоритеті користувача. Використовуємо,
        //  коли Jikan/MAL недоступний (live search на MAL часто падає з 504,
        //  хоча вже кешовані ID-запити можуть проходити) або не знайшов збіг.
        //  AniList повертає персонажів, зв'язки, студію та nextAiringEpisode
        //  (Unix-час, тому конвертація часової зони відбувається без ручних зсувів)
        //  усе в одному GraphQL-запиті.
        // ====================================================================
        const ANILIST_BASE = 'https://graphql.anilist.co';
        const anilistCache = new Map();
        const ANILIST_STATUS_LABELS = {
            RELEASING: 'Онґоїнг', FINISHED: 'Завершено', NOT_YET_RELEASED: 'Майбутнє',
            CANCELLED: 'Скасовано', HIATUS: 'Призупинено'
        };
        const ANILIST_RELATION_LABELS = {
            PREQUEL: 'попередній сезон', SEQUEL: 'наступний сезон', SIDE_STORY: 'спін-оф',
            SPIN_OFF: 'спін-оф', ALTERNATIVE: "альтернативна версія", SUMMARY: 'короткий переказ',
            ADAPTATION: 'адаптація', PARENT: 'пов’язаний твір', CHARACTER: 'пов’язаний твір',
            FULL_STORY: 'повна історія', OTHER: 'пов’язаний твір'
        };
        const ANILIST_FORMAT_LABELS = { TV: 'TV Серіал', TV_SHORT: 'TV Серіал', MOVIE: 'Фільм', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Спешл', MUSIC: 'Музика' };

        const ANILIST_SEARCH_QUERY = `query ($search: String) { Page(perPage: 5) { media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            id title { romaji english native } format status season seasonYear episodes duration averageScore genres siteUrl
            studios(isMain: true) { nodes { name } }
            nextAiringEpisode { airingAt episode }
            characters(sort: ROLE, perPage: 10) { edges { role node { name { full native } image { large } } voiceActors(language: JAPANESE) { name { full } image { large } } } } }
        } }`;

        async function fetchAnilist(query, variables) {
            const key = JSON.stringify({ query, variables });
            if (anilistCache.has(key)) return anilistCache.get(key);
            const promise = fetch(ANILIST_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query, variables })
            }).then(r => { if (!r.ok) throw new Error(`AniList HTTP ${r.status}`); return r.json(); });
            anilistCache.set(key, promise);
            try { return await promise; } catch (e) { anilistCache.delete(key); throw e; }
        }

        function normalizeAnilistTitle(v) { return normalizeJikanTitle(v); }

        async function fetchAnilistRelations(anilistId) {
            const query = `query ($id: Int) { Media(id: $id) { relations { edges { relationType(version: 2) node {
                id type title { romaji english } format startDate { year } coverImage { large } siteUrl } } } } }`;
            const res = await fetchAnilist(query, { id: anilistId });
            return res?.data?.Media?.relations?.edges || [];
        }

        function adaptAnilistMedia(media) {
            const studios = (media.studios?.nodes || []).map(n => ({ name: n.name }));
            const characters = (media.characters?.edges || []).map(e => ({
                character: { name: e.node?.name?.full, name_kanji: e.node?.name?.native, images: { webp: { image_url: e.node?.image?.large } } },
                role: e.role === 'MAIN' ? 'Головна роль' : 'Другорядна роль',
                voice_actors: e.voiceActors?.length ? [{ language: 'Japanese', person: { name: e.voiceActors[0].name.full, images: { webp: { image_url: e.voiceActors[0].image?.large } } } }] : []
            }));
            const seasonMap = { WINTER: 'winter', SPRING: 'spring', SUMMER: 'summer', FALL: 'fall' };
            return {
                _provider: 'anilist', _anilistId: media.id,
                title: media.title?.romaji || media.title?.english, url: media.siteUrl,
                type: media.format === 'MOVIE' ? 'Movie' : 'TV',
                status: media.status, _statusLabel: ANILIST_STATUS_LABELS[media.status] || null,
                season: seasonMap[media.season] || null, year: media.seasonYear,
                episodes: media.episodes, duration: media.duration, _durationMinutes: media.duration,
                airing: media.status === 'RELEASING',
                _nextAiringDate: media.nextAiringEpisode ? new Date(media.nextAiringEpisode.airingAt * 1000) : null,
                _nextEpisode: media.nextAiringEpisode?.episode || null,
                rating: media.averageScore ? `AniList ${(media.averageScore / 10).toFixed(1)}` : null,
                genres: media.genres || [], studios, characters
            };
        }

        async function resolveAnilistByTitle(query) {
            const res = await fetchAnilist(ANILIST_SEARCH_QUERY, { search: query });
            const list = res?.data?.Page?.media || [];
            const target = normalizeAnilistTitle(query);
            const candidates = list.map(m => {
                const names = [m.title?.romaji, m.title?.english, m.title?.native].map(normalizeAnilistTitle);
                let score = names.includes(target) ? 100 : 0;
                if (names.some(n => n && (n.includes(target) || target.includes(n)))) score += 35;
                if (m.format === 'TV') score += 4;
                return { m, score };
            }).sort((a, b) => b.score - a.score);
            const best = candidates[0];
            if (!best || best.score < 35) return null;
            return adaptAnilistMedia(best.m);
        }

        function hasCharacterData(data) {
            return Array.isArray(data?.characters) && data.characters.some(x => x?.character?.name);
        }

        async function resolveJikanAnime(anime) {
            const stableMalId = Number(anime?.externalIds?.mal_id);
            const stableAnilistId = Number(anime?.externalIds?.anilist_id);
            let jikanFallback = null;
            // Priority 1: MAL ID. Priority 2: AniList ID. Priority 3/4 handled by title fallback below.
            if (stableMalId) {
                try {
                    const byId = await withTimeout(resolveJikanById(stableMalId), 5000, 'Jikan ID запит перевищив час очікування');
                    if (byId && hasCharacterData(byId)) return byId;
                    if (byId) jikanFallback = byId;
                } catch (e) { console.warn('Jikan ID lookup failed, trying other sources:', e); }
            }
            if (stableAnilistId) {
                try {
                    const query = `query ($id: Int) { Media(id: $id, type: ANIME) {
                        id title { romaji english native } format status season seasonYear episodes duration averageScore genres siteUrl
                        studios(isMain: true) { nodes { name } } nextAiringEpisode { airingAt episode }
                        characters(sort: ROLE, perPage: 10) { edges { role node { name { full native } image { large } } voiceActors(language: JAPANESE) { name { full } image { large } } } } } }`;
                    const res = await withTimeout(fetchAnilist(query, { id: stableAnilistId }), 8000, 'AniList ID запит перевищив час очікування');
                    if (res?.data?.Media) return adaptAnilistMedia(res.data.Media);
                } catch (e) { console.warn('AniList ID lookup failed, trying title fallback:', e); }
            }
            const query = anime?.originalTitle || anime?.title;
            if (!query) return jikanFallback;
            // AniList is the preferred title fallback because it usually returns characters and
            // voice actors faster and more consistently than Jikan's rate-limited search endpoint.
            try {
                const anilistMatch = await withTimeout(resolveAnilistByTitle(query), 8000, 'AniList пошук перевищив час очікування');
                if (anilistMatch) return anilistMatch;
            } catch (e) { console.warn('AniList title search unavailable:', e); }
            try {
                const byTitle = await withTimeout(resolveJikanByTitle(query), 5000, 'Jikan пошук перевищив час очікування');
                if (byTitle && hasCharacterData(byTitle)) return byTitle;
                if (byTitle && !jikanFallback) jikanFallback = byTitle;
            } catch (e) { console.warn('Jikan title search unavailable:', e); }
            return jikanFallback;
        }

        function jikanImage(item) {
            return item?.images?.webp?.image_url || item?.images?.jpg?.image_url || '';
        }

        function setSectionState(id, visible) {
            const el = document.getElementById(id);
            if (el) el.style.display = visible ? '' : 'none';
        }

        function formatJikanDuration(value) {
            if (value === null || value === undefined || value === '') return '';
            if (Number.isFinite(Number(value))) return `${Number(value)} хвилин`;
            const m = String(value).match(/(\d+)\s*min/i);
            return m ? `${m[1]} хвилин` : String(value);
        }

        function formatNextEpisodeDate(date) {
            if (!date) return 'Дата невідома';
            return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
        }

        function nextBroadcastDate(broadcast) {
            if (!broadcast?.day || !broadcast?.time) return null;
            const days = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
            const targetDay = days[String(broadcast.day).toLowerCase()];
            if (targetDay === undefined) return null;
            const [hour, minute] = String(broadcast.time).split(':').map(Number);
            if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
            // Build the wall-clock date in Tokyo and convert it through Intl, never by a fixed offset.
            const now = new Date();
            const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            }).formatToParts(now).filter(x => x.type !== 'literal').map(x => [x.type, Number(x.value)]));
            const tokyoWall = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second));
            const currentDay = tokyoWall.getUTCDay();
            let delta = (targetDay - currentDay + 7) % 7;
            const candidateWall = new Date(tokyoWall);
            candidateWall.setUTCDate(candidateWall.getUTCDate() + delta);
            candidateWall.setUTCHours(hour, minute, 0, 0);
            if (candidateWall <= tokyoWall) candidateWall.setUTCDate(candidateWall.getUTCDate() + 7);
            const tokyoOffset = tokyoWall.getTime() - now.getTime();
            return new Date(candidateWall.getTime() - tokyoOffset);
        }

        function countdownText(date) {
            const ms = new Date(date).getTime() - Date.now();
            if (!Number.isFinite(ms) || ms <= 0) return 'Очікуємо оновлення';
            const totalMinutes = Math.floor(ms / 60000);
            const days = Math.floor(totalMinutes / 1440);
            const hours = Math.floor((totalMinutes % 1440) / 60);
            const mins = totalMinutes % 60;
            if (days) return `Вихід через ${days} дн. ${hours} год.`;
            if (hours) return `Вихід через ${hours} год. ${mins} хв.`;
            return `Вихід через ${Math.max(mins, 1)} хв.`;
        }

        function renderAnimeInformation(data, tmdbInfo, details) {
            const root = document.getElementById('animeInfoGrid');
            if (!root) return;
            const type = data?.type || (playerAnimeIsMovie() ? 'Movie' : 'TV');
            const typeLabel = type === 'TV' ? 'TV Серіал' : type === 'Movie' ? 'Фільм' : (type || '—');
            const status = data?._statusLabel || JIKAN_STATUS_LABELS[data?.status] || ANILIST_STATUS_LABELS[data?.status] || data?.status || '—';
            const derivedYear = data?.year || (details?.first_air_date || details?.release_date || '').slice(0, 4);
            const seasonYear = data?.season && derivedYear ? `${SEASON_LABELS[data.season] || data.season} ${derivedYear}` : (derivedYear || '—');
            const episodeCount = playerPageAnime?.totalEpisodes ?? '—';
            const nextDate = data?._nextAiringDate instanceof Date && !Number.isNaN(data._nextAiringDate.getTime())
                ? data._nextAiringDate : (data?.airing ? nextBroadcastDate(data.broadcast) : null);
            const nextEpisode = data?._nextEpisode || (data?.airing && Number.isFinite(Number(data?.episodes)) ? Number(data.episodes) + 1 : null);
            const next = nextDate ? `${nextEpisode ? `Епізод ${nextEpisode} · ` : ''}${formatNextEpisodeDate(nextDate)}` : (data?.airing ? 'Дата невідома' : '—');
            const studio = data?.studios?.[0]?.name || details?.production_companies?.[0]?.name || '—';
            const studioLogo = data?.studios?.[0]?.logo || (details?.production_companies?.[0]?.logo_path ? tmdbImgUrl(details.production_companies[0].logo_path, 'w185') : '');
            const rating = data?.rating || (details?.vote_average ? `TMDB ${details.vote_average.toFixed(1)}` : '—');
            const rows = [
                ['Тип', typeLabel], ['Статус', `<span class="anime-info-badge">${escapeHtml(status)}</span>`],
                ['Сезон / рік', seasonYear], ['Епізоди', episodeCount || '—'], ['Наступний епізод', next],
                ['Тривалість епізоду', formatJikanDuration(data?.duration) || (details?.episode_run_time?.[0] ? `${details.episode_run_time[0]} хвилин` : '—')],
                ['Рейтинг', rating],
                ['Жанри', normalizeGenreList(playerPageAnime?.genres).join(' · ') || '—'],
                ['Студія', studioLogo ? `${escapeHtml(studio)}<img class="anime-info-studio-logo" src="${escapeHtml(studioLogo)}" alt="" loading="lazy" onerror="this.remove()">` : studio]
            ];
            root.innerHTML = rows.map(([label, value]) => `<div class="anime-info-row"><span>${escapeHtml(label)}</span><strong>${String(value).includes('anime-info-badge') || String(value).includes('anime-info-studio-logo') ? value : escapeHtml(String(value))}</strong></div>`).join('');
            const countdown = document.getElementById('animeCountdown');
            if (playerCountdownTimer) { clearInterval(playerCountdownTimer); playerCountdownTimer = null; }
            if (countdown) countdown.textContent = nextDate ? countdownText(nextDate) : '';
            if (nextDate) playerCountdownTimer = setInterval(() => { if (countdown) countdown.textContent = countdownText(nextDate); }, 60000);
        }

        function renderMainCharacters(data) {
            const list = document.getElementById('mainCharactersList');
            const more = document.getElementById('mainCharactersMoreBtn');
            if (!list) return;
            playerCharacterItems = (data?.characters || []).filter(x => x?.character?.name).map(x => ({
                name: x.character.name, original: x.character.name_kanji, role: x.role,
                image: jikanImage(x.character), voice: x.voice_actors?.find(v => v.language === 'Japanese')?.person?.name || ''
            })).sort((a, b) => ((a.role === 'Main' || a.role === 'Головна роль') ? 0 : 1) - ((b.role === 'Main' || b.role === 'Головна роль') ? 0 : 1));
            const items = playerCharacterExpanded ? playerCharacterItems : playerCharacterItems.slice(0, 8);
            if (!items.length) {
                list.innerHTML = '';
                if (more) more.hidden = true;
                setSectionState('mainCharactersSection', false);
                return;
            }
            setSectionState('mainCharactersSection', true);
            list.innerHTML = items.map(c => `<article class="cast-card character-card"><div class="cast-avatar" style="${c.image ? `background-image:url('${escapeHtml(c.image)}')` : ''}"></div><div class="cast-name">${escapeHtml(c.name)}</div>${c.original ? `<div class="character-original">${escapeHtml(c.original)}</div>` : ''}<div class="cast-role">${escapeHtml([c.role, c.voice ? `Сейю: ${c.voice}` : ''].filter(Boolean).join(' · '))}</div></article>`).join('');
            if (more) { more.hidden = playerCharacterItems.length <= 8; more.textContent = playerCharacterExpanded ? '←' : '→'; }
        }

        function relatedCardMarkup(x) {
            return `<article class="related-card" data-related-title="${escapeHtml(x.title || '')}" data-related-title-en="${escapeHtml(x.titleEn || '')}"><img src="${escapeHtml(x.image || '')}" alt="" loading="lazy"><div><strong>${escapeHtml(x.title || '')}</strong><span>${escapeHtml([x.year, x.typeLabel, x.relationLabel].filter(Boolean).join(' · '))}</span></div></article>`;
        }

        async function openRelatedAnimeInPlayer(card) {
            if (!card || card.classList.contains('is-loading')) return;
            const title = card.dataset.relatedTitle || '';
            const titleEn = card.dataset.relatedTitleEn || '';
            if (!title && !titleEn) return;
            card.classList.add('is-loading');
            try {
                const queries = [...new Set([title, titleEn].filter(Boolean))];
                let results = [];
                for (const query of queries) {
                    results = await searchHikka(query, 1);
                    if (results?.length) break;
                }
                const normalizeTitle = value => String(value || '').toLocaleLowerCase('uk-UA')
                    .replace(/[\u2010-\u2015:!?.,'’"()\[\]{}]/g, ' ')
                    .replace(/\s+/g, ' ').trim();
                const wanted = queries.map(normalizeTitle).filter(Boolean);
                const exact = (results || []).find(item => {
                    const names = [item.title, item.originalTitle, ...(item.alternativeTitles || [])].map(normalizeTitle);
                    return names.some(name => wanted.includes(name) || wanted.some(q => q === name || q.includes(name) || name.includes(q)));
                });
                const match = exact || results?.[0];
                if (match?.url) openPlayerPage(match.url);
                else showToast(`«${title}» ще не знайдено в каталозі VakDab`);
            } catch (e) { showToast('Не вдалося відкрити пов’язане аніме'); }
            finally { card.classList.remove('is-loading'); }
        }


        async function renderRelatedAnimeFromJikan(data) {
            const current = Number(data?.mal_id);
            const entries = (data?.relations || []).flatMap(group => (group.entry || []).map(entry => ({ ...entry, relation: group.relation })))
                .filter(x => x.mal_id && Number(x.mal_id) !== current);
            const unique = [...new Map(entries.map(x => [x.mal_id, x])).values()];
            const detailItems = unique.slice(0, 24);
            const details = await Promise.allSettled(detailItems.map(x => fetchJikan(`/anime/${x.mal_id}`)));
            return unique.map((x, i) => {
                const result = i < details.length ? details[i] : null;
                const full = result?.status === 'fulfilled' ? result.value.data : {};
                return { url: full.url || x.url, image: jikanImage(full) || jikanImage(x), title: full.title || x.name, year: full.year || (full.aired?.from || '').slice(0, 4), typeLabel: full.type || '', relationLabel: x.relation };
            });
        }

        async function renderRelatedAnimeFromAnilist(data) {
            if (!data?._anilistId) return [];
            const edges = await fetchAnilistRelations(data._anilistId);
            const filtered = edges.filter(e => e.node?.id !== data._anilistId && e.node?.type === 'ANIME');
            const unique = [...new Map(filtered.map(e => [e.node.id, e])).values()];
            return unique.map(e => ({
                url: e.node.siteUrl, image: e.node.coverImage?.large,
                title: e.node.title?.romaji || e.node.title?.english, titleEn: e.node.title?.english || e.node.title?.romaji, year: e.node.startDate?.year,
                typeLabel: ANILIST_FORMAT_LABELS[e.node.format] || e.node.format,
                relationLabel: ANILIST_RELATION_LABELS[e.relationType] || null
            }));
        }

        async function renderRelatedAnime(data) {
            const list = document.getElementById('relatedList');
            const more = document.getElementById('relatedMoreBtn');
            if (!list) return;
            try {
                playerRelatedItems = data?._provider === 'anilist' ? await renderRelatedAnimeFromAnilist(data) : await renderRelatedAnimeFromJikan(data);
            } catch (e) { console.warn('Related anime lookup failed:', e); playerRelatedItems = []; }
            if (!playerRelatedItems.length) { setSectionState('relatedSection', false); return; }
            setSectionState('relatedSection', true);
            const visible = playerRelatedItems.slice(0, 4);
            list.innerHTML = visible.map(relatedCardMarkup).join('');
            list.querySelectorAll('.related-card').forEach(card => card.addEventListener('click', () => openRelatedAnimeInPlayer(card)));
            const count = document.getElementById('relatedCount');
            if (count) count.textContent = `(${playerRelatedItems.length})`;
            if (more) more.hidden = playerRelatedItems.length <= 4;
        }

        function renderAnimeMedia(data) {
            const list = document.getElementById('mediaList');
            const more = document.getElementById('mediaMoreBtn');
            if (!list) return;
            playerMediaItems = [
                ...(data?.theme?.openings || []).map(x => ({ label: 'Opening', title: x })),
                ...(data?.theme?.endings || []).map(x => ({ label: 'Ending', title: x }))
            ].filter(x => x.title).filter((x, i, arr) => arr.findIndex(y => y.label === x.label && y.title === x.title) === i);
            if (!playerMediaItems.length) { setSectionState('mediaSection', false); return; }
            setSectionState('mediaSection', true);
            const items = playerMediaExpanded ? playerMediaItems : playerMediaItems.slice(0, 8);
            list.innerHTML = items.map((x, i) => `<div class="media-track"><span>${escapeHtml(x.label)}</span><strong>${escapeHtml(x.title)}</strong></div>`).join('');
            if (more) { more.hidden = playerMediaItems.length <= 8; more.textContent = playerMediaExpanded ? '←' : '→'; }
        }

        async function loadAndRenderJikanExtras(anime, tmdbInfo, details) {
            try {
                const data = await resolveJikanAnime(anime);
                if (playerPageCurrentAnimeUrl !== anime.url) return;
                if (!data) {
                    const infoGrid = document.getElementById('animeInfoGrid');
                    if (infoGrid) infoGrid.innerHTML = '<div class="anime-info-placeholder">Розширена інформація тимчасово недоступна</div>';
                    setSectionState('relatedSection', false);
                    setSectionState('mediaSection', false);
                    setSectionState('mainCharactersSection', false);
                    return;
                }
                playerJikanData = data;
                renderAnimeInformation(data, tmdbInfo, details);
                renderMainCharacters(data);
                if (document.getElementById('castSection')?.style.display === 'none') renderVoiceCast(data);
                renderAnimeMedia(data);
                await renderRelatedAnime(data);
            } catch (e) {
                console.warn('Jikan anime extras unavailable:', e);
                const infoGrid = document.getElementById('animeInfoGrid');
                if (infoGrid) infoGrid.innerHTML = '<div class="anime-info-placeholder">Розширена інформація тимчасово недоступна</div>';
                const mainCharactersList = document.getElementById('mainCharactersList');
                if (mainCharactersList && !playerCharacterItems.length) {
                    setSectionState('mainCharactersSection', true);
                    mainCharactersList.innerHTML = '<div class="player-empty-episodes">Персонажі тимчасово недоступні</div>';
                }
                setSectionState('relatedSection', false);
                setSectionState('mediaSection', false);
            }
        }

        function renderCast(details) {
            const section = document.getElementById('castSection');
            const list = document.getElementById('castList');
            if (!section || !list) return;
            const cast = ((details && details.credits && details.credits.cast) || []).slice(0, 8);
            if (!cast.length) { list.innerHTML = ''; section.style.display = 'none'; return; }
            section.style.display = '';
            const castTitle = section.querySelector('.section-title');
            if (castTitle) castTitle.textContent = 'Актори';
            list.innerHTML = cast.map(c => {
                const avatar = c.profile_path ? tmdbImgUrl(c.profile_path, 'w185') : '';
                const avatarStyle = avatar ? `background-image:url(${avatar});background-size:cover;background-position:center;` : '';
                return `
                <div class="cast-card">
                    <div class="cast-avatar" style="${avatarStyle}"></div>
                    <div class="cast-name">${escapeHtml(c.name || '')}</div>
                    <div class="cast-role">${escapeHtml(c.character || '')}</div>
                </div>`;
            }).join('');
        }

        function renderVoiceCast(data) {
            const section = document.getElementById('castSection');
            const list = document.getElementById('castList');
            if (!section || !list) return;
            const cast = (data?.characters || []).filter(x => x?.character?.name && x?.voice_actors?.length).slice(0, 12);
            if (!cast.length) return;
            section.style.display = '';
            section.querySelector('.section-title').textContent = 'Актори / сейю';
            list.innerHTML = cast.map(x => {
                const c = x.character;
                const voice = x.voice_actors?.find(v => v.language === 'Japanese') || x.voice_actors?.[0];
                const person = voice?.person || {};
                const avatar = jikanImage(person);
                const style = avatar ? `background-image:url('${escapeHtml(avatar)}');` : '';
                return `<article class="cast-card"><div class="cast-avatar" style="${style}"></div><div class="cast-name">${escapeHtml(person.name || 'Сейю невідомий')}</div><div class="cast-role">${escapeHtml(c.name || '')}</div></article>`;
            }).join('');
        }

        function tmdbStillFor(ep, epMap, tmdbInfo, fallback) {
            const tmdbEpisode = epMap && epMap[parseInt(ep.episode, 10)];
            return tmdbImgUrl(tmdbEpisode?.still_path, 'w500') || fallback;
        }

        function tmdbRatingFor(ep, epMap) {
            const t = epMap && epMap[parseInt(ep.episode)];
            if (t && t.vote_average) return t.vote_average.toFixed(1);
            return null;
        }

        // ====================================================================
        //  ПОБУДОВА СПИСКУ СЕРІЙ — Сітка / Компактний / Класичний
        // ====================================================================
        function buildGridCard(ep, posterUrl, epMap, tmdbInfo) {
            const progress = getEpisodeProgress(ep.episode);
            const watched = progress >= 95;
            const img = tmdbStillFor(ep, epMap, tmdbInfo, posterUrl);
            const rating = tmdbRatingFor(ep, epMap);
            const statusText = watched ? 'Переглянуто' : (progress > 0 ? `${Math.round(progress)}%` : 'Доступно');
            return `
              <div class="episode-grid-card${watched ? ' watched' : ''}" data-file="${ep.file}" data-episode="${ep.episode}">
                <div class="episode-grid-thumb" style="background-image:url(${img})">
                  <span class="episode-grid-num">${String(ep.episode).padStart(2, '0')}</span>
                </div>
                <div class="episode-grid-info">
                  <div class="episode-grid-title">Серія ${ep.episode}</div>
                  <div class="episode-grid-meta">
                    ${rating ? `<span class="episode-grid-rating">★ ${rating}</span><span>·</span>` : ''}
                    <span>${statusText}</span>
                  </div>
                  <div class="episode-grid-progress"><div class="episode-grid-progress-bar" style="width:${Math.min(progress, 100)}%"></div></div>
                </div>
              </div>`;
        }

        function buildCompactRow(ep, posterUrl, epMap, tmdbInfo) {
            const progress = getEpisodeProgress(ep.episode);
            const watched = progress >= 95;
            const img = tmdbStillFor(ep, epMap, tmdbInfo, posterUrl);
            const rating = tmdbRatingFor(ep, epMap);
            const statusText = watched ? 'Переглянуто' : (progress > 0 ? `${Math.round(progress)}%` : 'Доступно');
            return `
              <div class="epv2c-row${watched ? ' watched' : ''}" data-file="${ep.file}" data-episode="${ep.episode}">
                <div class="epv2c-thumb" style="background-image:url(${img})"><span class="epv2c-num">${ep.episode}</span></div>
                <div class="epv2c-body">
                  <div class="epv2c-title">Серія ${ep.episode}</div>
                  <div class="epv2c-meta">
                    ${rating ? `<span>★ ${rating}</span><span>•</span>` : ''}
                    <span>${statusText}</span>
                  </div>
                </div>
                <span class="epv2c-quality">${playerPageCurrentQuality || '—'}</span>
              </div>`;
        }

        function buildClassicRow(ep, posterUrl, epMap, tmdbInfo) {
            const progress = getEpisodeProgress(ep.episode);
            const watched = progress >= 95;
            const img = tmdbStillFor(ep, epMap, tmdbInfo, posterUrl);
            const rating = tmdbRatingFor(ep, epMap);
            const statusText = watched ? 'Переглянуто' : (progress > 0 ? `${Math.round(progress)}%` : 'Доступно');
            return `
              <div class="epv2l-row${watched ? ' watched' : ''}" data-file="${ep.file}" data-episode="${ep.episode}">
                <div class="epv2l-thumb" style="background-image:url(${img})">
                  <span class="epv2l-badge epv2l-badge-num">Серія ${ep.episode}</span>
                  <span class="epv2l-badge epv2l-badge-quality">${playerPageCurrentQuality || '—'}</span>
                  ${progress > 0 ? `<div class="epv2l-progress"><div class="epv2l-progress-fill" style="width:${Math.min(progress, 100)}%"></div></div>` : ''}
                </div>
                <div class="epv2l-meta-row">
                  ${rating ? `<span class="epv2-rating"><i data-lucide="star" style="width:11px;height:11px;"></i>${rating}</span><span class="epv2-dot">•</span>` : ''}
                  <span>${statusText}</span>
                </div>
              </div>`;
        }

        function attachEpisodeClickHandlers(container) {
            if (!container) return;
            container.querySelectorAll('[data-file]').forEach(card => {
                card.addEventListener('click', () => {
                    const file = card.dataset.file;
                    const epNum = card.dataset.episode;
                    if (!file) return;
                    playerPageCurrentEpisodeNum = epNum;
                    playEpisode(file, epNum);
                });
            });
        }

        function renderAllEpisodeViews(episodes, epMap, tmdbInfo) {
            const picker = document.getElementById('episodeViewGrid');
            const compactContainer = document.getElementById('episodeViewCompact');
            const classicContainer = document.getElementById('episodeViewClassic');
            if (!picker) return;
            if (!episodes.length) {
                const emptyHtml = '<div class="player-empty-episodes">Серії ще не знайдені на цьому джерелі.</div>';
                picker.innerHTML = emptyHtml;
                if (compactContainer) compactContainer.innerHTML = '';
                if (classicContainer) classicContainer.innerHTML = '';
                return;
            }
            // The new player deliberately uses buttons instead of a poster grid.
            picker.innerHTML = episodes.map(ep => {
                const active = String(ep.episode) === String(playerPageCurrentEpisodeNum) ? ' active' : '';
                const progress = getEpisodeProgress(ep.episode);
                return `<button type="button" class="player-episode-btn${active}" data-file="${escapeHtml(ep.file || '')}" data-episode="${escapeHtml(ep.episode || '')}">
                    <span class="player-episode-number">${escapeHtml(ep.episode || '—')}</span>
                    <span class="player-episode-title">${escapeHtml(ep.title || `Серія ${ep.episode || ''}`)}</span>
                    ${progress > 0 ? `<span class="player-episode-progress" style="--progress:${progress}%"></span>` : ''}
                </button>`;
            }).join('');
            if (compactContainer) compactContainer.innerHTML = '';
            if (classicContainer) classicContainer.innerHTML = '';
            attachEpisodeClickHandlers(picker);
        }

        async function buildEpisodeViews() {
            const episodes = getCurrentEpisodes();
            playerPageEpisodes = episodes;
            renderAllEpisodeViews(episodes, null, null);
            if (!episodes.length) return;
            try {
                if (playerAnimeIsMovie()) return;
                const tmdbInfo = await fetchTmdbForAnime(playerPageAnime);
                if (!tmdbInfo) return;
                const seasonNum = parseInt(playerPageCurrentSeason) || 1;
                const seasonEpisodes = await fetchTmdbSeasonEpisodes(tmdbInfo, seasonNum);
                // якщо сезон/озвучку вже змінили поки йшов запит — не рендеримо застарілі дані
                if (getCurrentEpisodes() !== episodes) return;
                if (!seasonEpisodes) return;
                const epMap = {};
                seasonEpisodes.forEach(e => { epMap[e.episode_number] = e; });
                playerPageTmdbEpisodeMap = epMap;
                renderAllEpisodeViews(episodes, epMap, tmdbInfo);
                setPlayerFramePoster(tmdbImgUrl(epMap[Number(playerPageCurrentEpisodeNum)]?.still_path, 'w1280'));
            } catch (e) { console.warn('TMDB enrich failed', e); }
        }

        function playerAnimeIsMovie(anime = playerPageAnime) {
            return anime?.type === 'movie' || (anime?.genres || []).some(g => /повнометраж|фільм|movie/i.test(g));
        }

        function setPlayerFramePoster(frameUrl = '') {
            const frame = document.getElementById('playerFramePoster');
            if (!frame) return;
            const url = frameUrl || tmdbImgUrl(playerPageTmdbInfo?.backdrop_path, 'w1280') || document.getElementById('playerPosterImg')?.src || '';
            if (url) { frame.src = url; frame.classList.remove('is-hidden'); }
            else frame.classList.add('is-hidden');
        }
        function hidePlayerFramePoster() {
            const frame = document.getElementById('playerFramePoster');
            if (frame) frame.classList.add('is-hidden');
        }
        function formatMovieRuntime(minutes) {
            const n = Number(minutes);
            if (!Number.isFinite(n) || n <= 0) return '';
            const h = Math.floor(n / 60);
            const m = Math.round(n % 60);
            return h ? `${h} год ${m ? m + ' хв' : ''}`.trim() : `${m} хв`;
        }

        async function playEpisode(file, epNum) {
            if (!file) { showToast('Немає файлу для відтворення'); return; }
            if (!playerPageIsOpen) return;
            const playbackRequest = ++playerPagePlaybackRequest;
            playerPageCurrentEpisodeNum = epNum || '1';
            renderAllEpisodeViews(getCurrentEpisodes(), null, null);
            const videoContainer = document.getElementById('playerVideoContainer');
            const videoDiv = document.getElementById('playerPageVideo');
            videoContainer.classList.add('active');
            videoContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const videoTitleEl = document.getElementById('playerTopbarTitle');
            if (videoTitleEl) videoTitleEl.textContent = playerPageAnime?.title || '';
            videoDiv.innerHTML = '';
            setPlayerFramePoster(tmdbImgUrl(playerPageTmdbEpisodeMap[Number(epNum)]?.still_path, 'w1280'));
            let finalUrl = file;
            if (/ashdi\.vip\/vod\//i.test(file)) {
                showToast('Підключення ASHDI через проксі...');
                try {
                    finalUrl = await resolveAshdiPlaybackUrl(file);
                } catch (error) {
                    if (playbackRequest !== playerPagePlaybackRequest || !playerPageIsOpen) return;
                    console.warn('[ASHDI playback]', error);
                    videoContainer.classList.remove('active');
                    videoDiv.innerHTML = '<div class="player-video-error"><i class="fas fa-triangle-exclamation"></i><span>Відео цієї серії недоступне.</span></div>';
                    showToast(`ASHDI: ${error.message || 'відео недоступне'}`);
                    return;
                }
            }
            if (playbackRequest !== playerPagePlaybackRequest || !playerPageIsOpen) return;
            playerPageActiveEpisodeFile = finalUrl;

            if (playerPagePlayer) { playerPagePlayer.destroy();
                playerPagePlayer = null; }
            if (playbackRequest !== playerPagePlaybackRequest || !playerPageIsOpen) return;
            playerPagePlayer = new LampaPlayer(videoDiv, { poster: playerPageAnime?.images?.jpg?.large_image_url });
            playerPagePlayer.loadSource(finalUrl, playerPageAnime?.title || '', `Серія ${epNum}`);
            playerPageHistoryUpdated = false;
            playerPageWatchStartTime = 0;
            playerPageAccumulatedWatchSeconds = 0;
            playerPageLastVideoTime = null;
            playerPageIsPlaying = false;
            const video = playerPagePlayer.videoRef;
            if (video) {
                const hideFrame = () => hidePlayerFramePoster();
                const syncPlaybackClock = () => {
                    if (!playerPageIsPlaying) return;
                    const currentTime = Number(video.currentTime);
                    if (!Number.isFinite(currentTime)) return;
                    if (playerPageLastVideoTime !== null) {
                        const delta = currentTime - playerPageLastVideoTime;
                        // Ignore seeks/jumps; only count normal media progression.
                        if (delta >= 0 && delta <= 5) playerPageAccumulatedWatchSeconds += delta;
                    }
                    playerPageLastVideoTime = currentTime;
                };
                const onPlaying = () => {
                    playerPageIsPlaying = true;
                    playerPageLastVideoTime = Number(video.currentTime) || 0;
                };
                const onPause = () => {
                    syncPlaybackClock();
                    playerPageIsPlaying = false;
                    playerPageLastVideoTime = Number(video.currentTime) || 0;
                };
                const onSeeking = () => { playerPageLastVideoTime = null; };
                const onSeeked = () => { playerPageLastVideoTime = Number(video.currentTime) || 0; };
                video.addEventListener('playing', hideFrame, { once: true });
                video.addEventListener('playing', onPlaying);
                video.addEventListener('pause', onPause);
                video.addEventListener('waiting', onPause);
                video.addEventListener('seeking', onSeeking);
                video.addEventListener('seeked', onSeeked);
                const onTimeUpdate = () => {
                    syncPlaybackClock();
                    if (playerPageHistoryUpdated) return;
                    if (!playerPageAnime) return;
                    const duration = video.duration;
                    if (!duration || duration === Infinity) return;
                    const progress = (video.currentTime / duration) * 100;
                    const watchSecondsSoFar = Math.floor(playerPageAccumulatedWatchSeconds);
                    // Зберігаємо в історію через 2 хвилини перегляду
                    if (watchSecondsSoFar >= 120) {
                        playerPageHistoryUpdated = true;
                        const ep = epNum || playerPageCurrentEpisodeNum || '1';
                        const season = playerPageCurrentSeason || '1';
                        const history = Storage.getHistory();
                        const idx = history.findIndex(h => h.url === playerPageAnime.url);
                        // watchTime вже обчислено вище
                        if (watchSecondsSoFar > 0) {
                            Storage.addWatchTime(watchSecondsSoFar);
                            DailyStats.increment('minutesToday', Math.round(watchSecondsSoFar / 60));
                        }
                        if (idx >= 0) {
                            history[idx].episode = ep;
                            history[idx].season = season;
                            history[idx].timestamp = Date.now();
                            history[idx].progress = Math.min(progress, 100);
                            history[idx].duration = Math.floor(video.currentTime);
                            Storage.setHistory(history);
                        } else {
                            const entry = {
                                animeId: playerPageAnime.mal_id || playerPageAnime.url.hashCode(),
                                title: playerPageAnime.title,
                                poster: playerPageAnime.images?.jpg?.large_image_url || '',
                                url: playerPageAnime.url,
                                episode: ep,
                                season: season,
                                timestamp: Date.now(),
                                progress: Math.min(progress, 100),
                                duration: Math.floor(video.currentTime)
                            };
                            history.unshift(entry);
                            DailyStats.increment('episodesToday', 1);
                            DailyStats.addUniqueAnime(playerPageAnime.url);
                            if (history.length > 200) history.length = 200;
                            Storage.setHistory(history);
                        }
                        showToast(`Серія ${ep} збережена в історію`);
                        video.removeEventListener('timeupdate', onTimeUpdate);
                        buildEpisodeViews();
                    }
                };
                video.addEventListener('timeupdate', onTimeUpdate);
                if (playerPagePlayer._timeUpdateListener) {
                    video.removeEventListener('timeupdate', playerPagePlayer._timeUpdateListener);
                }
                playerPagePlayer._timeUpdateListener = onTimeUpdate;
            }
            setTimeout(() => { videoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);
        }

        function closePlayerPage() {
            const modal = document.getElementById('playerPageModal');
            if (!modal || (!playerPageIsOpen && !modal.classList.contains('is-open'))) return;
            playerPageIsOpen = false;
            playerPagePlaybackRequest += 1;
            modal.setAttribute('aria-busy', 'false');
            modal.setAttribute('aria-hidden', 'true');
            modal.classList.remove('is-open');
            // Скасувати активне завантаження — щоб catch не показував помилку
            if (_playerLoadController) {
                _playerLoadController.abort();
                _playerLoadController = null;
            }
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
            }
            closeWatchPage();
            modal.style.display = 'none';
            document.documentElement.classList.remove('player-page-open');
            document.body.classList.remove('player-page-open');
            document.getElementById('bottomNav')?.classList.remove('hidden-nav');
            document.body.style.overflow = playerPagePreviousBodyOverflow;
            document.getElementById('episodePanel').classList.remove('visible');
            if (playerPagePreviousActiveElement && document.contains(playerPagePreviousActiveElement)) {
                playerPagePreviousActiveElement.focus({ preventScroll: true });
            }
            playerPagePreviousActiveElement = null;
            if (Router.currentRoute === 'profile') renderProfilePage();
        }

        function updateBookmarkButton(url) {
            const btn = document.getElementById('playerBookmarkBtn');
            if (!btn) return;
            const bookmarks = Storage.getBookmarks();
            const isBookmarked = bookmarks.some(b => b.url === url);
            btn.classList.toggle('bookmarked', isBookmarked);
            btn.innerHTML = isBookmarked ?
                '<i class="fas fa-heart" style="color:#ffd700;"></i>' :
                '<i class="fas fa-heart"></i>';
        }

        function toggleBookmark() {
            const url = playerPageCurrentAnimeUrl;
            if (!url) { showToast('Немає аніме для закладки'); return; }
            const bookmarks = Storage.getBookmarks();
            const idx = bookmarks.findIndex(b => b.url === url);
            if (idx >= 0) {
                bookmarks.splice(idx, 1);
                Storage.setBookmarks(bookmarks);
                showToast('Видалено з закладок');
                updateBookmarkButton(url);
                if (Router.currentRoute === 'profile') renderProfilePage();
                return;
            }
            const anime = playerPageAnime;
            if (!anime) { showToast('Помилка: немає даних про аніме'); return; }
            const totalEpisodes = Object.values(anime.seasons || {}).reduce((sum, s) => sum + Object.values(s).reduce((s2,
                e) => Math.max(s2, e.length), 0), 0);
            bookmarks.push({
                url: anime.url,
                title: anime.title,
                poster: anime.images?.jpg?.large_image_url || '',
                episodes: totalEpisodes + ' еп.',
                addedAt: Date.now()
            });
            Storage.setBookmarks(bookmarks);
            DailyStats.increment('bookmarksToday', 1);
            showToast('Додано до закладок');
            updateBookmarkButton(url);
            if (Router.currentRoute === 'profile') renderProfilePage();
        }

        // ====================================================================
        //  ЛАЙК / ДИЗЛАЙК
        // ====================================================================
        function updateLikeButton() {
            const btn = document.getElementById('likeBtn');
            if (!btn) return;
            const likes = Storage.getLikes();
            const url = playerPageCurrentAnimeUrl;
            if (url && likes[url] === 'like') {
                btn.classList.add('liked');
                btn.innerHTML = '<i class="fas fa-thumbs-up" style="color:#00ff88;"></i>';
            } else {
                btn.classList.remove('liked');
                btn.innerHTML = '<i class="fas fa-thumbs-up"></i>';
            }
        }

        function updateDislikeButton() {
            const btn = document.getElementById('dislikeBtn');
            if (!btn) return;
            const likes = Storage.getLikes();
            const url = playerPageCurrentAnimeUrl;
            if (url && likes[url] === 'dislike') {
                btn.classList.add('disliked');
                btn.innerHTML = '<i class="fas fa-thumbs-down" style="color:#ff4444;"></i>';
            } else {
                btn.classList.remove('disliked');
                btn.innerHTML = '<i class="fas fa-thumbs-down"></i>';
            }
        }

        function toggleLike() {
            const url = playerPageCurrentAnimeUrl;
            if (!url) { showToast('Немає аніме для оцінки'); return; }
            const likes = Storage.getLikes();
            if (likes[url] === 'like') {
                delete likes[url];
                Storage.setLikes(likes);
                syncAnimeRating(url, 0);
                showToast('Лайк скасовано');
            } else {
                likes[url] = 'like';
                Storage.setLikes(likes);
                DailyStats.increment('likesToday', 1);
                DailyStats.addTotalRating();
                syncAnimeRating(url, 1);
                showToast('Лайк');
            }
            updateLikeButton();
            updateDislikeButton();
            if (Router.currentRoute === 'profile') renderProfilePage();
        }

        function toggleDislike() {
            const url = playerPageCurrentAnimeUrl;
            if (!url) { showToast('Немає аніме для оцінки'); return; }
            const likes = Storage.getLikes();
            if (likes[url] === 'dislike') {
                delete likes[url];
                Storage.setLikes(likes);
                syncAnimeRating(url, 0);
                showToast('Дизлайк скасовано');
            } else {
                likes[url] = 'dislike';
                Storage.setLikes(likes);
                syncAnimeRating(url, -1);
                showToast('Дизлайк');
            }
            updateLikeButton();
            updateDislikeButton();
            if (Router.currentRoute === 'profile') renderProfilePage();
        }

        // ====================================================================
        //  BOTTOM SHEET
        // ====================================================================
        let bottomSheetMode = 'full';

        function buildBottomSheetData() {
            const bindItems = (root, selector, callback) => {
                root?.querySelectorAll(selector).forEach(item => {
                    const activate = () => callback(item.dataset.value);
                    item.addEventListener('click', activate);
                    item.addEventListener('keydown', event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            activate();
                        }
                    });
                });
            };

            const sourceList = document.getElementById('bsSourceList');
            if (sourceList) {
                const sources = playerPageSources.length ? playerPageSources : ['Основне'];
                sourceList.innerHTML = sources.map(s => {
                    const active = s === playerPageCurrentSource ? ' active' : '';
                    return `<div class="source-item${active}" data-value="${escapeHtml(String(s))}" role="button" tabindex="0">${escapeHtml(String(s))}</div>`;
                }).join('');
                bindItems(sourceList, '[data-value]', value => switchProviderSource(value));
            }

            const dubList = document.getElementById('bsDubList');
            if (dubList && playerPageAnime?.seasons) {
                const seasons = Object.keys(playerPageAnime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
                const currentSeason = playerPageCurrentSeason || seasons[0] || '1';
                const dubs = Object.keys(playerPageAnime.seasons[currentSeason] || {}).sort();
                dubList.innerHTML = dubs.map(d => {
                    const active = d === playerPageCurrentDub ? ' active' : '';
                    return `<div class="source-item${active}" data-value="${escapeHtml(String(d))}" role="button" tabindex="0">${escapeHtml(String(d))}</div>`;
                }).join('');
                bindItems(dubList, '[data-value]', value => selectDubFromSheet(value));
            }

            const seasonList = document.getElementById('bsSeasonList');
            if (seasonList && playerPageAnime?.seasons) {
                const seasons = Object.keys(playerPageAnime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
                seasonList.innerHTML = seasons.map(s => {
                    const active = s === playerPageCurrentSeason ? ' active' : '';
                    return `<div class="source-item${active}" data-value="${escapeHtml(String(s))}" role="button" tabindex="0">Сезон ${escapeHtml(String(s))}</div>`;
                }).join('');
                bindItems(seasonList, '[data-value]', value => selectSeasonFromSheet(value));
            }

            const qualityRow = document.getElementById('bsQualityRow');
            if (qualityRow) {
                qualityRow.innerHTML = QUALITY_OPTIONS.map(q => {
                    const active = q === playerPageCurrentQuality ? ' active' : '';
                    return `<div class="quality-item${active}" data-value="${escapeHtml(String(q))}" role="button" tabindex="0">${escapeHtml(String(q))}</div>`;
                }).join('');
                bindItems(qualityRow, '[data-value]', value => selectQualityFromSheet(value));
            }
        }

        window.selectDubFromSheet = function(dub) {
            playerPageCurrentDub = dub;
            buildEpisodeViews();
            updateFilterChip();
            buildBottomSheetData();
            showToast(`Озвучка: ${dub}`);
        };

        window.selectSeasonFromSheet = function(season) {
            playerPageCurrentSeason = season;
            const dubs = Object.keys(playerPageAnime?.seasons?.[season] || {}).sort();
            playerPageCurrentDub = dubs[0] || '';
            buildEpisodeViews();
            refreshPlayerSeasonPoster(season);
            updateFilterChip();
            buildBottomSheetData();
            showToast(`Сезон ${season}`);
        };

        window.selectQualityFromSheet = function(quality) {
            playerPageCurrentQuality = quality;
            buildBottomSheetData();
            showToast(`Якість: ${quality}`);
        };

        function openBottomSheet(mode) {
            bottomSheetMode = mode || 'full';
            buildBottomSheetData();
            document.getElementById('bottomSheetOverlay').classList.add('open');
        }

        function closeBottomSheet() {
            document.getElementById('bottomSheetOverlay').classList.remove('open');
        }

        // ====================================================================
        //  ОБРОБНИКИ ПОДІЙ
        // ====================================================================
        function openMenuPopover() {
            const overlay = document.getElementById('menuPopoverOverlay');
            if (overlay) overlay.classList.add('visible');
        }
        function closeMenuPopover() {
            const overlay = document.getElementById('menuPopoverOverlay');
            if (overlay) overlay.classList.remove('visible');
        }
        window.closeMenuPopover = closeMenuPopover;

        document.getElementById('bnMenu')?.addEventListener('click', (e) => {
            e.stopPropagation();
            openMenuPopover();
        });

        document.getElementById('menuPopoverOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'menuPopoverOverlay') closeMenuPopover();
        });

        document.querySelectorAll('.menu-popover-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                closeMenuPopover();
                if (action === 'genres') {
                    Router.goTo('genres');
                } else if (action === 'settings') {
                    Router.goTo('settings');
                } else if (action === 'filters') {
                    Router.goTo('filter');
                } else if (action === 'stickers') {
                    Router.goTo('stickers');
                } else if (action === 'schedule') {
                    Router.goTo('schedule');
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeMenuPopover();
            }
        });

        document.getElementById('searchCircleBtn')?.addEventListener('click', () => {
            Router.goTo('search');
            setTimeout(() => {
                const inp = document.getElementById('searchPageInput');
                if (inp) inp.focus();
            }, 200);
        });

        document.getElementById('top100Btn').addEventListener('click', showTop100);
        document.getElementById('randomBtn').addEventListener('click', openRandomAnime);
        document.getElementById('logoHome').addEventListener('click', () => Router.goTo('main'));

        const cpBtn = document.getElementById('closePlayerPageBtn');
        if (cpBtn) cpBtn.addEventListener('click', closePlayerPage);
        // Fullscreen button — global handler
        const playerFsBtn = document.getElementById('playerFullscreenBtn');
        if (playerFsBtn) {
            playerFsBtn.addEventListener('click', () => {
                // Використовуємо toggleFullscreen з LampaPlayer якщо доступний
                // Always use playerVideoContainer directly for fullscreen
                if (playerPagePlayer) { playerPagePlayer.toggleFullscreen(); return; }
                const container = document.getElementById('playerVideoContainer');
                if (!container) return;
                if (document.fullscreenElement || document.webkitFullscreenElement) {
                    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
                    return;
                }
                const target = container.querySelector('.lampa-player-container') || container;
                const request = target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen;
                if (request) Promise.resolve(request.call(target)).catch(() => {});
                else if (target.querySelector('video')?.webkitEnterFullscreen) target.querySelector('video').webkitEnterFullscreen();
            });
        }

        document.getElementById('playerSourceChip').addEventListener('click', () => {
            openBottomSheet('source');
        });

        document.getElementById('playerFilterBtn').addEventListener('click', () => {
            openBottomSheet('full');
        });

        document.getElementById('bsApplyBtn').addEventListener('click', () => {
            closeBottomSheet();
            if (bottomSheetMode === 'source') {
                showToast(`Джерело: ${playerPageCurrentSource}`);
            } else {
                showToast('Фільтри застосовано');
            }
        });

        document.getElementById('bottomSheetOverlay').addEventListener('click', function(e) {
            if (e.target === this) closeBottomSheet();
        });

        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.dataset.view;
                showViewMode(mode);
            });
        });

        document.getElementById('mainCharactersMoreBtn')?.addEventListener('click', () => {
            playerCharacterExpanded = !playerCharacterExpanded;
            renderMainCharacters(playerJikanData);
        });
        document.getElementById('mediaMoreBtn')?.addEventListener('click', () => {
            playerMediaExpanded = !playerMediaExpanded;
            renderAnimeMedia(playerJikanData);
        });
        document.getElementById('relatedMoreBtn')?.addEventListener('click', () => {
            const list = document.getElementById('relatedList');
            if (!list) return;
            list.innerHTML = playerRelatedItems.map(relatedCardMarkup).join('');
            list.querySelectorAll('.related-card').forEach(card => card.addEventListener('click', () => openRelatedAnimeInPlayer(card)));
            document.getElementById('relatedMoreBtn').hidden = true;
        });

        document.getElementById('likeBtn').addEventListener('click', toggleLike);
        document.getElementById('dislikeBtn').addEventListener('click', toggleDislike);
        document.getElementById('playerBookmarkBtn').addEventListener('click', toggleBookmark);
        document.getElementById('videoBackBtn')?.addEventListener('click', () => {
            const videoContainer = document.getElementById('playerVideoContainer');
            videoContainer.classList.remove('active');
            if (playerPagePlayer) { try { playerPagePlayer.destroy(); } catch(e){} playerPagePlayer = null; }
            document.getElementById('playerPageVideo').innerHTML = '';
        });

        // ====================================================================
        //  РЕЙТИНГ ГЛЯДАЧІВ (реальний, спільний, Firestore anime_ratings)
        // ====================================================================
        async function loadAnimeRatingAggregate(animeUrl) {
            const numEl = document.getElementById('playerRatingNum');
            const labelEl = document.getElementById('playerRatingLabel');
            if (!numEl) return;
            if (!playerRatingSourceIsTmdb) {
                numEl.textContent = '—';
                if (labelEl) labelEl.textContent = 'ОЦІНКА ГЛЯДАЧІВ';
            }
            try {
                if (!db) return;
                await ensureFirebaseGuestAuth();
                const animeId = String(animeUrl.hashCode ? animeUrl.hashCode() : animeUrl);
                const q = query(collection(db, 'anime_ratings'), where('animeId', '==', animeId));
                const snap = await getDocs(q);
                // TMDB-рейтинг має пріоритет — якщо він уже застосований, локальну оцінку глядачів не показуємо в тому ж тайлі
                if (playerRatingSourceIsTmdb) return;
                if (snap.empty) { numEl.textContent = '—'; if (labelEl) labelEl.textContent = 'НЕМАЄ ОЦІНОК'; return; }
                let sum = 0, count = 0;
                snap.forEach(d => { const v = d.data().value; if (v === 1 || v === -1) { sum += v; count++; } });
                if (count === 0) { numEl.textContent = '—'; if (labelEl) labelEl.textContent = 'НЕМАЄ ОЦІНОК'; return; }
                const score = (((sum / count) + 1) / 2) * 10; // -1..1 -> 0..10
                numEl.textContent = score.toFixed(1);
                if (labelEl) labelEl.textContent = `${count} ${count === 1 ? 'ГОЛОС' : 'ГОЛОСІВ'}`;
            } catch (e) {
                console.warn('Rating aggregate error:', e);
            }
        }

        async function syncAnimeRating(animeUrl, value) {
            try {
                if (!db) return;
                await ensureFirebaseGuestAuth();
                const animeId = String(animeUrl.hashCode ? animeUrl.hashCode() : animeUrl);
                const uid = (auth?.currentUser?.uid) || Storage.getDeviceId?.() || 'anon';
                const docId = `${animeId}_${uid}`;
                const ref = doc(db, 'anime_ratings', docId);
                if (value === 0) { await deleteDoc(ref); }
                else { await setDoc(ref, { animeId, uid, value, updatedAt: Date.now() }); }
                loadAnimeRatingAggregate(animeUrl);
            } catch (e) {
                console.warn('syncAnimeRating error:', e);
            }
        }

        // ====================================================================
        //  РЕКОМЕНДАЦІЇ / ПОДІБНІ (реальні дані з каталогу за жанром)
        // ====================================================================
        function relatedAnimeLabel(anime) {
            const title = String(anime?.title || '');
            if (/\b(?:сезон|season)\s*\d+/i.test(title)) return (title.match(/(?:сезон|season)\s*\d+/i) || [''])[0];
            if (/\b\d+(?:-й|-я|-е)?\s*сезон/i.test(title)) return (title.match(/\b\d+(?:-й|-я|-е)?\s*сезон/i) || [''])[0];
            if (/фільм|movie|film/i.test(title)) return 'Фільм';
            if (/OVA|ONA|спешл|special/i.test(title)) return 'OVA / Special';
            return anime?.type === 'movie' ? 'Фільм' : '';
        }

        function renderPosterCards(container, list, excludeUrl) {
            const items = (list || []).filter(a => a.url !== excludeUrl).slice(0, 8);
            if (!items.length) { container.closest('section').style.display = 'none'; return; }
            container.closest('section').style.display = '';
            container.innerHTML = items.map(a => {
                const poster = a.images?.jpg?.large_image_url || '';
                const relationLabel = relatedAnimeLabel(a);
                return `
              <div class="poster-card" data-url="${escapeHtml(a.url)}">
                <div class="poster-thumb" style="background-image:url(${poster})">
                  ${(a.status || relationLabel) ? `<div class="poster-badges">${a.status ? `<span class="pb-format">${escapeHtml(a.status)}</span>` : ''}${relationLabel ? `<span class="pb-format">${escapeHtml(relationLabel)}</span>` : ''}</div>` : ''}
                </div>
                <div class="poster-title">${escapeHtml(a.title)}</div>
              </div>`;
            }).join('');
            container.querySelectorAll('.poster-card').forEach(card => {
                card.addEventListener('click', () => openPlayerPage(card.dataset.url));
            });
        }

        // Прибираємо суфікси сезону/частини/типу з назви, щоб знайти інші сезони/фільми того ж аніме
        function baseTitleForRelated(title) {
            return (title || '')
                .replace(/\[[^\]]*\]/g, '')
                .replace(/[«»"'`]/g, '')
                .replace(/\b\d+(?:-й|-я|-е)?\s*сезон\b/gi, '')
                .replace(/\bсезон\s*\d+\b/gi, '')
                .replace(/\bseason\s*\d+\b/gi, '')
                .replace(/\bs\d+\b/gi, '')
                .replace(/\b\d+\s*частина\b/gi, '')
                .replace(/\bчастина\s*\d+\b/gi, '')
                .replace(/\b(фільм|movie|film|ova|ona|спешл|special)\b/gi, '')
                .replace(/[:\-–—]\s*$/, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function extractRelatedOrderNum(title) {
            const t = String(title || '');
            const m = t.match(/(\d+)(?:-й|-я|-е)?\s*сезон/i) || t.match(/сезон\s*(\d+)/i) ||
                t.match(/season\s*(\d+)/i) || t.match(/\bs(\d+)\b/i) ||
                t.match(/(\d+)\s*частина/i) || t.match(/частина\s*(\d+)/i);
            if (m) return parseInt(m[1], 10);
            if (/фільм|movie|film/i.test(t)) return 900;
            if (/ova|ona|спешл|special/i.test(t)) return 950;
            return 1;
        }

        let relatedSeasonsCache = {};
        async function fetchRelatedSeasons(anime) {
            const base = baseTitleForRelated(anime.title || anime.originalTitle);
            if (!base || base.length < 3) return [];
            const cacheKey = base.toLowerCase();
            if (relatedSeasonsCache[cacheKey] !== undefined) return relatedSeasonsCache[cacheKey];
            try {
                const results = await searchHikka(base, 1);
                const baseNorm = base.toLowerCase();
                const filtered = (results || []).filter(a => {
                    const otherBase = baseTitleForRelated(a.title).toLowerCase();
                    if (!otherBase) return false;
                    return otherBase === baseNorm || otherBase.includes(baseNorm) || baseNorm.includes(otherBase);
                });
                filtered.sort((a, b) => extractRelatedOrderNum(a.title) - extractRelatedOrderNum(b.title));
                relatedSeasonsCache[cacheKey] = filtered;
                return filtered;
            } catch (e) {
                console.warn('Related seasons fetch error:', e);
                relatedSeasonsCache[cacheKey] = [];
                return [];
            }
        }

        async function renderRelatedSeasons(anime) {
            const section = document.getElementById('relatedSeasonsSection');
            const el = document.getElementById('relatedSeasonsHscroll');
            if (section) section.style.display = 'none';
            if (!el) return;
            try {
                const list = await fetchRelatedSeasons(anime);
                renderPosterCards(el, list, anime.url);
            } catch (e) {
                console.warn('Related seasons render error:', e);
            }
        }

        async function renderRecommendationsAndSimilar(anime) {
            const recSection = document.getElementById('recommendationsSection');
            const recEl = document.getElementById('recommendationsHscroll');
            if (recSection) recSection.style.display = 'none';
            if (!recEl) return;
            const genres = anime.genres || [];
            // Пробуємо усі жанри по черзі, поки не знайдемо результат — раніше бралась
            // лише перша генра і секція просто лишалась порожньою/схованою, якщо жанр
            // не мапився або на сторінці жанру нічого не було.
            for (const g of genres) {
                const slug = GENRE_MAP[g];
                if (!slug) continue;
                try {
                    const list = await fetchHikkaByGenre(slug, 1);
                    const filtered = (list || []).filter(a => a.url !== anime.url);
                    if (filtered.length) {
                        renderPosterCards(recEl, filtered, anime.url);
                        return;
                    }
                } catch (e) {
                    console.warn('Recommendations/similar fetch error:', e);
                }
            }
            // Фолбек — якщо жоден жанр не дав результату, показуємо топ-100, щоб секція
            // не зникала непередбачувано в одних плеєрах і не з'являлась в інших.
            try {
                const top = await fetchHikkaTop100();
                renderPosterCards(recEl, top || [], anime.url);
            } catch (e) {
                console.warn('Recommendations fallback (top100) error:', e);
            }
        }

        document.getElementById('playerPageModal')?.addEventListener('click', e => {
            if (e.target === e.currentTarget) closePlayerPage();
        });
        document.getElementById('playerShareBtn').addEventListener('click', shareAnime);
        document.getElementById('watchBackBtn')?.addEventListener('click', closeWatchPage);
        document.getElementById('watchSourcePill')?.addEventListener('click', () => openBottomSheet('source'));
        document.getElementById('watchFilterPill')?.addEventListener('click', () => openBottomSheet('full'));

        window.openSearchPage = function() {
            Router.goTo('search');
            setTimeout(() => {
                const inp = document.getElementById('searchPageInput');
                if (inp) inp.focus();
            }, 200);
        };

        // ====================================================================
        //  КЛАВІАТУРА
        // ====================================================================
        document.addEventListener('keydown', (e) => {
            const tag = document.activeElement?.tagName?.toLowerCase();
            const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement
                ?.isContentEditable;
            if (e.key === 'Escape') {
                const sheet = document.getElementById('bottomSheetOverlay');
                if (sheet?.classList.contains('open')) { closeBottomSheet(); return; }
                const menu = document.getElementById('menuPopoverOverlay');
                if (menu?.classList.contains('visible')) { closeMenuPopover(); return; }
                if (playerPageIsOpen) closePlayerPage();
                return;
            }
            if (isInput) return;
            if (e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
                e.preventDefault();
                if (Router.currentRoute === 'search') {
                    document.getElementById('searchPageInput')?.focus();
                } else {
                    Router.goTo('search');
                    setTimeout(() => { document.getElementById('searchPageInput')?.focus(); }, 200);
                }
                return;
            }
            if (e.key === 'm' || e.key === 'M') { e.preventDefault();
                toggleLeftdock(); return; }
            if (e.key === 't' || e.key === 'T') { e.preventDefault();
                toggleTheme(); return; }
            if (e.key === 'r' || e.key === 'R') { e.preventDefault();
                openRandomAnime(); return; }
        });

        // ====================================================================
        //  КНОПКА "ВГОРУ"
        // ====================================================================
        const backToTopBtn = document.getElementById('backToTopBtn');

        function updateBackToTop() { if (window.scrollY > 500) backToTopBtn.classList.add('visible');
            else backToTopBtn.classList.remove('visible'); }
        backToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
        window.addEventListener('scroll', updateBackToTop, { passive: true });

        // ====================================================================
        //  ПОКАЗ ВИГЛЯДУ ЕПІЗОДІВ
        // ====================================================================
        function showViewMode(mode) {
            const grid = document.getElementById('episodeViewGrid');
            const compact = document.getElementById('episodeViewCompact');
            const classic = document.getElementById('episodeViewClassic');
            grid.classList.toggle('hidden', mode !== 'grid');
            compact.classList.toggle('hidden', mode !== 'compact');
            classic.classList.toggle('hidden', mode !== 'classic');
            document.querySelectorAll('.view-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.view === mode);
            });
            playerPageCurrentView = mode;
        }
        window.showViewMode = showViewMode;

        // ====================================================================
        //  ІНІЦІАЛІЗАЦІЯ
        // ====================================================================
        function moveEpisodesBeforeReviews() {
            const info = document.getElementById('page-info');
            const episodes = document.getElementById('page-episodes');
            if (!info || !episodes || episodes.parentElement === info) return;
            const firstInfoSection = info.querySelector('section');
            info.insertBefore(episodes, firstInfoSection || null);
        }

        async function init() {
            moveEpisodesBeforeReviews();
            applyTheme(Storage.getTheme());
            applyThemeVariant(getProfile());
            /* leftdock removed */
            startClock();
            updateBackToTop();

            setTimeout(() => {
                if (Router.currentRoute === 'main') {
                    loadAndDisplayGenreSections();
                }
            }, 50);

            setTimeout(() => {
                buildHeroBanner();
            }, 100);

            // Auth.init() синхронно ДО Router — щоб Firebase перевірив сесію перш ніж показувати форму входу
            Auth.init();
            Router.init();

            const hash = window.location.hash.slice(1);
            if (hash.startsWith('anime?')) {
                const params = Object.fromEntries(new URLSearchParams(hash.split('?')[1]));
                if (params.url) {
                    setTimeout(() => openPlayerPage(params.url), 150);
                }
            } else if (hash === 'profile') {
                Router.goTo('profile');
            } else if (hash.startsWith('genre')) {
                const parts = hash.split('?');
                if (parts.length > 1) {
                    const params = Object.fromEntries(new URLSearchParams(parts[1]));
                    if (params.slug) {
                        const name = params.name || params.slug;
                        Router.goTo('genre', { slug: params.slug, name });
                    }
                }
            } else if (hash === 'search') {
                Router.goTo('search');
            } else if (hash === 'settings') {
                Router.goTo('settings');
            }

            // Зберегти дані при закритті вкладки
            window.addEventListener('beforeunload', () => {
                Storage._flushSync();
            });

            // Синхронізувати дані при приховуванні вкладки (більш надійно ніж beforeunload)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden' && Auth.isAuthenticated()) {
                    Storage._flushSync();
                }
            });

            /* console.log removed */
            /* console.log removed */
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

        window.Router = Router;
        window.showTop100 = showTop100;
        window.openRandomAnime = openRandomAnime;
        window.openPlayerPage = openPlayerPage;
        window.closePlayerPage = closePlayerPage;
        window.toggleTheme = toggleTheme;
        window.toggleLeftdock = toggleLeftdock;
        window.profileEditNick = profileEditNick;
        window.profileEditBio = profileEditBio;
        window.changeGenrePage = changeGenrePage;
        window.loadGenrePageContent = loadGenrePageContent;
        window.renderProfilePage = renderProfilePage;
        window.performSearchPage = performSearchPage;
        window.changeSearchPage = changeSearchPage;
        window.renderSettingsPage = renderSettingsPage;
        window.openSearchPage = openSearchPage;
        window.openBottomSheet = openBottomSheet;
        window.closeBottomSheet = closeBottomSheet;
        window.toggleLike = toggleLike;
        window.toggleDislike = toggleDislike;
        window.buildHeroBanner = buildHeroBanner;
        window.Auth = Auth;
        window.Storage = Storage;
        window.showViewMode = showViewMode;
        window.switchProviderSource = switchProviderSource;
        window.showToast = showToast;
        window.loadContent = loadContent;
        window.loadAndDisplayGenreSections = loadAndDisplayGenreSections;

        // ====================================================================
        //  BOTTOM NAV — логіка
        // ====================================================================
        (function initBottomNav() {
            const nav = document.getElementById('bottomNav');
            if (!nav) return;

            // Кнопка назад
            document.getElementById('bnBack').addEventListener('click', () => {
                if (history.length > 1) {
                    history.back();
                } else {
                    Router.goTo('main');
                }
            });

            // Навігаційні кнопки
            document.getElementById('bnHome').addEventListener('click', () => {
                Router.goTo('main');
            });
            document.getElementById('bnTop').addEventListener('click', () => {
                Router.goTo('rating');
            });
            document.getElementById('bnProfile').addEventListener('click', () => {
                Router.goTo('profile');
            });

            // Оновлення активного стану при зміні роуту
            function updateBottomNav(route) {
                const items = nav.querySelectorAll('.bn-item[data-route]');
                items.forEach(item => {
                    item.classList.remove('active');
                    if (item.dataset.route === route) {
                        item.classList.add('active');
                    }
                });
                // rating активний для route === 'rating'
            }

            // Router.goTo використовує hashchange → updateBottomNav спрацює автоматично

            // Ховати nav коли відкритий плеєр
            const playerModal = document.getElementById('playerPageModal');
            const _origOpenPlayer = window.openPlayerPage;
            window.openPlayerPage = function(url, options = {}) {
                if (nav) nav.classList.add('hidden-nav');
                return _origOpenPlayer(url, options);
            };
            const _origClosePlayer = window.closePlayerPage;
            window.closePlayerPage = function() {
                if (nav) nav.classList.remove('hidden-nav');
                return _origClosePlayer();
            };

            // Ховати nav при заході в Суспільне, показувати на Рейтингу
            function handleNavVisibility(route) {
                // community — під-вкладка рейтингу: ховаємо nav
                // перевіряємо активну вкладку на сторінці rating
                const isCommunityActive = () => {
                    const panel = document.getElementById('rgPanelCommunity');
                    return panel && panel.classList.contains('active');
                };

                if (route === 'rating' && isCommunityActive()) {
                    nav.classList.add('hidden-nav');
                } else {
                    nav.classList.remove('hidden-nav');
                }
                updateBottomNav(route);
            }

            // Слухаємо кліки по вкладках рейтингу (Рейтинг ↔ Суспільне)
            document.addEventListener('click', e => {
                const tab = e.target.closest('.rg-main-tab');
                if (!tab) return;
                const hash = window.location.hash.slice(1) || 'main';
                const route = hash.split('?')[0];
                if (route !== 'rating') return;
                setTimeout(() => {
                    if (tab.dataset.panel === 'community') {
                        nav.classList.add('hidden-nav');
                    } else {
                        nav.classList.remove('hidden-nav');
                    }
                }, 50);
            });

            // Також ховати/показувати при hashchange
            window.addEventListener('hashchange', () => {
                const hash = window.location.hash.slice(1) || 'main';
                const route = hash.split('?')[0];
                // Якщо йдемо не на rating — завжди показуємо nav і знімаємо community-active
                if (route !== 'rating') {
                    document.body.classList.remove('community-active');
                }
                handleNavVisibility(route);
            });

            // Початковий стан
            handleNavVisibility(Router.currentRoute || 'main');
        })();

        // Глобальний генератор SVG-обличчя наліпки — currentColor, щоб підхоплював тему (світла/темна)
        function stickerFaceSvg(variant) {
            const s = 'stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"';
            const faces = [
                `<g><circle cx="32" cy="30" r="16" ${s} /><path d="M18 24c2-8 8-12 14-12s12 4 14 12" ${s} /><path d="M25 30q3 3 6 0M33 30q3 3 6 0" ${s} /><path d="M27 39q5 4 10 0" ${s} /><path d="M46 44l6-4 3 3-7 6z" ${s} /></g>`,
                `<g><path d="M20 20l4-8 6 8M44 20l-4-8-6 8" ${s} /><circle cx="32" cy="30" r="15" ${s} /><path d="M25 29l3 2M39 29l-3 2" ${s} /><path d="M29 40q3 2 6 0" ${s} /><path d="M46 12l3 5M53 10l1 6M49 8l4 4" ${s} /></g>`,
                `<g><path d="M14 42c-3-16 5-28 18-28s21 12 18 28" ${s} /><circle cx="32" cy="30" r="14" ${s} /><path d="M25 29q2 2 4 0M35 29q2 2 4 0" ${s} /><path d="M27 38q5 4 10 0" ${s} /></g>`,
                `<g><circle cx="32" cy="28" r="14" ${s} /><path d="M20 34c8 6 16 6 24 0" ${s} /><path d="M26 27h2M36 27h2" ${s} /><path d="M28 34q4 2 8 0" ${s} /><path d="M44 46q6-2 8-8" ${s} /></g>`,
                `<g><circle cx="14" cy="26" r="6" ${s} /><circle cx="50" cy="26" r="6" ${s} /><circle cx="32" cy="30" r="14" ${s} /><path d="M25 29l4 1" ${s} /><path d="M35 27q2 2 4 0" ${s} /><path d="M28 39q4 3 8 0" ${s} /></g>`,
                `<g><path d="M16 44c-4-18 4-30 16-30s20 12 16 30" ${s} /><circle cx="32" cy="29" r="13" ${s} /><path d="M26 29h3M35 29h3" ${s} /><path d="M29 37q3 2 6 0" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="15" ${s} /><path d="M18 15l6 4-6 4 6-4-6-4z" ${s} /><path d="M25 30q3 3 6 0M33 30q3 3 6 0" ${s} /><path d="M27 40q5 4 10 0" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="15" ${s} /><path d="M44 16l7-2-3 6z" ${s} /><path d="M25 29q2 2 4 0M35 29q2 2 4 0" ${s} /><path d="M27 39q5 3 10 0" ${s} /></g>`,
                `<g><path d="M18 18l6-8 4 8M46 18l-6-8-4 8" ${s} /><circle cx="32" cy="30" r="15" ${s} /><rect x="21" y="26" width="10" height="6" rx="2" ${s} /><rect x="33" y="26" width="10" height="6" rx="2" ${s} /><path d="M31 29h2" ${s} /><path d="M28 41q4 2 8 0" ${s} /></g>`,
                `<g><path d="M16 22l4-10 4 8 4-9 4 8 4-9 4 8 4-9 4 10" ${s} /><circle cx="32" cy="31" r="14" ${s} /><path d="M26 30q2-2 4 0M34 30q2-2 4 0" ${s} /><path d="M29 40q3-4 6 0" ${s} /><path d="M46 44l3 6M50 44l1 6M54 42l4 5" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="14" ${s} /><path d="M22 20q4-6 10-6M42 20q-4-6-10-6" ${s} /><path d="M26 40q6 4 12 0" ${s} /><path d="M24 30l-3 6M40 30l3 6" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="14" ${s} /><path d="M24 29q3 2 6 0M34 29q3 2 6 0" ${s} /><path d="M28 40q4 2 8 0" ${s} /><path d="M12 20q4-2 6 2M52 20q-4-2-6 2" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="14" ${s} /><path d="M25 29q2 2 4 0M35 29q2 2 4 0" ${s} /><path d="M27 39q5 3 10 0" ${s} /><circle cx="18" cy="17" r="3" ${s} /><circle cx="26" cy="12" r="3" ${s} /><circle cx="38" cy="12" r="3" ${s} /><circle cx="46" cy="17" r="3" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="15" ${s} /><path d="M25 28q2-2 4 0M35 28q2-2 4 0" ${s} /><path d="M25 38q7 6 14 0" ${s} /></g>`
            ];
            const idx = ((variant % faces.length) + faces.length) % faces.length;
            return `<svg viewBox="0 0 64 56" style="width:100%;height:100%;">${faces[idx]}</svg>`;
        }

        const STICKER_VARIANT_COUNT = 14;

        // Всі унікальні варіанти, якими юзер реально володіє (singles + все, що є всередині власних наборів)
        function getOwnedStickerVariants(data) {
            const set = new Set();
            (data.singles || []).forEach(s => { if (s.variant !== undefined && s.variant !== null) set.add(s.variant); });
            (data.sets || []).forEach(st => (st.variants || []).forEach(v => set.add(v)));
            return Array.from(set).sort((a, b) => a - b);
        }

        // Уніфікований ключ наліпки: вбудовані обличчя ідентифікуються номером варіанта,
        // власні завантажені фото — унікальним id (у них немає variant). Ключ дозволяє
        // однаково зберігати нік-бейдж/медалі незалежно від типу наліпки.
        function stickerKeyFor(s) {
            return s.image ? ('img:' + s.id) : ('v:' + s.variant);
        }
        function resolveStickerByKey(d, key) {
            if (!key) return null;
            if (key.startsWith('img:')) return (d.singles || []).find(x => x.id === key.slice(4)) || null;
            if (key.startsWith('v:')) return { variant: parseInt(key.slice(2), 10) };
            return null;
        }
        function renderStickerVisual(s, color) {
            if (s && s.image) return `<img src="${escapeHtml(s.image)}" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;border-radius:8px;background:transparent;">`;
            const safeColor = color || s?.color || 'var(--text)';
            return `<span class="sticker-svg-visual" style="color:${escapeHtml(safeColor)};display:block;width:100%;height:100%;">${stickerFaceSvg(s ? s.variant : 0)}</span>`;
        }
        function renderStickerFaceByKey(d, key) {
            const s = resolveStickerByKey(d, key);
            return s ? renderStickerVisual(s, d.colors?.[key]) : '';
        }

        let _everyoneStickersCache = null;
        async function fetchEveryoneStickers() {
            if (_everyoneStickersCache) return _everyoneStickersCache;
            try {
                const { collection, query, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js');
                const q = query(collection(db, 'users'), limit(500));
                const snap = await getDocs(q);
                let sets = [];
                let singles = [];
                const users = [];
                snap.forEach(docSnap => {
                    const d = docSnap.data();
                    if (!d.stickers) return;
                    const ownerId = docSnap.id;
                    const ownerNickname = d.profile?.nickname || 'Користувач';
                    const ownerAvatar = d.profile?.avatar || '';
                    const source = Object.assign(getDefaultStickers(), d.stickers);
                    const sourceSingles = (Array.isArray(source.singles) ? source.singles : []).filter(single => single && single.image);
                    const sourceColors = source.colors || {};
                    sourceSingles.forEach(single => singles.push({
                        ...single,
                        _public: true,
                        _ownerId: ownerId,
                        _ownerNickname: ownerNickname,
                        _ownerAvatar: ownerAvatar,
                        _sourceColor: sourceColors[stickerKeyFor(single)] || ''
                    }));
                    (Array.isArray(source.sets) ? source.sets : []).forEach(set => {
                        const imageIds = (Array.isArray(set.images) ? set.images : []).filter(id => sourceSingles.some(single => single.id === id));
                        if (!imageIds.length) return;
                        sets.push({
                        ...set,
                        variants: [],
                        images: imageIds,
                        _public: true,
                        _ownerId: ownerId,
                        _ownerNickname: ownerNickname,
                        _ownerAvatar: ownerAvatar,
                        _sourceSingles: sourceSingles,
                        _sourceColors: sourceColors
                        });
                    });
                    users.push({ id: ownerId, nickname: ownerNickname, avatar: ownerAvatar, stickers: source });
                });
                // Фільтруємо дублікати за ID
                const uniqueSets = [];
                const setIds = new Set();
                sets.forEach(s => { if (s.id && !setIds.has(s.id)) { setIds.add(s.id); uniqueSets.push(s); } });

                const uniqueSingles = [];
                const singleIds = new Set();
                singles.forEach(s => { if (s.id && !singleIds.has(s.id)) { singleIds.add(s.id); uniqueSingles.push(s); } });

                _everyoneStickersCache = { sets: uniqueSets, singles: uniqueSingles, users };
                return _everyoneStickersCache;
            } catch (e) {
                console.error('[Stickers] Global fetch failed:', e);
                return { sets: [], singles: [], users: [] };
            }
        }

        window.renderStickersPage = function() {
            const container = document.getElementById('stickersPageContainer');
            if (!container) return;

            if (!window.stickersUI) {
                window.stickersUI = {
                    activeFilter: 'Усі',
                    view: 'grid',
                    search: '',
                    step: null,           // null | 'choose' | 'single' | 'pack' | 'actions' | 'setView'
                    pickedSingle: null,
                    pickedForPack: [],
                    packName: '',
                    actionsTarget: null   // { type: 'single'|'set', id }
                };
            }
            const ui = window.stickersUI;

            let stickersDataSanitized = false;
            function data() {
                const current = Storage.getStickers();
                if (!stickersDataSanitized) {
                    stickersDataSanitized = true;
                    const legacyKeys = new Set((current.singles || []).filter(s => s && !s.image && s.variant !== undefined).map(stickerKeyFor));
                    current.singles = (current.singles || []).filter(s => s && s.image);
                    current.sets = (current.sets || []).map(st => ({ ...st, variants: [], images: (st.images || []).filter(id => current.singles.some(s => s.id === id)) })).filter(st => st.images.length);
                    current.medals = (current.medals || []).filter(key => !legacyKeys.has(key));
                    if (current.nickBadge && legacyKeys.has(current.nickBadge)) current.nickBadge = null;
                    if (current.colors) legacyKeys.forEach(key => delete current.colors[key]);
                    if (legacyKeys.size) Storage.setStickers(current);
                }
                return current;
            }
            function saveData(d) {
                Storage.setStickers(d);
                if (Router.currentRoute === 'profile') renderProfilePage();
            }

            function Tile(variant, opts = {}) {
                const { selected = false, size = '' } = opts;
                return `
                    <button type="button" class="aspect-square rounded-xl border flex items-center justify-center p-2.5 shrink-0 relative transition-all ${size}"
                        style="background:${selected ? 'var(--accent)' : 'var(--tag-bg)'};border-color:${selected ? 'var(--accent)' : 'var(--border)'};color:${selected ? 'var(--accent-text)' : 'var(--text)'};"
                        data-variant="${variant}">
                        ${stickerFaceSvg(variant)}
                        ${selected ? `<span class="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style="background:var(--accent-text);color:var(--accent);"><i class="fas fa-check" style="font-size:9px;"></i></span>` : ''}
                    </button>
                `;
            }

            const FILTERS = ['Усі', 'Набори', 'Одиночні', 'Улюблені', 'Користувачі'];

                function matchesSearch(title) {
                    if (!ui.search.trim()) return true;
                    return title.toLowerCase().includes(ui.search.trim().toLowerCase());
                }

                function setStickerItems(st, localData) {
                    const sourceSingles = [...(localData.singles || []), ...(st._sourceSingles || [])];
                    const byId = id => sourceSingles.find(s => s.id === id);
                    return [
                        ...(st.variants || []).map(v => ({ variant: v, color: st._sourceColors?.['v:' + v] || '' })),
                        ...(st.images || []).map(id => byId(id)).filter(Boolean)
                    ];
                }

                function render() {
                const d = data();
                const owned = getOwnedStickerVariants(d);
                const showUsers = ui.activeFilter === 'Користувачі';
                const showSets = !showUsers && (ui.activeFilter === 'Усі' || ui.activeFilter === 'Набори' || (ui.activeFilter === 'Улюблені'));
                const showSingles = !showUsers && (ui.activeFilter === 'Усі' || ui.activeFilter === 'Одиночні' || (ui.activeFilter === 'Улюблені'));

                let visibleSets = (ui.activeFilter === 'Одиночні') ? [] : d.sets.filter(st => matchesSearch(st.title));
                if (ui.activeFilter === 'Улюблені') visibleSets = visibleSets.filter(st => st.favorite);

                let visibleSingles = (ui.activeFilter === 'Набори') ? [] : d.singles.filter(s => matchesSearch('наліпка ' + (s.variant + 1)));
                if (ui.activeFilter === 'Улюблені') visibleSingles = visibleSingles.filter(s => s.favorite);

                if (ui.activeFilter === 'Усі') {
                    const everyone = _everyoneStickersCache || { sets: [], singles: [] };
                    const mySetIds = new Set(d.sets.map(s => s.id));
                    everyone.sets.forEach(s => {
                        if (!mySetIds.has(s.id) && matchesSearch(s.title)) {
                            visibleSets.push(s);
                        }
                    });
                    const mySingleIds = new Set(d.singles.map(s => s.id));
                    everyone.singles.forEach(s => {
                        if (!mySingleIds.has(s.id) && matchesSearch(s.image ? 'власна' : 'наліпка ' + (s.variant + 1))) {
                            visibleSingles.push(s);
                        }
                    });
                    if (!_everyoneStickersCache) {
                        fetchEveryoneStickers().then(() => render());
                    }
                }

                const everyoneUsers = (_everyoneStickersCache?.users || []).filter(u => matchesSearch(u.nickname));
                const usersSection = showUsers ? (everyoneUsers.length ? everyoneUsers.map(u => {
                    const us = u.stickers || getDefaultStickers();
                    const userSingles = us.singles || [];
                    const userSets = us.sets || [];
                    const userStickers = userSingles.length ? userSingles : (userSets.flatMap(st => (st.variants || []).map(v => ({ variant: v }))).slice(0, 28));
                    return `<article class="sticker-user-card">
                        <div class="sticker-user-card__head"><div class="sticker-user-avatar">${u.avatar ? `<img src="${escapeHtml(u.avatar)}" alt="">` : `<span>${escapeHtml(u.nickname.charAt(0).toUpperCase())}</span>`}</div><div><strong>${escapeHtml(u.nickname)}</strong><small>${userStickers.length} наліпок</small></div></div>
                        <div class="sticker-user-card__grid">${userStickers.slice(0, 28).map(st => `<div class="sticker-user-card__item">${renderStickerVisual(st, us.colors?.[stickerKeyFor(st)])}</div>`).join('') || '<span class="sticker-empty-note">Наліпок ще немає</span>'}</div>
                    </article>`;
                }).join('') : '<div class="sticker-empty-note">Інших користувачів із наліпками поки немає.</div>') : '';
                if (showUsers && !_everyoneStickersCache) fetchEveryoneStickers().then(() => render());
                const nothingAtAll = !showUsers && d.singles.length === 0 && d.sets.length === 0;
                const nothingVisible = !showUsers && visibleSets.length === 0 && visibleSingles.length === 0;

                container.innerHTML = `
                    <div class="stickers-page" style="max-width:480px;margin:0 auto;color:var(--text);font-family:inherit;">
                        <div class="filter-page__header" style="margin-bottom:0.9rem;">
                            <button class="filter-page__back" id="stickersBackBtn" aria-label="Назад"><i class="fas fa-arrow-left"></i></button>
                            <div style="flex:1;">
                                <div class="filter-page__title">Наліпки</div>
                            </div>
                            <button id="stickersToggleView" class="filter-page__back" aria-label="Вигляд">
                                <i class="fas ${ui.view === 'grid' ? 'fa-list' : 'fa-table-cells'}"></i>
                            </button>
                        </div>

                        <div style="display:flex;align-items:center;gap:0.6rem;background:var(--tag-bg);border:1px solid var(--border);border-radius:14px;padding:0.7rem 0.9rem;margin-bottom:0.8rem;">
                            <i class="fas fa-search" style="color:var(--text-muted);"></i>
                            <input type="text" id="stickersSearchInput" placeholder="Пошук наборів і наліпок..." value="${escapeHtml(ui.search)}"
                                style="background:none;border:none;outline:none;color:var(--text);font-family:inherit;font-size:0.9rem;width:100%;">
                        </div>

                        <div style="display:flex;gap:0.5rem;overflow-x:auto;margin-bottom:1rem;padding-bottom:2px;">
                            ${FILTERS.map(f => `
                                <button class="sticker-filter-btn" data-filter="${f}" style="flex-shrink:0;padding:0.5rem 1rem;border-radius:999px;font-size:0.8rem;font-weight:700;border:1px solid ${ui.activeFilter === f ? 'var(--accent)' : 'var(--border)'};background:${ui.activeFilter === f ? 'var(--accent)' : 'var(--surface)'};color:${ui.activeFilter === f ? 'var(--accent-text)' : 'var(--text-secondary)'};white-space:nowrap;transition:all var(--transition);">
                                    ${f === 'Улюблені' ? '<i class="fas fa-star" style="font-size:0.7rem;margin-right:0.3rem;"></i>' : ''}${f}
                                </button>
                            `).join('')}
                        </div>

                        <button id="stickersOpenAdd" style="width:100%;margin-bottom:1.1rem;border:2px dashed var(--border-hover);border-radius:16px;padding:1.3rem;display:flex;flex-direction:column;align-items:center;gap:0.5rem;background:none;cursor:pointer;color:var(--text);transition:all var(--transition);">
                            <div style="width:44px;height:44px;border-radius:50%;border:2px solid var(--text);display:flex;align-items:center;justify-content:center;">
                                <i class="fas fa-plus"></i>
                            </div>
                            <span style="font-size:0.88rem;font-weight:700;">Додати наліпку</span>
                            <span style="font-size:0.75rem;color:var(--text-muted);">Одну наліпку або цілий набір</span>
                        </button>

                        ${showUsers ? `<section class="stickers-users-section"><div class="stickers-section-heading"><h2>Усі наліпки користувачів</h2><span>${everyoneUsers.length}</span></div>${usersSection}</section>` : ''}

                        ${nothingAtAll ? `
                            <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-muted);">
                                <i class="fas fa-icons" style="font-size:2rem;margin-bottom:0.8rem;display:block;"></i>
                                У вас поки немає наліпок. Додайте першу!
                            </div>
                        ` : nothingVisible ? `
                            <div style="text-align:center;padding:2rem 1rem;color:var(--text-muted);">Нічого не знайдено</div>
                        ` : `
                            ${showSets && visibleSets.length ? `
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.7rem;">
                                    <h2 style="font-size:0.95rem;font-weight:800;">Набори</h2>
                                    <span style="font-size:0.72rem;color:var(--text-muted);background:var(--tag-bg);border-radius:999px;padding:0.15rem 0.6rem;">${visibleSets.length}</span>
                                </div>
                                <div style="display:flex;flex-direction:column;gap:0.7rem;margin-bottom:1.3rem;">
                                    ${visibleSets.map(st => `
                                        <div style="border:1px solid var(--border);border-radius:16px;padding:0.9rem;background:var(--surface);">
                                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.7rem;">
                                                <div>
                                                    <div style="font-size:0.92rem;font-weight:800;">${escapeHtml(st.title)}</div>
                                                    <div style="font-size:0.75rem;color:var(--text-muted);">${setStickerItems(st, d).length} наліпок${st._public ? ` · ${escapeHtml(st._ownerNickname || 'Користувач')}` : ''}</div>
                                                </div>
                                                <button class="sticker-set-actions${st._public ? ' sticker-public-set-add' : ''}" data-set-id="${st.id}" ${st._public ? `data-public-owner="${escapeHtml(st._ownerId || '')}"` : ''} style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:var(--tag-bg);color:var(--text);cursor:pointer;">
                                                    <i class="fas ${st._public ? 'fa-plus' : (st.favorite ? 'fa-star' : 'fa-ellipsis-vertical')}"></i>
                                                </button>
                                            </div>
                                            <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:0.4rem;">
                                                ${setStickerItems(st, d).slice(0, 6).map(s => `<div style="aspect-ratio:1;border-radius:10px;background:${s.image ? 'transparent' : 'var(--tag-bg)'};border:${s.image ? 'none' : '1px solid var(--border)'};padding:${s.image ? '0' : '0.35rem'};overflow:hidden;">${renderStickerVisual(s, s.color)}</div>`).join('')}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}

                            ${showSingles && visibleSingles.length ? `
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.7rem;">
                                    <h2 style="font-size:0.95rem;font-weight:800;">Одиночні наліпки</h2>
                                    <span style="font-size:0.72rem;color:var(--text-muted);background:var(--tag-bg);border-radius:999px;padding:0.15rem 0.6rem;">${visibleSingles.length}</span>
                                </div>
                                <div style="display:grid;grid-template-columns:${ui.view === 'grid' ? 'repeat(4,1fr)' : '1fr'};gap:0.6rem;margin-bottom:1.5rem;">
                                                                            ${visibleSingles.map(s => { const sKey = stickerKeyFor(s); const sLabel = s.image ? 'Власна наліпка' : ('Наліпка #' + (s.variant + 1)); return ui.view === 'grid' ? `
                                        <button class="sticker-single-tile${s._public ? ' sticker-public-single-add' : ''}" data-single-id="${s.id}" ${s._public ? `data-public-owner="${escapeHtml(s._ownerId || '')}"` : ''} style="aspect-ratio:1;border-radius:14px;border:${s.image ? 'none' : '1px solid var(--border)'};background:${s.image ? 'transparent' : 'var(--tag-bg)'};padding:${s.image ? '0' : '0.6rem'};position:relative;cursor:pointer;transition:all var(--transition);overflow:hidden;">
                                            ${renderStickerVisual(s)}
                                            ${s.favorite ? `<i class="fas fa-star" style="position:absolute;top:6px;right:6px;font-size:0.65rem;color:#fff;text-shadow:0 0 3px rgba(0,0,0,0.6);"></i>` : ''}
                                            ${d.nickBadge === sKey ? `<i class="fas fa-id-badge" style="position:absolute;bottom:6px;left:6px;font-size:0.65rem;color:#fff;text-shadow:0 0 3px rgba(0,0,0,0.6);"></i>` : ''}
                                            ${d.medals.includes(sKey) ? `<i class="fas fa-medal" style="position:absolute;bottom:6px;right:6px;font-size:0.65rem;color:#fff;text-shadow:0 0 3px rgba(0,0,0,0.6);"></i>` : ''}
                                        </button>
                                    ` : `
                                        <button class="sticker-single-tile" data-single-id="${s.id}" style="display:flex;align-items:center;gap:0.8rem;border:1px solid var(--border);border-radius:14px;padding:0.6rem 0.8rem;background:var(--surface);cursor:pointer;text-align:left;">
                                            <div style="width:42px;height:42px;flex-shrink:0;background:${s.image ? 'transparent' : 'var(--tag-bg)'};border-radius:10px;padding:${s.image ? '0' : '0.4rem'};overflow:hidden;">${renderStickerVisual(s)}</div>
                                            <div style="flex:1;">
                                                <div style="font-size:0.85rem;font-weight:700;">${sLabel}</div>
                                                <div style="font-size:0.72rem;color:var(--text-muted);">
                                                    ${s.favorite ? '<i class="fas fa-star"></i> Улюблена' : ''}
                                                    ${d.nickBadge === sKey ? ' · Біля ніку' : ''}
                                                    ${d.medals.includes(sKey) ? ' · Медаль' : ''}
                                                </div>
                                            </div>
                                            <i class="fas fa-chevron-right" style="color:var(--text-muted);"></i>
                                        </button>
                                    `; }).join('')}
                                </div>
                            ` : ''}
                        `}

                        ${ui.step ? renderOverlay(d, owned) : ''}
                    </div>
                `;
                bindEvents(d, owned);
            }

            function renderOverlay(d, owned) {
                return `
                    <div style="position:fixed;inset:0;z-index:1001;display:flex;align-items:flex-end;justify-content:center;">
                        <div id="stickersOverlayBg" style="position:absolute;inset:0;background:rgba(0,0,0,0.5);"></div>
                        <div style="position:relative;width:100%;max-width:480px;background:var(--surface);border-radius:24px 24px 0 0;padding:1rem 1.1rem 1.6rem;max-height:85%;overflow-y:auto;animation:fadeInUp 0.25s ease;">
                            <div style="width:40px;height:5px;background:var(--border-hover);border-radius:999px;margin:0 auto 1rem;"></div>
                            ${renderOverlayContent(d, owned)}
                        </div>
                    </div>
                `;
            }

            function renderOverlayContent(d, owned) {
                if (ui.step === 'choose') {
                    return `
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                            <h3 style="font-size:1.05rem;font-weight:800;">Що додати?</h3>
                            <button id="stickersCloseOverlay" style="color:var(--text-muted);background:none;border:none;font-size:1.1rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:0.7rem;">
                            <button id="stickersChooseSingle" style="display:flex;align-items:center;gap:0.8rem;border:1px solid var(--border);border-radius:16px;padding:0.9rem;background:var(--tag-bg);cursor:pointer;text-align:left;color:var(--text);">
                                <div style="width:44px;height:44px;border-radius:12px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-face-smile"></i></div>
                                <div><div style="font-weight:700;font-size:0.88rem;">Власне фото</div><div style="font-size:0.75rem;color:var(--text-muted);">Завантажити одне фото як наліпку</div></div>
                            </button>
                            <button id="stickersChoosePack" style="display:flex;align-items:center;gap:0.8rem;border:1px solid var(--border);border-radius:16px;padding:0.9rem;background:var(--tag-bg);cursor:pointer;text-align:left;color:var(--text);">
                                <div style="width:44px;height:44px;border-radius:12px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-layer-group"></i></div>
                                <div><div style="font-weight:700;font-size:0.88rem;">Набір наліпок</div><div style="font-size:0.75rem;color:var(--text-muted);">Створити іменований набір з кількох наліпок</div></div>
                            </button>
                        </div>
                    `;
                }
                if (ui.step === 'single') {
                    return `
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                            <button id="stickersBackToChoose" style="color:var(--text-muted);background:none;border:none;font-size:1rem;cursor:pointer;"><i class="fas fa-arrow-left"></i></button>
                            <h3 style="font-size:1rem;font-weight:800;">Виберіть наліпку</h3>
                            <button id="stickersCloseOverlay" style="color:var(--text-muted);background:none;border:none;font-size:1.1rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.6rem;margin-bottom:1.2rem;">
                            ${Array.from({ length: STICKER_VARIANT_COUNT }, (_, i) => i).map(v => Tile(v, { selected: ui.pickedSingle === v })).join('')}
                        </div>
                        <button id="stickersConfirmSingle" ${ui.pickedSingle === null ? 'disabled' : ''} style="width:100%;padding:0.9rem;border-radius:14px;border:none;font-weight:800;font-size:0.9rem;cursor:pointer;background:var(--accent);color:var(--accent-text);opacity:${ui.pickedSingle === null ? 0.5 : 1};transition:all var(--transition);">
                            Додати наліпку
                        </button>
                    `;
                }
                if (ui.step === 'pack') {
                    const allOwned = d.singles.filter(Boolean);

                    return `
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                            <button id="stickersBackToChoose" style="color:var(--text-muted);background:none;border:none;font-size:1rem;cursor:pointer;"><i class="fas fa-arrow-left"></i></button>
                            <h3 style="font-size:1rem;font-weight:800;">Новий набір</h3>
                            <button id="stickersCloseOverlay" style="color:var(--text-muted);background:none;border:none;font-size:1.1rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                        </div>
                        <div style="margin-bottom:1rem;">
                            <label style="display:block;font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:0.4rem;">Назва набору</label>
                            <input id="stickersPackNameInput" type="text" maxlength="30" placeholder="Наприклад: Мої улюблені" value="${escapeHtml(ui.packName)}"
                                style="width:100%;background:var(--tag-bg);border:1.5px solid var(--border);border-radius:12px;padding:0.75rem 0.9rem;color:var(--text);font-family:inherit;font-size:0.9rem;outline:none;">
                        </div>
                        <label style="display:block;font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:0.5rem;">Виберіть свої одиночні наліпки (${ui.pickedForPack.length})</label>
                        ${allOwned.length ? '' : '<div style="padding:1rem;border:1px dashed var(--border);border-radius:14px;color:var(--text-muted);text-align:center;margin-bottom:1rem;">Спочатку додайте власне фото як одиночну наліпку.</div>'}
                        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.6rem;margin-bottom:1.2rem;max-height:300px;overflow-y:auto;padding:2px;">
                            ${allOwned.map(s => {
                                const v = s.variant !== undefined ? s.variant : null;
                                const isSelected = v !== null ? ui.pickedForPack.includes(v) : ui.pickedForPack.includes('img:' + s.id);
                                return `
                                    <button type="button" class="aspect-square rounded-xl border flex items-center justify-center p-2.5 shrink-0 relative transition-all"
                                        style="background:${isSelected ? 'var(--accent)' : 'var(--tag-bg)'};border-color:${isSelected ? 'var(--accent)' : 'var(--border)'};color:${isSelected ? 'var(--accent-text)' : 'var(--text)'};"
                                        data-pack-sticker="${v !== null ? v : 'img:' + s.id}">
                                        <div style="width:100%;height:100%;padding:${s.image ? '0' : '0.2rem'};">${renderStickerVisual(s)}</div>
                                        ${isSelected ? `<span class="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style="background:var(--accent-text);color:var(--accent);"><i class="fas fa-check" style="font-size:9px;"></i></span>` : ''}
                                    </button>
                                `;
                            }).join('')}
                        </div>
                        <button id="stickersConfirmPack" ${!ui.packName.trim() || ui.pickedForPack.length === 0 ? 'disabled' : ''} style="width:100%;padding:0.9rem;border-radius:14px;border:none;font-weight:800;font-size:0.9rem;cursor:pointer;background:var(--accent);color:var(--accent-text);opacity:${!ui.packName.trim() || ui.pickedForPack.length === 0 ? 0.5 : 1};transition:all var(--transition);">
                            Створити набір
                        </button>
                    `;
                }
                if (ui.step === 'actions' && ui.actionsTarget) {
                    const t = ui.actionsTarget;
                    if (t.type === 'single') {
                        const s = d.singles.find(x => x.id === t.id);
                        if (!s) return '';
                        const sKey = stickerKeyFor(s);
                        const isNick = d.nickBadge === sKey;
                        const isMedal = d.medals.includes(sKey);
                        return `
                            <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:1.2rem;">
                                <div style="width:56px;height:56px;background:var(--tag-bg);border-radius:14px;padding:${s.image ? '0' : '0.6rem'};flex-shrink:0;overflow:hidden;">${renderStickerVisual(s)}</div>
                                <div style="font-size:1rem;font-weight:800;">${s.image ? 'Власна наліпка' : ('Наліпка #' + (s.variant + 1))}</div>
                            </div>
                            <label class="sticker-color-control">Колір стікера та blur <input id="stickerColorInput" type="color" value="${escapeHtml(d.colors?.[sKey] || '#7c8494')}" title="Змінити колір стікера"><span>фон — тільки розмиття</span></label>
                            <div style="display:flex;flex-direction:column;gap:0.5rem;">
                                ${s.image ? '<button class="sticker-action-btn" data-act="remove-bg" data-single-id="' + s.id + '">' + sIconRow('fa-wand-magic-sparkles', 'Видалити фон AI') + '</button>' : ''}
                                <button class="sticker-action-btn" data-act="favorite" data-single-id="${s.id}">${sIconRow(s.favorite ? 'fa-star' : 'fa-star', s.favorite ? 'Прибрати з улюблених' : 'Додати в улюблені')}</button>
                                <button class="sticker-action-btn" data-act="nick" data-single-id="${s.id}">${sIconRow('fa-id-badge', isNick ? 'Прибрати біля ніку' : 'Встановити біля ніку')}</button>
                                <button class="sticker-action-btn" data-act="medal" data-single-id="${s.id}">${sIconRow('fa-medal', isMedal ? 'Прибрати медаль' : 'Додати як медаль')}</button>
                                <button class="sticker-action-btn" data-act="delete" data-single-id="${s.id}" style="border-style:dashed;">${sIconRow('fa-trash', 'Видалити наліпку')}</button>
                            </div>
                        `;
                    }
                    if (t.type === 'set') {
                        const st = d.sets.find(x => x.id === t.id);
                        if (!st) return '';
                        return `
                            <div style="margin-bottom:1rem;">
                                <div style="font-size:1rem;font-weight:800;margin-bottom:0.7rem;">${escapeHtml(st.title)}</div>
                                <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.5rem;margin-bottom:1rem;">
                                    ${[...(st.variants || []).map(v => ({variant: v})), ...(st.images || []).map(id => d.singles.find(s => s.id === id))].filter(Boolean).map(s => {
                                        const sKey = stickerKeyFor(s);
                                        return `<div style="aspect-ratio:1;background:${s.image ? 'transparent' : 'var(--tag-bg)'};border:${s.image ? 'none' : '1px solid var(--border)'};border-radius:10px;padding:${s.image ? '0' : '0.35rem'};position:relative;overflow:hidden;">
                                            ${renderStickerVisual(s)}
                                            ${d.nickBadge === sKey ? `<i class="fas fa-id-badge" style="position:absolute;bottom:2px;left:2px;font-size:0.55rem;color:#fff;text-shadow:0 0 2px #000;"></i>` : ''}
                                            ${d.medals.includes(sKey) ? `<i class="fas fa-medal" style="position:absolute;bottom:2px;right:2px;font-size:0.55rem;color:#fff;text-shadow:0 0 2px #000;"></i>` : ''}
                                        </div>`;
                                    }).join('')}
                                </div>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:0.5rem;">
                                <button class="sticker-action-btn" data-act="favorite-set" data-set-id="${st.id}">${sIconRow('fa-star', st.favorite ? 'Прибрати з улюблених' : 'Додати в улюблені')}</button>
                                <button class="sticker-action-btn" data-act="delete-set" data-set-id="${st.id}" style="border-style:dashed;">${sIconRow('fa-trash', 'Видалити набір')}</button>
                            </div>
                            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.8rem;">Щоб встановити конкретну наліпку з набору біля ніку чи як медаль — спочатку додайте її окремо через «Додати наліпку → Одиночна».</div>
                        `;
                    }
                }
                return '';
            }

            function sIconRow(icon, label) {
                return `<span style="display:flex;align-items:center;gap:0.7rem;padding:0.85rem 1rem;border:1px solid var(--border);border-radius:14px;background:var(--tag-bg);color:var(--text);font-size:0.85rem;font-weight:600;"><i class="fas ${icon}" style="width:18px;"></i>${label}</span>`;
            }

            function closeOverlay() {
                ui.step = null;
                ui.pickedSingle = null;
                ui.pickedForPack = [];
                ui.packName = '';
                ui.actionsTarget = null;
                render();
            }

            function makeLocalStickerId(prefix = 'sng_') {
                return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
            }

            function importPublicSingle(remoteId) {
                const remote = _everyoneStickersCache?.singles?.find(s => s.id === remoteId);
                if (!remote) return;
                const cur = data();
                if (remote.variant !== undefined && cur.singles.some(s => s.variant === remote.variant)) {
                    showToast('Ця наліпка вже є у вашій колекції');
                    return;
                }
                const copy = { ...remote, id: makeLocalStickerId(), _public: undefined, _ownerId: undefined, _ownerNickname: undefined, _ownerAvatar: undefined, _sourceColor: undefined, favorite: false, addedAt: Date.now() };
                delete copy._public; delete copy._ownerId; delete copy._ownerNickname; delete copy._ownerAvatar; delete copy._sourceColor;
                cur.singles.unshift(copy);
                saveData(cur);
                showToast('Наліпку додано до вашої колекції');
                render();
            }

            function importPublicSet(remoteId) {
                const remote = _everyoneStickersCache?.sets?.find(s => s.id === remoteId);
                if (!remote) return;
                const cur = data();
                const already = cur.sets.some(s => s.sourceSetId === remote.id && s.sourceOwnerId === remote._ownerId);
                if (already) {
                    showToast('Цей набір вже є у вашій колекції');
                    return;
                }
                const sourceSingles = remote._sourceSingles || [];
                const imageIdMap = {};
                sourceSingles.filter(s => (remote.images || []).includes(s.id)).forEach(source => {
                    if (!source.image) return;
                    const copy = { ...source, id: makeLocalStickerId(), favorite: false, addedAt: Date.now() };
                    delete copy._public; delete copy._ownerId; delete copy._ownerNickname; delete copy._ownerAvatar; delete copy._sourceColor;
                    cur.singles.unshift(copy);
                    imageIdMap[source.id] = copy.id;
                });
                cur.sets.unshift({
                    id: makeLocalStickerId('set_'),
                    title: remote.title || 'Набір наліпок',
                    variants: [...(remote.variants || [])],
                    images: (remote.images || []).map(id => imageIdMap[id]).filter(Boolean),
                    favorite: false,
                    addedAt: Date.now(),
                    sourceSetId: remote.id,
                    sourceOwnerId: remote._ownerId || ''
                });
                saveData(cur);
                showToast('Набір додано до вашої колекції');
                render();
            }

            function bindEvents(d, owned) {
                document.getElementById('stickersBackBtn')?.addEventListener('click', () => {
                    if (history.length > 1) history.back(); else Router.goTo('profile');
                });
                document.getElementById('stickersToggleView')?.addEventListener('click', () => {
                    ui.view = ui.view === 'grid' ? 'list' : 'grid';
                    render();
                });
                document.getElementById('stickersSearchInput')?.addEventListener('input', (e) => {
                    ui.search = e.target.value;
                    render();
                });
                document.querySelectorAll('.sticker-filter-btn').forEach(btn => {
                    btn.addEventListener('click', () => { ui.activeFilter = btn.dataset.filter; render(); });
                });
                document.getElementById('stickersOpenAdd')?.addEventListener('click', () => { ui.step = 'choose'; render(); });
                document.getElementById('stickersOverlayBg')?.addEventListener('click', closeOverlay);
                document.getElementById('stickersCloseOverlay')?.addEventListener('click', closeOverlay);
                document.getElementById('stickersBackToChoose')?.addEventListener('click', () => { ui.step = 'choose'; render(); });
                document.getElementById('stickersChooseSingle')?.addEventListener('click', () => {
                    ui.step = null;
                    render();
                    document.getElementById('stickerFileInput')?.click();
                });
                document.getElementById('stickersChoosePack')?.addEventListener('click', () => { ui.step = 'pack'; render(); });
                document.getElementById('stickersChooseUpload')?.addEventListener('click', () => {
                    ui.step = null;
                    render();
                    document.getElementById('stickerFileInput')?.click();
                });

                if (ui.step === 'single') {
                    document.querySelectorAll('[data-variant]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            ui.pickedSingle = parseInt(btn.dataset.variant, 10);
                            render();
                        });
                    });
                }
                if (ui.step === 'pack') {
                    document.querySelectorAll('[data-pack-sticker]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const val = btn.dataset.packSticker;
                            const stickerVal = val.startsWith('img:') ? val : parseInt(val, 10);
                            if (ui.pickedForPack.includes(stickerVal)) {
                                ui.pickedForPack = ui.pickedForPack.filter(x => x !== stickerVal);
                            } else {
                                ui.pickedForPack.push(stickerVal);
                            }
                            render();
                        });
                    });
                }

                document.getElementById('stickersPackNameInput')?.addEventListener('input', (e) => {
                    ui.packName = e.target.value;
                    const btn = document.getElementById('stickersConfirmPack');
                    if (btn) { btn.disabled = !ui.packName.trim() || ui.pickedForPack.length === 0; btn.style.opacity = btn.disabled ? '0.5' : '1'; }
                });

                document.getElementById('stickersConfirmSingle')?.addEventListener('click', () => {
                    if (ui.pickedSingle === null) return;
                    const cur = data();
                    const stickerId = 'sng_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                    const stickerKey = 'v:' + ui.pickedSingle;
                    cur.singles.unshift({ id: stickerId, variant: ui.pickedSingle, favorite: false, addedAt: Date.now() });
                    if (!Array.isArray(cur.medals)) cur.medals = [];
                    if (!cur.medals.includes(stickerKey) && cur.medals.length < PROFILE_STICKER_SLOTS) cur.medals.push(stickerKey);
                    if (!cur.colors) cur.colors = {};
                    if (!cur.colors[stickerKey]) cur.colors[stickerKey] = '#7c8494';
                    saveData(cur);
                    showToast(cur.medals.includes(stickerKey) ? 'Наліпку додано в профіль' : 'Наліпку додано');
                    closeOverlay();
                });

                document.getElementById('stickersConfirmPack')?.addEventListener('click', () => {
                    if (!ui.packName.trim() || ui.pickedForPack.length === 0) return;
                    const cur = data();
                    // Підтримка і варіантів (числа) і власних зображень (img:id)
                    const packVariants = ui.pickedForPack.filter(x => typeof x === 'number');
                    const packImages = ui.pickedForPack.filter(x => typeof x === 'string' && x.startsWith('img:'));

                    cur.sets.unshift({
                        id: 'set_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                        title: ui.packName.trim(),
                        variants: packVariants,
                        images: packImages.map(x => x.slice(4)), // зберігаємо тільки ID
                        favorite: false,
                        addedAt: Date.now()
                    });
                    saveData(cur);
                    showToast('Набір створено');
                    closeOverlay();
                });

                document.querySelectorAll('.sticker-public-single-add').forEach(el => {
                    el.addEventListener('click', () => importPublicSingle(el.dataset.singleId));
                });
                document.querySelectorAll('.sticker-public-set-add').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        importPublicSet(el.dataset.setId);
                    });
                });
                document.querySelectorAll('.sticker-single-tile:not(.sticker-public-single-add)').forEach(el => {
                    el.addEventListener('click', () => {
                        ui.step = 'actions';
                        ui.actionsTarget = { type: 'single', id: el.dataset.singleId };
                        render();
                    });
                });
                document.querySelectorAll('.sticker-set-actions:not(.sticker-public-set-add)').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        ui.step = 'actions';
                        ui.actionsTarget = { type: 'set', id: el.dataset.setId };
                        render();
                    });
                });

                document.getElementById('stickerColorInput')?.addEventListener('change', e => {
                    const target = ui.actionsTarget;
                    const cur = data();
                    const sticker = target && cur.singles.find(x => x.id === target.id);
                    if (sticker) {
                        if (!cur.colors) cur.colors = {};
                        cur.colors[stickerKeyFor(sticker)] = e.target.value;
                        saveData(cur);
                        render();
                    }
                });

                document.querySelectorAll('.sticker-action-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const act = btn.dataset.act;
                        const cur = data();
                        if (act === 'remove-bg') {
                            const s = cur.singles.find(x => x.id === btn.dataset.singleId);
                            if (!s?.image) return;
                            btn.disabled = true;
                            showToastProgress('AI готує видалення фону…');
                            try {
                                const response = await fetch(s.image, { mode: 'cors', cache: 'no-store' });
                                if (!response.ok) throw new Error('Не вдалося завантажити зображення наліпки');
                                const sourceBlob = await response.blob();
                                const processedBlob = await removeStickerBackground(sourceBlob);
                                showToast('Завантажую наліпку без фону...');
                                s.image = await uploadBlobToCloudinary(processedBlob, 'sticker-no-bg.png');
                                s.updatedAt = Date.now();
                                saveData(cur);
                                showToast('Фон наліпки видалено');
                                render();
                            } catch (error) {
                                console.error('Sticker reprocess error:', error);
                                showToast('Не вдалося видалити фон: ' + (error.message || 'невідома помилка'));
                                btn.disabled = false;
                            }
                            return;
                        }
                        if (act === 'favorite') {
                            const s = cur.singles.find(x => x.id === btn.dataset.singleId);
                            if (s) s.favorite = !s.favorite;
                            saveData(cur);
                        } else if (act === 'nick') {
                            const s = cur.singles.find(x => x.id === btn.dataset.singleId);
                            if (s) { const sKey = stickerKeyFor(s); cur.nickBadge = cur.nickBadge === sKey ? null : sKey; }
                            saveData(cur);
                            showToast(cur.nickBadge !== null ? 'Наліпку встановлено біля ніку' : 'Наліпку прибрано');
                        } else if (act === 'medal') {
                            const s = cur.singles.find(x => x.id === btn.dataset.singleId);
                            if (s) {
                                const sKey = stickerKeyFor(s);
                                if (cur.medals.includes(sKey)) {
                                    cur.medals = cur.medals.filter(k => k !== sKey);
                                } else {
                                    if (cur.medals.length >= PROFILE_STICKER_SLOTS) { showToast('Максимум 8 наліпок у профілі — спочатку приберіть одну'); return; }
                                    cur.medals.push(sKey);
                                }
                            }
                            saveData(cur);
                            showToast('Медалі оновлено');
                        } else if (act === 'delete') {
                            cur.singles = cur.singles.filter(x => x.id !== btn.dataset.singleId);
                            saveData(cur);
                            showToast('Наліпку видалено');
                            closeOverlay();
                            return;
                        } else if (act === 'favorite-set') {
                            const st = cur.sets.find(x => x.id === btn.dataset.setId);
                            if (st) st.favorite = !st.favorite;
                            saveData(cur);
                        } else if (act === 'delete-set') {
                            cur.sets = cur.sets.filter(x => x.id !== btn.dataset.setId);
                            saveData(cur);
                            showToast('Набір видалено');
                            closeOverlay();
                            return;
                        }
                        render();
                    });
                });
            }

            render();
        };
