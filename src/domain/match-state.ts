export type Team = 'azul' | 'vermelho';
export const INITIAL_KING_HP = 1_000;
export const LIKE_ATTACK_DAMAGE = 10;
export const MATCH_DURATION_SECONDS = 5 * 60;
export const NEXT_ROUND_DELAY_SECONDS = 30;
export const MAX_TIME_ADVANCE_SECONDS = 60 * 60;
export const TEAM_HEAL_THRESHOLD = 200;
export const TEAM_HEAL_AMOUNT = 50;
export const TEAM_ATTACK_THRESHOLD = 500;
export const TEAM_ATTACK_DAMAGE = 50;
export const TACTICAL_CHARGES_PER_ROSE = 1;
export const INITIAL_PLAYER_ENERGY = 2;
export const MAX_PLAYER_ENERGY = 5;
export const LIKES_PER_ENERGY = 25;
export const ATTACK_ENERGY_COST = 2;
export const DEFEND_ENERGY_COST = 2;
export const HEAL_ENERGY_COST = 3;
export const DEFEND_SHIELD_AMOUNT = 30;

export type MatchPhase = 'LOBBY' | 'ACTIVE' | 'FINISHED';

export type PlayerProfile = {
  user: string;
  team: Team;
  xp: number;
  level: number;
  score: number;
  likes: number;
  attacks: number;
  energy: number;
};

export type JoinResult = {
  team: Team;
  alreadyJoined: boolean;
};

export type LikeUpdate = {
  count: number;
  totalLikes: number;
  playerLikes: number;
  team?: Team;
  teamLikes?: number;
  attacksTriggered: number;
  healsTriggered: number;
  teamHp?: number;
  teamAttacksTriggered: number;
};

export type AttackResult = {
  attackingTeam: Team;
  targetTeam: Team;
  damage: number;
  targetKingHp: number;
  kingDefeated: boolean;
  shieldAbsorbed: number;
};

export type GiftUpdate = {
  user: string;
  team?: Team;
  quantity: number;
  tacticalCharges: number;
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
  tacticalCharges: Record<Team, number>;
  kingShield: Record<Team, number>;
  players: PlayerProfile[];
};

export class MatchState {
  private readonly players = new Map<string, Team>();
  private readonly teamLikes: Record<Team, number> = { azul: 0, vermelho: 0 };
  private readonly playerLikes = new Map<string, number>();
  private readonly playerAttackThresholds = new Map<string, number>();
  private readonly kingHp: Record<Team, number> = { azul: INITIAL_KING_HP, vermelho: INITIAL_KING_HP };
  private readonly teamHealThresholds = new Map<Team, number>();
  private readonly teamAttackThresholds = new Map<Team, number>();
  private readonly tacticalCharges: Record<Team, number> = { azul: 0, vermelho: 0 };
  private readonly kingShield: Record<Team, number> = { azul: 0, vermelho: 0 };
  private readonly profiles = new Map<string, PlayerProfile>();
  private totalLikes = 0;
  private phase: MatchPhase = 'LOBBY';
  private round = 1;
  private elapsedSeconds = 0;
  private roundBreakElapsedSeconds = 0;
  private winner: Team | undefined;

  join(user: string, requestedTeam: Team | undefined, random: () => number): JoinResult {
    const currentTeam = this.players.get(user);
    if (currentTeam) return { team: currentTeam, alreadyJoined: true };
    const team = requestedTeam ?? this.chooseBalancedTeam(random);
    this.players.set(user, team);
    this.profiles.set(user, { user, team, xp: 10, level: 1, score: 10, likes: 0, attacks: 0, energy: INITIAL_PLAYER_ENERGY });
    if (this.phase === 'LOBBY') this.phase = 'ACTIVE';
    return { team, alreadyJoined: false };
  }

  teamOf(user: string): Team | undefined {
    return this.players.get(user);
  }

