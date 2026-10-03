var Auth;
var init_auth = __esm({
  "src/js/core/compat/auth.js?v=20260927-persistence-v2"() {
    init_firebase();
    init_client();
    init_app_legacy();
    init_settingsLegacy();
    init_storage();
    init_constants2();
    Auth = {
      _user: null,
      _listeners: [],
      _initialized: false,
      _googleProvider: null,
      _isGuest: false,
      _loadingData: false,
      _lastProfileSync: null,
      _authResolved: false,
      _authReadyPromise: null,
      _resolveAuthReady: null,
      _syncQueue: Promise.resolve(),
      init() {
        if (!initialized) {
          console.warn("Firebase not available, auth disabled");
          return;
        }
        if (this._initialized) return;
        this._initialized = true;
        this._authReadyPromise = new Promise((resolve) => {
          this._resolveAuthReady = resolve;
        });
        this._isGuest = localStorage.getItem("vakdab_guest") === "1";
        this._googleProvider = new GoogleAuthProvider();
        onAuthStateChanged(auth, async (user) => {
          if (user && this._user && this._user.uid !== user.uid) {
            this._welcomeShown = false;
            Storage.clear();
          }
          if (user && !user.isAnonymous) this._isGuest = false;
          this._user = user;
          this._authResolved = true;
          if (this._resolveAuthReady) {
            this._resolveAuthReady(user);
            this._resolveAuthReady = null;
          }
          this._notifyListeners();
          if (user) {
            if (Router.currentRoute === "profile") {
              const profContainer = document.getElementById("profilePageContainer");
              if (profContainer && profContainer.classList.contains("active")) {
                renderProfilePage2();
              }
            }
            if (!this._welcomeShown) {
              this._welcomeShown = true;
              showToast("\u041F\u0440\u0438\u0432\u0456\u0442, " + (user.displayName || user.email || "\u043A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447"));
            }
            try {
              await this._loadUserData(user.uid);
              if (Router.currentRoute === "profile") {
                const profContainer = document.getElementById("profilePageContainer");
                if (profContainer && profContainer.classList.contains("active")) {
                  renderProfilePage2();
                }
              }
            } catch (e) {
              console.warn("Background load failed, using local data:", e.message);
            }
          } else {
            this._welcomeShown = false;
            if (Router.currentRoute === "profile") {
              const profContainer = document.getElementById("profilePageContainer");
              if (profContainer && profContainer.classList.contains("active")) {
                if (this.isGuest()) renderProfilePage2();
                else renderAuthPage();
              }
            }
          }
        });
      },
      _notifyListeners() {
        this._listeners.forEach((fn) => {
          try {
            fn(this._user);
          } catch (e) {
            console.warn("[Auth] listener failed:", e);
          }
        });
        try {
          window.dispatchEvent(new CustomEvent("vakdab:auth-changed", { detail: { user: this._user } }));
        } catch (_) {
        }
      },
      onAuthStateChanged(fn) {
        this._listeners.push(fn);
        if (this._authResolved) fn(this._user);
        return () => {
          this._listeners = this._listeners.filter((listener) => listener !== fn);
        };
      },
      async waitForResolution(timeoutMs = 5e3) {
        if (this._authResolved) return this._user;
        if (!this._authReadyPromise) return null;
        return Promise.race([
          this._authReadyPromise,
          new Promise((resolve) => setTimeout(() => resolve(this._user), timeoutMs))
        ]);
      },
      isAuthenticated() {
        return !!this._user && initialized;
      },
      isGuest() {
        return this._isGuest;
      },
      setGuest(val) {
        this._isGuest = val;
        if (val) localStorage.setItem("vakdab_guest", "1");
        else localStorage.removeItem("vakdab_guest");
        this._notifyListeners();
      },
      getUser() {
        return this._user;
      },
      async _loadUserData(uid) {
        if (!initialized || !db) return;
        if (this._loadingData) return;
        this._loadingData = true;
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Firestore timeout")), 5e3));
        try {
          const docRef = doc(db, "users", uid);
          const docSnap = await Promise.race([getDoc(docRef), timeout]);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const localProfileBeforeLoad = Storage.getProfile() || {};
            if (data.profile) {
              const remoteProfile = data.profile || {};
              const localProfileUpdatedAt = Number(localProfileBeforeLoad.profileUpdatedAt || 0);
              const remoteProfileUpdatedAt = Number(remoteProfile.profileUpdatedAt || 0);
              const localIsNewer = localProfileUpdatedAt > remoteProfileUpdatedAt;
              const mergedProfile = Object.assign(
                getDefaultProfile(),
                remoteProfile,
                localIsNewer ? localProfileBeforeLoad : {}
              );
              ["avatar", "avatarVideo", "avatarVideoSettings", "banner", "bannerVideo", "bannerVideoSettings", "bannerFormat"].forEach((key) => {
                if (!mergedProfile[key] && localProfileBeforeLoad[key]) mergedProfile[key] = localProfileBeforeLoad[key];
              });
              const telegramProfile = this._pendingTelegramProfile;
              const legacyNickname = String(mergedProfile.nickname || "").trim();
              if (!mergedProfile.realName && legacyNickname && legacyNickname !== "@user" && legacyNickname !== "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447") mergedProfile.realName = stripNicknamePrefix(legacyNickname);
              if (telegramProfile && (!mergedProfile.nickname || mergedProfile.nickname === "@user" || mergedProfile.nickname === "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447")) {
                mergedProfile.nickname = normalizeNickname(telegramProfile.username || `tg_${telegramProfile.id}`, "@user");
              }
              if (telegramProfile && (!mergedProfile.realName || mergedProfile.realName === "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447")) {
                mergedProfile.realName = [telegramProfile.first_name, telegramProfile.last_name].filter(Boolean).join(" ") || stripNicknamePrefix(mergedProfile.nickname);
              }
              mergedProfile.nickname = normalizeNickname(mergedProfile.nickname, "@user");
              mergedProfile.realName = stripNicknamePrefix(mergedProfile.realName);
              if (telegramProfile && !mergedProfile.avatar && telegramProfile.photo_url) mergedProfile.avatar = telegramProfile.photo_url;
              if ((!mergedProfile.realName || mergedProfile.realName === "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447") && this._user && this._user.displayName) {
                mergedProfile.realName = stripNicknamePrefix(this._user.displayName);
              }
              if ((!mergedProfile.nickname || mergedProfile.nickname === "@user" || mergedProfile.nickname === "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447") && this._user) {
                mergedProfile.nickname = normalizeNickname(this._user.email?.split("@")[0] || this._user.displayName, "@user");
              }
              if (!mergedProfile.avatar && this._user && this._user.photoURL) {
                mergedProfile.avatar = this._user.photoURL;
              }
              Storage._setProfile(mergedProfile);
              if (localIsNewer) this.syncUserData({ scope: "profile" }).catch(() => {
              });
            } else {
              const p = { ...getDefaultProfile(), ...localProfileBeforeLoad };
              if (this._user && this._user.displayName && (!p.realName || p.realName === "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447")) p.realName = stripNicknamePrefix(this._user.displayName);
              if (this._user && this._user.photoURL && !p.avatar) p.avatar = this._user.photoURL;
              Storage._setProfile(p);
            }
            const remoteHistoryTS = Number(data.historyUpdatedAt || 0);
            const localHistoryTS = Storage.getHistoryTS();
            if (Array.isArray(data.history) && localHistoryTS <= remoteHistoryTS) {
              Storage._setHistory(data.history);
              try {
                localStorage.setItem("vakdab_history_ts", String(remoteHistoryTS));
              } catch {
              }
            } else if (localHistoryTS > remoteHistoryTS) {
              Storage._debounceSync("history");
            }
            if (data.bookmarks) Storage._setBookmarks(data.bookmarks);
            if (data.likes) Storage._setLikes(data.likes);
            if (data.watchTime) Storage._setWatchTime(data.watchTime);
            const remoteStickersTS = data.stickersUpdatedAt || 0;
            const localStickersTS = Storage.getStickersTS();
            if (localStickersTS > remoteStickersTS) {
              Storage._debounceSync("stickers");
            } else if (data.stickers) {
              Storage._setStickers(Object.assign(getDefaultStickers(), data.stickers));
            }
          } else {
            const guestData = {
              profile: Storage.getProfile(),
              history: Storage.getHistory(),
              bookmarks: Storage.getBookmarks(),
              likes: Storage.getLikes(),
              watchTime: Storage.getWatchTime(),
              stickers: Storage.getStickers()
            };
            const telegramProfile = this._pendingTelegramProfile;
            const hasCustomGuestProfile = guestData.profile && guestData.profile.nickname && guestData.profile.nickname !== "@user" && guestData.profile.nickname !== "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447";
            if (hasCustomGuestProfile) {
              const guestProfile = { ...guestData.profile };
              guestProfile.nickname = normalizeNickname(guestProfile.nickname, "@user");
              guestProfile.realName = stripNicknamePrefix(guestProfile.realName);
              Storage._setProfile(guestProfile);
            } else if (telegramProfile) {
              const p = getDefaultProfile();
              p.nickname = normalizeNickname(telegramProfile.username || `tg_${telegramProfile.id}`, "@user");
              p.realName = [telegramProfile.first_name, telegramProfile.last_name].filter(Boolean).join(" ");
              if (telegramProfile.photo_url) p.avatar = telegramProfile.photo_url;
              Storage._setProfile(p);
            } else if (this._user && this._user.displayName) {
              const p = getDefaultProfile();
              p.realName = stripNicknamePrefix(this._user.displayName);
              p.nickname = normalizeNickname(this._user.email?.split("@")[0] || this._user.displayName, "@user");
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
          console.warn("Error loading user data:", e);
          const localProfileOnError = Storage.getProfile();
          if (localProfileOnError && typeof localProfileOnError === "object") {
            Storage._setProfile({ ...getDefaultProfile(), ...localProfileOnError });
          } else if (this._pendingTelegramProfile) {
            const p = getDefaultProfile();
            const tg = this._pendingTelegramProfile;
            p.nickname = normalizeNickname(tg.username || `tg_${tg.id}`, "@user");
            p.realName = [tg.first_name, tg.last_name].filter(Boolean).join(" ");
            if (tg.photo_url) p.avatar = tg.photo_url;
            Storage._setProfile(p);
          } else if (this._user && this._user.displayName) {
            const p = getDefaultProfile();
            p.realName = stripNicknamePrefix(this._user.displayName);
            p.nickname = normalizeNickname(this._user.email?.split("@")[0] || this._user.displayName, "@user");
            if (this._user.photoURL) p.avatar = this._user.photoURL;
            Storage._setProfile(p);
          } else {
            Storage._setProfile({ ...getDefaultProfile(), ...localProfileOnError || {} });
          }
        } finally {
          this._loadingData = false;
        }
      },
      async _createUserDoc(uid) {
        if (!initialized || !db) return;
        try {
          let profile = Storage.getProfile() || getDefaultProfile();
          if (this._user && this._user.displayName && (!profile.realName || profile.realName === "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447")) {
            profile.realName = stripNicknamePrefix(this._user.displayName);
          }
          profile.nickname = normalizeNickname(profile.nickname, "@user");
          profile.realName = stripNicknamePrefix(profile.realName);
          if (this._user && this._user.photoURL && !profile.avatar) {
            profile.avatar = this._user.photoURL;
          }
          Storage._setProfile(profile);
          const docRef = doc(db, "users", uid);
          const profileSync = JSON.parse(JSON.stringify(profile));
          if (profileSync.avatar && profileSync.avatar.length > 1e5) profileSync.avatar = "";
          if (profileSync.banner && profileSync.banner.length > 1e5) profileSync.banner = "";
          const createHistory = Storage.getHistory().slice(-100).map((h) => {
            if (h.poster && h.poster.startsWith("data:")) return { ...h, poster: "" };
            return h;
          });
          const createBookmarks = Storage.getBookmarks().map((b) => {
            if (b.poster && b.poster.startsWith("data:")) return { ...b, poster: "" };
            return b;
          });
          await setDoc(docRef, {
            profile: profileSync,
            history: createHistory,
            historyUpdatedAt: Storage.getHistoryTS(),
            bookmarks: createBookmarks,
            likes: Storage.getLikes(),
            watchTime: Storage.getWatchTime() || 0,
            stickers: Storage.getStickers(),
            stickersUpdatedAt: Storage.getStickersTS(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          console.warn("Error creating user doc:", e);
        }
      },
      formatAuthError(e, isGoogle = false) {
        if (!e) return "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0456\u0457";
        const msg = String(e.message || e.code || e);
        const code = String(e.code || msg);
        const isTma = Boolean(globalThis.Telegram?.WebApp?.initData);
        if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password") || code.includes("auth/user-not-found")) {
          return "\u041D\u0435\u0432\u0456\u0440\u043D\u0438\u0439 email \u0430\u0431\u043E \u043F\u0430\u0440\u043E\u043B\u044C.";
        }
        if (code.includes("auth/popup-blocked") || code.includes("auth/popup-closed-by-user") || code.includes("auth/cancelled-popup-request") || code.includes("disallowed_useragent")) {
          if (isTma) {
            return "\u0423 Telegram Mini App \u0432\u0445\u0456\u0434 \u0447\u0435\u0440\u0435\u0437 Google \u0431\u043B\u043E\u043A\u0443\u0454\u0442\u044C\u0441\u044F \u0432\u0431\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043E\u043C. \u0421\u043A\u043E\u0440\u0438\u0441\u0442\u0430\u0439\u0442\u0435\u0441\u044F \u043A\u043D\u043E\u043F\u043A\u043E\u044E \xAB\u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 Telegram\xBB.";
          }
          return "\u0412\u0456\u043A\u043D\u043E \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0456\u0457 \u0431\u0443\u043B\u043E \u0437\u0430\u043A\u0440\u0438\u0442\u043E \u0430\u0431\u043E \u0437\u0430\u0431\u043B\u043E\u043A\u043E\u0432\u0430\u043D\u043E \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043E\u043C.";
        }
        if (code.includes("auth/email-already-in-use")) {
          return "\u0426\u0435\u0439 email \u0432\u0436\u0435 \u0432\u0438\u043A\u043E\u0440\u0438\u0441\u0442\u043E\u0432\u0443\u0454\u0442\u044C\u0441\u044F \u0456\u043D\u0448\u0438\u043C \u0430\u043A\u0430\u0443\u043D\u0442\u043E\u043C.";
        }
        if (code.includes("auth/weak-password")) {
          return "\u041F\u0430\u0440\u043E\u043B\u044C \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043C\u0456\u0441\u0442\u0438\u0442\u0438 \u0449\u043E\u043D\u0430\u0439\u043C\u0435\u043D\u0448\u0435 6 \u0441\u0438\u043C\u0432\u043E\u043B\u0456\u0432.";
        }
        if (code.includes("auth/network-request-failed")) {
          return "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u043C\u0435\u0440\u0435\u0436\u0456. \u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0437\u02BC\u0454\u0434\u043D\u0430\u043D\u043D\u044F \u0437 \u0456\u043D\u0442\u0435\u0440\u043D\u0435\u0442\u043E\u043C.";
        }
        if (code.includes("auth/too-many-requests")) {
          return "\u0417\u0430\u0431\u0430\u0433\u0430\u0442\u043E \u043D\u0435\u0432\u0434\u0430\u043B\u0438\u0445 \u0441\u043F\u0440\u043E\u0431. \u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u0456\u0437\u043D\u0456\u0448\u0435.";
        }
        return msg.replace(/^Firebase:\s*(Error\s*)?(\(auth\/[^)]+\)\.?\s*)?/i, "").trim() || "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0456\u0457";
      },
      async login(email, password) {
        if (!initialized || !auth) {
          return { success: false, error: "Firebase \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439" };
        }
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          this._user = cred.user;
          this._authResolved = true;
          this._notifyListeners();
          showToast("\u0423\u0441\u043F\u0456\u0448\u043D\u0438\u0439 \u0432\u0445\u0456\u0434");
          return { success: true };
        } catch (e) {
          console.warn("Login error:", e);
          return { success: false, error: this.formatAuthError(e) };
        }
      },
      async register(email, password, displayName) {
        if (!initialized || !auth) {
          return { success: false, error: "Firebase \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439" };
        }
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          this._user = cred.user;
          if (displayName) {
            await updateProfile(cred.user, { displayName });
          }
          const profile = getDefaultProfile();
          profile.realName = stripNicknamePrefix(displayName);
          profile.nickname = normalizeNickname(email.split("@")[0] || displayName, "@user");
          Storage._setProfile(profile);
          this._createUserDoc(cred.user.uid).catch((e) => console.warn("Register _createUserDoc:", e.message));
          this._notifyListeners();
          showToast("\u0410\u043A\u0430\u0443\u043D\u0442 \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u043E");
          if (Router.currentRoute === "profile") renderProfilePage2();
          return { success: true };
        } catch (e) {
          console.warn("Register error:", e);
          return { success: false, error: this.formatAuthError(e) };
        }
      },
      async signInWithTelegram(initData = "") {
        if (!initialized || !auth) return { success: false, error: "Firebase \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439" };
        const rawInitData = String(initData || globalThis.Telegram?.WebApp?.initData || "").trim();
        if (!rawInitData) return { success: false, error: "\u0412\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 VakDab \u0456\u0437 Telegram Mini App \u0430\u0431\u043E \u0441\u043A\u043E\u0440\u0438\u0441\u0442\u0430\u0439\u0442\u0435\u0441\u044F \u0456\u043D\u0448\u0438\u043C \u0441\u043F\u043E\u0441\u043E\u0431\u043E\u043C \u0432\u0445\u043E\u0434\u0443" };
        try {
          const response = await fetch(TELEGRAM_AUTH_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: rawInitData })
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload.customToken) throw new Error(payload.error || "\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0438\u0442\u0438 Telegram");
          this._pendingTelegramProfile = payload.telegramUser || null;
          const result = await signInWithCustomToken(auth, payload.customToken);
          this._user = result.user;
          const tg = payload.telegramUser || {};
          const displayName = [tg.first_name, tg.last_name].filter(Boolean).join(" ") || (tg.username ? `@${tg.username}` : "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447");
          const current = Storage.getProfile() || getDefaultProfile();
          if (!current.nickname || current.nickname === "@user" || current.nickname === "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447") current.nickname = normalizeNickname(tg.username || `tg_${tg.id}`, "@user");
          if (!current.realName || current.realName === "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447") current.realName = stripNicknamePrefix(displayName);
          if (!current.avatar && tg.photo_url) current.avatar = tg.photo_url;
          Storage._setProfile(current);
          this._notifyListeners();
          showToast("\u0412\u0445\u0456\u0434 \u0447\u0435\u0440\u0435\u0437 Telegram \u0443\u0441\u043F\u0456\u0448\u043D\u0438\u0439");
          return { success: true };
        } catch (e) {
          console.warn("Telegram sign-in error:", e);
          this._pendingTelegramProfile = null;
          return { success: false, error: e.message || "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0432\u0445\u043E\u0434\u0443 \u0447\u0435\u0440\u0435\u0437 Telegram" };
        }
      },
      async signInWithGoogle() {
        if (!initialized || !auth || !this._googleProvider) {
          return { success: false, error: "Firebase \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439" };
        }
        try {
          const result = await signInWithPopup(auth, this._googleProvider);
          this._user = result.user;
          this._authResolved = true;
          this._notifyListeners();
          showToast("\u0412\u0445\u0456\u0434 \u0447\u0435\u0440\u0435\u0437 Google \u0443\u0441\u043F\u0456\u0448\u043D\u0438\u0439");
          return { success: true };
        } catch (e) {
          console.warn("Google sign-in error:", e);
          return { success: false, error: this.formatAuthError(e, true) };
        }
      },
      async logout() {
        if (!initialized || !auth) {
          return { success: false, error: "Firebase not available" };
        }
        if (Storage._syncTimer) {
          clearTimeout(Storage._syncTimer);
          Storage._syncTimer = null;
        }
        showToast("\u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043D\u044F \u0434\u0430\u043D\u0438\u0445 \u0456 \u0432\u0438\u0445\u0456\u0434...");
        try {
          if (this._lastProfileSync) await this._lastProfileSync;
        } catch (e) {
          console.warn("Logout: profile sync error", e.message);
        }
        try {
          const timeoutP = new Promise((r) => setTimeout(r, 6e3));
          await Promise.race([this.syncUserData(), timeoutP]);
        } catch (e) {
          console.warn("Logout: sync error", e.message);
        }
        this._user = null;
        this._authResolved = true;
        this._welcomeShown = false;
        this._isGuest = false;
        Storage.clear();
        this._notifyListeners();
        try {
          await signOut(auth);
        } catch (e) {
          console.error("Silent error:", e);
        }
        showToast("\u0412\u0438 \u0432\u0438\u0439\u0448\u043B\u0438 \u0437 \u0430\u043A\u0430\u0443\u043D\u0442\u0443");
        Router.showProfile();
        return { success: true };
      },
      handleExit() {
        if (this.isGuest()) {
          this._isGuest = false;
          localStorage.removeItem("vakdab_guest");
          Storage.clear();
          this._notifyListeners();
          showToast("\u0413\u043E\u0441\u0442\u0435\u0432\u0438\u0439 \u0441\u0435\u0430\u043D\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E");
          Router.showProfile();
        } else {
          this.logout().catch((e) => console.warn("Logout error:", e));
        }
      },
      // Чи ввійшов юзер через email/пароль (а не Google/анонімно) — для показу "Змінити пароль"
      hasPasswordProvider() {
        if (!this.isAuthenticated()) return false;
        return (this._user.providerData || []).some((p) => p.providerId === "password");
      },
      providerLabel() {
        if (this.isGuest() || !this.isAuthenticated()) return "\u0413\u0456\u0441\u0442\u044C";
        if ((this._user.providerData || []).some((p) => p.providerId === "google.com")) return "Google";
        if (this.hasPasswordProvider()) return "Email \u0456 \u043F\u0430\u0440\u043E\u043B\u044C";
        return "\u0410\u043A\u0430\u0443\u043D\u0442";
      },
      async sendPasswordReset() {
        if (!initialized || !auth || !this._user?.email) {
          return { success: false, error: "\u041F\u043E\u0448\u0442\u0430 \u0430\u043A\u0430\u0443\u043D\u0442\u0443 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430" };
        }
        try {
          await sendPasswordResetEmail(auth, this._user.email);
          return { success: true };
        } catch (e) {
          console.warn("Password reset error:", e);
          return { success: false, error: e.message };
        }
      },
      // Повне і незворотнє видалення акаунту: документ у Firestore + сам обліковий запис Firebase + локальні дані.
      async deleteAccount() {
        if (!initialized || !auth || !this._user) {
          return { success: false, error: "\u0410\u043A\u0430\u0443\u043D\u0442 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439" };
        }
        const uid = this._user.uid;
        try {
          try {
            await deleteDoc(doc(db, "users", uid));
          } catch (e) {
            console.warn("Delete user doc failed:", e.message);
          }
          await deleteUser(auth.currentUser);
          this._user = null;
          this._authResolved = true;
          this._welcomeShown = false;
          this._isGuest = false;
          Storage.clear();
          this._notifyListeners();
          return { success: true };
        } catch (e) {
          console.warn("Delete account error:", e);
          if (e.code === "auth/requires-recent-login") {
            return { success: false, error: "requires-recent-login" };
          }
          return { success: false, error: e.message };
        }
      },
      async syncUserData(options = {}) {
        const run = this._syncQueue.catch(() => {
        }).then(() => this._syncUserDataNow(options));
        this._syncQueue = run.catch(() => {
        });
        return run;
      },
      async _syncUserDataNow(options = {}) {
        if (!initialized || !db || !this._user) return { ok: false, error: "no-auth" };
        if (!this.isAuthenticated()) return { ok: false, error: "not-authenticated" };
        const uid = this._user.uid;
        const docRef = doc(db, "users", uid);
        const scope = options.scope || "all";
        const scopeSet = new Set(String(scope).split(",").filter(Boolean));
        const hasScope = (key) => scope === "all" || scopeSet.has(key);
        const profile = hasScope("profile") ? Storage.getProfile() : null;
        const history2 = hasScope("history") ? Storage.getHistory() : [];
        const bookmarks = hasScope("bookmarks") ? Storage.getBookmarks() : [];
        const likes = hasScope("likes") ? Storage.getLikes() : {};
        const watchTime = hasScope("watchTime") ? Storage.getWatchTime() || 0 : 0;
        const stickers = hasScope("stickers") ? Storage.getStickers() : null;
        const cleanProfile = JSON.parse(JSON.stringify(profile || {}));
        if (cleanProfile.avatar && cleanProfile.avatar.startsWith("data:")) {
          cleanProfile.avatar = "";
        }
        if (cleanProfile.banner && cleanProfile.banner.startsWith("data:")) {
          cleanProfile.banner = "";
        }
        const trimHistory = history2.slice(-200).map((h) => {
          if (h.poster && h.poster.startsWith("data:")) return { ...h, poster: "" };
          return h;
        });
        const cleanBookmarks = bookmarks.map((b) => {
          if (b.poster && b.poster.startsWith("data:")) return { ...b, poster: "" };
          return b;
        });
        if (scope !== "all") {
          const partialPayload = { updatedAt: serverTimestamp() };
          if (hasScope("profile")) partialPayload.profile = cleanProfile;
          if (hasScope("history")) partialPayload.history = trimHistory;
          if (hasScope("history")) partialPayload.historyUpdatedAt = Storage.getHistoryTS();
          if (hasScope("bookmarks")) partialPayload.bookmarks = cleanBookmarks;
          if (hasScope("likes")) partialPayload.likes = likes;
          if (hasScope("watchTime")) partialPayload.watchTime = watchTime;
          if (hasScope("stickers")) {
            partialPayload.stickers = stickers;
            partialPayload.stickersUpdatedAt = Storage.getStickersTS();
          }
          if (hasScope("history") || hasScope("bookmarks") || hasScope("watchTime")) {
            const partialXp = calcTotalXP();
            partialPayload.xp = partialXp;
            partialPayload.level = getLevel(partialXp);
          }
          try {
            await setDoc(docRef, partialPayload, { merge: true });
            return { ok: true, scope };
          } catch (e) {
            console.error("[Firestore] Partial sync FAILED:", scope, e.code, e.message);
            return { ok: false, error: e.message };
          }
        }
        const _xp = calcTotalXP();
        const _lv = getLevel(_xp);
        try {
          await setDoc(docRef, {
            profile: cleanProfile,
            history: trimHistory,
            historyUpdatedAt: Storage.getHistoryTS(),
            bookmarks: cleanBookmarks,
            likes,
            watchTime,
            stickers,
            stickersUpdatedAt: Storage.getStickersTS(),
            xp: _xp,
            level: _lv,
            updatedAt: serverTimestamp()
          }, { merge: true });
          return { ok: true };
        } catch (e) {
          console.error("[Firestore] Sync FAILED (full):", e.code, e.message);
        }
        try {
          await setDoc(docRef, {
            profile: cleanProfile,
            history: trimHistory.slice(-50),
            historyUpdatedAt: Storage.getHistoryTS(),
            bookmarks: cleanBookmarks,
            likes,
            watchTime,
            stickers,
            stickersUpdatedAt: Storage.getStickersTS(),
            xp: _xp,
            level: _lv,
            updatedAt: serverTimestamp()
          }, { merge: true });
          return { ok: true };
        } catch (e) {
          console.error("[Firestore] Sync FAILED (trimmed):", e.code, e.message);
        }
        try {
          await setDoc(docRef, {
            profile: cleanProfile,
            watchTime,
            stickers,
            stickersUpdatedAt: Storage.getStickersTS(),
            xp: _xp,
            level: _lv,
            updatedAt: serverTimestamp()
          }, { merge: true });
          return { ok: true };
        } catch (e2) {
          console.error("[Firestore] Sync FAILED (profile only):", e2.code, e2.message);
          return { ok: false, error: e2.message };
        }
      }
    };
  }
});
