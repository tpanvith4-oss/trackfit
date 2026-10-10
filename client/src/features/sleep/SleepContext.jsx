import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { sleepApi } from '../../api/sleepApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { getLatestOccurrence } from '../../services/circadianService.js';
import {
  ALARM_RING_WINDOW_MS,
  NATIVE_DAYS_AHEAD,
  getNativeAlarmPermissions,
  isNativeAlarmSupported,
  openExactAlarmSettings,
  requestNativeAlarmPermissions,
  syncNativeAlarms,
} from '../../services/nativeAlarmScheduler.js';
import * as brownNoise from './brownNoiseEngine.js';
import { SmartAlarmModal } from './SmartAlarmModal.jsx';

export const SNOOZE_MS = 9 * 60_000;
const ALARM_CHECK_MS = 5_000;
const SAVE_DEBOUNCE_MS = 600;
const NATIVE_ALARMS = isNativeAlarmSupported();

const SleepContext = createContext(null);

const cacheKey = (userId) => `trackfit.sleep.${userId}`;
const alarmStateKey = (userId) => `trackfit.alarm.${userId}`;

function readStored(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Without storage the alarm simply waits for the server copy on next launch.
  }
}

/**
 * `armedFor` is the wake time the alarm was last armed for (null when off) and `armedAt`
 * when; `handledAt` is when the last real alarm was snoozed or dismissed.
 */
const INITIAL_ALARM_STATE = { armedFor: null, armedAt: 0, handledAt: 0, snoozeUntil: null };

/** A wake-up that rang (or should have) after the alarm was armed and hasn't been answered yet. */
const isUnanswered = (occurrence, alarmState, now) =>
  occurrence >= alarmState.armedAt && occurrence > alarmState.handledAt && now - occurrence <= ALARM_RING_WINDOW_MS;

function planNativeAlarms(wakeTime, alarmState, now) {
  const series = [];
  const { snoozeUntil } = alarmState;
  if (snoozeUntil && now - snoozeUntil <= ALARM_RING_WINDOW_MS) series.push({ startsAt: snoozeUntil, kind: 'snooze' });
  if (!wakeTime) return series;

  const latest = getLatestOccurrence(wakeTime, new Date(now));
  if (isUnanswered(latest.getTime(), alarmState, now)) series.push({ startsAt: latest.getTime(), kind: 'wake' });
  for (let day = 1; day <= NATIVE_DAYS_AHEAD; day += 1) {
    const occurrence = new Date(latest);
    occurrence.setDate(latest.getDate() + day);
    series.push({ startsAt: occurrence.getTime(), kind: 'wake' });
  }
  return series;
}

/**
 * Owns the user's sleep schedule (cached locally so the alarm still knows the wake time
 * when the API is unreachable) and the alarm clock: it rings in-app over any tab and, on
 * Android, is mirrored into native notifications that fire even when TrackFit is closed.
 */
