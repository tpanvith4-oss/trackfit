import { Haptics } from '@capacitor/haptics';
import { useEffect, useRef, useState } from 'react';
import { endRestLiveActivity, startRestLiveActivity, updateRestLiveActivity } from '../../services/restLiveActivity.js';
import { Button } from '../../components/ui/Button.jsx';

function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Full-screen rest countdown. No audio — haptics only when finished.
 * Live Activity / Dynamic Island is best-effort on iOS.
 */
export function RestTimerOverlay({ seconds, exerciseName, onDone, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);
  const finishedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    finishedRef.current = false;
    setRemaining(seconds);
    let cancelled = false;

    (async () => {
      await startRestLiveActivity({ seconds, exerciseName });
    })();

    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      if (cancelled) return;
      const left = Math.max(0, seconds - (Date.now() - startedAt) / 1000);
      const rounded = Math.ceil(left);
      setRemaining(rounded);
      updateRestLiveActivity(rounded);

      if (left <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        window.clearInterval(tick);
        Haptics.vibrate({ duration: 450 }).catch(() => {});
        endRestLiveActivity();
        onDoneRef.current?.();
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearInterval(tick);
      endRestLiveActivity();
    };
  }, [seconds, exerciseName]);

  const progress = seconds > 0 ? Math.min(1, remaining / seconds) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Rest timer"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl shadow-black/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rest</p>
        <p className="mt-1 truncate text-sm text-slate-300">{exerciseName || 'Next set'}</p>
        <p className="mt-4 text-center font-mono text-5xl font-semibold tabular-nums text-slate-50">
          {formatClock(remaining)}
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-200 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={() => {
              endRestLiveActivity();
              onSkip?.();
            }}
          >
            Skip rest
          </Button>
        </div>
      </div>
    </div>
  );
}
