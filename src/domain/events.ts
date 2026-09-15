export type Source = 'simulation' | 'tiktok';
export type LiveEvent = {
  source: Source;
  user: string;
  messageId?: string;
} & (
  | { type: 'COMMENT'; text: string }
  | { type: 'LIKE_RECEIVED'; count: number; total?: string }
  | { type: 'GIFT_RECEIVED'; giftId: string; giftName: string; quantity: number }
);
