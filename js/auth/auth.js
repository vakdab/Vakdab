import { auth, db } from "../config/firebase.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Storage } from "../storage/storage.js";
import { getDefaultProfile, calcTotalXP, getLevel } from "../features/xp-system.js";

const Auth = {
  _user: null,
  _listeners: [],
  _initialized: false,
  _googleProvider: null,
  _isGuest: false,
  _loadingData: false,
  _authResolved: false,
  _welcomeShown: false,

  init() {
    if (this._initialized) return;
    this._initialized = true;
    this._isGuest = localStorage.getItem('vakdab_guest') === '1';
    this._googleProvider = new GoogleAuthProvider();

    onAuthStateChanged(auth, async (user) => {
      if (user && this._user && this._user.uid !== user.uid) this._welcomeShown = false;
      if (user && !user.isAnonymous) this._isGuest = false;
      this._user = user;
      this._authResolved = true;
      this._notifyListeners();

      if (user) {
        if (!this._welcomeShown) {
          this._welcomeShown = true;
          showToast('Привіт, ' + (user.displayName || user.email || 'користувач'));
        }
        try { await this._loadUserData(user.uid); } catch {}
      } else {
        this._welcomeShown = false;
      }
    });
  },

  _notifyListeners() { this._listeners.forEach(fn => fn(this._user)); },
  onAuthStateChanged(fn) { this._listeners.push(fn); if (this._user !== null) fn(this._user); },
  isAuthenticated() { return !!this._user; },
  isGuest() { return this._isGuest; },
  setGuest(val) { this._isGuest = val; if (val) localStorage.setItem('vakdab_guest', '1'); else localStorage.removeItem('vakdab_guest'); this._notifyListeners(); },
  getUser() { return this._user; },

  async _loadUserData(uid) {
    if (!db || this._loadingData) return;
    this._loadingData = true;
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      const guestData = {
        profile: Storage.getProfile(),
        history: Storage.getHistory(),
        bookmarks: Storage.getBookmarks(),
        likes: Storage.getLikes(),
        watchTime: Storage.getWatchTime()
      };
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.profile) {
          const merged = Object.assign(getDefaultProfile(), data.profile);
          if ((!merged.nickname || merged.nickname === 'Користувач') && this._user?.displayName) merged.nickname = this._user.displayName;
          if (!merged.avatar && this._user?.photoURL) merged.avatar = this._user.photoURL;
          Storage._setProfile(merged);
        } else if (this._user?.displayName) {
          const p = getDefaultProfile(); p.nickname = this._user.displayName; if (this._user.photoURL) p.avatar = this._user.photoURL; Storage._setProfile(p);
        } else Storage._setProfile(getDefaultProfile());
        if (data.history) Storage._setHistory(data.history);
        if (data.bookmarks) Storage._setBookmarks(data.bookmarks);
        if (data.likes) Storage._setLikes(data.likes);
        if (data.watchTime) Storage._setWatchTime(data.watchTime);
      } else {
        if (guestData.profile?.nickname && guestData.profile.nickname !== 'Користувач') Storage._setProfile(guestData.profile);
        else if (this._user?.displayName) { const p = getDefaultProfile(); p.nickname = this._user.displayName; if (this._user.photoURL) p.avatar = this._user.photoURL; Storage._setProfile(p); }
        else Storage._setProfile(getDefaultProfile());
        if (guestData.history?.length) Storage._setHistory(guestData.history);
        if (guestData.bookmarks?.length) Storage._setBookmarks(guestData.bookmarks);
        if (guestData.likes && Object.keys(guestData.likes).length) Storage._setLikes(guestData.likes);
        if (guestData.watchTime) Storage._setWatchTime(guestData.watchTime);
        await this._createUserDoc(uid);
      }
    } catch (e) { console.warn('Load user error:', e); if (this._user?.displayName) { const p = getDefaultProfile(); p.nickname = this._user.displayName; if (this._user.photoURL) p.avatar = this._user.photoURL; Storage._setProfile(p); } else Storage._setProfile(getDefaultProfile()); }
    finally { this._loadingData = false; }
  },

  async _createUserDoc(uid) {
    try {
      const profile = Storage.getProfile() || getDefaultProfile();
      if (this._user?.displayName && (!profile.nickname || profile.nickname === 'Користувач')) profile.nickname = this._user.displayName;
      if (this._user?.photoURL && !profile.avatar) profile.avatar = this._user.photoURL;
      Storage._setProfile(profile);
      const clean = JSON.parse(JSON.stringify(profile));
      if (clean.avatar?.startsWith('data:')) clean.avatar = '';
      if (clean.banner?.startsWith('data:')) clean.banner = '';
      await setDoc(doc(db, 'users', uid), {
        profile: clean,
        history: Storage.getHistory().slice(-100).map(h => h.poster?.startsWith('data:') ? { ...h, poster: '' } : h),
        bookmarks: Storage.getBookmarks().map(b => b.poster?.startsWith('data:') ? { ...b, poster: '' } : b),
        likes: Storage.getLikes(),
        watchTime: Storage.getWatchTime() || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) { console.warn('Create user doc error:', e); }
  },

  async login(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      this._user = cred.user;
      await this._loadUserData(cred.user.uid);
      this._notifyListeners();
      showToast('Успішний вхід');
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  },

  async register(email, password, displayName) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      this._user = cred.user;
      if (displayName) await updateProfile(cred.user, { displayName });
      const p = getDefaultProfile();
      p.nickname = displayName || email.split('@')[0] || 'Користувач';
      Storage._setProfile(p);
      await this._createUserDoc(cred.user.uid);
      this._notifyListeners();
      showToast('Акаунт створено');
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  },

  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, this._googleProvider);
      this._user = result.user;
      this._notifyListeners();
      showToast('Вхід через Google...');
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  },

  async logout() {
    if (this._syncTimer) clearTimeout(this._syncTimer);
    showToast('Збереження даних і вихід...');
    try { await this.syncUserData(); } catch {}
    this._user = null;
    this._authResolved = true;
    this._welcomeShown = false;
    this._isGuest = false;
    Storage.clear();
    this._notifyListeners();
    try { await signOut(auth); } catch {}
    showToast('Ви вийшли з акаунту');
    return { success: true };
  },

  handleExit() {
    if (this.isGuest()) {
      this._isGuest = false;
      localStorage.removeItem('vakdab_guest');
      Storage.clear();
      this._notifyListeners();
      showToast('Гостевий сеанс завершено');
    } else {
      this.logout();
    }
  },

  async syncUserData() {
    if (!db || !this._user) return { ok: false, error: 'no-auth' };
    const uid = this._user.uid;
    const docRef = doc(db, 'users', uid);
    const profile = Storage.getProfile();
    const clean = JSON.parse(JSON.stringify(profile || {}));
    if (clean.avatar?.startsWith('data:')) clean.avatar = '';
    if (clean.banner?.startsWith('data:')) clean.banner = '';
    const trimHistory = Storage.getHistory().slice(-200).map(h => h.poster?.startsWith('data:') ? { ...h, poster: '' } : h);
    const cleanBookmarks = Storage.getBookmarks().map(b => b.poster?.startsWith('data:') ? { ...b, poster: '' } : b);
    const _xp = calcTotalXP();
    const _lv = getLevel(_xp);
    try {
      await setDoc(docRef, {
        profile: clean,
        history: trimHistory,
        bookmarks: cleanBookmarks,
        likes: Storage.getLikes(),
        watchTime: Storage.getWatchTime() || 0,
        xp: _xp,
        level: _lv,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return { ok: true };
    } catch (e) {
      console.error('Sync failed, trying profile only:', e.code);
      try {
        await setDoc(docRef, {
          profile: clean,
          watchTime: Storage.getWatchTime() || 0,
          xp: _xp,
          level: _lv,
          updatedAt: serverTimestamp()
        }, { merge: true });
        return { ok: true };
      } catch (e2) { return { ok: false, error: e2.message }; }
    }
  }
};

export { Auth };
