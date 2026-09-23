import { RULES } from "./game-rules.js";
export type Team = "azul" | "vermelho";
export type MatchPhase = "LOBBY" | "ACTIVE" | "FINISHED";
export type PlayerProfile = {
  user: string;
  avatarUrl?: string;
  team: Team;
  xp: number;
  level: number;
  score: number;
  likes: number;
  attacks: number;
  specials: number;
  charge: number;
  nextAttackAt: number;
  joinedAt: number;
  boostUntil: number;
};
export type CombatEvent = {
  action: "AUTO_ATTACK" | "SPECIAL_ATTACK" | "ROSE_ATTACK";
  user: string;
  attackingTeam: Team;
  targetTeam: Team;
  damage: number;
  targetKingHp: number;
  kingDefeated: boolean;
};
export type MatchSnapshot = {
  phase: MatchPhase;
  round: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  nextRoundInSeconds?: number;
  winner?: Team;
  kingHp: Record<Team, number>;
  teamLikes: Record<Team, number>;
  players: PlayerProfile[];
  rules: typeof RULES;
};
export class MatchState {
  private profiles = new Map<string, PlayerProfile>();
  private kingHp: Record<Team, number> = {
    azul: RULES.kingHp,
    vermelho: RULES.kingHp,
  };
  private teamLikes: Record<Team, number> = { azul: 0, vermelho: 0 };
  private phase: MatchPhase = "LOBBY";
  private round = 1;
  private elapsed = 0;
  private breakElapsed = 0;
  private winner?: Team;
  private pendingEvents: CombatEvent[] = [];
  private totalLikes = 0;

  join(
    user: string,
    random: () => number,
    avatarUrl?: string,
  ): { team: Team; alreadyJoined: boolean } {
    const existing = this.profiles.get(user);
    if (existing) return { team: existing.team, alreadyJoined: true };
    const blue = [...this.profiles.values()].filter(
      (p) => p.team === "azul",
    ).length;
    const red = this.profiles.size - blue;
    const team: Team =
      blue === red
        ? random() < 0.5
          ? "azul"
          : "vermelho"
        : blue < red
          ? "azul"
          : "vermelho";
    this.profiles.set(user, {
      user,
      avatarUrl,
      team,
      xp: 0,
      level: 1,
      score: 0,
      likes: 0,
      attacks: 0,
      specials: 0,
      charge: 0,
      joinedAt: this.elapsed,
      boostUntil: 0,
      nextAttackAt: this.elapsed + RULES.attackInterval,
    });
    if (this.phase === "LOBBY") this.phase = "ACTIVE";
    return { team, alreadyJoined: false };
  }

  updateAvatar(user: string, avatarUrl?: string): void {
    const player = this.profiles.get(user);
    if (player && avatarUrl) player.avatarUrl = avatarUrl;
  }

  applyGiftPower(user: string, power: 'ROSE_STRIKE' | 'DONUT_BOOST', quantity: number) {
    const player = this.profiles.get(user);
    if (!player) return { applied: false, reason: 'player_not_joined' };
    if (this.phase !== 'ACTIVE') return { applied: false, reason: 'round_break' };
    if (!Number.isSafeInteger(quantity) || quantity <= 0) return { applied: false, reason: 'invalid_quantity' };
    if (power === 'DONUT_BOOST') {
      player.boostUntil = Math.min(RULES.roundSeconds, this.elapsed + RULES.donutDurationSeconds);
      return { applied: true, power, team: player.team, boostUntil: player.boostUntil,
        duration: player.boostUntil - this.elapsed, multiplier: RULES.donutMultiplier };
    }
    // Aggregate a finalized combo: one visual blast, damage proportional to quantity.
    this.attack(player, RULES.roseDamage * quantity, 'ROSE_ATTACK');
    return { applied: true, power, team: player.team };
  }

  recordLikes(user: string, count: number, reportedTotal?: string) {
    if (!Number.isSafeInteger(count) || count <= 0)
      throw new RangeError("Invalid like count");
    // Room total is informational. Never use it to charge one player's ability.
    const total = Number(reportedTotal);
    this.totalLikes =
      Number.isSafeInteger(total) && total >= 0
        ? Math.max(this.totalLikes, total)
        : this.totalLikes + count;
    const profile = this.profiles.get(user);
    if (!profile || this.phase !== "ACTIVE")
      return { totalLikes: this.totalLikes, playerLikes: 0, specials: 0 };
    const previous = profile.likes;
    profile.likes += count;
    profile.charge = profile.likes % RULES.likesPerSpecial;
    this.teamLikes[profile.team] += count;
    const earned =
      Math.floor(profile.likes / RULES.likesPerSpecial) -
      Math.floor(previous / RULES.likesPerSpecial);
    let specials = 0;
    for (let i = 0; i < earned && this.phase === "ACTIVE"; i++) {
      this.attack(profile, RULES.specialDamage, "SPECIAL_ATTACK");
      specials++;
    }
    return {
      totalLikes: this.totalLikes,
      playerLikes: profile.likes,
      team: profile.team,
      specials,
    };
  }

