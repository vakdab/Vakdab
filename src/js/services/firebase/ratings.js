import { firestore, documentRef } from './firestore.js';

export function saveRating(path, id, rating) {
    return firestore.setDoc(documentRef(path, id), { ...rating, updatedAt: firestore.serverTimestamp() }, { merge: true });
}

export async function getRating(path, id) {
    const snapshot = await firestore.getDoc(documentRef(path, id));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export function removeRating(path, id) {
    return firestore.deleteDoc(documentRef(path, id));
}
