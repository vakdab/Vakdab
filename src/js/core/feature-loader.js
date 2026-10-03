function loadFeature(name) {
  if (!loaders[name]) return Promise.reject(new Error(`Unknown feature: ${name}`));
  if (!cache.has(name)) cache.set(name, loaders[name]());
  return cache.get(name);
}
var loaders, cache;
var init_feature_loader = __esm({
  "src/js/core/feature-loader.js?v=20260905-deadcode-v1"() {
    loaders = Object.freeze({
      manga: () => Promise.resolve().then(() => (init_reader(), reader_exports)),
      player: () => Promise.resolve().then(() => (init_animePage(), animePage_exports)),
      profile: () => Promise.resolve().then(() => (init_profile(), profile_exports)),
      stickers: () => Promise.resolve().then(() => (init_stickersPage(), stickersPage_exports))
    });
    cache = /* @__PURE__ */ new Map();
  }
});
