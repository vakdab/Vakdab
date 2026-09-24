import {
    addDoc, collection, deleteDoc, doc, getDocs, increment, limit as fsLimit,
    onSnapshot, orderBy, query, updateDoc, where, arrayUnion, arrayRemove, signInAnonymously
} from '../../config/firebase.js';
import { auth, db } from '../firebase/client.js';
import { hashCode } from '../../utils/string.js';
import { Auth } from '../../core/compat/auth.js';
import { getProfile, getProfileDisplayName, getProfileHandle } from '../profile/profileStorage.js';

// Колекція Firestore зі спільними коментарями до аніме.
const COMMENTS_COLLECTION = 'anime_comments';
export const COMMENTS_MAX_LENGTH = 500;

export function commentsAnimeId(animeUrl) {
    return String(hashCode(String(animeUrl || '')));
}

// Гарантує анонімну Firebase-сесію для гостей, щоб читання коментарів
// не впиралось у permission-denied без входу (як у anime_ratings).
export async function ensureCommentsGuestAuth() {
    try {
        if (!auth) return false;
        if ((Auth.isAuthenticated && Auth.isAuthenticated()) || auth.currentUser) return true;
        await signInAnonymously(auth);
        return true;
    } catch (e) {
        console.warn('[comments] guest auth failed:', e?.code || e);
        return false;
    }
}

export function commentsAuthorData() {
    const profile = getProfile();
    return {
        uid: auth?.currentUser?.uid || 'anon',
        nickname: getProfileDisplayName(profile),
        handle: getProfileHandle(profile),
        avatar: profile.avatar || profile.avatarVideo || ''
    };
}

export function isSignedInUser() {
    return Boolean(Auth.isAuthenticated && Auth.isAuthenticated() && auth?.currentUser && !auth.currentUser.isAnonymous);
}

function snapshotToComment(docSnap) {
    const data = docSnap.data() || {};
    return {
        id: docSnap.id,
        ...data,
        likes: Array.isArray(data.likedBy) ? data.likedBy.length : (data.likes || 0),
        likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
        createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0
    };
}

// Коментарі конкретного аніме. Без orderBy — не потребує composite index,
// сортуємо на клієнті (той самий патерн, що в ratingSystem).
export async function fetchAnimeComments(animeUrl) {
    try {
        if (!db) return [];
        await ensureCommentsGuestAuth();
        const animeId = commentsAnimeId(animeUrl);
        const q = query(collection(db, COMMENTS_COLLECTION), where('animeId', '==', animeId));
        const snap = await getDocs(q);
        return snap.docs.map(snapshotToComment).sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
        console.warn('[comments] fetchAnimeComments error:', e?.code || e);
        return [];
    }
}

// Живі оновлення коментарів конкретного аніме (onSnapshot).
// Повертає функцію відписки.
export function subscribeAnimeComments(animeUrl, callback) {
    let unsub = () => {};
    (async () => {
        try {
            if (!db) { callback([]); return; }
            await ensureCommentsGuestAuth();
            const animeId = commentsAnimeId(animeUrl);
            const q = query(collection(db, COMMENTS_COLLECTION), where('animeId', '==', animeId));
            unsub = onSnapshot(q, snap => {
                const list = snap.docs.map(snapshotToComment).sort((a, b) => b.createdAt - a.createdAt);
                callback(list);
            }, err => {
                console.warn('[comments] subscribe error:', err?.code || err);
                callback(null);
            });
        } catch (e) {
            console.warn('[comments] subscribe setup error:', e?.code || e);
            callback(null);
        }
    })();
    return () => unsub();
}

// Стрічка останніх коментарів по всьому сайту (одне поле — авто-індекс).
export async function fetchRecentComments(limitCount = 30) {
    try {
        if (!db) return [];
        await ensureCommentsGuestAuth();
        const q = query(collection(db, COMMENTS_COLLECTION), orderBy('createdAt', 'desc'), fsLimit(limitCount));
        const snap = await getDocs(q);
        return snap.docs.map(snapshotToComment);
    } catch (e) {
        console.warn('[comments] fetchRecentComments error:', e?.code || e);
        return [];
    }
}

