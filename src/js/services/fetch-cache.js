import { debugLog } from '../utils/debug.js';

const inFlight = new Map(); // canonical key -> { promise }

function isRetryableStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function retryDelay(response, attempt) {
  const retryAfter = Number(response?.headers?.get?.('Retry-After'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(8000, retryAfter * 1000);
  return Math.min(8000, 350 * (2 ** Math.max(0, attempt - 1)));
}

async function _doFetch(url, options = {}) {
  const controller = new AbortController();
  const { signal: externalSignal, timeout = 10000 } = options;
  if (externalSignal?.aborted) controller.abort();
  if (externalSignal) {
    const onAbort = () => controller.abort();
    externalSignal.addEventListener('abort', onAbort, { once: true });
    controller.signal.addEventListener('abort', () => externalSignal.removeEventListener('abort', onAbort), { once: true });
  }
  const fetchOptions = { ...options, signal: controller.signal };
  delete fetchOptions.retry;
  delete fetchOptions.cacheKey;
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error('Fetch timeout'));
    }, timeout);
  });
  try {
    const res = await Promise.race([fetch(url, fetchOptions), timeoutPromise]);
    clearTimeout(timeoutId);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') throw new DOMException('Aborted', 'AbortError');
    throw error;
  }
}

export async function fetchWithCache(url, options = {}) {
  const key = options.cacheKey || url;
  if (inFlight.has(key)) return inFlight.get(key).promise;
  const maxAttempts = Math.max(1, Number(options.retry || 0) + 1);
  const promise = (async () => {
    let lastError;
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const response = await _doFetch(url, options);
          debugLog('http', 'response', { url, status: response.status, attempt, maxAttempts });
          if (response.ok || !isRetryableStatus(response.status) || attempt === maxAttempts) return response;
          await new Promise(resolve => setTimeout(resolve, retryDelay(response, attempt)));
        } catch (error) {
          lastError = error;
          if (error?.name === 'AbortError' || attempt === maxAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, Math.min(8000, 350 * (2 ** Math.max(0, attempt - 1)))));
        }
      }
    } finally {
      inFlight.delete(key);
    }
    throw lastError || new Error('Fetch failed');
  })();
  inFlight.set(key, { promise });
  return promise;
}

export function abortUrl(urlOrKey) {
  // The current abstraction deduplicates in-flight work. Removing the key
  // prevents future callers from joining a stale request; callers that need
  // hard cancellation should pass an AbortSignal to fetchWithCache.
  return inFlight.delete(urlOrKey);
}

export function clearCache() {
  inFlight.clear();
}
