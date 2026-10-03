var bootstrapPromise = null;
function bootstrap() {
  if (bootstrapPromise) return bootstrapPromise;
  installGlobalErrorBoundary({
    onError(error) {
      console.error("[VakDab] application error:", error);
    }
  });
  startGlobalEvents();
  try {
    localStorage.removeItem("vakdab_tv_mode");
    document.documentElement.classList.remove("android-tv-mode");
    document.body.classList.remove("android-tv-mode");
  } catch (_) {
  }
  bootstrapPromise = Promise.resolve().then(() => (init_app_legacy(), app_legacy_exports)).then((module) => {
    window.VakDabLegacy = module;
    if (module.Auth) window.Auth = module.Auth;
    if (module.Storage) window.Storage = module.Storage;
    window.VakDabRouter = { parse: parseRoute, get: getRouter };
    window.dispatchEvent(new CustomEvent("vakdab:ready", { detail: { route: parseRoute() } }));
    return module;
  }).catch((error) => {
    console.error("[VakDab] bootstrap failed:", error);
    throw error;
  });
  return bootstrapPromise;
}
