/** Shared HTTP primitives for service modules. */
export async function getJson(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...(options.headers || {}) } });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
}
