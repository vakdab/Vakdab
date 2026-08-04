/** Safe parser boundary for external HTML services. */
export function parseHtml(html = '') { return new DOMParser().parseFromString(html, 'text/html'); }