  advanceTime(seconds: number): MatchSnapshot {
    let pendingSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    if (pendingSeconds > MAX_TIME_ADVANCE_SECONDS) {
      throw new RangeError(`Time advance cannot exceed ${MAX_TIME_ADVANCE_SECONDS} seconds.`);
    }
    while (pendingSeconds > 0) {
      if (this.phase === 'ACTIVE') {
        const available = MATCH_DURATION_SECONDS - this.elapsedSeconds;
        const consumed = Math.min(available, pendingSeconds);
        this.elapsedSeconds += consumed;
        pendingSeconds -= consumed;
        if (this.elapsedSeconds >= MATCH_DURATION_SECONDS) this.finishByScore();
      } else if (this.phase === 'FINISHED') {
        const available = NEXT_ROUND_DELAY_SECONDS - this.roundBreakElapsedSeconds;
        const consumed = Math.min(available, pendingSeconds);
        this.roundBreakElapsedSeconds += consumed;
        pendingSeconds -= consumed;
        if (this.roundBreakElapsedSeconds >= NEXT_ROUND_DELAY_SECONDS) this.startNextRound();
      } else {
        break;
      }
    }
    return this.snapshot();
  }

  snapshot(): MatchSnapshot {
    return {
      phase: this.phase,
      round: this.round,
      elapsedSeconds: this.elapsedSeconds,
      remainingSeconds: MATCH_DURATION_SECONDS - this.elapsedSeconds,
      nextRoundInSeconds: this.phase === 'FINISHED' ? NEXT_ROUND_DELAY_SECONDS - this.roundBreakElapsedSeconds : undefined,
      winner: this.winner,
      kingHp: { ...this.kingHp },
      teamLikes: { ...this.teamLikes },
      tacticalCharges: { ...this.tacticalCharges },
      kingShield: { ...this.kingShield },
      players: [...this.profiles.values()].map(profile => ({ ...profile })),
    };
  }

  profileOf(user: string): PlayerProfile | undefined {
    const profile = this.profiles.get(user);
    return profile ? { ...profile } : undefined;
  }

  ranking(): PlayerProfile[] {
    return [...this.profiles.values()].map(profile => ({ ...profile })).sort((left, right) => right.score - left.score);
  }

  recordLikes(user: string, count: number, reportedTotal?: string): LikeUpdate {
    const total = reportedTotal ? Number(reportedTotal) : undefined;
    this.totalLikes = total !== undefined && Number.isSafeInteger(total) && total >= this.totalLikes
      ? total
      : this.totalLikes + count;

    const playerLikes = (this.playerLikes.get(user) ?? 0) + count;
    this.playerLikes.set(user, playerLikes);
    const profile = this.profiles.get(user);
    if (profile) {
      const energyEarned = Math.floor(playerLikes / LIKES_PER_ENERGY) - Math.floor((playerLikes - count) / LIKES_PER_ENERGY);
      profile.likes += count;
      profile.energy = Math.min(MAX_PLAYER_ENERGY, profile.energy + energyEarned);
      const likeMilestones = Math.floor(playerLikes / 100) - Math.floor((playerLikes - count) / 100);
      profile.score += likeMilestones * 10;
      profile.xp += likeMilestones * 10;
      profile.level = this.levelFor(profile.xp);
    }
    const team = this.players.get(user);
    const teamLikes = team ? this.teamLikes[team] + count : undefined;
    if (team && teamLikes !== undefined) this.teamLikes[team] = teamLikes;
    const thresholdsReached = Math.floor(playerLikes / 100);
    const previousThresholds = this.playerAttackThresholds.get(user) ?? 0;
    const attacksTriggered = team ? thresholdsReached - previousThresholds : 0;
    if (team) this.playerAttackThresholds.set(user, thresholdsReached);
    const healsTriggered = team ? this.thresholdCrossings(team, teamLikes!, TEAM_HEAL_THRESHOLD, this.teamHealThresholds) : 0;
    const teamAttacksTriggered = team ? this.thresholdCrossings(team, teamLikes!, TEAM_ATTACK_THRESHOLD, this.teamAttackThresholds) : 0;
    if (team && profile) {
      profile.score += attacksTriggered * 15;
      profile.xp += attacksTriggered * 10;
      profile.level = this.levelFor(profile.xp);
    }

    return {
      count,
      totalLikes: this.totalLikes,
      playerLikes,
      team,
      teamLikes,
      attacksTriggered,
      healsTriggered,
      teamHp: team ? this.kingHp[team] : undefined,
      teamAttacksTriggered,
    };
  }

