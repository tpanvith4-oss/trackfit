import { useEffect, useRef, useState } from 'react';
import { workoutsApi } from '../../api/workoutsApi.js';
import { CheckIcon, SpinnerIcon } from '../../components/icons.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';

function parseRepTarget(reps) {
  const match = String(reps).match(/(\d+)/);
  return match ? Number(match[1]) : 10;
}

/**
 * Per-exercise auto-save logger: checkmark posts one set immediately, then unlocks the next.
 */
export function ExerciseSetCard({
  exercise,
  splitDay,
  sessionId,
  restSeconds,
  onSession,
  onSetLogged,
}) {
  const plannedSets = exercise.sets;
  const [weightKg, setWeightKg] = useState(String(exercise.ghost?.weightKg ?? 0));
  const [reps, setReps] = useState(String(exercise.ghost?.reps ?? parseRepTarget(exercise.reps)));
  const [rir, setRir] = useState(String(exercise.ghost?.rir ?? 1));
  const [logged, setLogged] = useState(() => new Map());
  const [activeSet, setActiveSet] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const repsRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    setWeightKg(String(exercise.ghost?.weightKg ?? 0));
    setReps(String(exercise.ghost?.reps ?? parseRepTarget(exercise.reps)));
    setRir(String(exercise.ghost?.rir ?? 1));
    setLogged(new Map());
    setActiveSet(1);
    setError(null);
  }, [exercise.exerciseName, exercise.ghost, exercise.reps, splitDay]);

  const saveSet = async (setNumber) => {
    if (savingRef.current) return;
    const parsedReps = parseInt(reps, 10);
    const parsedWeight = parseFloat(weightKg);
    const parsedRir = parseInt(rir, 10);
    if (!Number.isFinite(parsedReps) || parsedReps < 1) {
      setError(new Error('Enter reps before checking the set.'));
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const data = await workoutsApi.logSet({
        splitDay,
        sessionId: sessionId ?? undefined,
        exerciseName: exercise.exerciseName,
        primaryMuscle: exercise.primaryMuscle,
        secondaryMuscles: exercise.secondaryMuscles ?? [],
        setNumber,
        weightKg: Number.isFinite(parsedWeight) ? parsedWeight : 0,
        reps: parsedReps,
        rir: Number.isFinite(parsedRir) ? parsedRir : 1,
        restSeconds,
      });

      setLogged((prev) => {
        const next = new Map(prev);
        next.set(setNumber, {
          weightKg: data.set.weightKg,
          reps: data.set.reps,
          rir: data.set.rir,
        });
        return next;
      });

      onSession?.(data.session?.id ?? null);
      const nextSet = Math.min(plannedSets, data.nextSetNumber ?? setNumber + 1);
      setActiveSet(nextSet);
      onSetLogged?.({
        exerciseName: exercise.exerciseName,
        setNumber,
        nextSetNumber: nextSet,
        finishedExercise: setNumber >= plannedSets,
      });

      queueMicrotask(() => repsRef.current?.focus());
    } catch (err) {
      setError(err);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const onEnter = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (!logged.has(activeSet) && activeSet <= plannedSets) saveSet(activeSet);
  };

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <div>
        <p className="text-sm font-semibold text-slate-100">{exercise.exerciseName}</p>
        <p className="text-[11px] text-slate-500">
          {plannedSets} × {exercise.reps} · {exercise.overloadHint}
          {exercise.ghost && ` · last ${exercise.ghost.weightKg} kg × ${exercise.ghost.reps}`}
        </p>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <label className="text-[10px] uppercase tracking-wide text-slate-500">
          kg
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm tabular-nums text-slate-100"
            type="number"
            step="0.5"
            inputMode="decimal"
            value={weightKg}
            onChange={(event) => setWeightKg(event.target.value)}
            onKeyDown={onEnter}
            disabled={saving}
          />
        </label>
        <label className="text-[10px] uppercase tracking-wide text-slate-500">
          reps
          <input
            ref={repsRef}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm tabular-nums text-slate-100"
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(event) => setReps(event.target.value)}
            onKeyDown={onEnter}
            disabled={saving}
          />
        </label>
        <label className="text-[10px] uppercase tracking-wide text-slate-500">
          RIR
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm tabular-nums text-slate-100"
            type="number"
            min="0"
            max="5"
            inputMode="numeric"
            value={rir}
            onChange={(event) => setRir(event.target.value)}
            onKeyDown={onEnter}
            disabled={saving}
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {Array.from({ length: plannedSets }, (_, index) => {
          const setNumber = index + 1;
          const done = logged.has(setNumber);
          const isActive = setNumber === activeSet && !done;
          const locked = setNumber > activeSet && !done;
          return (
            <button
              key={setNumber}
              type="button"
              disabled={saving || locked || done}
              aria-pressed={done}
              aria-label={done ? `Set ${setNumber} saved` : `Save set ${setNumber}`}
              onClick={() => saveSet(setNumber)}
              className={`inline-flex size-9 items-center justify-center rounded-lg border text-xs font-bold transition ${
                done
                  ? 'border-brand-500 bg-brand-500/20 text-brand-300'
                  : isActive
                    ? 'border-brand-400 bg-brand-500/10 text-brand-200 ring-1 ring-brand-500/40'
                    : 'border-slate-700 bg-slate-900 text-slate-500'
              } disabled:cursor-not-allowed`}
            >
              {saving && isActive ? <SpinnerIcon className="size-4" /> : done ? <CheckIcon className="size-4" /> : setNumber}
            </button>
          );
        })}
      </div>

      {logged.size > 0 && (
        <p className="mt-2 text-[11px] text-slate-500">
          Saved {logged.size}/{plannedSets}
          {logged.has(activeSet - 1) && logged.get(activeSet - 1)
            ? ` · last ${logged.get(activeSet - 1).weightKg} kg × ${logged.get(activeSet - 1).reps}`
            : ''}
        </p>
      )}
      <ErrorMessage error={error} />
    </li>
  );
}
