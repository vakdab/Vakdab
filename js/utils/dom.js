export function safeQuery(sel, parent) {
  try { return (parent || document).querySelector(sel); } catch { return null; }
}
export function safeQueryAll(sel, parent) {
  try { return Array.from((parent || document).querySelectorAll(sel)); } catch { return []; }
}
