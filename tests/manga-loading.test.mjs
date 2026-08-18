import assert from 'node:assert/strict';
import { buildPageMarkup, normalizeChapterName } from '../src/js/components/manga/pages.js';
import { parseChapterUrl, pageImageFallbackUrl, pageImageUrl } from '../src/js/services/api/manga.js';

const chapterUrl = 'https://honey-manga.com.ua/read/db4ed14e-f564-4103-be20-688948370f3d/8c336683-10ca-4912-9666-e18a1689da6e';
const resource = index => `resource-${index}-uuid`;

for (const count of [10, 24, 31, 50]) {
    const pages = Object.entries(Object.fromEntries(Array.from({ length: count }, (_, index) => [String(index), resource(index)])));
    const manifest = pages.map(([index, content]) => ({ index: Number(index), resourceId: content, content }));
    const markup = buildPageMarkup(manifest, pageImageUrl, pageImageFallbackUrl);
    assert.equal((markup.match(/class="manga-reader__page"/g) || []).length, count, `markup keeps all ${count} Honey pages`);
    assert.match(markup, /honeymangastorage-nocache\.b-cdn\.net\/public-resources/);
    assert.match(markup, /hmvolumestorage\.b-cdn\.net\/public-resources/);
}

assert.deepEqual(parseChapterUrl(chapterUrl), {
    source: 'honey-manga.com.ua',
    chapterId: 'db4ed14e-f564-4103-be20-688948370f3d',
    titleId: '8c336683-10ca-4912-9666-e18a1689da6e',
    url: chapterUrl,
});
assert.equal(normalizeChapterName(chapterUrl), 'Розділ Honey Manga');
assert.match(pageImageUrl('66f4404e-c3f9-42a5-bd5f-88cb8a6e6ccb'), /honeymangastorage-nocache\.b-cdn\.net/);
assert.match(pageImageFallbackUrl('66f4404e-c3f9-42a5-bd5f-88cb8a6e6ccb'), /hmvolumestorage\.b-cdn\.net/);
assert.throws(() => parseChapterUrl('https://example.com/old-reader.html'), /Honey Manga/);

console.log('manga-loading fixtures: ok');
