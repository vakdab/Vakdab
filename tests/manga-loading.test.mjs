import assert from 'node:assert/strict';
import { extractMangaImageCandidates } from '../monoanime_worker.js';
import { buildPageMarkup } from '../src/js/components/manga/pages.js';

const base = 'https://manga.in.ua/uploads/posts/2026-01/';
const image = index => `${base}${index}-page`; // intentionally no extension

function makeFixture(count) {
    const chunks = [];
    for (let index = 1; index <= count; index += 1) {
        const url = image(index);
        if (index % 5 === 0) chunks.push(`<picture><source srcset="${url}-source 480w, ${url}-source-hi 960w"><img src="placeholder-${index}"></picture>`);
        else if (index % 7 === 0) chunks.push(`<noscript><img data-original="${url}-noscript"></noscript>`);
        else if (index % 3 === 0) chunks.push(`<img src="placeholder-${index}" data-src="${url}-data">`);
        else chunks.push(`<img srcset="${url}-small 480w, ${url}-large 960w">`);
    }
    chunks.push('<img data-src="https://manga.in.ua/uploads/posts/2026-01/duplicate-page">');
    chunks.push('<img data-src="https://manga.in.ua/uploads/posts/2026-01/duplicate-page">');
    return chunks.join('\n');
}

for (const count of [10, 24, 31, 50]) {
    const urls = extractMangaImageCandidates(makeFixture(count), 'https://manga.in.ua/chapters/test.html');
    assert.equal(urls.length, count + 2, `parser keeps all ${count} pages plus duplicate page elements`);
    assert.equal(urls[0].startsWith('https://manga.in.ua/'), true);
    assert.equal(urls.at(-1), 'https://manga.in.ua/uploads/posts/2026-01/duplicate-page');
    const markup = buildPageMarkup(urls.map(content => ({ content })), value => value, value => value);
    assert.equal((markup.match(/class="manga-reader__page"/g) || []).length, count + 2, `markup keeps all ${count} pages`);
}

const fallbackFixture = '<img data-src="/uploads/posts/2026-01/page-without-extension" data-original="/uploads/posts/2026-01/fallback">';
assert.deepEqual(extractMangaImageCandidates(fallbackFixture, 'https://manga.in.ua/chapters/test.html'), [
    'https://manga.in.ua/uploads/posts/2026-01/page-without-extension'
]);

console.log('manga-loading fixtures: ok');
