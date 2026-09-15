import type { TikTokAdapter } from './tiktok-adapter.js';

const players = [
  ['luna', 'azul'], ['theo', 'vermelho'], ['mari', 'azul'], ['kadu', 'vermelho'],
  ['bia', 'azul'], ['nina', 'vermelho'], ['gui', 'azul'], ['leo', 'vermelho'],
] as const;

export function startArenaDemo(adapter: TikTokAdapter): NodeJS.Timeout {
  let step = 0;
  return setInterval(() => {
    const player = players[step % players.length]!;
    if (step < players.length) {
      adapter.receive('chat', { user: { uniqueId: player[0] }, comment: `!entrar ${player[1]}`, common: { msgId: `join-${step}` } });
    } else {
      const action = step % 7;
      const messageId = `demo-${step}`;
      if (action <= 2) {
        adapter.receive('like', { user: { uniqueId: player[0] }, count: 25, total: String((step - players.length + 1) * 25), common: { msgId: messageId } });
      } else if (action === 3) {
        adapter.receive('chat', { user: { uniqueId: player[0] }, comment: '!atacar', common: { msgId: messageId } });
      } else if (action === 4) {
        adapter.receive('chat', { user: { uniqueId: player[0] }, comment: '!defender', common: { msgId: messageId } });
      } else if (action === 5) {
        adapter.receive('chat', { user: { uniqueId: player[0] }, comment: '!curar', common: { msgId: messageId } });
      } else {
        adapter.receive('gift', { user: { uniqueId: player[0] }, giftId: 5655, gift: { type: 2, name: 'Rose' }, repeatCount: 1, common: { msgId: messageId } });
      }
    }
    step += 1;
  }, 850);
}
