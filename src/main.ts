import { TikTokAdapter } from './infrastructure/tiktok-adapter.js';
import { createLog } from './infrastructure/console-log.js';
import { createInterpreter } from './application/handle-live-event.js';
import { simulate } from './infrastructure/simulation.js';
import { readUsername } from './config/config.js';
import { createArenaServer } from './infrastructure/arena-server.js';
import { startArenaDemo } from './infrastructure/arena-demo.js';
import type { Log } from './application/ports.js';

async function runArena(): Promise<void> {
  const demo = process.argv[3] === '--demo';
  let username: string | undefined;
  if (!demo) {
    try { username = readUsername(process.argv[3], process.env.TIKTOK_USERNAME); } catch {
      createLog('tiktok')('CONFIG_ERROR', { message: 'Informe o @perfil: npm run arena -- @perfil (ou use npm run arena:demo)' });
      process.exitCode = 1;
      return;
    }
  }
  const consoleLog = createLog(demo ? 'simulation' : 'tiktok');
  const arena = createArenaServer();
  const log: Log = (stage, fields) => {
    consoleLog(stage, fields);
    arena.log(stage, fields);
  };
  const interpreter = createInterpreter(log, Math.random, snapshot => arena.updateSnapshot(snapshot));
  const adapter = new TikTokAdapter(demo ? 'simulation' : 'tiktok', interpreter, log);
  const configuredPort = Number(process.env.ARENA_PORT ?? 3000);
  const port = Number.isSafeInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65_535 ? configuredPort : 3000;
  await arena.start(port);
  arena.updateSnapshot(interpreter.snapshot());
  log('ARENA_READY', { url: `http://localhost:${port}`, demo });
  const timer = setInterval(() => interpreter.advanceTime(1), 1_000);
  timer.unref();
  if (demo) {
    startArenaDemo(adapter);
    return;
  }
  if (!username) return;
  const { runLive } = await import('./infrastructure/tiktok-live.js');
  await runLive(username, adapter, log);
}

const mode = process.argv[2];
if (mode !== 'simulate' && mode !== 'live' && mode !== 'arena') {
  console.error('Uso: npm run simulate | npm run live -- @perfil | npm run arena -- @perfil | npm run arena:demo');
  process.exitCode = 1;
} else if (mode === 'arena') {
  await runArena();
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
