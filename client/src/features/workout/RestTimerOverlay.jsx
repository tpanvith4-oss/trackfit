import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics } from '@capacitor/haptics';
import { useEffect, useRef, useState } from 'react';
import {
  cancelBackgroundRestTimer,
  isRestNotification,
  startBackgroundRestTimer,
  tickBackgroundRestTimer,
} from '../../services/restBackgroundTimer.js';

function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Rest timer controller.
 * - Native: no floating/blurred overlay. Runs via Local Notification (background vibrate/alert)
 *   + Live Activity when available. Only a compact inline strip is shown.
 * - Web: small inline strip, no backdrop blur / no full-screen sheet.
 */
export function RestTimerOverlay({ seconds, exerciseName, onDone, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);
  const [bgArmed, setBgArmed] = useState(false);
  const [islandActive, setIslandActive] = useState(false);
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
    setBgArmed(false);
    let cancelled = false;
    let tickId = 0;
    let receivedHandle;
    let actionHandle;

    (async () => {
      const started = await startBackgroundRestTimer({ seconds, exerciseName });
      if (cancelled) return;
      setIslandActive(Boolean(started.island));
      setBgArmed(Boolean(started.notificationScheduled || started.island));

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
      const rounded = Math.ceil(left);
      setRemaining(rounded);
      tickBackgroundRestTimer(rounded, { exerciseName });
      if (left <= 0) {
        window.clearInterval(tickId);
        finish();
      }
    }, 250);

    const onVisible = () => {
      if (document.visibilityState !== 'visible' || finishedRef.current) return;
      const left = seconds - (Date.now() - startedAt) / 1000;
      if (left <= 0) finish();
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
    // finish/onDone are stable via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, exerciseName]);

  const skip = () => {
    finishedRef.current = true;
    cancelBackgroundRestTimer();
    onSkip?.();
  };

  // Dynamic Island is showing the countdown — keep Train clean; only a Skip control.
  if (islandActive) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-2">
        <p className="text-xs text-brand-200">Resting in Dynamic Island · {formatClock(remaining)}</p>
        <button
          type="button"
          onClick={skip}
          className="rounded-lg border border-brand-500/40 px-2.5 py-1 text-[11px] font-semibold text-brand-100"
        >
          Skip
        </button>
      </div>
    );
  }

  // Fallback (no Island yet): slim inline strip — no floating blur overlay.
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900 px-3 py-2"
      role="status"
      aria-live="polite"
      aria-label={`Rest timer ${formatClock(remaining)}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {bgArmed && Capacitor.isNativePlatform() ? 'Rest · notification armed' : 'Rest'}
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
  );
}
