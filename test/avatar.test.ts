import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TikTokAdapter } from '../src/infrastructure/tiktok-adapter.js';
import { createInterpreter } from '../src/application/handle-live-event.js';
import { extractAvatarUrl } from '../src/infrastructure/tiktok-avatar.js';
import type { ImageModel } from 'tiktok-live-connector';

test('Dada foto no payload TikTok, quando entra, então snapshot inclui retrato e preserva entre rodadas', () => {
  const handle = createInterpreter(() => {}, () => 0);
  const adapter = new TikTokAdapter('simulation', handle, () => {});
  const avatarThumb = { urlList: ['https://example.com/avatar.jpg'] } satisfies Partial<ImageModel>;
  adapter.receive('chat', { user: { displayId: 'ana', avatarThumb }, content: '/entrar' });
  assert.equal(handle.snapshot().players[0]?.avatarUrl, avatarThumb.urlList[0]);
  handle.advanceTime(192);
  assert.equal(handle.snapshot().players[0]?.avatarUrl, avatarThumb.urlList[0]);
  adapter.receive('like', { user: { displayId: 'ana' }, count: 1 });
  assert.equal(handle.snapshot().players[0]?.avatarUrl, avatarThumb.urlList[0]);
  adapter.receive('chat', { user: { displayId: 'ana', avatarThumb: { urlList: ['https://example.com/new.jpg'] } }, content: '/entrar' });
  assert.equal(handle.snapshot().players.length, 1);
  assert.equal(handle.snapshot().players[0]?.avatarUrl, 'https://example.com/new.jpg');
});

test('Dada foto ausente ou inválida, então entrada continua e usa fallback', () => {
  assert.equal(extractAvatarUrl({}), undefined);
  assert.equal(extractAvatarUrl({ avatarThumb: { urlList: ['javascript:alert(1)', 'http://example.com/a'] } }), undefined);
  assert.equal(extractAvatarUrl({ avatarThumb: null, avatarMedium: { urlList: ['https://example.com/b'] } }), 'https://example.com/b');
  const handle = createInterpreter(() => {}, () => 0);
  new TikTokAdapter('simulation', handle, () => {}).receive('chat', { user: { displayId: 'ana' }, content: '/entrar' });
  assert.equal(handle.snapshot().players[0]?.avatarUrl, undefined);
});
