const loaders = Object.freeze({
    manga: () => import('../components/manga/reader.js?v=20260824-settings-redesign-v1'),
    novel: () => import('../components/novel/reader.js?v=20260824-settings-redesign-v1'),
    player: () => import('../pages/player/animePage.js?v=20260824-settings-redesign-v1'),
    community: () => import('../components/community/group.js?v=20260824-settings-redesign-v1'),
    chat: () => import('../components/community/chat.js?v=20260824-settings-redesign-v1'),
    profile: () => import('../pages/profile/profile.js?v=20260824-settings-redesign-v1'),
    stickers: () => import('../pages/profile/stickersPage.js?v=20260824-settings-redesign-v1')
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
