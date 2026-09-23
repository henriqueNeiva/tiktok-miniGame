import { test } from "node:test";
import assert from "node:assert/strict";
import { MatchState } from "../src/domain/match-state.js";
import { RULES } from "../src/domain/game-rules.js";
import { createInterpreter } from "../src/application/handle-live-event.js";
import { TikTokAdapter } from "../src/infrastructure/tiktok-adapter.js";

test("Dado /entrar, quando o tempo avança, então soldado ataca sem novos comentários", () => {
  const match = new MatchState();
  match.join("ana", () => 0);
  match.advanceTime(2.9);
  assert.equal(match.snapshot().kingHp.vermelho, 1000);
  match.advanceTime(0.1);
  assert.equal(match.snapshot().kingHp.vermelho, 998);
  assert.equal(match.snapshot().players[0]?.score, 2);
  assert.equal(match.drainCombatEvents()[0]?.action, "AUTO_ATTACK");
});
test("Dadas 250 curtidas pessoais, então dispara dois meteoros e conserva 50 de carga", () => {
  const match = new MatchState();
  match.join("ana", () => 0);
  match.recordLikes("ana", 99, "900000");
  assert.equal(match.snapshot().kingHp.vermelho, 1000);
  match.recordLikes("ana", 151, "900151");
  assert.equal(match.snapshot().kingHp.vermelho, 920);
  assert.equal(match.snapshot().players[0]?.charge, 50);
  assert.equal(match.snapshot().players[0]?.score, 80);
  assert.equal(match.drainCombatEvents().length, 2);
});
test("Dadas curtidas de dois usuários e de antes da entrada, então suas cargas não se misturam", () => {
  const match = new MatchState();
  match.recordLikes("ana", 100);
  match.join("ana", () => 0);
  match.join("bia", () => 0);
  match.recordLikes("ana", 50);
  match.recordLikes("bia", 50);
  assert.deepEqual(match.snapshot().kingHp, { azul: 1000, vermelho: 1000 });
  assert.deepEqual(
    match.snapshot().players.map((p) => p.charge),
    [50, 50],
  );
});
test("Dado pacote de curtidas repetido, então não dispara especial em dobro", () => {
  const logs: Record<string, unknown>[] = [];
  const handle = createInterpreter(
    (stage, fields) => logs.push({ stage, ...fields }),
    () => 0,
  );
  const adapter = new TikTokAdapter("simulation", handle, () => {});
  adapter.receive("chat", { user: { displayId: "ana" }, content: "/entrar" });
  const batch = {
    user: { displayId: "ana" },
    count: 100,
    total: "100000",
    common: { msgId: "like-1" },
  };
  adapter.receive("like", batch);
  adapter.receive("like", batch);
  assert.equal(handle.snapshot().kingHp.vermelho, 960);
  assert.equal(logs.filter((l) => l.stage === "DAMAGE_APPLIED").length, 1);
});
test("Dado um comando antigo ou time manual, então não cria ação; entrada repetida não pontua", () => {
  const handle = createInterpreter(
    () => {},
    () => 0,
  );
  for (const text of ["!atacar", "!defender", "!curar", "/entrar azul"])
    handle({ type: "COMMENT", source: "simulation", user: "ana", text });
  assert.equal(handle.snapshot().players.length, 0);
  for (const text of ["/entrar", "!entrar"])
    handle({ type: "COMMENT", source: "simulation", user: "ana", text });
  assert.equal(handle.snapshot().players.length, 1);
  assert.equal(handle.snapshot().players[0]?.score, 0);
});
test("Dado presente não mapeado, então reconhecimento continua sem modificar dano ou carga", () => {
  const handle = createInterpreter(
    () => {},
    () => 0,
  );
  handle({
    type: "COMMENT",
    source: "simulation",
    user: "ana",
    text: "/entrar",
  });
  const before = handle.snapshot();
  handle({
    type: "GIFT_RECEIVED",
    source: "simulation",
    user: "ana",
    giftId: "5655",
    giftName: "Presente não mapeado",
    quantity: 5,
  });
  assert.deepEqual(handle.snapshot(), before);
});
test("Dado rei derrotado, então dano respeita HP, pausa e reinicia rodada com XP preservado", () => {
  const match = new MatchState();
  match.join("ana", () => 0);
  match.recordLikes("ana", 10000);
  const finished = match.snapshot();
  assert.equal(finished.phase, "FINISHED");
  assert.equal(finished.kingHp.vermelho, 0);
  assert.equal(finished.players[0]?.score, 1000);
  match.advanceTime(11);
  assert.equal(match.snapshot().phase, "FINISHED");
  match.recordLikes("ana", 100);
  assert.equal(match.snapshot().players[0]?.score, 1000);
  match.advanceTime(1);
  const next = match.snapshot();
  assert.equal(next.round, 2);
  assert.equal(next.players[0]?.score, 0);
  assert.equal(next.players[0]?.charge, 0);
  assert.equal(next.players[0]?.xp, finished.players[0]?.xp);
  assert.equal(next.kingHp.vermelho, 1000);
});
test("Dado combate simétrico, então tempo e ordem de inserção não favorecem um time", () => {
  const match = new MatchState();
  match.join("ana", () => 0);
  match.join("bia", () => 0);
  match.advanceTime(RULES.roundSeconds);
  assert.equal(match.snapshot().phase, "FINISHED");
  assert.equal(match.snapshot().winner, undefined);
  assert.equal(match.snapshot().kingHp.azul, 880);
  assert.equal(match.snapshot().kingHp.vermelho, 880);
});
test("Dado avanço fracionado ou em lote, então resultado de combate é o mesmo", () => {
  const a = new MatchState(),
    b = new MatchState();
  for (const match of [a, b]) {
    match.join("ana", () => 0);
    match.join("bia", () => 0);
  }
  a.advanceTime(30);
  for (let i = 0; i < 30; i++) b.advanceTime(1);
  assert.deepEqual(a.snapshot(), b.snapshot());
  assert.throws(() => a.advanceTime(RULES.maxAdvanceSeconds + 1), RangeError);
});
test("Dado retorno durante intervalo, então jogador entra na próxima rodada sem dano na pausa", () => {
  const m = new MatchState();
  m.join("a", () => 0);
  m.recordLikes("a", 2500);
  m.drainCombatEvents();
  m.join("b", () => 0);
  m.advanceTime(6);
  assert.equal(m.drainCombatEvents().length, 0);
  m.advanceTime(9);
  assert.ok(m.drainCombatEvents().some((e) => e.user === "b"));
});