// Популярні коментарі (сортування за лайками).
export async function fetchPopularComments(limitCount = 30) {
    try {
        if (!db) return [];
        await ensureCommentsGuestAuth();
        const q = query(collection(db, COMMENTS_COLLECTION), orderBy('likes', 'desc'), fsLimit(limitCount));
        const snap = await getDocs(q);
        const list = snap.docs.map(snapshotToComment);
        return list.sort((a, b) => b.likes - a.likes || b.createdAt - a.createdAt);
    } catch (e) {
        console.warn('[comments] fetchPopularComments error:', e?.code || e);
        return [];
    }
}

export async function postComment({ animeUrl, animeTitle, animePoster, text, parentId = '' }) {
    if (!isSignedInUser()) {
        return { ok: false, error: 'auth' };
    }
    const clean = String(text || '').trim().slice(0, COMMENTS_MAX_LENGTH);
    if (!clean) return { ok: false, error: 'empty' };
    try {
        if (!db) return { ok: false, error: 'db' };
        const author = commentsAuthorData();
        const payload = {
            animeId: commentsAnimeId(animeUrl),
            animeUrl: String(animeUrl || ''),
            animeTitle: String(animeTitle || ''),
            animePoster: String(animePoster || ''),
            parentId: String(parentId || ''),
            text: clean,
            likes: 0,
            likedBy: [],
            createdAt: Date.now(),
            ...author
        };
        const ref = await addDoc(collection(db, COMMENTS_COLLECTION), payload);
        return { ok: true, id: ref.id };
    } catch (e) {
        console.warn('[comments] postComment error:', e?.code || e);
        return { ok: false, error: e?.code || 'write' };
    }
}

export async function toggleCommentLike(comment) {
    try {
        if (!db || !comment?.id) return { ok: false };
        const uid = auth?.currentUser?.uid;
        if (!uid) return { ok: false, error: 'auth' };
        const ref = doc(db, COMMENTS_COLLECTION, comment.id);
        if (comment.likedBy?.includes(uid)) {
            await updateDoc(ref, { likedBy: arrayRemove(uid), likes: increment(-1) });
        } else {
            await updateDoc(ref, { likedBy: arrayUnion(uid), likes: increment(1) });
        }
        return { ok: true };
    } catch (e) {
        console.warn('[comments] toggleLike error:', e?.code || e);
        return { ok: false, error: e?.code || 'write' };
    }
}

export async function deleteComment(comment) {
    try {
        if (!db || !comment?.id) return { ok: false };
        const uid = auth?.currentUser?.uid;
        if (comment.uid !== uid) return { ok: false, error: 'forbidden' };
        // Видаляємо і сам коментар, і відповіді на нього.
        await deleteDoc(doc(db, COMMENTS_COLLECTION, comment.id));
        const animeId = comment.animeId || commentsAnimeId(comment.animeUrl);
        const q = query(collection(db, COMMENTS_COLLECTION), where('parentId', '==', comment.id));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
        return { ok: true };
    } catch (e) {
        console.warn('[comments] deleteComment error:', e?.code || e);
        return { ok: false, error: e?.code || 'write' };
    }
}

export function countReplies(list, parentId) {
    return (list || []).filter(c => c.parentId === parentId).length;
}

export function groupComments(list) {
    const items = list || [];
    const top = items.filter(c => !c.parentId).sort((a, b) => b.createdAt - a.createdAt);
    const replies = items.filter(c => c.parentId);
    return { top, replies };
}

export function timeAgoUk(ts) {
    if (!ts) return 'щойно';
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) return 'щойно';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} хв тому`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} год тому`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 30) return `${diffD} дн тому`;
    const diffM = Math.floor(diffD / 30);
    if (diffM < 12) return `${diffM} міс тому`;
    return `${Math.floor(diffM / 12)} р тому`;
}
