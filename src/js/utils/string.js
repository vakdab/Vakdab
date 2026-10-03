function escapeHtml4(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function hashCode(value = "") {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash << 5) - hash + value.charCodeAt(i) | 0;
  return Math.abs(hash);
}
var init_string = __esm({
  "src/js/utils/string.js"() {
    String.prototype.hashCode = function() {
      return hashCode(this);
    };
  }
});
