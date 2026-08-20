/** Shared HTTP primitives for service modules.
 * Reworked to use fetchWithCache to avoid duplicate simultaneous requests,
 * and to add timeout/retry support. This is a minimal, non-breaking change.
 */
import { fetchWithCache } from './fetch-cache.js';

export async function getJson(url, options = {}) {
    const { timeout = 10000, retry = 0, cacheKey } = options;
    const fetchOptions = { timeout, retry, cacheKey };
    const res = await fetchWithCache(url, fetchOptions);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
}
