function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function normalizeChapterName(value = "") {
  if (value && typeof value === "object") {
    const volume = value.volume ?? "";
    const chapter = value.chapterNum ?? "";
    const sub = value.subChapterNum ? `.${value.subChapterNum}` : "";
    const title = String(value.title || "").trim();
    return `\u0422\u043E\u043C ${volume} \xB7 \u0420\u043E\u0437\u0434\u0456\u043B ${chapter}${sub}${title ? `: ${title}` : ""}`;
  }
  const raw = String(value || "").trim().replace(/&amp;/g, "&");
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const honeyMatch = url.pathname.match(/\/read\/([^/]+)\/([^/]+)/i);
      if (honeyMatch) return "\u0420\u043E\u0437\u0434\u0456\u043B Honey Manga";
    } catch {
    }
    return "\u0420\u043E\u0437\u0434\u0456\u043B \u0431\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
  }
  const parts = raw.split(/@#%&;№%#&\*\*#!@/).filter(Boolean);
  if (parts.length >= 2) return `\u0422\u043E\u043C ${parts[0]} \xB7 \u0420\u043E\u0437\u0434\u0456\u043B ${parts[1]}${parts.slice(2).join(" ").trim() ? `: ${parts.slice(2).join(" ").trim()}` : ""}`;
  return raw || "\u0420\u043E\u0437\u0434\u0456\u043B \u0431\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
}
function pageLabel(index, total) {
  return `${index + 1} / ${total}`;
}
function buildPageMarkup(pages, pageImageUrl2, fallbackImageUrl = () => "") {
  return pages.map((page, index) => {
    const content = page?.content || page?.url || page;
    const url = escapeHtml(pageImageUrl2(content));
    const fallback = escapeHtml(fallbackImageUrl(content));
    const immediate = index < 3;
    const source = immediate ? `src="${url}" fetchpriority="${index === 0 ? "high" : "auto"}"` : `data-src="${url}"`;
    const fallbackAttr = fallback ? ` data-fallback-src="${fallback}"` : "";
    return `<figure class="manga-reader__page" data-page-index="${index}" data-image-state="idle"><img ${source} data-page-src="${url}"${fallbackAttr} alt="\u0421\u0442\u043E\u0440\u0456\u043D\u043A\u0430 ${index + 1}" loading="${index < 2 ? "eager" : "lazy"}" decoding="async"><button type="button" class="manga-reader__page-retry" hidden>\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0438</button><figcaption>${pageLabel(index, pages.length)}</figcaption></figure>`;
  }).join("");
}
var init_pages = __esm({
  "src/js/components/manga/pages.js?v=20260824-settings-redesign-v1"() {
  }
});
