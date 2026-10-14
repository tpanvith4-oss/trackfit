/**
 * A collision-resistant, cuid-style id ("c" + timestamp + 96 random bits), safe to send as an
 * idempotency key. Uses getRandomValues, which unlike randomUUID also works on plain-http dev hosts.
 */
export function createId() {
  const random = Array.from(crypto.getRandomValues(new Uint32Array(3)), (n) => n.toString(36).padStart(7, '0')).join('');
  return `c${Date.now().toString(36)}${random}`;
}
