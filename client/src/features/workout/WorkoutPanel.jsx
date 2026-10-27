import { useEffect, useMemo, useState } from 'react';
import { workoutsApi } from '../../api/workoutsApi.js';
import { CheckIcon, SpinnerIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { RECOVERY_STYLES, SPLIT_DAY_LABELS, WEEKDAY_SPLIT } from '../../constants/cutProtocol.js';
import { useAsyncData } from '../../hooks/useAsyncData.js';

const SPLIT_OPTIONS = Object.keys(SPLIT_DAY_LABELS);

function defaultSplit() {
  return WEEKDAY_SPLIT[new Date().getDay()] ?? 'REST';
}

function parseRepTarget(reps) {
  const match = String(reps).match(/(\d+)/);
  return match ? Number(match[1]) : 10;
}

export function WorkoutPanel() {
  const [splitDay, setSplitDay] = useState(defaultSplit);
  const [completed, setCompleted] = useState(() => new Set());
  const [setDrafts, setSetDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveOk, setSaveOk] = useState(false);

  const { data: template, error: templateError, loading: templateLoading, reload: reloadTemplate } = useAsyncData(
    (signal) => workoutsApi.template(splitDay, { signal }),
    [splitDay],
  );
  const { data: recoveryData, reload: reloadRecovery } = useAsyncData((signal) => workoutsApi.recovery({ signal }), []);

  useEffect(() => {
    setCompleted(new Set());
    setSaveOk(false);
    setSaveError(null);
  }, [splitDay]);

  useEffect(() => {
    if (!template?.exercises) return;
    const drafts = {};
    for (const exercise of template.exercises) {
      drafts[exercise.exerciseName] = {
        weightKg: String(exercise.ghost?.weightKg ?? 0),
        reps: String(exercise.ghost?.reps ?? parseRepTarget(exercise.reps)),
        rir: String(exercise.ghost?.rir ?? 1),
      };
    }
    setSetDrafts(drafts);
  }, [template]);

  const recovery = recoveryData?.recovery ?? {};

  const recoveryBadges = useMemo(() => {
    const muscles = new Set();
    for (const exercise of template?.exercises ?? []) {
      muscles.add(exercise.primaryMuscle);
      for (const secondary of exercise.secondaryMuscles ?? []) muscles.add(secondary);
    }
    return [...muscles].map((muscle) => ({
      muscle,
      status: recovery[muscle]?.status ?? 'READY',
    }));
  }, [template, recovery]);

  const toggleSet = (key) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSaveOk(false);
  };

  const updateDraft = (exerciseName, field) => (event) => {
    setSetDrafts((prev) => ({
      ...prev,
      [exerciseName]: { ...prev[exerciseName], [field]: event.target.value },
    }));
  };

  const handleSave = async () => {
    if (!template || splitDay === 'REST') return;
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const sets = [];
      for (const exercise of template.exercises) {
        const draft = setDrafts[exercise.exerciseName] ?? {};
        for (let setNumber = 1; setNumber <= exercise.sets; setNumber += 1) {
          const key = `${exercise.exerciseName}:${setNumber}`;
          if (!completed.has(key)) continue;
          sets.push({
            exerciseName: exercise.exerciseName,
            primaryMuscle: exercise.primaryMuscle,
            secondaryMuscles: exercise.secondaryMuscles ?? [],
            setNumber,
            weightKg: parseFloat(draft.weightKg) || 0,
            reps: parseInt(draft.reps, 10) || 0,
            rir: parseInt(draft.rir, 10) || 1,
            isCompleted: true,
          });
        }
      }
      if (sets.length === 0) {
        setSaveError(new Error('Tap at least one set checkmark before saving.'));
        return;
      }
      const session = await workoutsApi.create({ splitDay, sets });
      await workoutsApi.complete(session.id);
      setSaveOk(true);
      reloadTemplate();
      reloadRecovery();
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Today's split" subtitle={`Mesocycle week ${template?.mesocycleWeek ?? '—'}`}>
        <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
          <div className="flex w-max gap-2 pb-1">
            {SPLIT_OPTIONS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSplitDay(day)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  splitDay === day
                    ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                    : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500'
                }`}
              >
                {SPLIT_DAY_LABELS[day]}
              </button>
            ))}
          </div>
        </div>

        {recoveryBadges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recoveryBadges.map(({ muscle, status }) => (
              <span key={muscle} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${RECOVERY_STYLES[status]}`}>
                {muscle.replaceAll('_', ' ')} · {status}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card title={SPLIT_DAY_LABELS[splitDay]} subtitle="Ghost loads from your last session · tap sets to complete">
        <ErrorMessage error={templateError} onRetry={reloadTemplate} />
        {templateLoading && !template ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-800/40" aria-busy="true" />
        ) : splitDay === 'REST' ? (
          <p className="text-sm text-slate-400">Rest day. Recover, hit water/creatine, and keep the food log closed clean.</p>
        ) : (
          <ul className="space-y-3">
            {(template?.exercises ?? []).map((exercise) => {
              const draft = setDrafts[exercise.exerciseName] ?? { weightKg: '0', reps: '10', rir: '1' };
              return (
                <li key={exercise.exerciseName} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{exercise.exerciseName}</p>
                      <p className="text-[11px] text-slate-500">
                        {exercise.sets} × {exercise.reps} · {exercise.overloadHint}
                        {exercise.ghost && ` · last ${exercise.ghost.weightKg} kg × ${exercise.ghost.reps}`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <label className="text-[10px] uppercase tracking-wide text-slate-500">
                      kg
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm tabular-nums text-slate-100"
                        type="number"
                        step="0.5"
                        value={draft.weightKg}
                        onChange={updateDraft(exercise.exerciseName, 'weightKg')}
                      />
                    </label>
                    <label className="text-[10px] uppercase tracking-wide text-slate-500">
                      reps
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm tabular-nums text-slate-100"
                        type="number"
                        value={draft.reps}
                        onChange={updateDraft(exercise.exerciseName, 'reps')}
                      />
                    </label>
                    <label className="text-[10px] uppercase tracking-wide text-slate-500">
                      RIR
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm tabular-nums text-slate-100"
                        type="number"
                        min="0"
                        max="5"
                        value={draft.rir}
                        onChange={updateDraft(exercise.exerciseName, 'rir')}
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Array.from({ length: exercise.sets }, (_, index) => {
                      const setNumber = index + 1;
                      const key = `${exercise.exerciseName}:${setNumber}`;
                      const done = completed.has(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={done}
                          onClick={() => toggleSet(key)}
                          className={`inline-flex size-8 items-center justify-center rounded-lg border text-xs font-bold transition ${
                            done
                              ? 'border-brand-500 bg-brand-500/20 text-brand-300'
                              : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {done ? <CheckIcon className="size-4" /> : setNumber}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {splitDay !== 'REST' && (
          <div className="mt-4 space-y-2">
            <ErrorMessage error={saveError} />
            {saveOk && <p className="text-xs text-brand-300">Session saved. Recovery badges refreshed.</p>}
            <Button type="button" className="w-full" disabled={saving} onClick={handleSave}>
              {saving && <SpinnerIcon className="size-4" />}
              {saving ? 'Saving session…' : 'Save completed sets'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
