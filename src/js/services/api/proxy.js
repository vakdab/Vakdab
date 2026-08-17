import { PROXY_URL } from '../../config/constants.js';
import { getJson } from '../api.js';

export function proxiedUrl(url) {
    return `${PROXY_URL}/?url=${encodeURIComponent(url)}`;
}

export function getViaProxy(url, options = {}) {
    return getJson(proxiedUrl(url), options);
}

export { PROXY_URL };
