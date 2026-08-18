const loaders = Object.freeze({
    manga: () => import('../components/manga/reader.js?v=20260818-image-fallback-v3'),
    novel: () => import('../components/novel/reader.js?v=20260818-ranobe-v7'),
    player: () => import('../components/player/animePage.js?v=20260817-player-lazy-v1'),
    community: () => import('../components/community/group.js?v=20260817-community-lazy-v1'),
    chat: () => import('../components/community/chat.js?v=20260817-chat-lazy-v1'),
    profile: () => import('../components/pages/profile.js?v=20260817-profile-lazy-v1'),
    stickers: () => import('../components/pages/stickersPage.js?v=20260817-stickers-lazy-v1')
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
