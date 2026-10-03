function isVakdabDebugEnabled() {
  try {
    const query2 = new URLSearchParams(window.location.search);
    return query2.get("debug") === "1" || window.localStorage?.getItem("vakdab_debug") === "1";
  } catch {
    return false;
  }
}
function debugLog(scope, event, details = {}) {
  if (!isVakdabDebugEnabled()) return;
  console.debug(`[VakDab:${scope}] ${event}`, details);
}
var init_debug = __esm({
  "src/js/utils/debug.js"() {
  }
});
