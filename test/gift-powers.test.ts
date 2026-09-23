import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MatchState } from '../src/domain/match-state.js';
import { createInterpreter } from '../src/application/handle-live-event.js';
import { TikTokAdapter } from '../src/infrastructure/tiktok-adapter.js';
import { giftPowerFor } from '../src/application/gift-powers.js';

test('Dado combo de três rosas, então final produz 60 de dano uma única vez', () => {
  const game = createInterpreter(() => {}, () => 0);
  const adapter = new TikTokAdapter('simulation', game, () => {});
  adapter.receive('chat', { user: { displayId: 'ana' }, content: '/entrar' });
  const gift = { user: { displayId: 'ana' }, giftId: '5655', groupId: '1', gift: { type: 1, name: 'Rose' }, repeatCount: 3 };
  adapter.receive('gift', { ...gift, repeatEnd: 0 });
  assert.equal(game.snapshot().kingHp.vermelho, 1000);
  adapter.receive('gift', { ...gift, repeatEnd: 1 });
  adapter.receive('gift', { ...gift, repeatEnd: 1 });
  assert.equal(game.snapshot().kingHp.vermelho, 940);
});

test('Dada rosquinha, então básico, meteoro e rosa causam 3x e bônus expira exatamente em 120s', () => {
  const game = new MatchState(); game.join('ana', () => 0);
  game.applyGiftPower('ana', 'DONUT_BOOST', 1);
  game.advanceTime(3);
  assert.equal(game.drainCombatEvents()[0]?.damage, 6);
  game.recordLikes('ana', 100);
  assert.equal(game.drainCombatEvents()[0]?.damage, 120);
  game.applyGiftPower('ana', 'ROSE_STRIKE', 1);
  assert.equal(game.drainCombatEvents()[0]?.damage, 60);
  game.advanceTime(117);
  assert.equal(game.drainCombatEvents().at(-1)?.damage, 2);
});

test('Dadas rosquinhas repetidas, então renovam tempo sem acumular multiplicador e zeram na rodada seguinte', () => {
  const game = new MatchState(); game.join('ana', () => 0);
  game.applyGiftPower('ana', 'DONUT_BOOST', 5);
  game.advanceTime(30); game.drainCombatEvents();
  game.applyGiftPower('ana', 'DONUT_BOOST', 1);
  assert.equal(game.snapshot().players[0]?.boostUntil, 150);
  game.advanceTime(3); assert.equal(game.drainCombatEvents()[0]?.damage, 6);
  game.advanceTime(159);
  assert.equal(game.snapshot().round, 2);
  assert.equal(game.snapshot().players[0]?.boostUntil, 0);
});

test('Dado presente sem entrada ou no intervalo, então efeito é ignorado com motivo', () => {
  const game = new MatchState();
  assert.equal(game.applyGiftPower('ana', 'ROSE_STRIKE', 1).reason, 'player_not_joined');
  game.join('ana', () => 0); game.applyGiftPower('ana', 'ROSE_STRIKE', 100);
  assert.equal(game.snapshot().kingHp.vermelho, 0);
  assert.equal(game.snapshot().players[0]?.score, 1000);
  assert.equal(game.applyGiftPower('ana', 'DONUT_BOOST', 1).reason, 'round_break');
});

test('Mapeamento aceita nomes localizados exatos sem confundir outros presentes', () => {
  for (const name of ['Rose', 'Rosa']) assert.equal(giftPowerFor(name), 'ROSE_STRIKE');
  for (const name of ['Rosquinha', 'Doughnut', 'Donut']) assert.equal(giftPowerFor(name), 'DONUT_BOOST');
  assert.equal(giftPowerFor('Rose bouquet'), undefined);
});
