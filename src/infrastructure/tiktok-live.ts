import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import type { ClientEventMap } from 'tiktok-live-connector';
import type { TikTokAdapter } from './tiktok-adapter.js';
import type { Log } from '../application/ports.js';

// Log only error messages, never transport objects containing headers/cookies.
export function errorMessage(error: unknown): string {
  const value = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Erro do conector; confira conectividade, perfil e serviço de assinatura.';
  const key = process.env.EULER_API_KEY;
  return key ? value.split(key).join('[REDACTED]') : value;
}

export async function runLive(username: string, adapter: TikTokAdapter, log: Log): Promise<void> {
  const connection = new TikTokLiveConnection(username, {
    processInitialData: false,
    // Event payloads contain gift type/name; the optional catalog requires paid signing.
    enableExtendedGiftInfo: false,
    signApiKey: process.env.EULER_API_KEY || undefined,
    wsClientOptions: { handshakeTimeout: 15_000 },
  });
  // Published typed-emitter default import does not resolve with NodeNext.
  // Keep the workaround at the SDK boundary, preserving its event-specific types.
  const events = connection as unknown as { on<K extends keyof ClientEventMap>(event: K, handler: ClientEventMap[K]): void };
  let stopping = false;
  const stop = async (reason: string, code: number) => {
    if (stopping) return;
    stopping = true;
    log('STOPPING', { reason });
    process.exitCode = code;
    const deadline = setTimeout(() => process.exit(code), 3000);
    deadline.unref();
    try { await connection.disconnect(); }
    catch (error) { log('ERROR', { message: errorMessage(error) }); }
  };
  events.on(WebcastEvent.CHAT, data => adapter.receive('chat', data));
  events.on(WebcastEvent.GIFT, data => adapter.receive('gift', data));
  events.on(WebcastEvent.LIKE, data => adapter.receive('like', data));
  events.on(ControlEvent.CONNECTED, state => log('CONNECTED', { username, roomId: state.roomId }));
  events.on(ControlEvent.ERROR, error => log('ERROR', { message: errorMessage(error) }));
  events.on(ControlEvent.DISCONNECTED, () => {
    log('DISCONNECTED', { expected: stopping, retry: 'Execute novamente npm run live -- @perfil' });
    if (!stopping) void stop('connection_lost', 1);
  });
  events.on(WebcastEvent.STREAM_END, () => { void stop('stream_end', 0); });
  process.once('SIGINT', () => { void stop('SIGINT', 0); });
  process.once('SIGTERM', () => { void stop('SIGTERM', 0); });
  log('CONNECTING', { username });
  const timeout = setTimeout(() => { log('ERROR', { message: 'Conexão excedeu 60 segundos.' }); void stop('connect_timeout', 1); }, 60_000);
  try {
    await connection.connect();
    if (stopping) await connection.disconnect();
  } catch (error) {
    log('CONNECT_FAILED', { message: errorMessage(error), hint: 'Verifique se o perfil está ao vivo, a rede e a disponibilidade do serviço de assinatura Euler.' });
    await stop('connect_failed', 1);
  } finally { clearTimeout(timeout); }
}
