import type { LiveEvent } from '../domain/events.js';
export type Log = (stage: string, fields: Record<string, unknown>) => void;
export type HandleLiveEvent = (event: LiveEvent) => void;
