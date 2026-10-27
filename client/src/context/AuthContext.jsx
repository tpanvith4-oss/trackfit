import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onUnauthorized } from '../api/apiClient.js';
import { authApi } from '../api/authApi.js';
import { clearSession, isSessionStorageKey, loadSession, restoreSession, saveSession, saveUser } from '../api/authSession.js';
import { cancelWakeAlarm } from '../services/nativeAlarmScheduler.js';

const AuthContext = createContext(null);

const cancelAccountAlarms = () => cancelWakeAlarm().catch(() => {});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [restoredToken, setRestoredToken] = useState(null);
  const [authEvent, setAuthEvent] = useState(null);
  const sessionRef = useRef(null);
  sessionRef.current = session;

  useEffect(() => {
    let active = true;
    restoreSession().then((restored) => {
      if (!active) return;
      // Alarms armed by an account whose session expired must not keep ringing.
      if (!restored) cancelAccountAlarms();
      setSession(restored);
      setRestoredToken(restored?.token ?? null);
      setIsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const startSession = useCallback(async (next, type) => {
    // Saved before the dashboard mounts, because its requests read the token from storage.
    await saveSession(next);
    setSession(next);
    setAuthEvent({ type, name: next.user.name, at: Date.now() });
    return next.user;
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    setRestoredToken(null);
    setAuthEvent(null);
    clearSession();
    cancelAccountAlarms();
  }, []);

  const login = useCallback(
    async ({ username, password }) => startSession(await authApi.login({ username, password }), 'login'),
    [startSession],
  );

  const register = useCallback(async (profile) => startSession(await authApi.register(profile), 'register'), [startSession]);

  const updateProfile = useCallback(async (profile) => {
    const user = await authApi.updateProfile(profile);
    saveUser(user);
    setSession((prev) => (prev ? { ...prev, user } : prev));
    return user;
  }, []);

  useEffect(
    () =>
      onUnauthorized((_error, token) => {
        if (token === sessionRef.current?.token) logout();
      }),
    [logout],
  );

  // A restored profile may be stale (goals edited on another device), so refresh it once per launch.
  useEffect(() => {
    if (!restoredToken) return undefined;
    const controller = new AbortController();
    authApi
      .me({ signal: controller.signal })
      .then((user) => {
        if (sessionRef.current?.token !== restoredToken) return;
        saveUser(user);
        setSession((prev) => (prev?.token === restoredToken ? { ...prev, user } : prev));
      })
      .catch(() => {
        // 401s sign out through onUnauthorized; offline keeps the cached profile.
      });
    return () => controller.abort();
  }, [restoredToken]);

  useEffect(() => {
    let latestRead = 0;
    const syncAcrossTabs = async (event) => {
      if (event.key !== null && !isSessionStorageKey(event.key)) return;
      const read = ++latestRead;
      const next = await loadSession();
      if (read === latestRead) setSession(next);
    };
    window.addEventListener('storage', syncAcrossTabs);
    return () => window.removeEventListener('storage', syncAcrossTabs);
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token && session?.user),
      isReady,
      authEvent,
      login,
      register,
      updateProfile,
      logout,
    }),
    [session, isReady, authEvent, login, register, updateProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
