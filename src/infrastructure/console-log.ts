import type { Source } from '../domain/events.js';
import type { Log } from '../application/ports.js';
export function createLog(source: Source): Log {
  return (stage, fields) => console.log(JSON.stringify({ time: new Date().toISOString(), source, stage, ...fields }));
}
