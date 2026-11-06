/**
 * Liveness probe only — no DB. Render / load balancers must get an instant 200
 * even while Neon is still connecting in the background.
 */
export function getHealth(_req, res) {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
