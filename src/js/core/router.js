function parseRoute(hash = window.location.hash) {
  const raw = String(hash || "").replace(/^#/, "");
  const [name = "main", queryString = ""] = raw.split("?");
  return { name: name || "main", params: Object.fromEntries(new URLSearchParams(queryString)) };
}
function getRouter() {
  return window.Router || null;
}
