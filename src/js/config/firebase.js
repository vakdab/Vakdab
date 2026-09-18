// This is a static browser app, so Firebase must be imported from browser URLs.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signInWithCustomToken, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile, setPersistence, browserLocalPersistence, signInAnonymously, sendPasswordResetEmail, deleteUser } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, addDoc, collection, query, where, orderBy, limit, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA23-0J0dwKN_EKWEbVKTMSxyB-DV5PuxA",
    authDomain: "vakdab.firebaseapp.com",
    projectId: "vakdab",
    storageBucket: "vakdab.firebasestorage.app",
    messagingSenderId: "202715819838",
    appId: "1:202715819838:web:89b96c8237a73bec35066f",
    measurementId: "G-3JLHRQDS0R"
};

export {
    initializeApp,
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signInWithCustomToken,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
    updateProfile,
    setPersistence,
    browserLocalPersistence,
    signInAnonymously,
    sendPasswordResetEmail,
    deleteUser,
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
    where,
    orderBy,
    limit,
    onSnapshot,
    getDocs,
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
};
