const loaders = Object.freeze({
    manga: () => import('../components/manga/reader.js?v=20260822-home-genres-v64'),
    novel: () => import('../components/novel/reader.js?v=20260822-home-genres-v64'),
    player: () => import('../pages/player/animePage.js?v=20260822-home-genres-v64'),
    community: () => import('../components/community/group.js?v=20260822-home-genres-v64'),
    chat: () => import('../components/community/chat.js?v=20260822-home-genres-v64'),
    profile: () => import('../pages/profile/profile.js?v=20260822-home-genres-v64'),
    stickers: () => import('../pages/profile/stickersPage.js?v=20260822-home-genres-v64')
});

const cache = new Map();

export function loadFeature(name) {
    if (!loaders[name]) return Promise.reject(new Error(`Unknown feature: ${name}`));
    if (!cache.has(name)) cache.set(name, loaders[name]());
    return cache.get(name);
}

export function isFeatureLoaded(name) {
    return cache.has(name);
}
