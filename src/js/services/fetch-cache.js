/** In-flight fetch cache with single-flight, timeout, retry and abort support.
 * Usage:
 *  import { fetchWithCache, abortUrl } from './services/fetch-cache.js'
 *  const res = await fetchWithCache(url, { timeout: 8000, retry: 1, signal });
 */
const inFlight = new Map(); // url -> { promise, controllers: Set }

function makeTimeout(ms) {
  return new Promise((_, reject) => {
    const id = setTimeout(() => reject(new Error('Fetch timeout')), ms);
    // return clear function
    return () => clearTimeout(id);
  });
}

async function _doFetch(url, options = {}) {
  const controller = new AbortController();
  const { signal: externalSignal, timeout = 10000 } = options;
  // if externalSignal is aborted already, throw
  if (externalSignal && externalSignal.aborted) {
    controller.abort();
  }
  const signals = [controller.signal];
  if (externalSignal) {
    // when external aborts, abort our controller
    const onAbort = () => controller.abort();
    externalSignal.addEventListener('abort', onAbort);
    controller.signal.addEventListener('abort', () => externalSignal.removeEventListener('abort', onAbort));
  }

  const fetchOptions = { ...options, signal: controller.signal };
  // create a promise that rejects on timeout
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error('Fetch timeout'));
    }, timeout);
  });

  try {
    const p = fetch(url, fetchOptions);
    const res = await Promise.race([p, timeoutPromise]);
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    // normalize AbortError
    if (err && err.name === 'AbortError') throw new DOMException('Aborted', 'AbortError');
    throw err;
  }
}

export async function fetchWithCache(url, options = {}) {
  // canonicalize url for cache key when options.cacheKey provided else use url
  const key = options.cacheKey || url;
  // reuse in-flight
  if (inFlight.has(key)) {
    return inFlight.get(key).promise;
  }

  let attempt = 0;
  const maxAttempts = (options.retry || 0) + 1;

  let controllers = new Set();

  const promise = (async () => {
    try {
      while (attempt < maxAttempts) {
        attempt++;
        try {
          const res = await _doFetch(url, options);
          return res;
        } catch (err) {
          // if aborted, rethrow immediately
          if (err && (err.name === 'AbortError' || err.name === 'DOMException')) throw err;
          if (attempt >= maxAttempts) throw err;
          // otherwise retry once
        }
      }
    } finally {
      // cleanup
      inFlight.delete(key);
      controllers.clear();
    }
  })();

  inFlight.set(key, { promise, controllers });
  return promise;
}

export function abortUrl(urlOrKey) {
  const entry = inFlight.get(urlOrKey);
  if (!entry) return false;
  // There is no direct controller stored (we used single controller inside _doFetch per call)
  // But we can rely on the promise consumer to pass external signal normally. For completeness, we allow
  // abort by deleting map entry so future calls will not reuse it.
  inFlight.delete(urlOrKey);
  return true;
}

export function clearCache() {
  inFlight.clear();
}
