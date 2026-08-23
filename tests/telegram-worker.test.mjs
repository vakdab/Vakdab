import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getContentType,
  contentTypeLabel,
  validateContentUrl,
  extractContentId,
  isUnsafeRouletteText,
  extractRelayMedia,
  isBotOwner,
  formatBotUsageReport,
  scheduleWebAppKeyboard,
  vakdabWatchUrl
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

test('roulette media extractor maps Telegram message variants to correct send methods', () => {
  assert.deepEqual(extractRelayMedia({ sticker: { file_id: 'sticker-file' } }), { method: 'sendSticker', field: 'sticker', fileId: 'sticker-file' });
  assert.deepEqual(extractRelayMedia({ animation: { file_id: 'gif-file' } }), { method: 'sendAnimation', field: 'animation', fileId: 'gif-file' });
  assert.deepEqual(extractRelayMedia({ photo: [{ file_id: 'small' }, { file_id: 'large' }] }), { method: 'sendPhoto', field: 'photo', fileId: 'large' });
  assert.deepEqual(extractRelayMedia({ video: { file_id: 'video-file' } }), { method: 'sendVideo', field: 'video', fileId: 'video-file' });
  assert.deepEqual(extractRelayMedia({ video_note: { file_id: 'round-video-file' } }), { method: 'sendVideoNote', field: 'video_note', fileId: 'round-video-file' });
  assert.deepEqual(extractRelayMedia({ audio: { file_id: 'audio-file' } }), { method: 'sendAudio', field: 'audio', fileId: 'audio-file' });
  assert.deepEqual(extractRelayMedia({ voice: { file_id: 'voice-file' } }), { method: 'sendVoice', field: 'voice', fileId: 'voice-file' });
  assert.deepEqual(extractRelayMedia({ document: { file_id: 'document-file' } }), { method: 'sendDocument', field: 'document', fileId: 'document-file' });
  assert.equal(extractRelayMedia({ location: { latitude: 1, longitude: 2 } }), null);
});

test('roulette safety filter blocks contact vectors but allows ordinary chat', () => {
  assert.equal(isUnsafeRouletteText('Привіт, як справи?'), false);
  assert.equal(isUnsafeRouletteText('Напиши мені в https://example.com'), true);
  assert.equal(isUnsafeRouletteText('Мій контакт @some_user'), true);
  assert.equal(isUnsafeRouletteText('Мій номер +380 67 123 45 67'), true);
  assert.equal(isUnsafeRouletteText('доксинг'), true);
});

test('private statistics access accepts only the configured owner username', () => {
  assert.equal(isBotOwner({ username: 'vaditx' }), true);
  assert.equal(isBotOwner({ username: 'VADITX' }), true);
  assert.equal(isBotOwner({ username: 'another_user' }), false);
  assert.equal(isBotOwner({}), false);
});

test('private statistics report presents the usage summary without user IDs', () => {
  const report = formatBotUsageReport({
    ok: true,
    total: 1,
    users: [{ username: 'example_user', first_name: 'Ім’я', last_name: 'Прізвище', last_seen_at: 1766311200000, user_id: '123456789' }]
  });
  assert.match(report, /Унікальних користувачів: <b>1<\/b>/);
  assert.match(report, /@example_user/);
  assert.doesNotMatch(report, /123456789/);
});

test('schedule fallback keyboard opens the dedicated Mini App page', () => {
  const button = scheduleWebAppKeyboard().inline_keyboard[0][0];
  assert.equal(button.text, 'Відкрити розклад');
  assert.equal(button.web_app.url, 'https://vakdab.github.io/Vakdab/schedule.html?v=mono-20260823-1540');
});

test('VakDab links support anime, manga and novels', () => {
  assert.equal(vakdabWatchUrl('test-anime', 'anime'), 'https://vakdab.github.io/Vakdab/#anime/test-anime');
  assert.equal(vakdabWatchUrl('berserk-fb9fbd', 'manga'), 'https://vakdab.github.io/Vakdab/content.html?type=manga&slug=berserk-fb9fbd');
  assert.equal(vakdabWatchUrl('test-novel', 'novel'), 'https://vakdab.github.io/Vakdab/content.html?type=novel&slug=test-novel');
  assert.equal(vakdabWatchUrl('bad slug', 'manga'), '');
});

test('manga and novel details use VakDab reader routes and a concise bot button', () => {
  const workerSource = readFileSync(new URL('../vakdab-telegram-bot/worker.js', import.meta.url), 'utf8');
  const contentPage = readFileSync(new URL('../content.html', import.meta.url), 'utf8');

  assert.match(workerSource, /\{ text: 'VakDab', url: watchUrl \}/);
  assert.match(contentPage, /resolveHoneyReaderUrl/);
  assert.match(contentPage, /resolveRanobeReader/);
  assert.match(contentPage, /https:\/\/vakdab\.github\.io\/Vakdab\/#\$\{type\}\?url=/);
  assert.match(contentPage, /type === 'novel' \? `&poster=\$\{encodeURIComponent\(item\.image \|\| ''\)\}` : ''/);
  assert.doesNotMatch(contentPage, /<a class="back"/);
  assert.doesNotMatch(contentPage, /href="\$\{escape\(externalReadUrl\)\}"/);
});
