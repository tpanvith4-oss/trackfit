import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { sleepApi } from '../../api/sleepApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { getLatestOccurrence } from '../../services/circadianService.js';
import * as brownNoise from './brownNoiseEngine.js';
import { SmartAlarmModal } from './SmartAlarmModal.jsx';

export const SNOOZE_MS = 9 * 60_000;
const RING_WINDOW_MS = 30 * 60_000;
const ALARM_CHECK_MS = 5_000;
const SAVE_DEBOUNCE_MS = 600;

const SleepContext = createContext(null);

const cacheKey = (userId) => `trackfit.sleep.${userId}`;

function readCachedSchedule(userId) {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(userId)));
  } catch {
    return null;
  }
}

function writeCachedSchedule(userId, schedule) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(schedule));
  } catch {
    // Without storage the alarm simply waits for the server copy on next launch.
  }
}

/**
 * Owns the user's sleep schedule (cached locally so the alarm still knows the wake time
 * when the API is unreachable) and the in-app alarm clock, which rings over any tab.
 */
export function SleepProvider({ children }) {
  const { user } = useAuth();
  const userId = user.id;

  const [schedule, setSchedule] = useState(() => readCachedSchedule(userId));
  const [loadState, setLoadState] = useState({ loading: true, error: null });
  const [saveState, setSaveState] = useState({ status: 'idle', error: null });
  const [reloadToken, setReloadToken] = useState(0);
  const latestRef = useRef(schedule);
  const hasLocalEditsRef = useRef(false);
  const saveTimerRef = useRef(null);
  const saveChainRef = useRef(Promise.resolve());
  const saveSeqRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState({ loading: true, error: null });
    sleepApi
      .getSchedule({ signal: controller.signal })
      .then((serverSchedule) => {
        if (controller.signal.aborted) return;
        if (!hasLocalEditsRef.current) {
          latestRef.current = serverSchedule;
          setSchedule(serverSchedule);
          writeCachedSchedule(userId, serverSchedule);
        }
        setLoadState({ loading: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadState({ loading: false, error });
      });
    return () => controller.abort();
  }, [userId, reloadToken]);

  const persist = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    const seq = ++saveSeqRef.current;
    const snapshot = latestRef.current;
    setSaveState({ status: 'saving', error: null });

    // Chained so an older PUT can never land after a newer one.
    saveChainRef.current = saveChainRef.current.then(async () => {
      try {
        await sleepApi.saveSchedule(snapshot);
        if (seq === saveSeqRef.current) setSaveState({ status: 'saved', error: null });
      } catch (error) {
        if (seq === saveSeqRef.current) setSaveState({ status: 'error', error });
      }
    });
  }, []);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden' && saveTimerRef.current) persist();
    };
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', flushWhenHidden);
      clearTimeout(saveTimerRef.current);
    };
  }, [persist]);

  useEffect(() => () => brownNoise.stop(), []);

  const [alarm, setAlarm] = useState(null);
  const [snoozeUntil, setSnoozeUntil] = useState(null);
  const armedAtRef = useRef(Date.now());
  const lastRungRef = useRef(null);
  const wakeTime = schedule?.targetWakeTime;
  const alarmEnabled = Boolean(schedule?.enableCognitiveAlarm);

  const updateSchedule = useCallback(
    (patch) => {
      const next = { ...latestRef.current, ...patch };
      latestRef.current = next;
      hasLocalEditsRef.current = true;
      setSchedule(next);
      writeCachedSchedule(userId, next);
      if (patch.enableCognitiveAlarm === false) setSnoozeUntil(null);
      setSaveState({ status: 'pending', error: null });
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(persist, SAVE_DEBOUNCE_MS);
    },
    [userId, persist],
  );

  // Only wake-ups after the alarm was (re)armed may ring, so moving the wake time to a
  // minute that just passed, or opening the app late, doesn't set it off.
  useEffect(() => {
    armedAtRef.current = Date.now();
    lastRungRef.current = null;
  }, [wakeTime, alarmEnabled]);

  useEffect(() => {
    if (!wakeTime || alarm) return undefined;

    const check = () => {
      const now = Date.now();
      if (snoozeUntil) {
        if (now >= snoozeUntil) {
          setSnoozeUntil(null);
          setAlarm({ isTest: false, startedAt: now });
        }
        return;
      }
      if (!alarmEnabled) return;
      const occurrence = getLatestOccurrence(wakeTime, new Date(now)).getTime();
      if (occurrence < armedAtRef.current || now - occurrence > RING_WINDOW_MS || lastRungRef.current === occurrence) return;
      lastRungRef.current = occurrence;
      setAlarm({ isTest: false, startedAt: now });
    };

    check();
    const intervalId = setInterval(check, ALARM_CHECK_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', check);
    };
  }, [wakeTime, alarmEnabled, snoozeUntil, alarm]);

  const snooze = () => {
    if (alarm && !alarm.isTest) setSnoozeUntil(Date.now() + SNOOZE_MS);
    setAlarm(null);
  };

  const value = useMemo(
    () => ({
      schedule,
      loading: loadState.loading,
      loadError: loadState.error,
      reload: () => setReloadToken((token) => token + 1),
      saveState,
      retrySave: persist,
      updateSchedule,
      snoozeUntil,
      cancelSnooze: () => setSnoozeUntil(null),
      testAlarm: () => setAlarm({ isTest: true, startedAt: Date.now() }),
    }),
    [schedule, loadState, saveState, persist, updateSchedule, snoozeUntil],
  );

  return (
    <SleepContext.Provider value={value}>
      {children}
      {alarm && (
        <SmartAlarmModal
          key={alarm.startedAt}
          challengeType={schedule?.alarmChallengeType ?? 'math'}
          isTest={alarm.isTest}
          user={user}
          onSnooze={snooze}
          onClose={() => setAlarm(null)}
        />
      )}
    </SleepContext.Provider>
  );
}

export function useSleep() {
  const context = useContext(SleepContext);
  if (!context) throw new Error('useSleep must be used inside <SleepProvider>');
  return context;
}
