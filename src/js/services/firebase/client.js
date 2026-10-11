var firebaseApp, auth, db, initialized, firebaseClient, firebasePersistenceReady;
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
      firebasePersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.warn("[VakDab] Firebase persistence:", error);
      });
      db = getFirestore(firebaseApp, FIREBASE_CONFIG.firestoreDatabaseId || "ai-studio-vakdab-a56ac132-784f-47f9-ba81-34e827c31516");
      initialized = true;
    } catch (error) {
      console.warn("[VakDab] Firebase init:", error?.message || error);
      firebasePersistenceReady = Promise.resolve();
    }
    firebaseClient = Object.freeze({
      app: firebaseApp,
      auth,
      db,
      initialized
    });
  }
});
