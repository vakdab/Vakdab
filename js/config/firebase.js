import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA23-0J0dwKN_EKWEbVKTMSxyB-DV5PuxA",
  authDomain: "vakdab.firebaseapp.com",
  projectId: "vakdab",
  storageBucket: "vakdab.firebasestorage.app",
  messagingSenderId: "202715819838",
  appId: "1:202715819838:web:89b96c8237a73bec35066f",
  measurementId: "G-3JLHRQDS0R"
};

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(() => {});

export { auth, db, FIREBASE_CONFIG };
