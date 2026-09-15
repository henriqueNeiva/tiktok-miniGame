const canvas = document.querySelector('#arena');
const context = canvas.getContext('2d');
const elements = Object.fromEntries([
  'blue-hp', 'red-hp', 'blue-hp-bar', 'red-hp-bar', 'blue-shield', 'red-shield',
  'clock', 'phase', 'goal-title', 'goal-copy', 'goal-left', 'goal-bar',
  'blue-charge', 'red-charge', 'event-feed', 'connection', 'winner', 'winner-team',
  'winner-kicker', 'next-round', 'round-label',
].map(id => [id, document.getElementById(id)]));

const teamColor = { azul: '#26aef3', vermelho: '#f34f68' };
const teamDark = { azul: '#096ec3', vermelho: '#bd2949' };
const hairstyles = ['#6f412b', '#efbd55', '#2c6c80', '#713f75'];
const effects = [];
let snapshot = {
  phase: 'LOBBY', remainingSeconds: 300,
  kingHp: { azul: 1000, vermelho: 1000 }, kingShield: { azul: 0, vermelho: 0 },
  teamLikes: { azul: 0, vermelho: 0 }, tacticalCharges: { azul: 0, vermelho: 0 }, players: [],
};
let size = { width: 1600, height: 900, dpr: 1 };

function isPortrait() { return size.height >= size.width * 1.25; }
function battleCenterY() { return size.height * (isPortrait() ? .56 : .5); }

