import { firestore, collectionRef, documentRef } from './firestore.js';

export function createPost(path, post) {
    return firestore.addDoc(collectionRef(path), { ...post, createdAt: firestore.serverTimestamp() });
}

export function updatePost(path, id, patch) {
    return firestore.updateDoc(documentRef(path, id), patch);
}

export function deletePost(path, id) {
    return firestore.deleteDoc(documentRef(path, id));
}

export function toggleReaction(path, id, uid, active) {
    return firestore.updateDoc(documentRef(path, id), {
        reactions: active ? firestore.arrayUnion(uid) : firestore.arrayRemove(uid)
    });
}
