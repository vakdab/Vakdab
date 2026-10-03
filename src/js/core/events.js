var cleanup = null;
function startGlobalEvents() {
  if (cleanup) return cleanup;
  const onVisibility = () => document.documentElement.toggleAttribute("data-vakdab-hidden", document.hidden);
  const onHashChange = () => window.dispatchEvent(new CustomEvent("vakdab:route-change", { detail: window.location.hash }));
  document.addEventListener("visibilitychange", onVisibility, { passive: true });
  window.addEventListener("hashchange", onHashChange, { passive: true });
  cleanup = () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("hashchange", onHashChange);
    cleanup = null;
  };
  return cleanup;
}
