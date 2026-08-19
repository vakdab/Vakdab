import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile, signInAnonymously, sendPasswordResetEmail, deleteUser, doc, getDoc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, addDoc, collection, query, where, orderBy, limit, onSnapshot } from '../../config/firebase.js';
import { auth, db, initialized as firebaseInitialized } from '../../services/firebase/client.js';
import {
    Router, getDefaultStickers, calcTotalXP, getLevel,
    renderAuthPage, renderProfilePage, showToast
} from '../../legacy/app-legacy.js?v=20260818-honey-free-chapter-v2';
import { getDefaultProfile } from '../../components/pages/settingsLegacy.js';
import { Storage } from './storage.js';

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

export { Auth };
