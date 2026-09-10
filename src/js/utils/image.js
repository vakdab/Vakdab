import { PROXY_URL } from '../config/constants.js?v=20260824-settings-redesign-v1';

export function getProxyUrl(url, forceUA = 'desktop') {
    if (!url) return null;
    return `${PROXY_URL}?url=${encodeURIComponent(url)}&force_ua=${forceUA}`;
}
export function isEmbedUrl(url = '') {
    return url.includes('tortuga.tw/embed') || url.includes('/embed/') ||
        /moonanime\.art\/iframe\//i.test(url) ||
        url.includes('aniboom') || url.includes('cdn-iframe') || url.includes('cdnvideohub') ||
        /^https?:\/\/(?:www\.)?mikai\.me\/anime\//i.test(url);
}
