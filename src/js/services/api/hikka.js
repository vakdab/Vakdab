import { HIKKA_API } from '../../config/constants.js?v=20260820-hikka-proxy-fix2';
import { getJson } from '../api.js';

export const HIKKA_ENDPOINTS = Object.freeze({
    anime: `${HIKKA_API}/anime`,
    search: `${HIKKA_API}/anime`,
    schedule: `${HIKKA_API}/schedule`
});

export function getHikkaAnime(id, options = {}) {
    return getJson(`${HIKKA_API}/anime/${encodeURIComponent(id)}`, options);
}

export function searchHikkaAnime(params = {}, options = {}) {
    const query = new URLSearchParams(params);
    return getJson(`${HIKKA_ENDPOINTS.search}?${query}`, options);
}

export function getHikkaSchedule(params = {}, options = {}) {
    const query = new URLSearchParams(params);
    return getJson(`${HIKKA_ENDPOINTS.schedule}?${query}`, options);
}
