const TOKEN_KEY = 'trackfit.auth.token';
const USER_KEY = 'trackfit.auth.user';

function read(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode, quota); the in-memory session still works.
  }
}

let currentToken = read(TOKEN_KEY);

export const getAuthToken = () => currentToken;

/** @returns {{ token: string, user: object } | null} */
export function loadSession() {
  currentToken = read(TOKEN_KEY);
  if (!currentToken) return null;
  try {
    const user = JSON.parse(read(USER_KEY) ?? 'null');
    return user && typeof user === 'object' ? { token: currentToken, user } : null;
  } catch {
    return null;
  }
}

export function saveSession({ token, user }) {
  currentToken = token;
  write(TOKEN_KEY, token);
  write(USER_KEY, JSON.stringify(user));
}

export function saveUser(user) {
  write(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  currentToken = null;
  write(TOKEN_KEY, null);
  write(USER_KEY, null);
}

export const isSessionStorageKey = (key) => key === TOKEN_KEY || key === USER_KEY;
