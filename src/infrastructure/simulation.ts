import type { TikTokAdapter } from './tiktok-adapter.js';

export function simulate(adapter: TikTokAdapter): void {
  adapter.receive('chat', { common: { msgId: 'c1' }, user: { uniqueId: 'joao' }, comment: '/entrar' });
  adapter.receive('chat', { common: { msgId: 'c2' }, user: { uniqueId: 'maria' }, comment: '!entrar' });
  adapter.receive('like', { common: { msgId: 'l1' }, user: { uniqueId: 'joao' }, count: 100, total: '100' });
  adapter.receive('chat', { user: { uniqueId: 'ana' }, comment: 'Oi, live!' });
  adapter.receive('chat', { user: { uniqueId: 'ana' }, comment: '!desconhecido' });
  const rose = { user: { uniqueId: 'pedro' }, giftId: 5655, gift: { type: 1, name: 'Rose' }, groupId: 'combo-1' };
  for (const repeatCount of [1, 2, 3]) adapter.receive('gift', { ...rose, repeatCount, repeatEnd: false });
  const final = { ...rose, common: { msgId: 'g1' }, repeatCount: 3, repeatEnd: true };
  adapter.receive('gift', final);
  adapter.receive('gift', final);
  adapter.receive('gift', { ...rose, groupId: 'combo-2', repeatCount: 1, repeatEnd: true });
  adapter.receive('gift', { user: { uniqueId: 'ana' }, common: { msgId: 'g2' }, giftId: 999,
    gift: { type: 2, name: 'Presente simulado' }, repeatCount: 1 });
}

