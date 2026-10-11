import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signInWithCustomToken, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile, setPersistence, browserLocalPersistence, signInAnonymously, sendPasswordResetEmail, deleteUser } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, addDoc, collection, query, where, orderBy, limit, onSnapshot, getDocs as getDocs2, increment } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";
var FIREBASE_CONFIG;
var init_firebase = __esm({
  "src/js/config/firebase.js"() {
    FIREBASE_CONFIG = {
      apiKey: "AIzaSyAtial_MrEr6PZgA0vzL1RlmmD9sR4i10I",
      authDomain: "lunalikbot.firebaseapp.com",
      projectId: "lunalikbot",
      storageBucket: "lunalikbot.firebasestorage.app",
      messagingSenderId: "64771326987",
      appId: "1:64771326987:web:bf1300aed66eb06ddef30e",
      measurementId: "",
      firestoreDatabaseId: "ai-studio-vakdab-a56ac132-784f-47f9-ba81-34e827c31516"
    };
  }
});