  advanceTime(seconds: number): MatchSnapshot {
    if (
      !Number.isFinite(seconds) ||
      seconds < 0 ||
      seconds > RULES.maxAdvanceSeconds
    )
      throw new RangeError("Invalid time advance");
    let pending = seconds;
    while (pending > 0 && this.phase !== "LOBBY") {
      if (this.phase === "FINISHED") {
        const delta = Math.min(pending, RULES.breakSeconds - this.breakElapsed);
        this.breakElapsed += delta;
        pending -= delta;
        if (this.breakElapsed >= RULES.breakSeconds) this.startNextRound();
        continue;
      }
      const nextAttack = Math.min(
        ...[...this.profiles.values()].map((p) => p.nextAttackAt),
      );
      const next = Math.min(RULES.roundSeconds, nextAttack);
      const delta = Math.min(pending, next - this.elapsed);
      this.elapsed += delta;
      pending -= delta;
      // Resolve simultaneous basic attacks as one volley; insertion order gives no advantage.
      if (this.elapsed >= nextAttack) {
        const attackers = [...this.profiles.values()].filter(
          (p) => p.nextAttackAt <= this.elapsed,
        );
        for (const player of attackers) {
          this.attack(player, RULES.basicDamage, "AUTO_ATTACK", false);
          player.nextAttackAt += RULES.attackInterval;
        }
        this.resolveDefeat();
      }
      if (this.phase === "ACTIVE" && this.elapsed >= RULES.roundSeconds)
        this.finish();
    }
    return this.snapshot();
  }

  drainCombatEvents(): CombatEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  snapshot(): MatchSnapshot {
    return {
      phase: this.phase,
      round: this.round,
      elapsedSeconds: this.elapsed,
      remainingSeconds: Math.max(0, RULES.roundSeconds - this.elapsed),
      nextRoundInSeconds:
        this.phase === "FINISHED"
          ? Math.max(0, RULES.breakSeconds - this.breakElapsed)
          : undefined,
      winner: this.winner,
      kingHp: { ...this.kingHp },
      teamLikes: { ...this.teamLikes },
      players: [...this.profiles.values()].map((p) => ({ ...p })),
      rules: RULES,
    };
  }

  private attack(
    player: PlayerProfile,
    requestedDamage: number,
    action: CombatEvent["action"],
    resolve = true,
  ): void {
    const targetTeam = player.team === "azul" ? "vermelho" : "azul";
    const multiplier = this.elapsed < player.boostUntil ? RULES.donutMultiplier : 1;
    const damage = Math.min(this.kingHp[targetTeam], requestedDamage * multiplier);
    if (!damage) return;
    this.kingHp[targetTeam] -= damage;
    player.attacks++;
    if (action === "SPECIAL_ATTACK") player.specials++;
    // Score measures actual HP removed, never duplicated join commands or gift price.
    player.score += damage;
    player.xp += action === "SPECIAL_ATTACK" ? 10 : action === 'AUTO_ATTACK' ? 1 : 0;
    player.level = 1 + Math.floor(player.xp / 100);
    this.pendingEvents.push({
      action,
      user: player.user,
      attackingTeam: player.team,
      targetTeam,
      damage,
      targetKingHp: this.kingHp[targetTeam],
      kingDefeated: this.kingHp[targetTeam] === 0,
    });
    if (resolve) this.resolveDefeat();
  }

  private resolveDefeat(): void {
    if (this.kingHp.azul === 0 || this.kingHp.vermelho === 0) this.finish();
  }

  private finish(): void {
    this.phase = "FINISHED";
    this.winner =
      this.kingHp.azul === this.kingHp.vermelho
        ? undefined
        : this.kingHp.azul > this.kingHp.vermelho
          ? "azul"
          : "vermelho";
  }

  private startNextRound(): void {
    this.round++;
    this.phase = "ACTIVE";
    this.elapsed = 0;
    this.breakElapsed = 0;
    this.winner = undefined;
    this.kingHp = { azul: RULES.kingHp, vermelho: RULES.kingHp };
    this.teamLikes = { azul: 0, vermelho: 0 };
    for (const player of this.profiles.values()) {
      player.score = 0;
      player.likes = 0;
      player.charge = 0;
      player.attacks = 0;
      player.specials = 0;
      player.joinedAt = 0;
      player.boostUntil = 0;
      player.nextAttackAt = RULES.attackInterval;
    }
  }
}
