import type { Source } from '../domain/events.js';
import type { HandleLiveEvent, Log } from '../application/ports.js';

type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj => value !== null && typeof value === 'object' ? value as Obj : {};
const id = (value: unknown): string | undefined =>
  (typeof value === 'string' && value !== '' && value !== '0') || (typeof value === 'number' && value > 0) || (typeof value === 'bigint' && value > 0n)
    ? String(value) : undefined;

// Bounded, session-local replay protection. No promise of exactly-once delivery.
export class TikTokAdapter {
  private seen = new Set<string>();
  constructor(private source: Source, private emit: HandleLiveEvent, private log: Log) {}

  receive(kind: 'chat' | 'gift' | 'like', payload: unknown): void {
    const data = obj(payload);
    const user = id(obj(data.user).displayId) ?? id(obj(data.user).uniqueId) ?? id(obj(data.user).id) ?? id(obj(data.user).userId);
    const messageId = id(obj(data.common).msgId);
    if (!user) { this.log('INVALID_EVENT', { kind, reason: 'missing_user' }); return; }
    const base = { source: this.source, user, messageId };
    if (kind === 'like') {
      const count = data.count;
      const total = data.total;
      if (!Number.isSafeInteger(count) || Number(count) <= 0) {
        this.log('INVALID_EVENT', { kind, user, reason: 'invalid_like_count' }); return;
      }
      this.log('RECEIVED', { kind, user, messageId, count, total });
      this.emit({ ...base, type: 'LIKE_RECEIVED', count: Number(count), total: typeof total === 'string' ? total : undefined });
      return;
    }
    if (kind === 'chat') {
      const comment = data.content ?? data.comment;
      if (typeof comment !== 'string' || !comment.trim()) {
        this.log('INVALID_EVENT', { kind, reason: 'missing_comment' }); return;
      }
      this.log('RECEIVED', { kind, user, messageId, text: comment });
      if (messageId && this.duplicate(`chat:${messageId}`)) return;
      this.emit({ ...base, type: 'COMMENT', text: comment });
      return;
    }
    const details = obj(data.gift ?? data.giftDetails);
    const giftId = id(data.giftId);
    const quantity = data.repeatCount;
    const giftType = details.type ?? details.giftType;
    if (!giftId || !Number.isSafeInteger(quantity) || Number(quantity) <= 0 ||
        !Number.isSafeInteger(giftType) || Number(giftType) < 0 ||
        (giftType === 1 && ![true, false, 0, 1].includes(data.repeatEnd as boolean | number))) {
      this.log('INVALID_EVENT', { kind, user, reason: 'invalid_gift_fields' }); return;
    }
    const name = details.name ?? details.giftName;
    const giftName = typeof name === 'string' && name ? name : `gift-${giftId}`;
    this.log('RECEIVED', { kind, user, messageId, giftId, giftName, quantity, repeatEnd: data.repeatEnd });
    if (giftType === 1 && (data.repeatEnd === false || data.repeatEnd === 0)) {
      this.log('GIFT_PROGRESS', { user, giftId, quantity, counted: false }); return;
    }
    // A streak group is stronger than a message ID (the final can be retransmitted).
    const groupId = id(data.groupId);
    const key = giftType === 1 && groupId ? `streak:${user}:${giftId}:${groupId}` : messageId ? `gift:${messageId}` : undefined;
    if (key && this.duplicate(key)) return;
    if (!key) this.log('DEDUP_UNAVAILABLE', { kind, user, giftId });
    this.emit({ ...base, type: 'GIFT_RECEIVED', giftId, giftName, quantity: Number(quantity) });
  }

  private duplicate(key: string): boolean {
    if (this.seen.has(key)) { this.log('DUPLICATE_IGNORED', { key }); return true; }
    this.seen.add(key);
    if (this.seen.size > 10_000) this.seen.delete(this.seen.values().next().value!);
    return false;
  }
}
