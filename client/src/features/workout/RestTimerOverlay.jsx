import { Haptics } from '@capacitor/haptics';
import { useEffect, useRef, useState } from 'react';
import { endRestLiveActivity, startRestLiveActivity, updateRestLiveActivity } from '../../services/restLiveActivity.js';

function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Non-blocking rest countdown.
 * On iOS, prefers Dynamic Island / Live Activity and only shows a tiny Skip chip.
 * Elsewhere (and iOS fallback): a compact floating pill — never a full-screen modal.
 */
export function RestTimerOverlay({ seconds, exerciseName, onDone, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);
  const [islandActive, setIslandActive] = useState(false);
  const finishedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    finishedRef.current = false;
    setRemaining(seconds);
    setIslandActive(false);
    let cancelled = false;

    (async () => {
      const started = await startRestLiveActivity({ seconds, exerciseName });
      if (!cancelled) setIslandActive(Boolean(started));
    })();

    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      if (cancelled) return;
      const left = Math.max(0, seconds - (Date.now() - startedAt) / 1000);
      const rounded = Math.ceil(left);
      setRemaining(rounded);
      updateRestLiveActivity(rounded, { exerciseName });

      if (left <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        window.clearInterval(tick);
        Haptics.vibrate({ duration: 450 }).catch(() => {});
        endRestLiveActivity();
        onDoneRef.current?.();
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(tick);
      endRestLiveActivity();
    };
  }, [seconds, exerciseName]);

  const skip = () => {
    endRestLiveActivity();
    onSkip?.();
  };

  const progress = seconds > 0 ? Math.min(1, remaining / seconds) : 0;

  // Dynamic Island owns the timer — keep the workout list fully scrollable/usable.
  if (islandActive) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
        <div className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-full border border-slate-700/80 bg-slate-950/90 px-3 py-2 shadow-lg shadow-black/30 backdrop-blur">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-brand-400" aria-hidden />
          <p className="min-w-0 text-xs text-slate-300">
            Resting in Dynamic Island · <span className="font-mono tabular-nums text-slate-100">{formatClock(remaining)}</span>
          </p>
          <button
            type="button"
            onClick={skip}
            className="shrink-0 rounded-full border border-slate-600 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-slate-400"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4"
      role="status"
      aria-live="polite"
      aria-label={`Rest timer ${formatClock(remaining)}`}
    >
      <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/95 shadow-xl shadow-black/40 backdrop-blur">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Rest</p>
            <p className="truncate text-xs text-slate-400">{exerciseName || 'Next set'}</p>
          </div>
          <p className="font-mono text-2xl font-semibold tabular-nums text-slate-50">{formatClock(remaining)}</p>
          <button
            type="button"
            onClick={skip}
            className="rounded-xl border border-slate-600 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-slate-400"
          >
            Skip
          </button>
        </div>
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-brand-500 transition-[width] duration-200 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
