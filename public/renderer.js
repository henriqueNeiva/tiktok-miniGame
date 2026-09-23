import { AvatarCache } from './avatar-cache.js';
const COLORS = { azul: "#6ecaff", vermelho: "#ff8290" };
const W = 720,
  H = 970;
const hash = (value) => [...value].reduce((n, c) => n + c.charCodeAt(0), 0);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const kingY = (team) => (team === "vermelho" ? 142 : 828);

export class ArenaRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.effects = [];
    this.avatars = new AvatarCache();
    this.snapshot = null;
    this.updatedAt = 0;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    new ResizeObserver(() => this.resize()).observe(canvas);
    requestAnimationFrame((time) => this.frame(time));
  }
  resize() {
    const box = this.canvas.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(box.width * dpr);
    this.canvas.height = Math.round(box.height * dpr);
    this.ctx.setTransform(
      this.canvas.width / W,
      0,
      0,
      this.canvas.height / H,
      0,
      0,
    );
  }
  update(snapshot) {
    if (snapshot.round !== this.snapshot?.round) this.effects = [];
    this.snapshot = snapshot;
    this.updatedAt = performance.now();
  }
  position(player, index, time) {
    const blue = player.team === "azul";
    const elapsed =
      this.snapshot.elapsedSeconds +
      (this.snapshot.phase === "ACTIVE"
        ? Math.min(1, (time - this.updatedAt) / 1000)
        : 0);
    const travel = clamp((elapsed - player.joinedAt) / 3, 0, 1);
    const lane = index % 3,
      row = Math.floor(index / 3);
    return {
      x: 226 + lane * 134 + (blue ? -20 : 20),
      y: (blue ? 740 : 230) + (blue ? -1 : 1) * travel * (175 - row * 110),
    };
  }
  attack(event) {
    if (this.effects.length >= 180) this.effects.shift();
    const members =
      this.snapshot?.players.filter((p) => p.team === event.attackingTeam) ??
      [];
    const index = members.findIndex((p) => p.user === event.user),
      player = members[index];
    const from = player
      ? this.position(player, Math.max(0, index) % 6, performance.now())
      : { x: 360, y: kingY(event.attackingTeam) };
    this.effects.push({
      ...event,
      from,
      started: performance.now(),
      special: event.action !== "AUTO_ATTACK",
      rose: event.action === "ROSE_ATTACK",
    });
  }
  text(text, x, y, size = 20, color = "#f0e6ca", weight = 700) {
    const c = this.ctx;
    c.font = weight + " " + size + "px Segoe UI, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = color;
    c.fillText(text, x, y);
  }
  round(x, y, w, h, r, fill, stroke) {
    const c = this.ctx;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 2;
      c.stroke();
    }
  }
  field(time) {
    const c = this.ctx;
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#473237");
    bg.addColorStop(0.4, "#303c32");
    bg.addColorStop(0.6, "#293e37");
    bg.addColorStop(1, "#263a50");
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);
    // Stone borders, garden edges and two clear marching lanes.
    for (let y = 30; y < H; y += 55) {
      for (const x of [18, 664])
        this.round(x, y, 38, 47, 7, "#495148", "#667062");
      for (const x of [86, 620]) {
        c.fillStyle = "#344936";
        c.beginPath();
        c.arc(x, y + 14, 10 + Math.sin(y) * 3, 0, Math.PI * 2);
        c.fill();
      }
    }
    for (const x of [224, 358, 492]) {
      this.round(x - 44, 190, 88, 590, 25, "#bdac7820");
      c.strokeStyle = "#d8c18e14";
      c.lineWidth = 2;
      c.setLineDash([8, 16]);
      c.beginPath();
      c.moveTo(x, 208);
      c.lineTo(x, 760);
      c.stroke();
      c.setLineDash([]);
    }
    c.fillStyle = "#142d36";
    c.fillRect(58, 448, 604, 75);
    for (let y = 457; y < 515; y += 16) {
      c.strokeStyle = "#50939244";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(60, y);
      c.bezierCurveTo(260, y + Math.sin(time / 1000) * 8, 460, y - 8, 660, y);
      c.stroke();
    }
    for (const x of [226, 360, 494]) {
      this.round(x - 46, 438, 92, 94, 8, "#493c30", "#857255");
      for (let y = 445; y < 524; y += 14)
        this.round(x - 40, y, 80, 10, 2, "#aa8a58");
    }
    // A restrained center emblem leaves the actual battle readable.
    c.strokeStyle = "#e2d7b333";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(360, 485, 29, 0, Math.PI * 2);
    c.stroke();
    this.text("✦", 360, 485, 25, "#edce8c");
  }
  castle(team, time) {
    const c = this.ctx,
      x = 360,
      y = kingY(team),
      color = COLORS[team];
    c.save();
    c.translate(x, y);
    c.fillStyle = "#0004";
    c.beginPath();
    c.ellipse(0, 54, 104, 21, 0, 0, Math.PI * 2);
    c.fill();
    this.round(-94, -45, 188, 104, 16, "#222b33", "#a59777");
    for (const tx of [-74, 74]) {
      this.round(tx - 25, -64, 50, 102, 6, "#6a716c", "#c3b993");
      for (const dx of [-19, 0, 19])
        this.round(tx + dx - 7, -77, 14, 24, 2, "#a4ab96");
      this.round(tx - 11, -40, 22, 34, 8, "#1b2930");
    }
    this.round(
      -51,
      -54,
      102,
      100,
      14,
      team === "azul" ? "#295277" : "#713c49",
      color,
    );
    this.round(-21, 5, 42, 49, 17, "#131f29", "#9b8a65");
    // Crown with bright silhouette, independent of OS emoji fonts.
    c.fillStyle = "#f0c975";
    c.strokeStyle = "#9e7540";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-27, -40);
    c.lineTo(-34, -67);
    c.lineTo(-12, -56);
    c.lineTo(0, -82);
    c.lineTo(12, -56);
    c.lineTo(34, -67);
    c.lineTo(27, -40);
    c.closePath();
    c.fill();
    c.stroke();
    this.text(team === "azul" ? "REI AZUL" : "REI VERMELHO", 0, 78, 16, color);
    c.restore();
  }
  soldiers(time) {
    if (!this.snapshot) return;
    for (const team of ["vermelho", "azul"]) {
      const all = this.snapshot.players.filter((p) => p.team === team),
        visible = all.slice(0, 6);
      visible.forEach((p, index) => {
        const c = this.ctx,
          pos = this.position(p, index, time),
          color = COLORS[team];
        const bob =
          this.reduced || this.snapshot.phase !== "ACTIVE"
            ? 0
            : Math.sin(time * 0.009 + hash(p.user)) * 3;
        c.save();
        c.translate(pos.x, pos.y + bob);
        const boostRemaining = this.snapshot.phase === 'ACTIVE'
          ? Math.max(0, p.boostUntil - this.snapshot.elapsedSeconds) : 0;
        if (boostRemaining > 0) {
          c.save();
          c.strokeStyle = '#dc9bff'; c.lineWidth = 5;
          c.shadowColor = '#bd58ff'; c.shadowBlur = this.reduced ? 0 : 18;
          c.beginPath(); c.arc(0, -3, 40 + (this.reduced ? 0 : Math.sin(time / 180) * 2), 0, Math.PI * 2); c.stroke();
          c.restore();
          this.text('3× · '+Math.ceil(boostRemaining)+'s', 0, -55, 15, '#edc5ff');
        }
        c.fillStyle = "#0005";
        c.beginPath();
        c.ellipse(0, 26, 25, 8, 0, 0, Math.PI * 2);
        c.fill();
        // Legs, tunic, face, helmet, shield and a directional spear.
        c.strokeStyle = "#18202a";
        c.lineWidth = 9;
        c.beginPath();
        c.moveTo(-8, 16);
        c.lineTo(-10 + Math.sin(time * 0.009 + index) * 2, 29);
        c.moveTo(8, 16);
        c.lineTo(10, 29);
        c.stroke();
        this.round(
          -17,
          -7,
          34,
          32,
          8,
          team === "azul" ? "#3278ab" : "#b54e64",
          "#a9bac4",
        );
        c.fillStyle = "#e4c59c";
        c.beginPath();
        c.arc(0, -15, 15, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#b9c5c5";
        c.beginPath();
        c.arc(0, -19, 17, Math.PI, 0);
        c.lineTo(17, -12);
        c.lineTo(-17, -12);
        c.fill();
        this.round(-5, -35, 10, 12, 3, color);
        this.round(-27, -2, 15, 25, 6, color, "#d5cba4");
        c.strokeStyle = "#cabd9a";
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(24, 17);
        c.lineTo(24, -27);
        c.stroke();
        c.fillStyle = "#ebeadc";
        c.beginPath();
        c.moveTo(18, -25);
        c.lineTo(24, -40);
        c.lineTo(30, -25);
        c.fill();
        const photo = this.avatars.get(p.avatarUrl);
        if (photo) {
          const side = Math.min(photo.naturalWidth, photo.naturalHeight);
          c.save();
          c.beginPath();
          c.arc(0, -3, 30, 0, Math.PI * 2);
          c.clip();
          c.drawImage(photo, (photo.naturalWidth - side) / 2,
            (photo.naturalHeight - side) / 2, side, side, -30, -33, 60, 60);
          c.restore();
        }
        c.strokeStyle = color;
        c.lineWidth = 4;
        c.beginPath();
        c.arc(0, -3, 33, 0, Math.PI * 2);
        c.stroke();
        c.strokeStyle = "#f6cc71";
        c.beginPath();
        c.arc(
          0,
          -3,
          33,
          -Math.PI / 2,
          -Math.PI / 2 + (Math.PI * 2 * p.charge) / 100,
        );
        c.stroke();
        this.round(-52, 35, 104, 22, 6, "#101c2ade");
        this.text(
          "@" + (p.user.length > 10 ? p.user.slice(0, 9) + "…" : p.user),
          0,
          46,
          13,
          "#e5ecf5",
        );
        this.text(p.charge + "/100", 0, 68, 12, "#e6c376");
        c.restore();
      });
      if (all.length > 6)
        this.text(
          "+" + (all.length - 6) + " soldados ativos",
          360,
          team === "azul" ? 927 : 45,
          15,
          COLORS[team],
        );
    }
  }
  drawEffects(time) {
    const c = this.ctx;
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i],
        age = (time - e.started) / 1000,
        flight = e.special ? 0.75 : 0.38,
        lifetime = flight + 0.65;
      if (age > lifetime) {
        this.effects.splice(i, 1);
        continue;
      }
      const to = {
        x: 360 + ((hash(e.user) % 50) - 25),
        y: kingY(e.targetTeam),
      };
      c.save();
      if (age < flight && !this.reduced) {
        const t = age / flight,
          x = e.from.x + (to.x - e.from.x) * t,
          y = e.from.y + (to.y - e.from.y) * t;
        c.strokeStyle = e.rose ? '#ff68ba' : e.special ? "#ffb756" : COLORS[e.attackingTeam];
        c.lineWidth = e.special ? 12 : 3;
        c.shadowColor = c.strokeStyle;
        c.shadowBlur = e.special ? 25 : 6;
        c.beginPath();
        c.moveTo(x - (to.x - e.from.x) * 0.07, y - (to.y - e.from.y) * 0.07);
        c.lineTo(x, y);
        c.stroke();
        c.fillStyle = e.special ? "#fff0ae" : "#d4efff";
        c.beginPath();
        c.arc(x, y, e.special ? 15 : 4, 0, Math.PI * 2);
        c.fill();
        if (e.rose) this.text('✿', x, y, 36, '#ffb9de');
      } else {
        const fade = clamp((age - flight) / 0.65, 0, 1);
        c.globalAlpha = 1 - fade;
        c.strokeStyle = e.rose ? '#ff68ba' : e.special ? "#ffd286" : COLORS[e.attackingTeam];
        c.lineWidth = e.special ? 6 : 2;
        c.beginPath();
        c.arc(to.x, to.y, 12 + fade * (e.special ? 95 : 25), 0, Math.PI * 2);
        c.stroke();
        if (e.special) {
          for (let j = 0; j < 10; j++) {
            const a = (j * Math.PI) / 5;
            c.fillStyle = e.rose ? '#ff98d0' : "#ffc677";
            c.beginPath();
            c.arc(
              to.x + Math.cos(a) * fade * 100,
              to.y + Math.sin(a) * fade * 100,
              3,
              0,
              Math.PI * 2,
            );
            c.fill();
          }
        }
        this.text(
          "−" + e.damage,
          to.x + (e.special ? 0 : (hash(e.user) % 70) - 35),
          to.y - 60 - fade * 35,
          e.special ? 38 : 18,
          e.special ? "#ffe0a2" : "#fff",
        );
      }
      c.restore();
    }
  }
  frame(time) {
    this.ctx.clearRect(0, 0, W, H);
    this.field(this.reduced ? 0 : time);
    this.castle("vermelho", time);
    this.castle("azul", time);
    this.soldiers(time);
    this.drawEffects(time);
    requestAnimationFrame((t) => this.frame(t));
  }
}
