function loadFeature2(name) {
  if (!loaders2[name]) return Promise.reject(new Error(`Unknown feature: ${name}`));
  if (!cache2.has(name)) cache2.set(name, loaders2[name]());
  return cache2.get(name);
}
var loaders2, cache2;
var init_feature_loader2 = __esm({
  "src/js/core/feature-loader.js?v=20260905-runtime-fix-v2"() {
    loaders2 = Object.freeze({
      manga: () => Promise.resolve().then(() => (init_reader(), reader_exports)),
      player: () => Promise.resolve().then(() => (init_animePage(), animePage_exports)),
      profile: () => Promise.resolve().then(() => (init_profile(), profile_exports)),
      stickers: () => Promise.resolve().then(() => (init_stickersPage(), stickersPage_exports))
    });
    cache2 = /* @__PURE__ */ new Map();
  }
});
