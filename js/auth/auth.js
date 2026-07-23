// ===== СИСТЕМА АВТОРИЗАЦІЇ =====
// Оригінальні рядки: L5749-L6163

import { auth, db } from '../config/firebase.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
    updateProfile,
    setPersistence,
    browserLocalPersistence,
    signInAnonymously
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Storage } from '../storage/storage.js';
import { calcTotalXP, getLevel } from '../features/xp-system.js';
import { getDefaultProfile } from '../pages/profile.js';

        //  СИСТЕМА АВТОРИЗАЦІЇ
        // ====================================================================
export const Auth = {
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
                        if (window.Router?.currentRoute === 'profile') {
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
                            if (window.Router?.currentRoute === 'profile') {
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
                        // ТІЛЬКИ якщо ми на сторінці профілю показуємо форму входу
                        if (window.Router?.currentRoute === 'profile') {
                            const profContainer = document.getElementById('profilePageContainer');
                            if (profContainer && profContainer.classList.contains('active')) {
                                renderAuthPage();
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
                // ВАЖЛИВО: спочатку зберігаємо гостеві дані (щоб перенести в новий акаунт)
                const guestData = {
                    profile: Storage.getProfile(),
                    history: Storage.getHistory(),
                    bookmarks: Storage.getBookmarks(),
                    likes: Storage.getLikes(),
                    watchTime: Storage.getWatchTime()
                };
                // Завантажуємо з Firestore. НЕ очищаємо localStorage спереду —
                // якщо завантаження впаде, локальні дані залишаться.
                try {
                    const docRef = doc(db, 'users', uid);
                    const docSnap = await Promise.race([getDoc(docRef), timeout]);
                    if (docSnap.exists()) {
                        // Існуючий юзер — завантажуємо його дані з Firestore
                        const data = docSnap.data();
                        console.log('[Load] Firestore doc fields:', Object.keys(data));
                        console.log('[Load] profile avatar:', data.profile?.avatar ? data.profile.avatar.substring(0,50) : 'EMPTY');
                        console.log('[Load] profile banner:', data.profile?.banner ? data.profile.banner.substring(0,50) : 'EMPTY');
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
                    } else {
                        // Новий юзер — переносимо ГОСТЕВІ дані (не чужі!)
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
                    this._user = cred.user;
                    await this._loadUserData(cred.user.uid);
                    this._notifyListeners();
                    showToast('Успішний вхід');
                    if (window.Router?.currentRoute === 'profile') renderProfilePage();
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
                    if (window.Router?.currentRoute === 'profile') renderProfilePage();
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
                    console.log('Logout: sync done');
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
                try { await signOut(auth); } catch(e) {}

                showToast('Ви вийшли з акаунту');
                window.Router?.showProfile();
                return { success: true };
            },

            handleExit() {
                if (this.isGuest()) {
                    this._isGuest = false;
                    localStorage.removeItem('vakdab_guest');
                    Storage.clear();
                    this._notifyListeners();
                    showToast('Гостевий сеанс завершено');
                    window.Router?.showProfile();
                } else {
                    // Юзер — повний logout
                    this.logout().catch(e => console.warn('Logout error:', e));
                }
            },

            async syncUserData() {
                if (!firebaseInitialized || !db || !this._user) return { ok: false, error: 'no-auth' };
                if (!this.isAuthenticated()) return { ok: false, error: 'not-authenticated' };
                const uid = this._user.uid;
                const docRef = doc(db, 'users', uid);
                const profile = Storage.getProfile();
                const history = Storage.getHistory();
                const bookmarks = Storage.getBookmarks();
                const likes = Storage.getLikes();
                const watchTime = Storage.getWatchTime() || 0;
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
                console.log('[Sync] profile avatar:', cleanProfile.avatar ? cleanProfile.avatar.substring(0,50) : 'EMPTY');
                console.log('[Sync] profile banner:', cleanProfile.banner ? cleanProfile.banner.substring(0,50) : 'EMPTY');
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
                        xp: _xp,
                        level: _lv,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                    console.log('[Firestore] Sync OK (full)');
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
                        xp: _xp,
                        level: _lv,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                    console.log('[Firestore] Sync OK (trimmed history)');
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
                        xp: _xp,
                        level: _lv,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                    console.log('[Firestore] Sync OK (profile only)');
                    return { ok: true };
                } catch (e2) {
                    console.error('[Firestore] Sync FAILED (profile only):', e2.code, e2.message);
                    return { ok: false, error: e2.message };
                }
            }
        };


window.Auth = Auth;
