import { FIREBASE_CONFIG, initializeApp, getAuth, setPersistence, browserLocalPersistence, getFirestore } from '../../config/firebase.js';

let firebaseApp = null;
let auth = null;
let db = null;
let initialized = false;

try {
    firebaseApp = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(firebaseApp);
    setPersistence(auth, browserLocalPersistence).catch(error => console.warn('[VakDab] Firebase persistence:', error));
    db = getFirestore(firebaseApp);
    initialized = true;
} catch (error) {
    console.warn('[VakDab] Firebase init:', error?.message || error);
}

export const firebaseClient = Object.freeze({
    app: firebaseApp,
    auth,
    db,
    initialized
});

export { firebaseApp, auth, db, initialized };
