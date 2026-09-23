import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInterpreter } from '../src/application/handle-live-event.js';
import { TikTokAdapter } from '../src/infrastructure/tiktok-adapter.js';
import type { WebcastGiftMessage, WebcastChatMessage } from 'tiktok-live-connector';

test('BDD-01: Dado um comentário /entrar, quando recebido, então confirma entrada no time vermelho', () => {
  const records: Record<string, unknown>[] = [];
  const handle = createInterpreter((stage, fields) => records.push({ stage, ...fields }), () => 0.8);
  // Application accepts internal events without TikTok or console dependencies.
  handle({ source: 'simulation', type: 'COMMENT', user: 'joao', text: '!vermelho' });
  const adapter = new TikTokAdapter('simulation', handle, () => {});
  const chat = { content: '/entrar' } satisfies Partial<WebcastChatMessage>;
  const user = { displayId: 'joao' } satisfies Partial<NonNullable<WebcastChatMessage['user']>>;
  adapter.receive('chat', { ...chat, user });
  assert.ok(records.some(r => r.stage === 'COMMAND' && r.action === 'PLAYER_JOIN' && r.team === 'vermelho'));
  assert.ok(records.some(r => r.stage === 'RESULT' && String(r.response).includes('@joao')));
  assert.equal(records.filter(r => r.stage === 'RESULT').length, 1);
});

test('BDD-02: Dado comando desconhecido, quando interpretado, então registra motivo sem confirmar ação', () => {
  const records: Record<string, unknown>[] = [];
  const handle = createInterpreter((stage, fields) => records.push({ stage, ...fields }), () => 0.8);
  handle({ source: 'simulation', type: 'COMMENT', user: 'joao', text: '!inexistente' });
  assert.ok(records.some(r => r.reason === 'unknown_command'));
  assert.ok(!records.some(r => r.stage === 'RESULT'));
});

test('BDD-03: Dada uma rosa, quando combo encerra e final repete, então confirma uma única unidade', () => {
  const records: Record<string, unknown>[] = [];
  const log = (stage: string, fields: Record<string, unknown>) => { records.push({ stage, ...fields }); };
  const adapter = new TikTokAdapter('simulation', createInterpreter(log), log);
  // Compile-checked against the installed SDK schema, without opening a connection.
  const gift = { type: 1, name: 'Rose' } satisfies Partial<NonNullable<WebcastGiftMessage['gift']>>;
  const user = { id: '42', displayId: 'maria' } satisfies Partial<NonNullable<WebcastGiftMessage['user']>>;
  const envelope = { giftId: '5655', groupId: 'rose-one', repeatCount: 1, repeatEnd: 0 } satisfies Partial<WebcastGiftMessage>;
  adapter.receive('gift', { ...envelope, user, gift });
  assert.ok(!records.some(r => r.stage === 'RESULT'));
  adapter.receive('gift', { ...envelope, user, gift, repeatEnd: 1 });
  adapter.receive('gift', { ...envelope, user, gift, repeatEnd: 1 });
  const results = records.filter(r => r.stage === 'RESULT');
  assert.equal(results.length, 1);
  assert.equal(results[0]?.quantity, 1);
  assert.match(String(results[0]?.response), /@maria enviou Rose x1/);
});

