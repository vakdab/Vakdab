function normalizeNickname(value, fallback = "@user") {
  const raw = String(value || "").trim().replace(/^@+/, "").replace(/\s+/g, "_").replace(/[^\p{L}\p{N}._-]/gu, "").slice(0, 24);
  return raw ? `@${raw}` : fallback;
}
function stripNicknamePrefix(value) {
  return String(value || "").trim().replace(/^@+/, "");
}
function getProfileDisplayName(profile) {
  const name = stripNicknamePrefix(profile?.realName);
  if (name) return name;
  return stripNicknamePrefix(profile?.nickname) || "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447";
}
function getProfileHandle(profile) {
  return normalizeNickname(profile?.nickname, "@user");
}
function getDefaultProfile() {
  return {
    nickname: "@user",
    avatar: "",
    avatarVideo: "",
    banner: "",
    bannerVideo: "",
    bio: "\u0410\u043D\u0456\u043C\u0435 \u0435\u043D\u0442\u0443\u0437\u0456\u0430\u0441\u0442. \u0414\u0438\u0432\u043B\u044E\u0441\u044C \u0443\u0441\u0435 \u043F\u0456\u0434\u0440\u044F\u0434 \u2014 \u0432\u0456\u0434 \u0441\u043B\u0430\u0439\u0441-\u043E\u0444-\u043B\u0430\u0439\u0444 \u0434\u043E \u043F\u0441\u0438\u0445\u043E\u043B\u043E\u0433\u0456\u0447\u043D\u043E\u0433\u043E \u0442\u0440\u0438\u043B\u0435\u0440\u0430.",
    bioBold: true,
    profileUpdatedAt: 0,
    realName: "",
    birthdate: "",
    showBirthdate: true,
    private: false,
    hideHistory: false,
    hideBookmarks: false,
    effect: "none",
    atmosphere: "none",
    avatarDecoration: "none",
    bannerEffect: "none",
    bannerFormat: "narrow"
  };
}
function getProfile() {
  const p = Storage.getProfile();
  const def = getDefaultProfile();
  if (!p) {
    Storage.setProfile(def);
    return def;
  }
  const merged = { ...def, ...p };
  ["nickname", "avatar", "avatarVideo", "banner", "bannerVideo", "bio", "realName", "birthdate", "effect", "atmosphere", "avatarDecoration", "bannerEffect", "bannerFormat"].forEach((key) => {
    if (typeof merged[key] !== "string") merged[key] = def[key];
  });
  const legacyNickname = String(merged.nickname || "").trim();
  if (!merged.realName && legacyNickname && legacyNickname !== "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447" && !legacyNickname.startsWith("@")) merged.realName = legacyNickname;
  merged.nickname = normalizeNickname(legacyNickname, def.nickname);
  merged.realName = stripNicknamePrefix(merged.realName);
  if (merged.bannerFormat !== "narrow" && merged.bannerFormat !== "wide") merged.bannerFormat = def.bannerFormat;
  merged.bioBold = true;
  merged.hideHistory = merged.hideHistory === true;
  merged.hideBookmarks = merged.hideBookmarks === true;
  return merged;
}
function saveProfile(data) {
  const nextProfile = { ...data, profileUpdatedAt: Date.now(), bioBold: true };
  Storage._setProfile(nextProfile);
  try {
    window.dispatchEvent(new CustomEvent("vakdab:profile-changed"));
  } catch {
  }
  if (Auth.isAuthenticated()) {
    const syncPromise = Auth.syncUserData({ scope: "profile" }).catch((error) => {
      console.warn("[VakDab] profile sync failed:", error);
      return { ok: false, error: error?.message || "\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u043F\u0440\u043E\u0444\u0456\u043B\u044C" };
    });
    Auth._lastProfileSync = syncPromise;
    return syncPromise;
  }
  return Promise.resolve({ ok: true, localOnly: true });
}
function getProfileStats() {
  const history2 = Storage.getHistory();
  const bookmarks = Storage.getBookmarks();
  const uniqueAnime = new Set(history2.map((h) => h.animeId || h.title));
  const totalEpisodes = history2.length;
  const totalWatchTime = Storage.getWatchTime() || history2.reduce((sum, h) => sum + (h.duration || 0), 0);
  const minutes = Math.floor(totalWatchTime / 60);
  return {
    viewed: totalEpisodes,
    bookmarks: bookmarks.length,
    watchMinutes: minutes,
    totalWatchTime,
    uniqueAnime: uniqueAnime.size,
    history: history2.slice(0, 50),
    historyCount: history2.length,
    bookmarksList: bookmarks
  };
}
var init_profileStorage = __esm({
  "src/js/services/profile/profileStorage.js?v=20260927-persistence-v1"() {
    init_storage();
    init_auth();
  }
});
