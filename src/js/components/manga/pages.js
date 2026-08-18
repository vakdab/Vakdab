export function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function normalizeChapterName(value = '') {
    if (value && typeof value === 'object') {
        const volume = value.volume ?? '';
        const chapter = value.chapterNum ?? '';
        const sub = value.subChapterNum ? `.${value.subChapterNum}` : '';
        const title = String(value.title || '').trim();
        return `Том ${volume} · Розділ ${chapter}${sub}${title ? `: ${title}` : ''}`;
    }
    const raw = String(value || '').trim().replace(/&amp;/g, '&');
    if (/^https?:\/\//i.test(raw)) {
        try {
            const url = new URL(raw);
            const honeyMatch = url.pathname.match(/\/read\/([^/]+)\/([^/]+)/i);
            if (honeyMatch) return 'Розділ Honey Manga';
        } catch { /* URL fallback is intentionally hidden from the reader UI. */ }
        return 'Розділ без назви';
    }
    const parts = raw.split(/@#%&;№%#&\*\*#!@/).filter(Boolean);
    if (parts.length >= 2) return `Том ${parts[0]} · Розділ ${parts[1]}${parts.slice(2).join(' ').trim() ? `: ${parts.slice(2).join(' ').trim()}` : ''}`;
    return raw || 'Розділ без назви';
}

export function pageLabel(index, total) {
    return `${index + 1} / ${total}`;
}

export function buildPageMarkup(pages, pageImageUrl, fallbackImageUrl = () => '') {
    return pages.map((page, index) => {
        const content = page?.content || page?.url || page;
        const url = escapeHtml(pageImageUrl(content));
        const fallback = escapeHtml(fallbackImageUrl(content));
        const immediate = index < 3;
        const source = immediate
            ? `src="${url}" fetchpriority="${index === 0 ? 'high' : 'auto'}"`
            : `data-src="${url}"`;
        const fallbackAttr = fallback ? ` data-fallback-src="${fallback}"` : '';
        return `<figure class="manga-reader__page" data-page-index="${index}" data-image-state="idle"><img ${source} data-page-src="${url}"${fallbackAttr} alt="Сторінка ${index + 1}" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async"><button type="button" class="manga-reader__page-retry" hidden>Повторити</button><figcaption>${pageLabel(index, pages.length)}</figcaption></figure>`;
    }).join('');
}
