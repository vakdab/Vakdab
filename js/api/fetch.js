// ===== FETCH через проксі =====
// Оригінальні рядки: L5717-L5723 (getProxyUrl, isEmbedUrl), L6331-L6370 (fetchUA)

import { PROXY_URL } from '../config/api.js';

export function getProxyUrl(url) {
    try {
        const u = new URL(url);
        if (u.hostname === 'ashdi.vip' || u.hostname === 'vidmoly') return url;
        return PROXY_URL + '/proxy?url=' + encodeURIComponent(url);
    } catch { return url; }
}

export function isEmbedUrl(url) {
    return /(?:\/embed\/|player\.|iframe|vidmoly|ashdi)/.test(url);
}

export async function fetchUA(url, retries = 2) {
    const proxyUrl = getProxyUrl(url);
    const doFetch = async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        try {
            const resp = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            clearTimeout(timer);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const html = await resp.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            doc._rawHtml = html;
            return doc;
        } catch (e) {
            clearTimeout(timer);
            throw e;
        }
    };
    for (let i = 0; i <= retries; i++) {
        try { return await doFetch(); }
        catch (e) { if (i === retries) throw e; await new Promise(r => setTimeout(r, 800 * (i + 1))); }
    }
}
