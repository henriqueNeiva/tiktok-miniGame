import type { HandleLiveEvent, Log } from './ports.js';
import {
  ATTACK_ENERGY_COST,
  DEFEND_ENERGY_COST,
  HEAL_ENERGY_COST,
  LIKE_ATTACK_DAMAGE,
  MatchState,
  TEAM_ATTACK_DAMAGE,
  type MatchSnapshot,
  type Team,
} from '../domain/match-state.js';

const commands: Record<string, string> = {
  '!entrar': 'PLAYER_JOIN',
  '!atacar': 'PLAYER_ATTACK', '!defender': 'PLAYER_DEFEND', '!curar': 'PLAYER_HEAL',
};

export type GameInterpreter = HandleLiveEvent & {
  snapshot(): MatchSnapshot;
  advanceTime(seconds: number): MatchSnapshot;
};

export function createInterpreter(
  log: Log,
  random: () => number = Math.random,
  onSnapshot?: (snapshot: MatchSnapshot) => void,
): GameInterpreter {
  let acceptedCommands = 0;
  let gifts = 0;
  const match = new MatchState();
  const handle: HandleLiveEvent = event => {
    try {
      log('INTERNAL_EVENT', { event });
    if (event.type === 'LIKE_RECEIVED') {
      if (match.snapshot().phase === 'FINISHED') {
        log('EVENT_IGNORED', { user: event.user, type: event.type, reason: 'round_break' });
        return;
      }
      const update = match.recordLikes(event.user, event.count, event.total);
      log('PLAYER_LIKES_UPDATED', { user: event.user, count: event.count, playerLikes: update.playerLikes, team: update.team });
      if (update.team && update.teamLikes !== undefined) {
        log('TEAM_LIKES_UPDATED', { team: update.team, count: event.count, teamLikes: update.teamLikes });
      }
      log('RESULT', { action: 'LIKE_ACKNOWLEDGED', user: event.user, count: event.count, totalLikes: update.totalLikes,
        playerLikes: update.playerLikes, team: update.team, teamLikes: update.teamLikes,
        response: `@${event.user} enviou ${event.count} curtida(s). Curtida registrada localmente.` });
      if (update.team) {
        for (let heal = 1; heal <= update.healsTriggered; heal++) {
          log('RULE_TRIGGERED', { rule: 'TEAM_LIKES_200', action: 'TEAM_HEAL', team: update.team, healNumber: heal });
          log('TEAM_HEAL_APPLIED', { team: update.team, amount: 50, kingHp: match.applyTeamHeal(update.team) });
        }
        for (let teamAttack = 1; teamAttack <= update.teamAttacksTriggered; teamAttack++) {
          const damage = match.applyAttack(update.team, TEAM_ATTACK_DAMAGE);
          log('RULE_TRIGGERED', { rule: 'TEAM_LIKES_500', action: 'TEAM_ATTACK', team: update.team, attackNumber: teamAttack, damage: TEAM_ATTACK_DAMAGE });
          log('DAMAGE_APPLIED', { action: 'TEAM_ATTACK', attackingTeam: damage.attackingTeam, targetTeam: damage.targetTeam,
            damage: damage.damage, targetKingHp: damage.targetKingHp });
          if (damage.kingDefeated) log('KING_DEFEATED', { team: damage.targetTeam, targetKingHp: damage.targetKingHp });
        }
      }
      for (let attack = 1; attack <= update.attacksTriggered; attack++) {
        log('RULE_TRIGGERED', { rule: 'PLAYER_LIKE_COMBO_100', action: 'PLAYER_ATTACK', user: event.user,
          team: update.team, playerLikes: update.playerLikes, attackNumber: attack, damage: LIKE_ATTACK_DAMAGE });
        const damage = match.applyAttack(update.team!, LIKE_ATTACK_DAMAGE, event.user);
        log('DAMAGE_APPLIED', { action: 'PLAYER_ATTACK', user: event.user, attackingTeam: damage.attackingTeam,
          targetTeam: damage.targetTeam, damage: damage.damage, targetKingHp: damage.targetKingHp });
        if (damage.kingDefeated) log('KING_DEFEATED', { team: damage.targetTeam, targetKingHp: damage.targetKingHp });
      }
      return;
    }
    if (event.type === 'GIFT_RECEIVED') {
      if (match.snapshot().phase === 'FINISHED') {
        log('EVENT_IGNORED', { user: event.user, type: event.type, reason: 'round_break' });
        return;
      }
      gifts += event.quantity;
      const isRose = event.giftName.trim().toLowerCase() === 'rose';
      const gift = isRose ? match.addGift(event.user, event.quantity) : undefined;
      if (gift?.team) log('TACTICAL_CHARGE_UPDATED', { user: event.user, team: gift.team, quantity: event.quantity, tacticalCharges: gift.tacticalCharges });
      log('RESULT', { action: 'GIFT_ACKNOWLEDGED', user: event.user, quantity: event.quantity, totalGifts: gifts,
        team: gift?.team, tacticalCharges: gift?.tacticalCharges,
        response: `@${event.user} enviou ${event.giftName} x${event.quantity}. Presente registrado localmente.` });
      return;
    }
    const parts = event.text.trim().toLowerCase().split(/\s+/);
    const command = parts[0] ?? '';
    const requestedTeam = parts[1];
    const action = commands[command];
    const validJoin = command === '!entrar' && parts.length <= 2 && (!requestedTeam || requestedTeam === 'azul' || requestedTeam === 'vermelho');
    if (!action || (command !== '!entrar' && parts.length !== 1)) {
      log('COMMENT_IGNORED', { user: event.user, reason: command.startsWith('!') ? 'unknown_command' : 'regular_comment' });
      return;
    }
    if (command === '!entrar' && !validJoin) {
      log('COMMENT_IGNORED', { user: event.user, reason: 'invalid_join_team' });
      return;
    }
    if (command === '!entrar' && match.teamOf(event.user)) {
      const team = match.teamOf(event.user);
      log('COMMENT_IGNORED', { user: event.user, reason: 'already_joined', team });
      return;
    }
      if (command === '!entrar') {
        acceptedCommands++;
        const join = match.join(event.user, requestedTeam as Team | undefined, random);
        log('COMMAND', { user: event.user, command, action, team: join.team });
        log('RESULT', { user: event.user, action, team: join.team, acceptedCommands,
          response: `@${event.user} entrou no time ${join.team}.` });
        return;
      }

      const team = match.teamOf(event.user);
      if (!team) {
        log('COMMENT_IGNORED', { user: event.user, command, reason: 'player_not_joined' });
        return;
      }
      if (match.snapshot().phase !== 'ACTIVE') {
        log('COMMENT_IGNORED', { user: event.user, command, reason: 'round_break' });
        return;
      }
      const cost = action === 'PLAYER_ATTACK' ? ATTACK_ENERGY_COST : action === 'PLAYER_DEFEND' ? DEFEND_ENERGY_COST : HEAL_ENERGY_COST;
      if (!match.spendEnergy(event.user, cost)) {
        log('COMMENT_IGNORED', { user: event.user, command, reason: 'insufficient_energy', requiredEnergy: cost,
          energy: match.profileOf(event.user)?.energy ?? 0 });
        return;
      }
      acceptedCommands++;
      log('COMMAND', { user: event.user, command, action, team, cost });
      if (action === 'PLAYER_ATTACK') {
        const damage = match.applyAttack(team, LIKE_ATTACK_DAMAGE, event.user);
        log('DAMAGE_APPLIED', { action, user: event.user, attackingTeam: team, targetTeam: damage.targetTeam,
          damage: damage.damage, shieldAbsorbed: damage.shieldAbsorbed, targetKingHp: damage.targetKingHp });
      } else if (action === 'PLAYER_DEFEND') {
        log('SHIELD_APPLIED', { action, user: event.user, team, shield: match.addShield(team) });
      } else {
        log('TEAM_HEAL_APPLIED', { action, user: event.user, team, amount: 50, kingHp: match.applyTeamHeal(team) });
      }
      log('RESULT', { user: event.user, action, team, acceptedCommands, energy: match.profileOf(event.user)?.energy,
        response: `@${event.user} usou ${command} pelo time ${team}.` });
    } finally {
      onSnapshot?.(match.snapshot());
    }
  };
  return Object.assign(handle, {
    snapshot: () => match.snapshot(),
    advanceTime: (seconds: number) => {
      const snapshot = match.advanceTime(seconds);
      onSnapshot?.(snapshot);
      return snapshot;
    },
  });
}
