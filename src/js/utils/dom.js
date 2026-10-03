function safeQueryAll(selector, parent = document) {
  try {
    return Array.from(parent.querySelectorAll(selector));
  } catch {
    return [];
  }
}
var init_dom = __esm({
  "src/js/utils/dom.js"() {
  }
});
