/** Liveness only — kept for imports; prefer inline handlers in `app.js` (no DB). */
export function getHealth(_req, res) {
  res.status(200).json({ status: 'ok' });
}
