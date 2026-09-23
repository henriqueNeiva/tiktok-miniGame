import type { TikTokAdapter } from "./tiktok-adapter.js";
const players = ["luna", "theo", "mari", "kadu", "bia", "nina", "gui", "leo"];
export function startArenaDemo(adapter: TikTokAdapter): NodeJS.Timeout {
  let step = 0;
  return setInterval(() => {
    const user = { displayId: players[step % players.length]! };
    if (step < players.length)
      adapter.receive("chat", {
        user,
        content: "/entrar",
        common: { msgId: `join-${step}` },
      });
    else if (step % 24 === 8 || step % 24 === 16)
      adapter.receive('gift', {
        user, giftId: step % 24 === 8 ? 'demo-donut' : 'demo-rose',
        gift: { type: 2, name: step % 24 === 8 ? 'Doughnut' : 'Rose' },
        repeatCount: 1, common: { msgId: `gift-${step}` },
      });
    else
      adapter.receive("like", {
        user,
        count: 25,
        common: { msgId: `like-${step}` },
      });
    step++;
  }, 650);
}
