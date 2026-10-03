var loaders3;
var init_feature_loader3 = __esm({
  "src/js/core/feature-loader.js"() {
    loaders3 = Object.freeze({
      manga: () => Promise.resolve().then(() => (init_reader(), reader_exports)),
      player: () => Promise.resolve().then(() => (init_animePage(), animePage_exports)),
      profile: () => Promise.resolve().then(() => (init_profile(), profile_exports)),
      stickers: () => Promise.resolve().then(() => (init_stickersPage(), stickersPage_exports))
    });
  }
});
