import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onUnauthorized } from '../api/apiClient.js';
import { authApi } from '../api/authApi.js';
import { clearSession, isSessionStorageKey, loadSession, saveSession, saveUser } from '../api/authSession.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);
  const [authEvent, setAuthEvent] = useState(null);
  const initialToken = useRef(session?.token ?? null);

  const startSession = useCallback((next, type) => {
    saveSession(next);
    setSession(next);
    setAuthEvent({ type, name: next.user.name, at: Date.now() });
    return next.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setAuthEvent(null);
  }, []);

  const login = useCallback(
    async ({ username, password }) => startSession(await authApi.login({ username, password }), 'login'),
    [startSession],
  );

  const register = useCallback(async (profile) => startSession(await authApi.register(profile), 'register'), [startSession]);

  useEffect(() => onUnauthorized(logout), [logout]);

  useEffect(() => {
    const token = initialToken.current;
    if (!token) return undefined;

    const controller = new AbortController();
    authApi
      .me({ signal: controller.signal })
      .then((user) => {
        saveUser(user);
        setSession((prev) => (prev?.token === token ? { ...prev, user } : prev));
      })
      .catch((err) => {
        if (err?.status === 401) logout();
      });
    return () => controller.abort();
  }, [logout]);

  useEffect(() => {
    const syncAcrossTabs = (event) => {
      if (event.key === null || isSessionStorageKey(event.key)) setSession(loadSession());
    };
    window.addEventListener('storage', syncAcrossTabs);
    return () => window.removeEventListener('storage', syncAcrossTabs);
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token && session?.user),
      authEvent,
      login,
      register,
      logout,
    }),
    [session, authEvent, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
