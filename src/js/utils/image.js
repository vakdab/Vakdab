function getProxyUrl(url, forceUA = "desktop") {
  if (!url) return null;
  return `${PROXY_URL2}?url=${encodeURIComponent(url)}&force_ua=${forceUA}`;
}
function isEmbedUrl(url = "") {
  return url.includes("tortuga.tw/embed") || url.includes("/embed/") || /moonanime\.art\/iframe\//i.test(url) || url.includes("aniboom") || url.includes("cdn-iframe") || url.includes("cdnvideohub") || /^https?:\/\/(?:www\.)?mikai\.me\/anime\//i.test(url);
}
var init_image = __esm({
  "src/js/utils/image.js"() {
    init_constants2();
  }
});
