import assert from 'node:assert/strict';
import {
    normalizeNovelTitle,
    scoreNovelTitleMatch,
    proxiedRanobeUrl,
    parseRanobeChapterList,
    parseRanobeChapterHtml,
    RANOBELIB_TOTAL_COUNT
} from '../src/js/services/api/novel.js';

assert.equal(normalizeNovelTitle('Инструкция по эксплуатации Регрессора (Новелла)'), 'instruktsiya po ekspluatatsii regressora');
assert.equal(scoreNovelTitleMatch('Інструкція по експлуатації Регресора', 'Инструкция по эксплуатации Регрессора (Новелла)') > 0.35, true);
assert.equal(scoreNovelTitleMatch('Completely Different Title', 'Инструкция по эксплуатации Регрессора') < 0.35, true);
assert.match(proxiedRanobeUrl('https://ranobelib.me/ru/book/1--demo'), /^https:\/\/corsproxy\.io\/\?url=https%3A%2F%2Franobelib\.me/);

const chapterHtml = `<!doctype html><body>
    <a href="/ru/novel/read/v1/c0?bid=7">Том 1 Глава 0</a>
    <a href="/ru/demo/read/v1/c1?bid=7">Том 1 Глава 1</a>
    <a href="/ru/demo/read/v1/c1?bid=7">duplicate</a>
    <a href="/ru/book/7--demo">Книга</a>
</body>`;

if (typeof DOMParser === 'undefined') {
    globalThis.DOMParser = class {
        parseFromString() {
            return { querySelectorAll: () => [
                { href: 'https://ranobelib.me/ru/demo/read/v1/c0?bid=7', textContent: 'Том 1 Глава 0' },
                { href: 'https://ranobelib.me/ru/demo/read/v1/c1?bid=7', textContent: 'Том 1 Глава 1' },
                { href: 'https://ranobelib.me/ru/demo/read/v1/c1?bid=7', textContent: 'duplicate' }
            ] };
        }
    };
}
const chapters = parseRanobeChapterList(chapterHtml, 'https://ranobelib.me/ru/demo/read/v1/c1?bid=7');
assert.equal(chapters.length, 2);
assert.equal(chapters[1].url, 'https://ranobelib.me/ru/demo/read/v1/c1?bid=7');
const markdownChapter = `Title: Demo\nURL Source: https://ranobelib.me/ru/demo/read/v1/c1\nMarkdown Content:\n# Глава 1\n![Image 1](https://ranobelib.me/uploads/ranobe/demo/chapters/123/image_1.png)\nТекст розділу.\n!\\[Image 2\\](https://ranobelib.me/uploads/ranobe/demo/chapters/123/image_2.png)!\\[Image 3\\] (https://ranobelib.me/uploads/ranobe/demo/chapters/123/image_3.png)`;
const parsedMarkdown = parseRanobeChapterHtml(markdownChapter, 'https://ranobelib.me/ru/demo/read/v1/c1');
assert.deepEqual(parsedMarkdown.imageUrls, [
    'https://ranobelib.me/uploads/ranobe/demo/chapters/123/image_1.png',
    'https://ranobelib.me/uploads/ranobe/demo/chapters/123/image_2.png',
    'https://ranobelib.me/uploads/ranobe/demo/chapters/123/image_3.png'
]);
assert.deepEqual(parsedMarkdown.paragraphs, ['Текст розділу.']);

const noisyMarkdown = `Title: Demo
URL Source: https://ranobelib.me/ru/demo/read/v1/c1
Markdown Content:
# Том 1 Глава 1
Основний текст розділу.

Назад[Вперед]
(https://ranobelib.me/ua/demo/read/v1/c1?bid=25644)
Нові
Налаштування
Правила
Написати коментар...
[fox1e [Культ Лиса]](https://ranobelib.me/ua/user/5596981)
✨ Ласкаво просимо до нашої затишної нори!`;
const parsedNoisy = parseRanobeChapterHtml(noisyMarkdown, 'https://ranobelib.me/ru/demo/read/v1/c1');
assert.deepEqual(parsedNoisy.paragraphs, ['Основний текст розділу.']);
assert.equal(RANOBELIB_TOTAL_COUNT, 23598);
console.log('novel-source.test.mjs: ok');
