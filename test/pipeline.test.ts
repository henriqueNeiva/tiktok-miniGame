import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { TikTokAdapter } from '../src/infrastructure/tiktok-adapter.js';
import { createInterpreter } from '../src/application/handle-live-event.js';
import { simulate } from '../src/infrastructure/simulation.js';
import { INITIAL_KING_HP, LIKE_ATTACK_DAMAGE, MatchState, MAX_PLAYER_ENERGY, MAX_TIME_ADVANCE_SECONDS } from '../src/domain/match-state.js';
import type { LiveEvent } from '../src/domain/events.js';
import type { Log } from '../src/application/ports.js';

function setup() {
  const events: LiveEvent[] = [];
  const logs: { stage: string; fields: Record<string, unknown> }[] = [];
  const log: Log = (stage, fields) => logs.push({ stage, fields });
  const interpret = createInterpreter(log);
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
test('explicit team is accepted and duplicate entry is ignored', () => {
  const logs: { stage: string; fields: Record<string, unknown> }[] = [];
  const log: Log = (stage, fields) => logs.push({ stage, fields });
  const handle = createInterpreter(log, () => 0);
  handle({ source: 'simulation', type: 'COMMENT', user: 'joao', text: '!entrar azul' });
  handle({ source: 'simulation', type: 'COMMENT', user: 'joao', text: '!entrar vermelho' });
  assert.equal(logs.filter(l => l.stage === 'COMMAND').length, 1);
  assert.equal(logs.find(l => l.stage === 'COMMAND')?.fields.team, 'azul');
  assert.ok(logs.some(l => l.stage === 'COMMENT_IGNORED' && l.fields.reason === 'already_joined'));
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
test('team likes and personal combo trigger one attack at each hundred', () => {
  const logs: { stage: string; fields: Record<string, unknown> }[] = [];
  const log: Log = (stage, fields) => logs.push({ stage, fields });
  const handle = createInterpreter(log);
  handle({ source: 'simulation', type: 'COMMENT', user: 'joao', text: '!entrar azul' });
  handle({ source: 'simulation', type: 'LIKE_RECEIVED', user: 'joao', count: 99, total: '99' });
  handle({ source: 'simulation', type: 'LIKE_RECEIVED', user: 'joao', count: 1, total: '100' });
  handle({ source: 'simulation', type: 'LIKE_RECEIVED', user: 'joao', count: 100, total: '200' });
  assert.equal(logs.filter(l => l.stage === 'TEAM_LIKES_UPDATED' && l.fields.teamLikes === 100).length, 1);
  assert.equal(logs.filter(l => l.stage === 'RULE_TRIGGERED' && l.fields.rule === 'PLAYER_LIKE_COMBO_100').length, 2);
  assert.equal(logs.filter(l => l.stage === 'RULE_TRIGGERED' && l.fields.rule === 'TEAM_LIKES_200').length, 1);
  assert.equal(logs.filter(l => l.stage === 'DAMAGE_APPLIED').length, 2);
  assert.equal(logs.at(-1)?.fields.targetKingHp, INITIAL_KING_HP - LIKE_ATTACK_DAMAGE * 2);
});
test('team milestone triggers collective attack and damage', () => {
  const logs: { stage: string; fields: Record<string, unknown> }[] = [];
  const handle = createInterpreter((stage, fields) => logs.push({ stage, fields }));
  handle({ source: 'simulation', type: 'COMMENT', user: 'joao', text: '!entrar azul' });
  handle({ source: 'simulation', type: 'LIKE_RECEIVED', user: 'joao', count: 500, total: '500' });
  assert.equal(logs.filter(l => l.stage === 'RULE_TRIGGERED' && l.fields.rule === 'TEAM_LIKES_500').length, 1);
  assert.ok(logs.some(l => l.stage === 'DAMAGE_APPLIED' && l.fields.action === 'TEAM_ATTACK' && l.fields.damage === 50));
});
test('match timer finishes after five minutes and exposes ranking profile', () => {
  const match = new MatchState();
  match.join('joao', 'azul', () => 0);
  match.recordLikes('joao', 100, '100');
  assert.equal(match.advanceTime(299).phase, 'ACTIVE');
  const snapshot = match.advanceTime(1);
  assert.equal(snapshot.phase, 'FINISHED');
  assert.equal(snapshot.remainingSeconds, 0);
  assert.equal(snapshot.nextRoundInSeconds, 30);
  assert.equal(match.ranking()[0]?.user, 'joao');
  assert.equal(match.profileOf('joao')?.level, 1);
});
test('next round starts after thirty seconds and keeps players on their teams', () => {
  const match = new MatchState();
  match.join('joao', 'azul', () => 0);
  match.join('maria', 'vermelho', () => 0);
  match.recordLikes('joao', 100, '100');
  match.applyAttack('azul', INITIAL_KING_HP);
  assert.equal(match.snapshot().phase, 'FINISHED');
  assert.equal(match.advanceTime(29).nextRoundInSeconds, 1);
  const nextRound = match.advanceTime(2);
  assert.equal(nextRound.phase, 'ACTIVE');
  assert.equal(nextRound.round, 2);
  assert.equal(nextRound.remainingSeconds, 299);
  assert.equal(nextRound.kingHp.azul, INITIAL_KING_HP);
  assert.equal(nextRound.kingHp.vermelho, INITIAL_KING_HP);
  assert.equal(nextRound.players.find(player => player.user === 'joao')?.team, 'azul');
  assert.equal(nextRound.players.find(player => player.user === 'maria')?.team, 'vermelho');
});
test('round break ignores interactions and rejects unreasonable clock jumps', () => {
  const logs: { stage: string; fields: Record<string, unknown> }[] = [];
  const handle = createInterpreter((stage, fields) => logs.push({ stage, fields }));
  handle({ source: 'simulation', type: 'COMMENT', user: 'joao', text: '!entrar azul' });
  handle.advanceTime(300);
  handle({ source: 'simulation', type: 'LIKE_RECEIVED', user: 'joao', count: 100, total: '100' });
  handle({ source: 'simulation', type: 'GIFT_RECEIVED', user: 'joao', giftId: '5655', giftName: 'Rose', quantity: 1 });
  handle({ source: 'simulation', type: 'COMMENT', user: 'joao', text: '!atacar' });
  const breakSnapshot = handle.snapshot();
  assert.equal(breakSnapshot.teamLikes.azul, 0);
  assert.equal(breakSnapshot.tacticalCharges.azul, 0);
  assert.equal(logs.filter(log => log.stage === 'EVENT_IGNORED' && log.fields.reason === 'round_break').length, 2);
  assert.ok(logs.some(log => log.stage === 'COMMENT_IGNORED' && log.fields.reason === 'round_break'));
  assert.throws(() => handle.advanceTime(MAX_TIME_ADVANCE_SECONDS + 1), RangeError);
});
test('rose creates a tactical charge for the player team without direct damage', () => {
  const logs: { stage: string; fields: Record<string, unknown> }[] = [];
  const handle = createInterpreter((stage, fields) => logs.push({ stage, fields }));
  handle({ source: 'simulation', type: 'COMMENT', user: 'joao', text: '!entrar vermelho' });
  handle({ source: 'simulation', type: 'GIFT_RECEIVED', user: 'joao', giftId: '5655', giftName: 'Rose', quantity: 1 });
  assert.ok(logs.some(l => l.stage === 'TACTICAL_CHARGE_UPDATED' && l.fields.team === 'vermelho' && l.fields.tacticalCharges === 1));
  assert.equal(logs.filter(l => l.stage === 'DAMAGE_APPLIED').length, 0);
});
test('king HP decreases from attacks and never goes below zero', () => {
  const match = new MatchState();
  assert.equal(match.applyAttack('azul').targetKingHp, INITIAL_KING_HP - LIKE_ATTACK_DAMAGE);
  assert.equal(match.applyAttack('azul', INITIAL_KING_HP).targetKingHp, 0);
  assert.equal(match.applyAttack('azul').targetKingHp, 0);
});
test('likes from a player without a team do not update a team or trigger an attack', () => {
  const logs: { stage: string; fields: Record<string, unknown> }[] = [];
  const handle = createInterpreter((stage, fields) => logs.push({ stage, fields }));
  handle({ source: 'simulation', type: 'LIKE_RECEIVED', user: 'joao', count: 100, total: '100' });
  assert.equal(logs.filter(l => l.stage === 'TEAM_LIKES_UPDATED').length, 0);
  assert.equal(logs.filter(l => l.stage === 'RULE_TRIGGERED').length, 0);
});
test('exact commands normalized, arbitrary comments ignored, chat replay filtered', () => {
  const { adapter, logs } = setup();
  for (const [msgId, comment] of [['a', '  !entrar azul  '], ['a', '!entrar azul'], ['b', '!atacar agora'], ['c', 'oi']]) {
    adapter.receive('chat', { user: { uniqueId: 'joao' }, common: { msgId }, comment });
  }
  const commands = logs.filter(l => l.stage === 'COMMAND');
  assert.equal(commands.length, 1);
  assert.equal(commands[0]?.fields.team, 'azul');
  assert.equal(logs.filter(l => l.stage === 'COMMENT_IGNORED').length, 2);
});
test('free likes recharge energy used by attack, defense and heal commands', () => {
  const logs: { stage: string; fields: Record<string, unknown> }[] = [];
  const handle = createInterpreter((stage, fields) => logs.push({ stage, fields }));
  handle({ source: 'simulation', type: 'COMMENT', user: 'joao', text: '!entrar azul' });
  handle({ source: 'simulation', type: 'LIKE_RECEIVED', user: 'joao', count: 75, total: '75' });
  assert.equal(handle.snapshot().players[0]?.energy, MAX_PLAYER_ENERGY);
  handle({ source: 'simulation', type: 'COMMENT', user: 'joao', text: '!atacar' });
  handle({ source: 'simulation', type: 'COMMENT', user: 'joao', text: '!defender' });
  assert.equal(handle.snapshot().players[0]?.energy, 1);
  assert.equal(handle.snapshot().kingShield.azul, 30);
  assert.ok(logs.some(log => log.stage === 'DAMAGE_APPLIED' && log.fields.user === 'joao'));
  handle({ source: 'simulation', type: 'COMMENT', user: 'joao', text: '!curar' });
  assert.ok(logs.some(log => log.stage === 'COMMENT_IGNORED' && log.fields.reason === 'insufficient_energy'));
});
test('live CLI without username fails before any connection', () => {
  const result = spawnSync(process.execPath, ['dist/src/main.js', 'live'], {
    encoding: 'utf8', env: { ...process.env, TIKTOK_USERNAME: '' }, timeout: 10_000,
  });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /CONFIG_ERROR/);
  assert.doesNotMatch(result.stdout, /CONNECTING|SIMULATION_START/);
});
