import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync(new URL('../backend/telegram/worker.js', import.meta.url), 'utf8');
const musicHtml = fs.readFileSync(new URL('../app/music.html', import.meta.url), 'utf8');
const musicJs = fs.readFileSync(new URL('../src/js/music-app.js', import.meta.url), 'utf8');
const musicCss = fs.readFileSync(new URL('../src/styles/music.css', import.meta.url), 'utf8');

test('main bot menu opens the Shazam Mini App', () => {
  assert.match(worker, /MUSIC_WEB_APP_URL = .*\/music\.html\?v=20260825-shazam-v2/);
  assert.match(worker, /\{ text: 'Shazam', web_app: \{ url: MUSIC_WEB_APP_URL \} \}/);
});

test('Shazam Mini App provides Telegram login, upload, playlists, player and equalizer', () => {
  assert.match(musicHtml, /telegram-web-app\.js/);
  assert.match(musicHtml, /id="trackFile"/);
  assert.match(musicHtml, /id="playlistForm"/);
  assert.match(musicHtml, /id="equalizerPanel"/);
  assert.match(musicJs, /signInWithCustomToken/);
  assert.match(musicJs, /uploadBytesResumable/);
  assert.match(musicJs, /90000/);
  assert.match(musicJs, /Завантаження зависло/);
  assert.match(musicJs, /createBiquadFilter/);
  assert.match(musicJs, /musicTracks/);
  assert.match(musicJs, /rightsConfirmed/);
  assert.match(musicCss, /--paper:#fff/);
});