function resize() {
  const box = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(box.width * dpr);
  canvas.height = Math.round(box.height * dpr);
  size = { width: box.width, height: box.height, dpr };
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function roundedRect(x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawBackground(time) {
  const { width, height } = size;
  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#7ed479');
  gradient.addColorStop(.47, '#a2dd79');
  gradient.addColorStop(.53, '#a5d777');
  gradient.addColorStop(1, '#e69c81');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.globalAlpha = .13;
  context.strokeStyle = '#173f39';
  context.lineWidth = 2;
  const grid = 48;
  for (let x = -grid; x < width + grid; x += grid) {
    for (let y = 0; y < height; y += grid) {
      context.beginPath();
      context.moveTo(x + (y / grid % 2) * grid / 2, y);
      context.lineTo(x + grid / 2 + (y / grid % 2) * grid / 2, y + grid / 2);
      context.lineTo(x + (y / grid % 2) * grid / 2, y + grid);
      context.stroke();
    }
  }
  context.globalAlpha = 1;

  const riverWidth = Math.max(95, width * .075);
  const riverX = width / 2 - riverWidth / 2;
  const water = context.createLinearGradient(riverX, 0, riverX + riverWidth, 0);
  water.addColorStop(0, '#3aaedf'); water.addColorStop(.5, '#76ddf1'); water.addColorStop(1, '#2996cf');
  context.fillStyle = water;
  context.fillRect(riverX, 0, riverWidth, height);
  context.save();
  context.globalAlpha = .35;
  context.strokeStyle = '#e9ffff';
  context.lineWidth = 4;
  for (let y = -30; y < height; y += 45) {
    context.beginPath();
    for (let x = riverX + 8; x <= riverX + riverWidth - 8; x += 8) {
      const waveY = y + Math.sin((x + time * .05) * .08) * 4;
      x === riverX + 8 ? context.moveTo(x, waveY) : context.lineTo(x, waveY);
    }
    context.stroke();
  }
  context.restore();

  const centerY = battleCenterY();
  const bridgeOffset = height * (isPortrait() ? .105 : .14);
  for (const bridgeY of [centerY - bridgeOffset, centerY + bridgeOffset]) drawBridge(width / 2, bridgeY, riverWidth + 35);
  drawCenterCrest(width / 2, centerY);
}

function drawBridge(x, y, width) {
  context.save();
  context.translate(x, y);
  context.fillStyle = '#775136';
  roundedRect(-width / 2 - 5, -25, width + 10, 58, 12); context.fill();
  for (let plank = -width / 2; plank < width / 2; plank += 19) {
    context.fillStyle = plank % 38 ? '#d69a55' : '#e6ad62';
    roundedRect(plank, -21, 16, 50, 4); context.fill();
  }
  context.strokeStyle = '#563d2e'; context.lineWidth = 5;
  context.beginPath(); context.moveTo(-width / 2, -18); context.lineTo(width / 2, -18); context.stroke();
  context.restore();
}

function drawCenterCrest(x, y) {
  context.save();
  context.translate(x, y);
  context.fillStyle = '#fff1be'; context.strokeStyle = '#684d36'; context.lineWidth = 6;
  context.beginPath(); context.arc(0, 0, 42, 0, Math.PI * 2); context.fill(); context.stroke();
  context.font = '800 38px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillText('⚔', 0, 2);
  context.restore();
}

function drawCastle(team, time) {
  const { width, height } = size;
  const blue = team === 'azul';
  const portrait = isPortrait();
  const x = blue ? width * (portrait ? .12 : .095) : width * (portrait ? .88 : .905);
  const y = battleCenterY();
  const scale = portrait ? Math.min(1.3, width / 800) : Math.max(.75, Math.min(1.15, width / 1500));
  context.save();
  context.translate(x, y + Math.sin(time * .002 + (blue ? 0 : 1)) * 2);
  context.scale(scale, scale);
  context.fillStyle = 'rgba(13,45,54,.2)';
  context.beginPath(); context.ellipse(0, 82, 86, 22, 0, 0, Math.PI * 2); context.fill();
  context.fillStyle = blue ? '#299fe4' : '#e54860';
  context.strokeStyle = blue ? '#0762a2' : '#9d213d'; context.lineWidth = 7;
  roundedRect(-63, -35, 126, 116, 18); context.fill(); context.stroke();
  context.fillStyle = '#fff0bb';
  for (const towerX of [-58, 58]) {
    roundedRect(towerX - 28, -83, 56, 112, 15); context.fill(); context.stroke();
    context.fillStyle = blue ? '#167fc5' : '#bd2948';
    context.beginPath(); context.moveTo(towerX - 37, -72); context.lineTo(towerX, -118); context.lineTo(towerX + 37, -72); context.closePath(); context.fill(); context.stroke();
    context.fillStyle = '#fff0bb';
  }
  context.fillStyle = '#583b32'; roundedRect(-24, 23, 48, 58, 22); context.fill();
  context.font = '42px sans-serif'; context.textAlign = 'center'; context.fillText('👑', 0, -49);
  const shield = snapshot.kingShield?.[team] ?? 0;
  if (shield > 0) {
    context.strokeStyle = '#bdf5ff'; context.lineWidth = 7; context.globalAlpha = .7 + Math.sin(time * .006) * .15;
    context.beginPath(); context.arc(0, -3, 105, Math.PI * 1.08, Math.PI * 1.92); context.stroke();
  }
  context.restore();
}

function playerPosition(team, index, count) {
  const { width, height } = size;
  const blue = team === 'azul';
  const visibleCount = Math.min(count, 8);
  const portrait = isPortrait();
  const columns = portrait ? (visibleCount > 2 ? 2 : 1) : (visibleCount > 4 ? 2 : 1);
  const row = Math.floor(index / columns);
  const column = index % columns;
  const xBase = blue ? width * (portrait ? .3 : .25) : width * (portrait ? .7 : .75);
  const x = xBase + (blue ? 1 : -1) * column * width * (portrait ? .12 : .075);
  const rows = Math.ceil(visibleCount / columns);
  const spacing = portrait ? Math.min(145, height * .08) : Math.min(105, height * .105);
  const y = battleCenterY() + (row - (rows - 1) / 2) * spacing;
  return { x, y };
}

function drawPlayers(team, time) {
  const all = snapshot.players.filter(player => player.team === team);
  const players = all.slice(0, 8);
  players.forEach((player, index) => {
    const { x, y } = playerPosition(team, index, players.length);
    const radius = isPortrait() ? Math.max(48, Math.min(58, size.width * .052)) : Math.max(27, Math.min(38, size.width * .022));
    context.save();
    context.translate(x, y + Math.sin(time * .004 + index) * 3);
    context.fillStyle = 'rgba(8,36,42,.2)';
    context.beginPath(); context.ellipse(0, radius + 12, radius * 1.1, 10, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#fff7dc'; context.strokeStyle = teamColor[team]; context.lineWidth = 7;
    context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.fill(); context.stroke();
    context.textAlign = 'center'; context.textBaseline = 'middle';
    drawAvatar(player.user, radius);
    context.fillStyle = '#183647'; context.strokeStyle = '#fff7dc'; context.lineWidth = 5;
    roundedRect(-radius - 9, radius + 4, radius * 2 + 18, 25, 9); context.stroke(); context.fill();
    context.fillStyle = '#fff'; context.font = `800 ${isPortrait() ? 22 : 12}px Nunito, sans-serif`;
    context.fillText(`@${shortName(player.user)}`, 0, radius + 17);
    context.fillStyle = '#ffd456'; context.strokeStyle = '#fff7dc'; context.lineWidth = 3;
    const badgeRadius = isPortrait() ? 21 : 15;
    context.beginPath(); context.arc(-radius + 2, -radius + 2, badgeRadius, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = '#5b4417'; context.font = `900 ${isPortrait() ? 14 : 10}px Nunito, sans-serif`; context.fillText(`Nv${player.level}`, -radius + 2, -radius + 2);
    context.fillStyle = '#dff37a'; context.strokeStyle = '#fff7dc'; context.lineWidth = 3;
    context.beginPath(); context.arc(radius - 2, -radius + 2, badgeRadius, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = '#405016'; context.font = `900 ${isPortrait() ? 14 : 10}px Nunito, sans-serif`; context.fillText(`E${player.energy}`, radius - 2, -radius + 2);
    context.restore();
  });
  if (all.length > 8) {
    const blue = team === 'azul';
    context.fillStyle = '#fff7dc'; context.strokeStyle = teamColor[team]; context.lineWidth = 5;
    const groupX = blue ? size.width * .39 : size.width * .61;
    const groupY = isPortrait() ? battleCenterY() + size.height * .17 : size.height * .74;
    context.beginPath(); context.arc(groupX, groupY, 28, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = teamDark[team]; context.font = '900 15px Nunito'; context.textAlign = 'center'; context.fillText(`+${all.length - 8}`, groupX, groupY + 2);
  }
}

function drawAvatar(user, radius) {
  const variant = hash(user) % hairstyles.length;
  context.fillStyle = '#ffd6a8';
  context.beginPath(); context.arc(0, 2, radius * .72, 0, Math.PI * 2); context.fill();
  context.fillStyle = hairstyles[variant];
  context.beginPath();
  context.arc(0, -radius * .08, radius * .73, Math.PI * 1.02, Math.PI * 1.98);
  context.lineTo(radius * .65, -radius * .18);
  context.quadraticCurveTo(0, -radius * .9, -radius * .65, -radius * .18);
  context.fill();
  context.fillStyle = '#263e48';
  context.beginPath(); context.arc(-radius * .23, radius * .05, 2.4, 0, Math.PI * 2); context.fill();
  context.beginPath(); context.arc(radius * .23, radius * .05, 2.4, 0, Math.PI * 2); context.fill();
  context.strokeStyle = '#b65e58'; context.lineWidth = 2;
  context.beginPath(); context.arc(0, radius * .14, radius * .2, .15, Math.PI - .15); context.stroke();
}

function drawEffects(now) {
  for (let index = effects.length - 1; index >= 0; index--) {
    const effect = effects[index];
    const progress = Math.min(1, (now - effect.started) / effect.duration);
    if (progress >= 1) { effects.splice(index, 1); continue; }
    context.save();
    const blue = effect.team === 'azul';
    if (effect.kind === 'attack') {
      const from = { x: blue ? size.width * .35 : size.width * .65, y: battleCenterY() };
      const to = { x: blue ? size.width * .88 : size.width * .12, y: battleCenterY() };
      const eased = 1 - (1 - progress) ** 3;
      const x = from.x + (to.x - from.x) * eased;
      const arcHeight = isPortrait() ? size.width * .18 : size.height * .15;
      const y = from.y + (to.y - from.y) * eased - Math.sin(progress * Math.PI) * arcHeight;
      context.shadowBlur = 22; context.shadowColor = teamColor[effect.team];
      context.fillStyle = '#fff7aa'; context.beginPath(); context.arc(x, y, 12 + Math.sin(progress * 20) * 3, 0, Math.PI * 2); context.fill();
      context.fillStyle = teamColor[effect.team]; context.globalAlpha = .6;
      context.beginPath(); context.arc(x - (blue ? 18 : -18), y + 7, 18, 0, Math.PI * 2); context.fill();
    } else {
      const x = blue ? size.width * (isPortrait() ? .12 : .1) : size.width * (isPortrait() ? .88 : .9);
      context.strokeStyle = effect.kind === 'heal' ? '#8aff95' : '#b9f2ff';
      context.lineWidth = 8; context.globalAlpha = 1 - progress;
      context.beginPath(); context.arc(x, battleCenterY(), 85 + progress * 80, 0, Math.PI * 2); context.stroke();
      context.font = '42px sans-serif'; context.textAlign = 'center'; context.fillText(effect.kind === 'heal' ? '💚' : '🛡️', x, battleCenterY() - 70 - progress * 35);
    }
    context.restore();
  }
}

function updateHud() {
  const hp = snapshot.kingHp;
  elements['blue-hp'].textContent = `${hp.azul.toLocaleString('pt-BR')} HP`;
  elements['red-hp'].textContent = `${hp.vermelho.toLocaleString('pt-BR')} HP`;
  elements['blue-hp-bar'].style.width = `${hp.azul / 10}%`;
  elements['red-hp-bar'].style.width = `${hp.vermelho / 10}%`;
  elements['blue-shield'].textContent = `ESCUDO ${snapshot.kingShield?.azul ?? 0}`;
  elements['red-shield'].textContent = `ESCUDO ${snapshot.kingShield?.vermelho ?? 0}`;
  const displayedSeconds = snapshot.phase === 'FINISHED' ? snapshot.nextRoundInSeconds ?? 30 : snapshot.remainingSeconds;
  const minutes = Math.floor(displayedSeconds / 60);
  const seconds = displayedSeconds % 60;
  elements.clock.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  elements.phase.textContent = snapshot.phase === 'LOBBY' ? 'PREPARE-SE' : snapshot.phase === 'FINISHED' ? 'PRÓXIMA' : 'BATALHA';
  elements['round-label'].textContent = `RODADA ${snapshot.round ?? 1}`;
  document.querySelector('.clock-card').classList.toggle('climax', snapshot.remainingSeconds <= 40 && snapshot.phase === 'ACTIVE');
  const blueProgress = snapshot.teamLikes.azul % 200;
  const redProgress = snapshot.teamLikes.vermelho % 200;
  const goalTeam = 200 - blueProgress <= 200 - redProgress ? 'azul' : 'vermelho';
  const progress = goalTeam === 'azul' ? blueProgress : redProgress;
  elements['goal-title'].textContent = `Cura do time ${goalTeam}`;
  elements['goal-copy'].textContent = `${progress} / 200 curtidas`;
  elements['goal-left'].textContent = `faltam ${200 - progress}`;
  elements['goal-bar'].style.width = `${progress / 2}%`;
  elements['blue-charge'].textContent = snapshot.tacticalCharges.azul;
  elements['red-charge'].textContent = snapshot.tacticalCharges.vermelho;
  if (snapshot.phase === 'FINISHED') {
    elements['winner-kicker'].textContent = snapshot.winner ? 'VITÓRIA DO' : 'FIM DE RODADA';
    elements['winner-team'].textContent = snapshot.winner ? `TIME ${snapshot.winner.toUpperCase()}` : 'EMPATE';
    elements['next-round'].textContent = `Próxima rodada em ${snapshot.nextRoundInSeconds ?? 30}s`;
    elements.winner.classList.add('show');
  } else {
    elements.winner.classList.remove('show');
  }
}

function activity(message) {
  const { stage, fields } = message;
  const team = fields.team ?? fields.attackingTeam;
  if (stage === 'DAMAGE_APPLIED') {
    effects.push({ kind: 'attack', team, started: performance.now(), duration: 900 });
    const result = fields.shieldAbsorbed
      ? `${fields.shieldAbsorbed} no escudo · ${fields.damage} no HP`
      : `${fields.damage} de dano no Rei ${fields.targetTeam}`;
    addFeed(`⚔️ @${fields.user ?? `Time ${team}`}`, result);
  } else if (stage === 'TEAM_HEAL_APPLIED') {
    effects.push({ kind: 'heal', team, started: performance.now(), duration: 1100 });
    addFeed(`💚 Cura do time ${team}`, `Rei recuperou ${fields.amount} HP`);
  } else if (stage === 'SHIELD_APPLIED') {
    effects.push({ kind: 'shield', team, started: performance.now(), duration: 1100 });
    addFeed(`🛡️ @${fields.user} defendeu`, `Escudo do time: ${fields.shield}`);
  } else if (stage === 'TACTICAL_CHARGE_UPDATED') {
    addFeed(`🌹 Presente de @${fields.user}`, `Time ${team} ganhou uma carga`);
  } else if (stage === 'COMMAND' && fields.action === 'PLAYER_JOIN') {
    addFeed(`👋 @${fields.user} entrou`, `Agora luta pelo time ${fields.team}`);
  } else if (stage === 'KING_DEFEATED') {
    addFeed('👑 Rei derrotado!', `O time ${fields.team} caiu`);
  }
}

function addFeed(title, detail) {
  const item = document.createElement('li');
  const heading = document.createElement('b');
  const copy = document.createElement('span');
  heading.textContent = title;
  copy.textContent = detail;
  item.append(heading, copy);
  elements['event-feed'].prepend(item);
  while (elements['event-feed'].children.length > 4) elements['event-feed'].lastElementChild.remove();
}

function hash(value) { return [...value].reduce((sum, letter) => sum + letter.charCodeAt(0), 0); }
function shortName(value) { return value.length > 11 ? `${value.slice(0, 10)}…` : value; }
function frame(time) {
  context.clearRect(0, 0, size.width, size.height);
  drawBackground(time);
  drawCastle('azul', time); drawCastle('vermelho', time);
  drawPlayers('azul', time); drawPlayers('vermelho', time);
  drawEffects(time);
  requestAnimationFrame(frame);
}

const stream = new EventSource('/events');
stream.addEventListener('open', () => {
  elements.connection.classList.add('online');
  elements.connection.querySelector('span').textContent = 'arena conectada';
});
stream.addEventListener('error', () => {
  elements.connection.classList.remove('online');
  elements.connection.querySelector('span').textContent = 'reconectando à arena';
});
stream.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.type === 'snapshot') { snapshot = message.snapshot; updateHud(); }
  if (message.type === 'activity') activity(message);
});

window.addEventListener('resize', resize);
resize(); updateHud(); requestAnimationFrame(frame);
