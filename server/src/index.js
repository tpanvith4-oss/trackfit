import { createApp, mountApiRoutes } from './app.js';
import { env } from './config/env.js';
import { attachLiveCoachWebSocket } from './services/liveCoach.service.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;
const PORT = Number.parseInt(process.env.PORT ?? '', 10) || env.port || 3000;
const HOST = process.env.HOST || env.host || '0.0.0.0';

const app = createApp();

await mountApiRoutes(app);

const server = app.listen(PORT, HOST, () => {
  console.log(`[server] Listening on http://${HOST}:${PORT}`);

  import('./config/db.js')
    .then(({ connectDb }) =>
      connectDb().then(({ mode }) => console.log(`[db] Ready (${mode})`)),
    )
    .catch((err) => console.error('[db] Init error:', err));
});

attachLiveCoachWebSocket(server);

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
    try {
      const { disconnectDb } = await import('./config/db.js');
      await disconnectDb();
    } catch {
      // ignore
    }
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});
