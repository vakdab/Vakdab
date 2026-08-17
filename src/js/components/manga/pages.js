export function escapeHtml(value = '') {
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
    const parts = raw.split(/@#%&;№%#&\*\*#!@/).filter(Boolean);
    if (parts.length >= 2) return `Том ${parts[0]} · Розділ ${parts[1]}${parts.slice(2).join(' ').trim() ? `: ${parts.slice(2).join(' ').trim()}` : ''}`;
    return raw || 'Розділ без назви';
}

export function pageLabel(index, total) {
    return `${index + 1} / ${total}`;
}

export function buildPageMarkup(pages, pageImageUrl) {
    return pages.map((page, index) => {
        const url = escapeHtml(pageImageUrl(page.content));
        const immediate = index < 3;
        const source = immediate ? `src="${url}" fetchpriority="${index === 0 ? 'high' : 'auto'}"` : `data-src="${url}"`;
        return `<figure class="manga-reader__page" data-page-index="${index}" data-image-state="${index === 0 ? 'loading' : 'idle'}"><img ${source} alt="Сторінка ${index + 1}" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async"><figcaption>${pageLabel(index, pages.length)}</figcaption></figure>`;
    }).join('');
}
