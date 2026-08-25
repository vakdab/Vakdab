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

function request(init, action, payload) {
  return new Request('https://vakdab.animegran8.workers.dev/watch-party-api', { method: action ? 'POST' : 'GET', headers: { Origin: 'https://vakdab.animegran8.workers.dev', 'content-type': 'application/json', 'X-Telegram-Init-Data': init }, body: action ? JSON.stringify({ action, ...payload }) : undefined });
}

test('Watch Party poll, live state and chat persist in KV', async () => {
  const token = '123456:test-token';
  const admin = { id: 1, first_name: 'Admin', username: 'vaditx' };
  const viewer = { id: 2, first_name: 'Viewer', username: 'viewer' };
  const adminInit = await initData(token, admin);
  const viewerInit = await initData(token, viewer);
  const env = { TELEGRAM_BOT_TOKEN: token, MAKIMA_MEMORY: new MockKV() };

  let response = await handleWatchPartyRequest(request(adminInit, 'add_option', { title: 'Demo Anime', episodes: 12, startsAt: '2026-08-25T20:00:00.000Z', siteUrl: 'https://vakdab.github.io/VakDab/', videoUrl: 'https://cdn.example/demo.m3u8' }), env);
  assert.equal(response.status, 200);
  const optionId = (await response.json()).state.options[0].id;
  response = await handleWatchPartyRequest(request(viewerInit, 'vote', { optionId }), env);
  assert.equal(response.status, 200);
  response = await handleWatchPartyRequest(request(adminInit, 'start', {}), env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).state.status, 'live');
  response = await handleWatchPartyRequest(request(adminInit, 'control', { playing: true, position: 42, episode: 2 }), env);
  assert.equal(response.status, 200);
  response = await handleWatchPartyRequest(request(viewerInit, 'chat', { text: 'Дивимось разом!' }), env);
  assert.equal(response.status, 200);
  response = await handleWatchPartyRequest(request(viewerInit, '', {}), env);
  const snapshot = await response.json();
  assert.equal(snapshot.state.position, 42);
  assert.equal(snapshot.state.episode, 2);
  assert.equal(snapshot.state.myVote, optionId);
  assert.equal(snapshot.state.messages[0].text, 'Дивимось разом!');
  assert.equal(snapshot.user.isAdmin, false);
});

test('Watch Party blocks non-admin controls', async () => {
  const token = '123456:test-token';
  const viewerInit = await initData(token, { id: 2, first_name: 'Viewer', username: 'viewer' });
  const env = { TELEGRAM_BOT_TOKEN: token, MAKIMA_MEMORY: new MockKV() };
  const response = await handleWatchPartyRequest(request(viewerInit, 'add_option', { title: 'Not allowed' }), env);
  assert.equal(response.status, 403);
});
