import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { TikTokAdapter } from '../src/infrastructure/tiktok-adapter.js';
import { createInterpreter } from '../src/application/handle-live-event.js';
import { simulate } from '../src/infrastructure/simulation.js';
import type { LiveEvent } from '../src/domain/events.js';
import type { Log } from '../src/application/ports.js';

function setup() {
  const events: LiveEvent[] = [];
  const logs: { stage: string; fields: Record<string, unknown> }[] = [];
  const log: Log = (stage, fields) => logs.push({ stage, fields });
  const interpret = createInterpreter(log, () => 0);
  const adapter = new TikTokAdapter('simulation', event => { events.push(event); interpret(event); }, log);
  return { adapter, events, logs };
}
const rose = { user: { uniqueId: 'pedro' }, giftId: 5655, gift: { type: 1, name: 'Rose' }, groupId: 'one' };

test('simulation totals five gifts, two commands and rejects final replay', () => {
  const { adapter, events, logs } = setup();
  simulate(adapter);
  assert.deepEqual(events.filter(e => e.type === 'GIFT_RECEIVED').map(e => e.quantity), [3, 1, 1]);
  assert.equal(logs.filter(l => l.stage === 'COMMAND').length, 2);
  assert.equal(logs.filter(l => l.stage === 'DUPLICATE_IGNORED').length, 1);
  assert.equal(logs.at(-1)?.fields.totalGifts, 5);
});
test('players are balanced when joining without an explicit team', () => {
  const logs: { stage: string; fields: Record<string, unknown> }[] = [];
  const log: Log = (stage, fields) => logs.push({ stage, fields });
  const handle = createInterpreter(log, () => 0.8);
  handle({ source: 'simulation', type: 'COMMENT', user: 'joao', text: '!entrar' });
  handle({ source: 'simulation', type: 'COMMENT', user: 'maria', text: '!entrar' });
  handle({ source: 'simulation', type: 'COMMENT', user: 'ana', text: '!entrar' });
  const teams = logs.filter(l => l.stage === 'COMMAND').map(l => l.fields.team);
  assert.deepEqual(teams, ['vermelho', 'azul', 'vermelho']);
});
test('numeric proto flags, independent users/groups and late progress do not overcount', () => {
  const { adapter, events } = setup();
  adapter.receive('gift', { ...rose, repeatCount: 1, repeatEnd: 0 });
  assert.equal(events.length, 0);
  adapter.receive('gift', { ...rose, repeatCount: 5, repeatEnd: 1 });
  adapter.receive('gift', { ...rose, repeatCount: 5, repeatEnd: 1, common: { msgId: 'other' } });
  adapter.receive('gift', { ...rose, repeatCount: 2, repeatEnd: 0 });
  adapter.receive('gift', { ...rose, user: { uniqueId: 'ana' }, repeatCount: 1, repeatEnd: 1 });
  adapter.receive('gift', { ...rose, groupId: 'two', repeatCount: 1, repeatEnd: 1 });
  assert.deepEqual(events.filter(e => e.type === 'GIFT_RECEIVED').map(e => e.quantity), [5, 1, 1]);
});
test('malformed gifts rejected and incomplete combos never credited', () => {
  const { adapter, events, logs } = setup();
  for (const repeatCount of [0, -1, NaN, Infinity, '3', 1.5]) adapter.receive('gift', { ...rose, repeatCount, repeatEnd: true });
  adapter.receive('gift', { ...rose, repeatCount: 1, repeatEnd: 'false' });
  adapter.receive('gift', { ...rose, repeatCount: 1 });
  adapter.receive('gift', { ...rose, repeatCount: 3, repeatEnd: false });
  adapter.receive('chat', null);
  assert.equal(events.length, 0);
  assert.equal(logs.filter(l => l.stage === 'INVALID_EVENT').length, 9);
});
test('message IDs deduplicate non-streak gifts; missing IDs explicitly warned', () => {
  const { adapter, events, logs } = setup();
  const gift = { ...rose, gift: { type: 2 }, repeatCount: 1, common: { msgId: 'x' } };
  adapter.receive('gift', gift); adapter.receive('gift', gift);
  adapter.receive('gift', { ...gift, common: undefined });
  assert.equal(events.length, 2);
  assert.ok(logs.some(l => l.stage === 'DEDUP_UNAVAILABLE'));
});
test('like batches use the cumulative total when TikTok reports it', () => {
  const { adapter, events, logs } = setup();
  adapter.receive('like', { user: { uniqueId: 'ana' }, common: { msgId: 'l1' }, count: 3, total: '120' });
  adapter.receive('like', { user: { uniqueId: 'ana' }, common: { msgId: 'l2' }, count: 2, total: '122' });
  assert.deepEqual(events.filter(e => e.type === 'LIKE_RECEIVED').map(e => e.count), [3, 2]);
  assert.equal(logs.filter(l => l.stage === 'RESULT' && l.fields.action === 'LIKE_ACKNOWLEDGED').at(-1)?.fields.totalLikes, 122);
});
test('exact commands normalized, arbitrary comments ignored, chat replay filtered', () => {
  const { adapter, logs } = setup();
  for (const [msgId, comment] of [['a', '  /entrar  '], ['a', '/entrar'], ['b', '!atacar agora'], ['c', 'oi']]) {
    adapter.receive('chat', { user: { uniqueId: 'joao' }, common: { msgId }, comment });
  }
  const commands = logs.filter(l => l.stage === 'COMMAND');
  assert.equal(commands.length, 1);
  assert.equal(commands[0]?.fields.team, 'azul');
  assert.equal(logs.filter(l => l.stage === 'COMMENT_IGNORED').length, 2);
});
test('live CLI without username fails before any connection', () => {
  const result = spawnSync(process.execPath, ['dist/src/main.js', 'live'], {
    encoding: 'utf8', env: { ...process.env, TIKTOK_USERNAME: '' }, timeout: 10_000,
  });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /CONFIG_ERROR/);
  assert.doesNotMatch(result.stdout, /CONNECTING|SIMULATION_START/);
});

