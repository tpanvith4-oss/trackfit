import { createApp } from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { env } from './config/env.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start() {
  try {
    await connectDb();
  } catch (err) {
    console.error(
      '[db] Could not connect to PostgreSQL. Is it running (`npm run db:up`) and is DATABASE_URL correct?\n',
      err.message,
    );
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.port, env.host, () => {
    console.log(`[server] TrackFit API listening on http://${env.host}:${env.port} (${env.nodeEnv})`);
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] ${signal} received, shutting down gracefully...`);

    setTimeout(() => {
      console.error('[server] Forced shutdown after timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();

    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});

start();
