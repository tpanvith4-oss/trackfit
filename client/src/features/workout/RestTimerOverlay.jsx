import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useEffect, useRef, useState } from 'react';
import {
  cancelBackgroundRestTimer,
  isRestNotification,
  requestRestNotificationPermission,
  startBackgroundRestTimer,
} from '../../services/restBackgroundTimer.js';

function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Inline rest countdown + Local Notification when the timer ends (works in background).
 * Foreground: Haptics.vibrate() at zero. No Live Activities / Dynamic Island.
 */
export function RestTimerOverlay({ seconds, exerciseName, onDone, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);
  const [armed, setArmed] = useState(false);
  const finishedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const finish = async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    await cancelBackgroundRestTimer();
    Haptics.vibrate({ duration: 500 }).catch(() => {});
    onDoneRef.current?.();
  };

  useEffect(() => {
    finishedRef.current = false;
    setRemaining(seconds);
    setArmed(false);
    let cancelled = false;
    let tickId = 0;
    let receivedHandle;
    let actionHandle;

    (async () => {
      await requestRestNotificationPermission();
      if (cancelled) return;
      const started = await startBackgroundRestTimer({ seconds, exerciseName });
      if (cancelled) return;
      setArmed(Boolean(started.notificationScheduled));

      if (Capacitor.isNativePlatform()) {
        receivedHandle = await LocalNotifications.addListener('localNotificationReceived', (notification) => {
          if (isRestNotification(notification)) finish();
        });
        actionHandle = await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
          if (isRestNotification(event?.notification)) finish();
        });
      }
    })();

    const startedAt = Date.now();
    tickId = window.setInterval(() => {
      if (cancelled || finishedRef.current) return;
      const left = Math.max(0, seconds - (Date.now() - startedAt) / 1000);
      setRemaining(Math.ceil(left));
      if (left <= 0) {
        window.clearInterval(tickId);
        finish();
      }
    }, 250);

    const onVisible = () => {
      if (document.visibilityState !== 'visible' || finishedRef.current) return;
      if (seconds - (Date.now() - startedAt) / 1000 <= 0) finish();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(tickId);
      document.removeEventListener('visibilitychange', onVisible);
      receivedHandle?.remove();
      actionHandle?.remove();
      cancelBackgroundRestTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, exerciseName]);

  const skip = () => {
    finishedRef.current = true;
    cancelBackgroundRestTimer();
    onSkip?.();
  };

  const progress = seconds > 0 ? Math.min(1, remaining / seconds) : 0;

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-slate-700/80 bg-slate-900 px-3 py-2"
      role="status"
      aria-live="polite"
      aria-label={`Rest timer ${formatClock(remaining)}`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {armed ? 'Rest · notification armed' : 'Rest'}
          </p>
          <p className="truncate text-xs text-slate-400">{exerciseName || 'Next set'}</p>
        </div>
        <p className="font-mono text-lg font-semibold tabular-nums text-slate-100">{formatClock(remaining)}</p>
        <button
          type="button"
          onClick={skip}
          className="rounded-lg border border-slate-600 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-slate-400"
        >
          Skip
        </button>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-brand-500 transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