  applyAttack(attackingTeam: Team, damage = LIKE_ATTACK_DAMAGE, user?: string): AttackResult {
    if (this.phase === 'FINISHED') return { attackingTeam, targetTeam: attackingTeam === 'azul' ? 'vermelho' : 'azul', damage: 0, targetKingHp: this.kingHp[attackingTeam === 'azul' ? 'vermelho' : 'azul'], kingDefeated: false, shieldAbsorbed: 0 };
    const targetTeam: Team = attackingTeam === 'azul' ? 'vermelho' : 'azul';
    const attackerLevel = user ? this.profiles.get(user)?.level ?? 1 : 1;
    const levelBonus = Math.min(5, Math.max(0, Math.floor((attackerLevel - 1) / 2)));
    const appliedDamage = damage === LIKE_ATTACK_DAMAGE ? damage + levelBonus : damage;
    const shieldAbsorbed = Math.min(this.kingShield[targetTeam], appliedDamage);
    this.kingShield[targetTeam] -= shieldAbsorbed;
    const healthDamage = appliedDamage - shieldAbsorbed;
    const targetKingHp = Math.max(0, this.kingHp[targetTeam] - healthDamage);
    this.kingHp[targetTeam] = targetKingHp;
    if (user) {
      const profile = this.profiles.get(user);
      if (profile) profile.attacks += 1;
    }
    if (targetKingHp === 0) { this.phase = 'FINISHED'; this.winner = attackingTeam; }
    return { attackingTeam, targetTeam, damage: healthDamage, targetKingHp, kingDefeated: targetKingHp === 0, shieldAbsorbed };
  }

  applyTeamHeal(team: Team): number {
    if (this.phase === 'FINISHED') return this.kingHp[team];
    this.kingHp[team] = Math.min(INITIAL_KING_HP, this.kingHp[team] + TEAM_HEAL_AMOUNT);
    return this.kingHp[team];
  }

  addShield(team: Team, amount = DEFEND_SHIELD_AMOUNT): number {
    if (this.phase !== 'FINISHED') this.kingShield[team] = Math.min(100, this.kingShield[team] + amount);
    return this.kingShield[team];
  }

  spendEnergy(user: string, cost: number): boolean {
    const profile = this.profiles.get(user);
    if (!profile || profile.energy < cost || this.phase !== 'ACTIVE') return false;
    profile.energy -= cost;
    profile.score += 10;
    profile.xp += 5;
    profile.level = this.levelFor(profile.xp);
    return true;
  }

  addGift(user: string, quantity: number): GiftUpdate {
    const team = this.players.get(user);
    if (team) this.tacticalCharges[team] = Math.min(3, this.tacticalCharges[team] + quantity * TACTICAL_CHARGES_PER_ROSE);
    return { user, team, quantity, tacticalCharges: team ? this.tacticalCharges[team] : 0 };
  }

  private thresholdCrossings(team: Team, value: number, threshold: number, reached: Map<Team, number>): number {
    const current = Math.floor(value / threshold);
    const previous = reached.get(team) ?? 0;
    reached.set(team, current);
    return Math.max(0, current - previous);
  }

  private levelFor(xp: number): number {
    let level = 1;
    let required = 100;
    let remaining = xp;
    while (remaining >= required) { remaining -= required; level++; required = level * 100; }
    return level;
  }

  private finishByScore(): void {
    this.phase = 'FINISHED';
    this.winner = this.kingHp.azul === this.kingHp.vermelho ? undefined : this.kingHp.azul > this.kingHp.vermelho ? 'azul' : 'vermelho';
  }

  private startNextRound(): void {
    this.round += 1;
    this.phase = 'ACTIVE';
    this.elapsedSeconds = 0;
    this.roundBreakElapsedSeconds = 0;
    this.winner = undefined;
    this.totalLikes = 0;
    this.kingHp.azul = INITIAL_KING_HP;
    this.kingHp.vermelho = INITIAL_KING_HP;
    this.kingShield.azul = 0;
    this.kingShield.vermelho = 0;
    this.teamLikes.azul = 0;
    this.teamLikes.vermelho = 0;
    this.tacticalCharges.azul = 0;
    this.tacticalCharges.vermelho = 0;
    this.playerLikes.clear();
    this.playerAttackThresholds.clear();
    this.teamHealThresholds.clear();
    this.teamAttackThresholds.clear();
    for (const profile of this.profiles.values()) {
      profile.score = 0;
      profile.likes = 0;
      profile.attacks = 0;
      profile.energy = INITIAL_PLAYER_ENERGY;
    }
  }

  private chooseBalancedTeam(random: () => number): Team {
    const blueCount = [...this.players.values()].filter(team => team === 'azul').length;
    const redCount = this.players.size - blueCount;
    if (blueCount < redCount) return 'azul';
    if (redCount < blueCount) return 'vermelho';
    return random() < 0.5 ? 'azul' : 'vermelho';
  }
}
