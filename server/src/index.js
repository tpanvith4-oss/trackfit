import { createApp, mountApiRoutes } from './app.js';
import { env } from './config/env.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;
const PORT = Number.parseInt(process.env.PORT ?? '', 10) || env.port || 4000;
const HOST = process.env.HOST || env.host || '0.0.0.0';

/**
 * Bind instantly so Render keep-alive / deploy health checks get `/health` within 30s.
 * Prisma + AI route graph load in the background after the port is open.
 */
const app = createApp();

const server = app.listen(PORT, HOST, () => {
  console.log(`Server bound to port ${PORT} instantly.`);

  // Lazy-load Prisma — never import it before listen (cold-start cost).
  import('./config/db.js')
    .then(({ connectDb }) =>
      connectDb()
        .then(() => console.log('[db] Connected'))
        .catch((err) => console.error('DB connect err:', err)),
    )
    .catch((err) => console.error('DB connect err:', err));

  // Heavy routers (Prisma models, Gemini/NVIDIA) after bind.
  mountApiRoutes(app)
    .then(() => console.log('[server] API routes mounted'))
    .catch((err) => console.error('[server] Failed to mount API routes:', err));
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
