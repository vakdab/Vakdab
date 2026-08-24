import assert from 'node:assert/strict';
import { buildPageMarkup, normalizeChapterName } from '../../src/js/components/manga/pages.js';
import { extractHoneyResourceIds, hasHoneyPageResources, isHoneyComicItem, parseChapterUrl, pageImageFallbackUrl, pageImageUrl, selectHoneyReaderChapter, sortHoneyChaptersForReading } from '../../src/js/services/api/manga.js';

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

const chapter78 = { id: 'chapter-78', volume: 1, chapterNum: 78, isMonetized: false };
const chapter1 = { id: 'chapter-1', volume: 1, chapterNum: 1, isMonetized: false };
const chapter16 = { id: 'chapter-16', volume: 1, chapterNum: 16, isMonetized: false };
assert.deepEqual(sortHoneyChaptersForReading([chapter78, chapter1, chapter16]).map(item => item.id), ['chapter-1', 'chapter-16', 'chapter-78']);
assert.equal(selectHoneyReaderChapter([chapter78, chapter1]), chapter1, 'reader starts from the first chapter in reading order');
const paidLatest = { id: 'paid-latest', volume: 1, chapterNum: 80, isMonetized: true };
const publicOlder = { id: 'public-older', volume: 1, chapterNum: 1, isMonetized: false };
assert.equal(selectHoneyReaderChapter([paidLatest, publicOlder]), publicOlder, 'reader prefers a public chapter over a paid latest chapter');
assert.equal(selectHoneyReaderChapter([paidLatest]), paidLatest, 'reader keeps paid fallback when no public chapter exists');
assert.equal(selectHoneyReaderChapter([]), null, 'empty chapter lists do not create a reader URL');
assert.equal(isHoneyComicItem({ type: 'Новела' }), false, 'Honey novels are not manga reader items');
assert.equal(isHoneyComicItem({ type: 'Ранобе' }), false, 'Honey ranobe are not manga reader items');
assert.equal(isHoneyComicItem({ type: 'Манхва' }), true, 'manhwa remains a manga reader item');
assert.equal(isHoneyComicItem({ type: 'Мальопис' }), true, 'comics remain manga reader items');
assert.equal(isHoneyComicItem({}), true, 'missing type stays backward-compatible');
assert.deepEqual(extractHoneyResourceIds({ resourceIds: { 0: 'page-a', 1: 'page-b' } }), { 0: 'page-a', 1: 'page-b' });
assert.deepEqual(extractHoneyResourceIds({ data: { resourceIds: { 0: 'page-a' } } }), { 0: 'page-a' });
assert.deepEqual(extractHoneyResourceIds({ pages: [{ resourceId: 'page-a' }, { id: 'page-b' }] }), { 0: 'page-a', 1: 'page-b' });
assert.equal(hasHoneyPageResources({ resourceIds: {} }), false);
assert.equal(hasHoneyPageResources({ pages: [{ resourceId: 'page-a' }] }), true);
assert.throws(() => parseChapterUrl('https://example.com/old-reader.html'), /Honey Manga/);

console.log('manga-loading fixtures: ok');
