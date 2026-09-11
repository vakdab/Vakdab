import assert from 'node:assert/strict';
import fs from 'node:fs';

const storage = fs.readFileSync(new URL('../../src/js/core/compat/storage.js', import.meta.url), 'utf8');
const player = fs.readFileSync(new URL('../../src/js/pages/player/animePlayerPage.js', import.meta.url), 'utf8');
const auth = fs.readFileSync(new URL('../../src/js/core/compat/auth.js', import.meta.url), 'utf8');
const rating = fs.readFileSync(new URL('../../src/js/components/rating/ratingSystem.js', import.meta.url), 'utf8');

assert.match(storage, /getWatchEntry\(url, episode, season = '1'\)/);
assert.match(storage, /isEpisodeWatched\(url, episode, season = '1'\)/);
assert.match(storage, /upsertWatchEntry\(entry\)/);
assert.match(storage, /_debounceSync\('history'\)/);
assert.match(player, /Storage\.upsertWatchEntry\(\{/);
assert.match(player, /playerPagePlayer\?\._persistProgress\?\.\(true\)/);
assert.match(player, /Storage\._flushSync\('history,watchTime'\)/);
assert.match(auth, /_syncQueue: Promise\.resolve\(\)/);
assert.match(auth, /this\._syncQueue\.catch\(\(\) => \{\}\)\.then\(\(\) => this\._syncUserDataNow\(options\)\)/);
assert.match(auth, /historyUpdatedAt/);
assert.match(rating, /filter\(item => Number\(item\?\.progress\) >= 88\)/);
console.log('player watch-state fixtures: ok');
