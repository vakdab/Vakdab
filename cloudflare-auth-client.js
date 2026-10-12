// Cloudflare-backed compatibility adapter. See cloudflare/auth-worker.js for server-side auth.
const API_BASE = "https://vakdab-auth-api.animegran8.workers.dev";
const TOKEN_KEY = "vakdab_cloudflare_session_v1";
let authSingleton = null;
const authListeners = new WeakMap();

function readToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
}
function storeToken(value) {
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}
function setCurrentUser(auth, user) {
  auth.currentUser = user || null;
  const listeners = authListeners.get(auth);
  if (listeners) for (const callback of [...listeners]) {
    try { callback(auth.currentUser); } catch (error) { console.warn("Auth listener failed:", error); }
  }
}
function makeError(payload, status) {
  const error = new Error(payload?.error || payload?.message || `Auth API request failed (${status})`);
  error.code = payload?.code || "auth/internal-error";
  error.status = status;
  return error;
}
async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = auth ? readToken() : "";
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (cause) {
    const error = new Error("Не вдалося з'єднатися з Cloudflare auth API. Перевірте підключення до інтернету.");
    error.code = "auth/network-request-failed";
    error.cause = cause;
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw makeError(payload, response.status);
  return payload;
}
function acceptSession(auth, payload) {
  const accessToken = payload?.accessToken || payload?.customToken;
  if (!accessToken || !payload?.user) throw makeError({ error: "Сервер повернув некоректну сесію", code: "auth/invalid-response" }, 502);
  storeToken(accessToken);
  setCurrentUser(auth, payload.user);
  return { user: payload.user };
}
function ensureRestore(auth) {
  if (auth._restorePromise) return auth._restorePromise;
  auth._restorePromise = (async () => {
    const token = readToken();
    if (!token) { auth.currentUser = null; return null; }
    try {
      const result = await api("/auth/me");
      auth.currentUser = result.user || null;
      return auth.currentUser;
    } catch {
      storeToken("");
      auth.currentUser = null;
      return null;
    }
  })();
  return auth._restorePromise;
}

export function initializeApp(config = {}) { return { options: config, name: "[CLOUDFARE]" }; }
export function getAuth() {
  if (!authSingleton) {
    authSingleton = { currentUser: null, _restorePromise: null };
    authListeners.set(authSingleton, new Set());
  }
  return authSingleton;
}
export function setPersistence() { return Promise.resolve(); }
export const browserLocalPersistence = "local";
export function onAuthStateChanged(auth, callback) {
  let listeners = authListeners.get(auth);
  if (!listeners) { listeners = new Set(); authListeners.set(auth, listeners); }
  listeners.add(callback);
  ensureRestore(auth).then(() => { if (listeners.has(callback)) callback(auth.currentUser); });
  return () => listeners.delete(callback);
}
export async function signInWithEmailAndPassword(auth, email, password) {
  const result = await api("/auth/login", { method: "POST", auth: false, body: { email, password } });
  return acceptSession(auth, result);
}
export async function createUserWithEmailAndPassword(auth, email, password) {
  const result = await api("/auth/register", { method: "POST", auth: false, body: { email, password } });
  return acceptSession(auth, result);
}
export async function signInWithCustomToken(auth, token) {
  storeToken(String(token || ""));
  const result = await api("/auth/me");
  return acceptSession(auth, { accessToken: token, user: result.user });
}
export class GoogleAuthProvider { constructor() { this.providerId = "google.com"; } }
export async function signInWithPopup() {
  const error = new Error("У цьому вході доступні email/пароль і Telegram.");
  error.code = "auth/operation-not-supported";
  throw error;
}
export async function signInAnonymously(auth) {
  const result = await api("/auth/anonymous", { method: "POST", auth: false, body: {} });
  return acceptSession(auth, result);
}
export async function signOut(auth) {
  try { await api("/auth/logout", { method: "POST" }); } catch {}
  storeToken("");
  auth._restorePromise = Promise.resolve(null);
  setCurrentUser(auth, null);
}
export async function updateProfile(user, changes = {}) {
  const auth = getAuth();
  const result = await api("/auth/profile", { method: "PATCH", body: changes });
  setCurrentUser(auth, result.user || { ...user, ...changes });
  return result;
}
export async function sendPasswordResetEmail(_auth, email) {
  await api("/auth/password-reset", { method: "POST", auth: false, body: { email } });
}
export async function deleteUser(user) {
  await api("/auth/account", { method: "DELETE" });
  storeToken("");
  if (authSingleton) { authSingleton._restorePromise = Promise.resolve(null); setCurrentUser(authSingleton, null); }
  return user;
}