export function SleepProvider({ children }) {
  const { user } = useAuth();
  const userId = user.id;

  const [schedule, setSchedule] = useState(() => readStored(cacheKey(userId)));
  const [loadState, setLoadState] = useState({ loading: true, error: null });
  const [saveState, setSaveState] = useState({ status: 'idle', error: null });
  const [reloadToken, setReloadToken] = useState(0);
  const latestRef = useRef(schedule);
  const hasLocalEditsRef = useRef(false);
  const saveTimerRef = useRef(null);
  const saveChainRef = useRef(Promise.resolve());
  const saveSeqRef = useRef(0);
  const aliveRef = useRef(true);

  const replaceSchedule = useCallback(
    (next) => {
      latestRef.current = next;
      setSchedule(next);
      writeStored(cacheKey(userId), next);
    },
    [userId],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoadState({ loading: true, error: null });
    sleepApi
      .getSchedule({ signal: controller.signal })
      .then((serverSchedule) => {
        if (controller.signal.aborted) return;
        if (!hasLocalEditsRef.current) replaceSchedule(serverSchedule);
        setLoadState({ loading: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadState({ loading: false, error });
      });
    return () => controller.abort();
  }, [reloadToken, replaceSchedule]);

  const persist = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    const seq = ++saveSeqRef.current;
    const snapshot = latestRef.current;
    setSaveState({ status: 'saving', error: null });

    // Chained so an older PUT can never land after a newer one.
    saveChainRef.current = saveChainRef.current.then(async () => {
      try {
        const saved = await sleepApi.saveSchedule(snapshot);
        if (!aliveRef.current) return;
        // `updatedAt` marks the schedule as set up by the user, which is what arms the alarm.
        replaceSchedule({ ...latestRef.current, updatedAt: saved.updatedAt });
        if (seq === saveSeqRef.current) setSaveState({ status: 'saved', error: null });
      } catch (error) {
        if (seq === saveSeqRef.current) setSaveState({ status: 'error', error });
      }
    });
  }, [replaceSchedule]);

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

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      brownNoise.stop();
      // Signing out must not leave this account's alarms ringing on the device.
      if (NATIVE_ALARMS) syncNativeAlarms([]).catch(() => {});
    };
  }, []);

  const [alarm, setAlarm] = useState(null);
  const [alarmState, setAlarmState] = useState(() => ({
    ...INITIAL_ALARM_STATE,
    ...readStored(alarmStateKey(userId)),
  }));
  const updateAlarmState = useCallback((patch) => setAlarmState((state) => ({ ...state, ...patch })), []);

  useEffect(() => writeStored(alarmStateKey(userId), alarmState), [userId, alarmState]);

  // Default schedules never ring: the alarm arms once the user has saved a schedule.
  const alarmArmed = Boolean(schedule?.enableCognitiveAlarm && schedule?.updatedAt);
  const armedWakeTime = alarmArmed ? schedule.targetWakeTime : null;
  // False for the render between a wake-time change and the re-arm below.
  const alarmStateReady = alarmState.armedFor === armedWakeTime;

  // Only wake-ups after the alarm was (re)armed may ring, so moving the wake time to a
  // minute that just passed doesn't set it off.
  useEffect(() => {
    const now = Date.now();
    setAlarmState((state) => (state.armedFor === armedWakeTime ? state : { ...state, armedFor: armedWakeTime, armedAt: now }));
  }, [armedWakeTime]);

  const updateSchedule = useCallback(
    (patch) => {
      hasLocalEditsRef.current = true;
      replaceSchedule({ ...latestRef.current, ...patch });
      if (patch.enableCognitiveAlarm === false) updateAlarmState({ snoozeUntil: null });
      setSaveState({ status: 'pending', error: null });
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(persist, SAVE_DEBOUNCE_MS);
    },
    [replaceSchedule, updateAlarmState, persist],
  );

  useEffect(() => {
    if (!alarmStateReady || alarm) return undefined;

    const check = () => {
      const now = Date.now();
      const { snoozeUntil } = alarmState;
      if (snoozeUntil) {
        if (now < snoozeUntil) return;
        if (now - snoozeUntil <= ALARM_RING_WINDOW_MS) setAlarm({ isTest: false, startedAt: now });
        else updateAlarmState({ snoozeUntil: null });
        return;
      }
      if (!armedWakeTime) return;
      const occurrence = getLatestOccurrence(armedWakeTime, new Date(now)).getTime();
      if (isUnanswered(occurrence, alarmState, now)) setAlarm({ isTest: false, startedAt: now });
    };

    check();
    const intervalId = setInterval(check, ALARM_CHECK_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', check);
    };
  }, [alarmStateReady, alarm, alarmState, armedWakeTime, updateAlarmState]);

  const [nativePermissions, setNativePermissions] = useState(null);
  const [nativeSyncError, setNativeSyncError] = useState(null);
  const permissionPromptedRef = useRef(false);

  useEffect(() => {
    if (!NATIVE_ALARMS) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        let status = await getNativeAlarmPermissions();
        if (armedWakeTime && status.notifications === 'prompt' && !permissionPromptedRef.current) {
          permissionPromptedRef.current = true;
          status = await requestNativeAlarmPermissions();
        }
        if (active) setNativePermissions(status);
      } catch {
        // Unknown permissions just hide the native status hints.
      }
    };
    const refreshWhenVisible = () => document.visibilityState === 'visible' && refresh();
    refresh();
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [armedWakeTime]);

  useEffect(() => {
    if (!NATIVE_ALARMS || !alarmStateReady) return undefined;
    const sync = () => {
      syncNativeAlarms(planNativeAlarms(armedWakeTime, alarmState, Date.now())).then(
        () => setNativeSyncError(null),
        (error) => setNativeSyncError(error),
      );
    };
    // Re-planned on resume so the week of armed wake-ups keeps rolling forward.
    const syncWhenVisible = () => document.visibilityState === 'visible' && sync();
    sync();
    document.addEventListener('visibilitychange', syncWhenVisible);
    return () => document.removeEventListener('visibilitychange', syncWhenVisible);
  }, [alarmStateReady, armedWakeTime, alarmState]);

  const answerAlarm = (patch) => {
    if (alarm && !alarm.isTest) updateAlarmState({ handledAt: Date.now(), snoozeUntil: null, ...patch });
  };

  const snooze = () => {
    answerAlarm({ snoozeUntil: Date.now() + SNOOZE_MS });
    setAlarm(null);
  };

  const nativeAlarm = useMemo(
    () =>
      NATIVE_ALARMS && {
        permissions: nativePermissions,
        error: nativeSyncError,
        requestPermission: () => requestNativeAlarmPermissions().then(setNativePermissions, () => {}),
        openExactAlarmSettings: () => openExactAlarmSettings().then(setNativePermissions, () => {}),
      },
    [nativePermissions, nativeSyncError],
  );

  const value = useMemo(
    () => ({
      schedule,
      loading: loadState.loading,
      loadError: loadState.error,
      reload: () => setReloadToken((token) => token + 1),
      saveState,
      retrySave: persist,
      updateSchedule,
      alarmArmed,
      armAlarm: () => updateSchedule({ enableCognitiveAlarm: true }),
      snoozeUntil: alarmState.snoozeUntil,
      cancelSnooze: () => updateAlarmState({ snoozeUntil: null }),
      testAlarm: () => setAlarm({ isTest: true, startedAt: Date.now() }),
      nativeAlarm,
    }),
    [schedule, loadState, saveState, persist, updateSchedule, alarmArmed, alarmState.snoozeUntil, updateAlarmState, nativeAlarm],
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
          onDismiss={() => answerAlarm()}
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
