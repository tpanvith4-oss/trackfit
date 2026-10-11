import { storage } from '../services/storageService.js';

const TOKEN_KEY = 'trackfit.auth.token';
const USER_KEY = 'trackfit.auth.user';

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Whether `token` looks like an unexpired session JWT for `userId`. Only the shape is checked
 * here; the server still verifies the signature on every request.
 */
export function isUsableSessionToken(token, userId) {
  if (typeof token !== 'string') return false;
  const payload = decodeJwtPayload(token);
  if (!payload || payload.userId !== userId) return false;
  // Scoped tokens (iOS Shortcuts sync) are rejected by every session endpoint.
  if (payload.scope) return false;
  return typeof payload.exp !== 'number' || payload.exp * 1000 > Date.now();
}

const isProfile = (user) => Boolean(user) && typeof user === 'object' && typeof user.id === 'string';

/** The token requests should carry right now, read from storage so every tab and launch agrees. */
export async function getAuthToken() {
  const token = await storage.get(TOKEN_KEY);
  return typeof token === 'string' && token ? token : null;
}

/** @returns {Promise<{ token: string, user: object } | null>} */
export async function loadSession() {
  const [token, user] = await Promise.all([storage.get(TOKEN_KEY), storage.get(USER_KEY)]);
  return isProfile(user) && isUsableSessionToken(token, user.id) ? { token, user } : null;
}

/** Like `loadSession`, but also clears a stored session that is expired or malformed. */
export async function restoreSession() {
  const session = await loadSession();
  if (!session) await clearSession();
  return session;
}

/** The profile carries the user's goals (calories, protein, weight range), so they persist with it. */
export async function saveSession({ token, user }) {
  await Promise.all([storage.set(TOKEN_KEY, token), storage.set(USER_KEY, user)]);
}

export function saveUser(user) {
  return storage.set(USER_KEY, user);
}

export async function clearSession() {
  await Promise.all([storage.remove(TOKEN_KEY), storage.remove(USER_KEY)]);
}

export const isSessionStorageKey = (key) => key === TOKEN_KEY || key === USER_KEY;
