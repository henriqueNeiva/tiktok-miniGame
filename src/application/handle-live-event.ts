import type { HandleLiveEvent, Log } from "./ports.js";
import { MatchState, type MatchSnapshot } from "../domain/match-state.js";
import { giftPowerFor } from './gift-powers.js';
export type GameInterpreter = HandleLiveEvent & {
  snapshot(): MatchSnapshot;
  advanceTime(seconds: number): MatchSnapshot;
};
export function createInterpreter(
  log: Log,
  random: () => number = Math.random,
  onSnapshot?: (snapshot: MatchSnapshot) => void,
): GameInterpreter {
  const match = new MatchState();
  let gifts = 0;
  const publish = () => {
    for (const event of match.drainCombatEvents()) {
      log("DAMAGE_APPLIED", event);
      if (event.kingDefeated) log("KING_DEFEATED", { team: event.targetTeam });
    }
    onSnapshot?.(match.snapshot());
  };
  const handle: HandleLiveEvent = (event) => {
    try {
      log("INTERNAL_EVENT", { event });
      match.updateAvatar(event.user, event.avatarUrl);
      if (event.type === "GIFT_RECEIVED") {
        gifts += event.quantity;
        const power = giftPowerFor(event.giftName);
        const result = power ? match.applyGiftPower(event.user, power, event.quantity)
          : { applied: false, reason: 'unmapped_gift' };
        log('GIFT_POWER', { user: event.user, giftName: event.giftName, ...result });
        log("RESULT", {
          action: "GIFT_ACKNOWLEDGED",
          user: event.user,
          totalGifts: gifts,
          quantity: event.quantity,
          response: `@${event.user} enviou ${event.giftName} x${event.quantity}. ${result.applied ? 'Poder ativado!' : 'Presente registrado; poder não aplicado.'}`,
        });
        return;
      }
      if (event.type === "LIKE_RECEIVED") {
        if (match.snapshot().phase === "FINISHED") {
          log("EVENT_IGNORED", { reason: "round_break", user: event.user });
          return;
        }
        const update = match.recordLikes(event.user, event.count, event.total);
        log("RESULT", {
          action: "LIKE_ACKNOWLEDGED",
          user: event.user,
          count: event.count,
          ...update,
        });
        return;
      }
      const command = event.text.trim().toLowerCase();
      if (command !== "/entrar" && command !== "!entrar") {
        log("COMMENT_IGNORED", {
          user: event.user,
          reason: /^[!/]/.test(command) ? "unknown_command" : "regular_comment",
        });
        return;
      }
      const join = match.join(event.user, random, event.avatarUrl);
      if (join.alreadyJoined) {
        log("COMMENT_IGNORED", { user: event.user, reason: "already_joined" });
        return;
      }
      log("COMMAND", {
        user: event.user,
        command,
        action: "PLAYER_JOIN",
        team: join.team,
      });
      log("RESULT", {
        user: event.user,
        action: "PLAYER_JOIN",
        team: join.team,
        response: `@${event.user} entrou no time ${join.team}. Seu soldado ataca automaticamente.`,
      });
    } finally {
      publish();
    }
  };
  return Object.assign(handle, {
    snapshot: () => match.snapshot(),
    advanceTime: (seconds: number) => {
      const snapshot = match.advanceTime(seconds);
      publish();
      return snapshot;
    },
  });
}
