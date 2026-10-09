import { pingDb } from '../config/db.js';

export async function getHealth(_req, res) {
  let database = 'up';
  try {
    await pingDb();
  } catch {
    database = 'down';
  }

  const healthy = database === 'up';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
