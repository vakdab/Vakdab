// ===== FIREBASE КОНФІГУРАЦІЯ + ІМПОРТИ + ІНІЦІАЛІЗАЦІЯ =====
// Оригінальні рядки: L5626-L5638 (config), L5640-L5673 (imports), L5728-L5748 (init)

import { initializeApp } from "firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
    updateProfile,
    setPersistence,
    browserLocalPersistence,
    signInAnonymously
} from "firebase/auth";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    serverTimestamp,
    addDoc,
    collection,
    query,
    orderBy,
    limit,
    onSnapshot
} from "firebase/firestore";

export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA23-0J0dwKN_EKWEbVKTMSxyB-DV5PuxA",
    authDomain: "vakdab.firebaseapp.com",
    projectId: "vakdab",
    storageBucket: "vakdab.firebasestorage.app",
    messagingSenderId: "202715819838",
    appId: "1:202715819838:web:89b96c8237a73bec35066f",
    measurementId: "G-3JLHRQDS0R"
};

export const firebaseApp = initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
