import { db, initialized as firebaseInitialized } from './client.js';

const FIRESTORE_VERSION = 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

function normalizeProfile(uid, data = {}) {
    const profile = data.profile || {};
    const now = Date.now();
    const rawNickname = String(profile.nickname || profile.username || '').trim();
    const nicknameBase = rawNickname.replace(/^@+/, '').replace(/\s+/g, '_').replace(/[^\p{L}\p{N}._-]/gu, '').slice(0, 24);
    const normalizedNickname = nicknameBase ? `@${nicknameBase}` : '@user';
    const rawRealName = String(profile.realName || '').trim();
    const normalizedRealName = rawRealName.replace(/^@+/, '') || (rawNickname && rawNickname !== 'Користувач' ? rawNickname.replace(/^@+/, '') : '');
    const thought = String(profile.thought || '').trim();
    const thoughtAt = Number(profile.thoughtAt || 0);
    const thoughtExpiresAt = Number(profile.thoughtExpiresAt || (thoughtAt + (4 * 60 * 60 * 1000)) || 0);
    const activeThought = thought && thoughtAt > 0 && thoughtExpiresAt > now ? thought : '';
    return {
        uid,
        nickname: normalizedNickname,
        realName: normalizedRealName,
        bio: String(profile.bio || ''),
        bioBold: profile.bioBold === true,
        avatar: String(profile.avatar || ''),
        avatarVideo: String(profile.avatarVideo || ''),
        avatarVideoSettings: profile.avatarVideoSettings || {},
        banner: String(profile.banner || ''),
        bannerVideo: String(profile.bannerVideo || ''),
        bannerVideoSettings: profile.bannerVideoSettings || {},
        bannerFormat: profile.bannerFormat === 'wide' ? 'wide' : 'narrow',
        bannerEffect: String(profile.bannerEffect || 'none'),
        atmosphere: String(profile.atmosphere || 'none'),
        effect: String(profile.effect || 'none'),
        avatarDecoration: String(profile.avatarDecoration || 'none'),
        thought: activeThought,
        thoughtAt: activeThought ? thoughtAt : 0,
        thoughtExpiresAt: activeThought ? thoughtExpiresAt : 0,
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
    if (!firebaseInitialized || !db) throw new Error('Firebase недоступний');
}

async function firestore() {
    return import(FIRESTORE_VERSION);
}

export async function getPublicProfile(uid) {
    assertReady();
    const targetUid = String(uid || '').trim();
    if (!targetUid) return null;
    const { collection, doc, documentId, getDoc, getDocs, limit, query, where } = await firestore();
    let directReadError = null;
    try {
        const snapshot = await getDoc(doc(db, 'users', targetUid));
        if (snapshot.exists()) return normalizeProfile(snapshot.id, snapshot.data());
        return null;
    } catch (error) {
        // Деякі production rules дозволяють list/query для публічних карток,
        // але блокують прямий get документа. У такому разі використовуємо
        // query за UID і не залишаємо public profile у нескінченному loading.
        directReadError = error;
        const code = String(error?.code || '');
        const message = String(error?.message || '');
        if (!/permission-denied|insufficient permissions/i.test(`${code} ${message}`)) throw error;
    }
    try {
        const publicQuery = query(
            collection(db, 'users'),
            where(documentId(), '==', targetUid),
            limit(1)
        );
        const result = await getDocs(publicQuery);
        const match = result.docs?.[0];
        return match ? normalizeProfile(match.id, match.data()) : null;
    } catch (queryError) {
        console.warn('[VakDab] public profile query failed:', queryError);
        // Повертаємо первинну помилку, щоб renderer показав зрозумілий стан,
        // а не маскував проблему як «користувача не знайдено».
        throw directReadError || queryError;
    }
}

export async function getSocialState(profileUid, viewerUid = '') {
    assertReady();
    const { collection, getDocs, query, where } = await firestore();
    const edgeCollection = collection(db, 'user_follow_edges');
    const [followingSnapshot, followersSnapshot] = await Promise.all([
        getDocs(query(edgeCollection, where('followerUid', '==', String(profileUid)))),
        getDocs(query(edgeCollection, where('followingUid', '==', String(profileUid))))
    ]);
    const followingIds = new Set();
    const followerIds = new Set();
    followingSnapshot.forEach(item => {
        const data = item.data() || {};
        if (data.followingUid) followingIds.add(String(data.followingUid));
    });
    followersSnapshot.forEach(item => {
        const data = item.data() || {};
        if (data.followerUid) followerIds.add(String(data.followerUid));
    });
    // У VakDab «Друзі» — це всі соціальні зв'язки профілю:
    // достатньо, щоб один із користувачів почав слідкувати за іншим.
    // Тому підписник відображається у друзях профілю, на який він підписався,
    // навіть якщо взаємного follow ще немає.
    const friendIds = new Set([...followingIds, ...followerIds]);
    return {
        following: followingIds.size,
        followers: followerIds.size,
        friends: friendIds.size,
        isFollowing: Boolean(viewerUid && followerIds.has(String(viewerUid))),
        followingIds: [...followingIds],
        followerIds: [...followerIds]
    };
}

export async function setFollowing(viewerUid, targetUid, shouldFollow) {
    assertReady();
    const followerUid = String(viewerUid || '');
    const followingUid = String(targetUid || '');
    if (!followerUid || !followingUid) throw new Error('Потрібна авторизація');
    if (followerUid === followingUid) throw new Error('Не можна слідкувати за власним профілем');
    const { deleteDoc, doc, serverTimestamp, setDoc } = await firestore();
    const edgeRef = doc(db, 'user_follow_edges', `${followerUid}_${followingUid}`);
    if (shouldFollow) {
        await setDoc(edgeRef, {
            followerUid,
            followingUid,
            createdAt: serverTimestamp()
        }, { merge: true });
    } else {
        await deleteDoc(edgeRef);
    }
    return getSocialState(followingUid, followerUid);
}

async function loadProfilesByIds(ids) {
    const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).map(id => String(id || '').trim()).filter(Boolean))];
    if (!uniqueIds.length) return [];
    const profiles = await Promise.all(uniqueIds.map(id => getPublicProfile(id).catch(error => {
        console.warn('[VakDab] social list profile failed:', id, error);
        return null;
    })));
    return profiles.filter(Boolean);
}

// Отримати список друзів/соціальних зв'язків разом із публічними профілями.
// Одностороння підписка також входить до цього списку.
export async function getFriendsList(uid) {
    const targetUid = String(uid || '').trim();
    if (!targetUid) return [];
    const social = await getSocialState(targetUid);
    const friendIds = [...new Set([
        ...(social.followingIds || []),
        ...(social.followerIds || [])
    ])];
    return loadProfilesByIds(friendIds);
}

// Отримати список користувачів, на яких підписаний профіль.
export async function getFollowingList(uid) {
    const targetUid = String(uid || '').trim();
    if (!targetUid) return [];
    const social = await getSocialState(targetUid);
    return loadProfilesByIds(social.followingIds || []);
}

export function publicProfileRoute(uid) {
    return `#profile?uid=${encodeURIComponent(String(uid || ''))}`;
}
