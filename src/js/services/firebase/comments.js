import { firestore, collectionRef, documentRef } from './firestore.js';

export function createComment(path, comment) {
    return firestore.addDoc(collectionRef(path), { ...comment, createdAt: firestore.serverTimestamp() });
}

export function updateComment(path, id, patch) {
    return firestore.updateDoc(documentRef(path, id), patch);
}

export function deleteComment(path, id) {
    return firestore.deleteDoc(documentRef(path, id));
}

export function watchComments(path, listener, ...constraints) {
    return firestore.onSnapshot(firestore.query(collectionRef(path), ...constraints), snapshot => listener(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))));
}
