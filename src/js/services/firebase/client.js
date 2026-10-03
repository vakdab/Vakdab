var firebaseApp, auth, db, initialized, firebaseClient;
var init_client = __esm({
  "src/js/services/firebase/client.js"() {
    init_firebase();
    firebaseApp = null;
    auth = null;
    db = null;
    initialized = false;
    try {
      firebaseApp = initializeApp(FIREBASE_CONFIG);
      auth = getAuth(firebaseApp);
      setPersistence(auth, browserLocalPersistence).catch((error) => console.warn("[VakDab] Firebase persistence:", error));
      db = getFirestore(firebaseApp);
      initialized = true;
    } catch (error) {
      console.warn("[VakDab] Firebase init:", error?.message || error);
    }
    firebaseClient = Object.freeze({
      app: firebaseApp,
      auth,
      db,
      initialized
    });
  }
});
