import { TikTokAdapter } from './infrastructure/tiktok-adapter.js';
import { createLog } from './infrastructure/console-log.js';
import { createInterpreter } from './application/handle-live-event.js';
import { simulate } from './infrastructure/simulation.js';
import { readUsername } from './config/config.js';

const mode = process.argv[2];
if (mode !== 'simulate' && mode !== 'live') {
  console.error('Uso: npm run simulate | npm run live -- @perfil | npm start -- simulate');
  process.exitCode = 1;
} else {
  const source = mode === 'live' ? 'tiktok' : 'simulation';
  const log = createLog(source);
  const adapter = new TikTokAdapter(source, createInterpreter(log), log);
  if (mode === 'simulate') {
    log('SIMULATION_START', { realConnection: false });
    simulate(adapter);
    log('SIMULATION_END', { realConnection: false, expectedTotalGifts: 5 });
  } else {
    let username: string | undefined;
    try { username = readUsername(process.argv[3], process.env.TIKTOK_USERNAME); } catch {
      log('CONFIG_ERROR', { message: 'Informe o @perfil que está ao vivo: npm run live -- @perfil' });
      process.exitCode = 1;
    }
    if (username) {
      try {
        const { runLive } = await import('./infrastructure/tiktok-live.js');
        await runLive(username, adapter, log);
      } catch {
        log('FATAL_ERROR', { message: 'Não foi possível iniciar o conector. Confira npm ci e npm run check.' });
        process.exitCode = 1;
      }
    }
  }
}
