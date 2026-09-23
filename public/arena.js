import { ArenaRenderer } from "./renderer.js";
const el = (id) => document.getElementById(id);
const renderer = new ArenaRenderer(el("arena"));
let calloutTimer;
function update(s) {
  renderer.update(s);
  for (const [team, prefix] of [
    ["azul", "blue"],
    ["vermelho", "red"],
  ]) {
    el(prefix + "-hp").textContent =
      s.kingHp[team].toLocaleString("pt-BR") + " HP";
    el(prefix + "-bar").style.width =
      (s.kingHp[team] / s.rules.kingHp) * 100 + "%";
  }
  const seconds = Math.ceil(
    s.phase === "FINISHED" ? s.nextRoundInSeconds : s.remainingSeconds,
  );
  el("clock").textContent =
    String(Math.floor(seconds / 60)).padStart(2, "0") +
    ":" +
    String(seconds % 60).padStart(2, "0");
  el("phase").textContent =
    s.phase === "LOBBY"
      ? "ENTRE NA ARENA"
      : s.phase === "FINISHED"
        ? "PRÓXIMA EM"
        : "BATALHA";
  el("round").textContent = "RODADA " + s.round;
  document.body.classList.toggle(
    "climax",
    s.phase === "ACTIVE" && seconds <= 30,
  );
  el("army-count").textContent = s.players.length + " SOLDADOS";
  const charging = [...s.players].sort((a, b) => b.charge - a.charge)[0];
  el("charge-user").textContent = charging
    ? "@" + charging.user
    : "Entre para carregar";
  el("charge-count").textContent = (charging?.charge ?? 0) + " / 100";
  el("charge-bar").style.width = (charging?.charge ?? 0) + "%";
  const leader = [...s.players].sort((a, b) => b.score - a.score)[0];
  el("leader").textContent = leader ? "@" + leader.user : "A coroa espera você";
  el("leader-score").textContent = leader
    ? leader.score + " de dano · " + leader.specials + " especiais"
    : "O placar conta HP removido";
  el("winner").hidden = s.phase !== "FINISHED";
  if (s.phase === "FINISHED") {
    el("winner-team").textContent = s.winner
      ? "VITÓRIA " + s.winner.toUpperCase()
      : "EMPATE";
    el("mvp").textContent = leader
      ? "Destaque: @" + leader.user + " · " + leader.score + " de dano"
      : "";
    el("next-round").textContent = "Nova batalha em " + seconds + "s";
  }
}
function activity({ stage, fields }) {
  if (stage === "DAMAGE_APPLIED") {
    renderer.attack(fields);
    if (fields.action === "SPECIAL_ATTACK" || fields.action === 'ROSE_ATTACK') {
      const powerName = fields.action === 'ROSE_ATTACK' ? 'RAJADA DE PÉTALAS' : 'METEORO';
      el("activity").textContent =
        "✦ @" + fields.user + " lançou " + powerName + " · −" + fields.damage + " HP";
      el("callout").textContent =
        "@" + fields.user + " • " + powerName + " −" + fields.damage;
      el("callout").classList.add("show");
      clearTimeout(calloutTimer);
      calloutTimer = setTimeout(
        () => el("callout").classList.remove("show"),
        2200,
      );
    }
  } else if (stage === 'GIFT_POWER' && fields.applied && fields.power === 'DONUT_BOOST') {
    el('activity').textContent = '🍩 @'+fields.user+' ativou dano 3× por '+fields.duration+'s!';
  } else if (stage === "COMMAND")
    el("activity").textContent =
      "@" +
      fields.user +
      " entrou no time " +
      fields.team +
      ". Soldado em marcha!";
  else if (stage === "CONNECTED")
    el("source-label").textContent = "TIKTOK LIVE CONECTADA";
  else if (["DISCONNECTED", "CONNECT_FAILED"].includes(stage))
    el("source-label").textContent = "TIKTOK DESCONECTADO";
}
const stream = new EventSource("/events");
stream.onopen = () => {
  el("connection").textContent = "● Arena online";
  el("connection").classList.add("online");
};
stream.onerror = () => {
  el("connection").textContent = "Reconectando";
  el("connection").classList.remove("online");
};
stream.onmessage = (event) => {
  const m = JSON.parse(event.data);
  if (m.type === "snapshot") update(m.snapshot);
  if (m.type === "activity") activity(m);
  if (m.type === "status")
    el("source-label").textContent = m.demo
      ? "DEMONSTRAÇÃO • SEM LIVE"
      : m.connected
        ? "TIKTOK LIVE CONECTADA"
        : "MODO LIVE • SEM CONEXÃO";
};
