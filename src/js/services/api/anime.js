import { getHikkaAnime, searchHikkaAnime, getHikkaSchedule } from './hikka.js';

export const animeApi = Object.freeze({
    get: getHikkaAnime,
    search: searchHikkaAnime,
    schedule: getHikkaSchedule
});

export { getHikkaAnime, searchHikkaAnime, getHikkaSchedule };
