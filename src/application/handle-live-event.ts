import type { HandleLiveEvent, Log } from './ports.js';
import { LIKE_ATTACK_DAMAGE, MatchState, TEAM_ATTACK_DAMAGE, type Team } from '../domain/match-state.js';

const commands: Record<string, string> = {
  '!entrar': 'PLAYER_JOIN',
  '!atacar': 'PLAYER_ATTACK', '!defender': 'PLAYER_DEFEND', '!curar': 'PLAYER_HEAL', '!boss': 'PLAYER_BOSS',
};

export function createInterpreter(log: Log, random: () => number = Math.random): HandleLiveEvent {
  let acceptedCommands = 0;
  let gifts = 0;
  const match = new MatchState();
  return event => {
    log('INTERNAL_EVENT', { event });
    if (event.type === 'LIKE_RECEIVED') {
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
    acceptedCommands++;
    const join = command === '!entrar' ? match.join(event.user, requestedTeam as Team | undefined, random) : undefined;
    const team = join?.team;
    log('COMMAND', { user: event.user, command, action, team });
    log('RESULT', { user: event.user, action, team, acceptedCommands,
      response: team ? `@${event.user} entrou no time ${team}.` : `@${event.user}: ${command} reconhecido e registrado localmente.` });
  };
}
