/** DOM helpers shared across feature modules. */
export function safeQuery(selector, parent = document) {
    try { return parent.querySelector(selector); } catch { return null; }
}
export function safeQueryAll(selector, parent = document) {
    try { return Array.from(parent.querySelectorAll(selector)); } catch { return []; }
}
export function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}
