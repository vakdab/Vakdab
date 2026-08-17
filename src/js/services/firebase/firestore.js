import { collection, doc, getDoc, setDoc, deleteDoc, updateDoc, addDoc, query, where, orderBy, limit, onSnapshot, arrayUnion, arrayRemove, serverTimestamp } from '../../config/firebase.js';
import { db } from './client.js';

export const firestoreClient = Object.freeze({ db });

export function collectionRef(path) {
    return collection(db, path);
}

export function documentRef(path, id) {
    return doc(db, path, id);
}

export const firestore = Object.freeze({
    collectionRef,
    documentRef,
    getDoc,
    setDoc,
    deleteDoc,
    updateDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    arrayUnion,
    arrayRemove,
    serverTimestamp
});
