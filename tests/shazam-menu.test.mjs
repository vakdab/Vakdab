import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync(new URL('../backend/telegram/worker.js', import.meta.url), 'utf8');
const musicHtml = fs.readFileSync(new URL('../app/music.html', import.meta.url), 'utf8');
const musicJs = fs.readFileSync(new URL('../src/js/music-app.js', import.meta.url), 'utf8');
const musicCss = fs.readFileSync(new URL('../src/styles/music.css', import.meta.url), 'utf8');
const musicStore = fs.readFileSync(new URL('../backend/telegram/music-store.js', import.meta.url), 'utf8');

test('main bot menu opens the Shazam Mini App', () => {
  assert.match(worker, /MUSIC_WEB_APP_URL = 'https:\/\/vakdab\.animegran8\.workers\.dev\/app\/music\?v=20260825-shazam-v23'/);
  assert.match(worker, /\{ text: 'Shazam', web_app: \{ url: MUSIC_WEB_APP_URL \} \}/);
});

test('Shazam Mini App provides Telegram login, upload, playlists, player and equalizer', () => {
  assert.match(musicHtml, /telegram-web-app\.js/);
  assert.match(musicHtml, /id="trackFile"/);
  assert.match(musicHtml, /id="playlistForm"/);
  assert.match(musicHtml, /id="equalizerPanel"/);
  assert.match(musicJs, /signInWithCustomToken/);
  assert.match(musicJs, /onAuthStateChanged/);
  assert.match(musicJs, /MUSIC_API_BASE/);
  assert.match(musicJs, /musicApi\('\/upload'|musicApi\("\/upload"/);
  assert.match(musicJs, /X-Music-Path/);
  assert.match(musicJs, /fetch\(MUSIC_API_BASE/);
  assert.doesNotMatch(musicJs, /fetch\(`\$\{MUSIC_API_BASE\}\$\{path\}/);
  assert.match(musicJs, /API_TIMEOUT_MS = 7000/);
  assert.match(musicJs, /Promise\.allSettled/);
  assert.match(musicJs, /vakdab\.animegran8\.workers\.dev/);
  assert.match(musicStore, /X-Music-Path/);
  assert.match(musicJs, /musicApi\('\/library', \{ method: 'POST' \}\)/);
  assert.match(musicJs, /10 \* 1024 \* 1024/);
  assert.match(musicJs, /максимум 10 MB/);
  assert.doesNotMatch(musicJs, /максимум 50 MB/);
  assert.match(worker, /handleMusicApiRequest/);
  assert.match(worker, /handleTelegramAudioUpload/);
  assert.match(musicStore, /MAKIMA_MEMORY/);
  assert.match(musicStore, /MAX_AUDIO_BYTES = 10 \* 1024 \* 1024/);
  assert.match(musicStore, /handleMusicApiRequest/);
  assert.match(musicJs, /createBiquadFilter/);
  assert.match(musicJs, /MUSIC_API_BASE/);
  assert.match(musicJs, /rightsConfirmed/);
  assert.match(musicCss, /--paper:#fff/);
});