export function getFirestore() { return { __cloudflareFirestore: true }; }
function reference(type, collectionName, id = "") {
  return { __cfType: type, collection: String(collectionName || ""), id: String(id || "") };
}
export function doc(_db, collectionName, id) { return reference("doc", collectionName, id); }
export function collection(_db, collectionName) { return reference("collection", collectionName); }
export function where(field, operator, value) { return { __cfConstraint: "where", field: field?.__cfDocumentId ? "__name__" : String(field), operator, value }; }
export function documentId() { return { __cfDocumentId: true }; }
export function limit(value) { return { __cfConstraint: "limit", value: Number(value) }; }
export function orderBy(field, direction = "asc") { return { __cfConstraint: "orderBy", field: field?.__cfDocumentId ? "__name__" : String(field), direction }; }
export function query(base, ...constraints) {
  const filters = constraints.filter((entry) => entry?.__cfConstraint === "where");
  const limitConstraint = constraints.find((entry) => entry?.__cfConstraint === "limit");
  const orderConstraint = constraints.find((entry) => entry?.__cfConstraint === "orderBy");
  return { __cfType: "query", collection: base.collection, filters, limit: limitConstraint?.value || 100, orderBy: orderConstraint || null };
}
function asQuery(value) {
  return value?.__cfType === "query" ? value : { __cfType: "query", collection: value.collection, filters: [], limit: 100, orderBy: null };
}
function querySnapshot(payload) {
  const docs = (payload?.docs || []).map((item) => ({ id: item.id, exists: () => true, data: () => item.data }));
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (callback) => docs.forEach(callback) };
}
export async function getDoc(refValue) {
  const params = new URLSearchParams({ collection: refValue.collection, id: refValue.id });
  const result = await api(`/db/doc?${params}`);
  return { id: refValue.id, exists: () => Boolean(result.exists), data: () => result.data };
}
export async function getDocs(value) {
  const spec = asQuery(value);
  const params = new URLSearchParams({ collection: spec.collection });
  const body = { filters: spec.filters.map(({ field, operator, value: operand }) => ({ field, op: operator, value: operand })), limit: spec.limit, orderBy: spec.orderBy ? { field: spec.orderBy.field, direction: spec.orderBy.direction } : null };
  return querySnapshot(await api(`/db/query?${params}`, { method: "POST", body }));
}
export async function setDoc(refValue, data, options = {}) {
  const params = new URLSearchParams({ collection: refValue.collection, id: refValue.id });
  return api(`/db/doc?${params}`, { method: "PUT", body: { data, merge: Boolean(options?.merge) } });
}
export async function updateDoc(refValue, data) {
  const params = new URLSearchParams({ collection: refValue.collection, id: refValue.id });
  return api(`/db/doc?${params}`, { method: "PATCH", body: { data, merge: true } });
}
export async function deleteDoc(refValue) {
  const params = new URLSearchParams({ collection: refValue.collection, id: refValue.id });
  return api(`/db/doc?${params}`, { method: "DELETE" });
}
export async function addDoc(refValue, data) {
  const params = new URLSearchParams({ collection: refValue.collection });
  const result = await api(`/db/collection?${params}`, { method: "POST", body: { data } });
  return reference("doc", refValue.collection, result.id);
}
export function onSnapshot(queryValue, next, error) {
  let stopped = false;
  const refresh = async () => {
    if (stopped) return;
    try { next(await getDocs(queryValue)); } catch (cause) { if (error) error(cause); }
  };
  refresh();
  const timer = setInterval(refresh, 20000);
  return () => { stopped = true; clearInterval(timer); };
}
export function serverTimestamp() { return Date.now(); }
export function arrayUnion(...values) { return { __cfOp: "arrayUnion", values }; }
export function arrayRemove(...values) { return { __cfOp: "arrayRemove", values }; }
export function increment(value) { return { __cfOp: "increment", value }; }

export function getStorage() { return { __cloudflareStorage: true }; }
export function ref(storage, fullPath) { return { storage, fullPath: String(fullPath || "") }; }
export async function uploadBytesResumable() { throw new Error("Завантаження файлів буде перенесено окремо в Cloudflare R2."); }
export async function getDownloadURL(storageRef) { return storageRef?.fullPath || ""; }
export async function deleteObject() { return { deleted: true }; }
