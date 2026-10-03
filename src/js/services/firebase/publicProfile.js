var publicProfile_exports = {};
__export(publicProfile_exports, {
  getPublicProfile: () => getPublicProfile
});
function normalizeProfile(uid, data = {}) {
  const profile = data.profile || {};
  const now = Date.now();
  const rawNickname = String(profile.nickname || profile.username || "").trim();
  const nicknameBase = rawNickname.replace(/^@+/, "").replace(/\s+/g, "_").replace(/[^\p{L}\p{N}._-]/gu, "").slice(0, 24);
  const normalizedNickname = nicknameBase ? `@${nicknameBase}` : "@user";
  const rawRealName = String(profile.realName || "").trim();
  const normalizedRealName = rawRealName.replace(/^@+/, "") || (rawNickname && rawNickname !== "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447" ? rawNickname.replace(/^@+/, "") : "");
  return {
    uid,
    nickname: normalizedNickname,
    realName: normalizedRealName,
    bio: String(profile.bio || ""),
    bioBold: true,
    avatar: String(profile.avatar || ""),
    avatarVideo: String(profile.avatarVideo || ""),
    avatarVideoSettings: profile.avatarVideoSettings || {},
    banner: String(profile.banner || ""),
    bannerVideo: String(profile.bannerVideo || ""),
    bannerVideoSettings: profile.bannerVideoSettings || {},
    bannerFormat: profile.bannerFormat === "wide" ? "wide" : "narrow",
    bannerEffect: String(profile.bannerEffect || "none"),
    atmosphere: String(profile.atmosphere || "none"),
    effect: String(profile.effect || "none"),
    avatarDecoration: String(profile.avatarDecoration || "none"),
    private: profile.private === true,
    hideHistory: profile.hideHistory === true,
    hideBookmarks: profile.hideBookmarks === true,
    history: Array.isArray(data.history) ? data.history.slice(-100).reverse() : [],
    bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.slice(0, 100) : [],
    watchTime: Number(data.watchTime || 0),
    xp: Number(data.xp || 0),
    createdAt: data.createdAt || null
  };
}
function assertReady() {
  if (!initialized || !db) throw new Error("Firebase \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439");
}
async function firestore() {
  return import(FIRESTORE_VERSION);
}
async function getPublicProfile(uid) {
  assertReady();
  const targetUid = String(uid || "").trim();
  if (!targetUid) return null;
  const { collection: collection2, doc: doc2, documentId, getDoc: getDoc2, getDocs: getDocs3, limit: limit2, query: query2, where: where2 } = await firestore();
  let directReadError = null;
  try {
    const snapshot = await getDoc2(doc2(db, "users", targetUid));
    if (snapshot.exists()) return normalizeProfile(snapshot.id, snapshot.data());
    return null;
  } catch (error) {
    directReadError = error;
    const code = String(error?.code || "");
    const message = String(error?.message || "");
    if (!/permission-denied|insufficient permissions/i.test(`${code} ${message}`)) throw error;
  }
  try {
    const publicQuery = query2(
      collection2(db, "users"),
      where2(documentId(), "==", targetUid),
      limit2(1)
    );
    const result = await getDocs3(publicQuery);
    const match = result.docs?.[0];
    return match ? normalizeProfile(match.id, match.data()) : null;
  } catch (queryError) {
    console.warn("[VakDab] public profile query failed:", queryError);
    throw directReadError || queryError;
  }
}
var FIRESTORE_VERSION;
var init_publicProfile = __esm({
  "src/js/services/firebase/publicProfile.js?v=20260905-public-profile-v1"() {
    init_client();
    FIRESTORE_VERSION = "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
  }
});
