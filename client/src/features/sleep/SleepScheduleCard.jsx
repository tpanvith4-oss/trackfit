import { useId, useMemo } from 'react';
import { CheckIcon, SpinnerIcon } from '../../components/icons.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { calculateBedtimes, formatClockLabel, isClockTime } from '../../services/circadianService.js';

const LATENCY_STEP = 5;
const LATENCY_MIN = 0;
const LATENCY_MAX = 60;

function SaveIndicator({ saveState, onRetry }) {
  const { status } = saveState;
  if (status === 'pending' || status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-400" role="status">
        <SpinnerIcon className="size-3.5" /> Saving…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1 text-xs text-brand-400" role="status">
        <CheckIcon className="size-3.5" /> Saved
      </span>
    );
  }
  if (status === 'error') {
    return (
      <button type="button" onClick={onRetry} className="text-xs font-semibold text-rose-300 underline-offset-2 hover:underline" role="alert">
        Not saved · Retry
      </button>
    );
  }
  return null;
}

function StepButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-10 items-center justify-center rounded-xl border border-slate-700 text-lg font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function SleepScheduleCard({ schedule, onChange, saveState, onRetrySave }) {
  const id = useId();
  const { targetWakeTime, targetSleepHours, latencyMinutes } = schedule;
  const options = useMemo(() => calculateBedtimes(targetWakeTime, { latencyMinutes }), [targetWakeTime, latencyMinutes]);

  const setLatency = (value) => onChange({ latencyMinutes: Math.min(LATENCY_MAX, Math.max(LATENCY_MIN, value)) });

  return (
    <Card
      title="Sleep schedule"
      subtitle="Wake at the end of a 90-minute cycle, not halfway through one"
      action={<SaveIndicator saveState={saveState} onRetry={onRetrySave} />}
    >
      <div className="space-y-5">
        <Field label="Wake up at" htmlFor={`${id}-wake`} hint={formatClockLabel(targetWakeTime)}>
          <Input
            id={`${id}-wake`}
            type="time"
            required
            value={targetWakeTime}
            onChange={(event) => isClockTime(event.target.value) && onChange({ targetWakeTime: event.target.value })}
            className="text-lg font-semibold tabular-nums [color-scheme:dark]"
          />
        </Field>

        <div>
          <p id={`${id}-bedtime`} className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            Get into bed at
          </p>
          <div role="radiogroup" aria-labelledby={`${id}-bedtime`} className="grid grid-cols-2 gap-3">
            {options.map((option) => {
              const selected = option.sleepHours === targetSleepHours;
              return (
                <button
                  key={option.cycles}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ targetSleepHours: option.sleepHours })}
                  className={`rounded-2xl border p-3 text-left transition ${
                    selected
                      ? 'border-indigo-400/60 bg-indigo-500/10 ring-1 ring-indigo-400/40'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xl font-bold tabular-nums text-slate-50">{option.label}</span>
                    {option.isIdeal && <Badge tone="brand">Ideal</Badge>}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    {option.cycles} cycles · {option.sleepHours} h sleep
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-100">Time to fall asleep</p>
            <p className="mt-0.5 text-xs text-slate-400">Added before your first cycle starts.</p>
          </div>
          <div className="flex items-center gap-2">
            <StepButton label="Less time to fall asleep" onClick={() => setLatency(latencyMinutes - LATENCY_STEP)} disabled={latencyMinutes <= LATENCY_MIN}>
              −
            </StepButton>
            <output className="w-14 text-center text-sm font-semibold tabular-nums text-slate-100" aria-live="polite">
              {latencyMinutes} min
            </output>
            <StepButton label="More time to fall asleep" onClick={() => setLatency(latencyMinutes + LATENCY_STEP)} disabled={latencyMinutes >= LATENCY_MAX}>
              +
            </StepButton>
          </div>
        </div>
      </div>
    </Card>
  );
}
