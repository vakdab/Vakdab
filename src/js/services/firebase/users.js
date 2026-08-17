import { firestore, documentRef } from './firestore.js';

export async function getUserProfile(uid) {
    if (!uid) return null;
    const snapshot = await firestore.getDoc(documentRef('users', uid));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export function saveUserProfile(uid, data, options = { merge: true }) {
    return firestore.setDoc(documentRef('users', uid), data, options);
}

export function watchUserProfile(uid, listener) {
    return firestore.onSnapshot(documentRef('users', uid), snapshot => listener(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null));
}
