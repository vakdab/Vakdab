import { PROXY_URL } from '../config/constants.js?v=20260822-home-genres-v64';

export function getProxyUrl(url, forceUA = 'desktop') {
    if (!url) return null;
    return `${PROXY_URL}?url=${encodeURIComponent(url)}&force_ua=${forceUA}`;
}
export function isEmbedUrl(url = '') {
    return url.includes('tortuga.tw/embed') || url.includes('/embed/') ||
        url.includes('aniboom') || url.includes('cdn-iframe') || url.includes('cdnvideohub') ||
        /^https?:\/\/(?:www\.)?mikai\.me\/anime\//i.test(url);
}
