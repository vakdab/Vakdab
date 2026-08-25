import assert from 'node:assert/strict';
import test from 'node:test';
import { handleWatchPartyRequest } from '../backend/telegram/watch-party.js';

class MockKV {
  constructor() { this.data = new Map(); }
  async get(key) { return this.data.get(key) ?? null; }
  async put(key, value) { this.data.set(key, value); }
}

async function initData(botToken, user) {
  const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify(user), query_id: 'watch-party-test' });
  const secret = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new TextEncoder().encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(botToken));
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([keyName, value]) => `${keyName}=${value}`).join('\n');
  const hash = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(check)))].map(value => value.toString(16).padStart(2, '0')).join('');
  params.set('hash', hash);
  return params.toString();
}
function request(init, action, payload) { return new Request('https://vakdab.animegran8.workers.dev/watch-party-api', { method: action ? 'POST' : 'GET', headers: { Origin: 'https://vakdab.animegran8.workers.dev', 'content-type': 'application/json', 'X-Telegram-Init-Data': init }, body: action ? JSON.stringify({ action, ...payload }) : undefined }); }
function mockCatalog() { return async () => new Response(JSON.stringify({ list: [{ id: 'a1', slug: 'demo-anime', title_ua: 'Demo Anime', image: 'https://img.example/demo.jpg', episodes_total: 12 }, { id: 'a2', slug: 'second-anime', title_ua: 'Second Anime', episodes_total: 8 }, { id: 'a3', slug: 'third-anime', title_ua: 'Third Anime', episodes_total: 10 }] }), { status: 200, headers: { 'content-type': 'application/json' } }); }

 test('daily random anime is created automatically and persists', async () => {
  const previousFetch = global.fetch;
  global.fetch = mockCatalog();
  try {
    const token = '123456:test-token';
    const adminInit = await initData(token, { id: 1, first_name: 'Admin', username: 'vaditx' });
    const env = { TELEGRAM_BOT_TOKEN: token, MAKIMA_MEMORY: new MockKV() };
    const response = await handleWatchPartyRequest(request(adminInit, '', {}), env);
    assert.equal(response.status, 200);
    const snapshot = await response.json();
    assert.match(snapshot.state.day, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(snapshot.state.anime.title);
    assert.match(snapshot.state.anime.catalogUrl, /api\.hikka\.io\/anime/);
    assert.match(snapshot.state.anime.siteUrl, /vakdab\.github\.io\/VakDab/);
    const second = await handleWatchPartyRequest(request(adminInit, '', {}), env);
    assert.equal((await second.json()).state.day, snapshot.state.day);
  } finally { global.fetch = previousFetch; }
});

test('users choose time, episode count and dub; next anime is locked until finish', async () => {
  const previousFetch = global.fetch;
  global.fetch = mockCatalog();
  try {
    const token = '123456:test-token';
    const adminInit = await initData(token, { id: 1, first_name: 'Admin', username: 'vaditx' });
    const viewerInit = await initData(token, { id: 2, first_name: 'Viewer', username: 'viewer' });
    const env = { TELEGRAM_BOT_TOKEN: token, MAKIMA_MEMORY: new MockKV() };
    await handleWatchPartyRequest(request(viewerInit, '', {}), env);
    let response = await handleWatchPartyRequest(request(viewerInit, 'catalog_meta', { dubs: ['AniLibria', 'UkrDub'], episodesTotal: 2 }), env);
    assert.equal(response.status, 200);
    response = await handleWatchPartyRequest(request(viewerInit, 'choose', { time: '20:00', episodes: 1, dub: 'UkrDub' }), env);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).state.myChoices.dub, 'UkrDub');
    response = await handleWatchPartyRequest(request(adminInit, 'choose', { time: '20:00', episodes: 1, dub: 'UkrDub' }), env);
    assert.equal(response.status, 200);
    response = await handleWatchPartyRequest(request(adminInit, 'start', {}), env);
    assert.equal(response.status, 200);
    const live = (await response.json()).state;
    assert.equal(live.status, 'live');
    assert.deepEqual(live.selection, { time: '20:00', episodes: 1, dub: 'UkrDub' });
    response = await handleWatchPartyRequest(request(viewerInit, 'choose', { time: '22:00', episodes: 1, dub: 'AniLibria' }), env);
    assert.equal(response.status, 409);
    response = await handleWatchPartyRequest(request(adminInit, 'next_episode', {}), env);
    assert.equal(response.status, 409);
    response = await handleWatchPartyRequest(request(adminInit, 'next_episode', { completed: true }), env);
    const pausedForVote = (await response.json()).state;
    assert.equal(pausedForVote.episode, 2);
    assert.equal(pausedForVote.status, 'voting');
    response = await handleWatchPartyRequest(request(adminInit, 'choose', { time: '20:00', episodes: 1, dub: 'UkrDub' }), env);
    assert.equal(response.status, 200);
    response = await handleWatchPartyRequest(request(adminInit, 'start', {}), env);
    assert.equal((await response.json()).state.status, 'live');
    response = await handleWatchPartyRequest(request(adminInit, 'next_episode', { completed: true }), env);
    assert.equal((await response.json()).state.status, 'finished');
    const finished = await handleWatchPartyRequest(request(viewerInit, '', {}), env);
    assert.equal((await finished.json()).state.status, 'finished');
  } finally { global.fetch = previousFetch; }
});

test('non-admin users cannot start, reset or manage the room', async () => {
  const token = '123456:test-token';
  const viewerInit = await initData(token, { id: 2, first_name: 'Viewer', username: 'viewer' });
  const env = { TELEGRAM_BOT_TOKEN: token, MAKIMA_MEMORY: new MockKV() };
  assert.equal((await handleWatchPartyRequest(request(viewerInit, 'start', {}), env)).status, 403);
  assert.equal((await handleWatchPartyRequest(request(viewerInit, 'reset', {}), env)).status, 403);
});
