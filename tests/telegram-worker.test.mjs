import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getContentType,
  contentTypeLabel,
  validateContentUrl,
  extractContentId,
  isUnsafeRouletteText
} from '../vakdab-telegram-bot/worker.js';

test('content type descriptor supports anime, manga and novel with anime fallback', () => {
  assert.equal(getContentType('anime').key, 'anime');
  assert.equal(getContentType('manga').endpoint, 'manga');
  assert.equal(getContentType('novel').label, 'Ранобе');
  assert.equal(getContentType('unknown').key, 'anime');
  assert.equal(contentTypeLabel('manga'), 'Манґа');
});

test('content URL validation only accepts the matching Hikka endpoint', () => {
  assert.equal(validateContentUrl('https://api.hikka.io/anime/naruto-123', 'anime'), 'https://api.hikka.io/anime/naruto-123');
  assert.equal(validateContentUrl('https://api.hikka.io/manga/berserk-fb9fbd', 'manga'), 'https://api.hikka.io/manga/berserk-fb9fbd');
  assert.equal(validateContentUrl('https://api.hikka.io/novel/guimi-zhi-zhu-7059fd', 'novel'), 'https://api.hikka.io/novel/guimi-zhi-zhu-7059fd');
  assert.equal(validateContentUrl('https://api.hikka.io/anime/naruto-123', 'manga'), '');
  assert.equal(validateContentUrl('https://evil.example/anime/naruto-123', 'anime'), '');
  assert.equal(validateContentUrl('javascript:alert(1)', 'anime'), '');
});

test('content id extraction works for the selected type and newsid deeplink', () => {
  assert.equal(extractContentId('https://api.hikka.io/manga/berserk-fb9fbd', 'manga'), 'berserk-fb9fbd');
  assert.equal(extractContentId('https://api.hikka.io/novel/guimi-zhi-zhu-7059fd', 'novel'), 'guimi-zhi-zhu-7059fd');
  assert.equal(extractContentId('https://api.hikka.io/anime/ignored?newsid=one-piece-123', 'anime'), 'one-piece-123');
  assert.equal(extractContentId('https://api.hikka.io/manga/berserk-fb9fbd', 'novel'), '');
});

test('roulette safety filter blocks contact vectors but allows ordinary chat', () => {
  assert.equal(isUnsafeRouletteText('Привіт, як справи?'), false);
  assert.equal(isUnsafeRouletteText('Напиши мені в https://example.com'), true);
  assert.equal(isUnsafeRouletteText('Мій контакт @some_user'), true);
  assert.equal(isUnsafeRouletteText('Мій номер +380 67 123 45 67'), true);
  assert.equal(isUnsafeRouletteText('доксинг'), true);
});
