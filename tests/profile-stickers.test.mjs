import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const profileSource = readFileSync(new URL('../src/js/components/pages/profileLegacy.js', import.meta.url), 'utf8');
const stickersSource = readFileSync(new URL('../src/js/components/pages/stickersLegacy.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/js/legacy/app-legacy.js', import.meta.url), 'utf8');
const profileCss = readFileSync(new URL('../src/styles/pages/profile.css', import.meta.url), 'utf8');

test('profile renders the selected nickname sticker', () => {
  assert.match(profileSource, /Storage\.getStickers\(\)/);
  assert.match(profileSource, /profile-nick-badge/);
  assert.match(profileSource, /renderStickerFaceByKey\(stickerData, stickerData\.nickBadge\)/);
  assert.match(appSource, /nickBadge: null/);
  assert.doesNotMatch(appSource, /from ['\"]\.\.\/components\/pages\/stickersLegacy\.js/);
});

test('sticker actions can set and unset the nickname sticker', () => {
  assert.match(stickersSource, /data-act="nick-badge"/);
  assert.match(stickersSource, /cur\.nickBadge = cur\.nickBadge === sKey \? null : sKey/);
  assert.match(stickersSource, /export function renderStickerFaceByKey/);
  assert.match(profileSource, /from ['\"]\.\/stickersLegacy\.js/);
  assert.match(profileCss, /\.profile-nick-badge/);
});
