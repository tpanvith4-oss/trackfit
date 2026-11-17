import { useEffect, useMemo, useState } from 'react';
import { workoutsApi } from '../../api/workoutsApi.js';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { RECOVERY_STYLES, SPLIT_DAY_LABELS, WEEKDAY_SPLIT } from '../../constants/cutProtocol.js';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { requestRestNotificationPermission } from '../../services/restBackgroundTimer.js';
import { storage } from '../../services/storageService.js';
import { ExerciseSetCard } from './ExerciseSetCard.jsx';
import { RestTimerOverlay } from './RestTimerOverlay.jsx';
import { WorkoutAnalyticsChart } from './WorkoutAnalyticsChart.jsx';

const SPLIT_OPTIONS = Object.keys(SPLIT_DAY_LABELS);
const REST_PREF_KEY = 'workout.restSeconds';
const REST_OPTIONS = [60, 90];

function defaultSplit() {
  return WEEKDAY_SPLIT[new Date().getDay()] ?? 'REST';
}

export function WorkoutPanel() {
  const [splitDay, setSplitDay] = useState(defaultSplit);
  const [sessionId, setSessionId] = useState(null);
  const [restSeconds, setRestSeconds] = useState(60);
  const [chartExercise, setChartExercise] = useState(null);
  const [timer, setTimer] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState(null);
  const [completeOk, setCompleteOk] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);

  const { data: template, error: templateError, loading: templateLoading, reload: reloadTemplate } = useAsyncData(
    (signal) => workoutsApi.template(splitDay, { signal }),
    [splitDay],
  );
  const { data: recoveryData, reload: reloadRecovery } = useAsyncData((signal) => workoutsApi.recovery({ signal }), []);

  useEffect(() => {
    let active = true;
    storage.get(REST_PREF_KEY, 60).then((value) => {
      const seconds = Number(value);
      if (active && REST_OPTIONS.includes(seconds)) setRestSeconds(seconds);
    });
    requestRestNotificationPermission();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSessionId(null);
    setCompleteOk(false);
    setCompleteError(null);
    setTimer(null);
    setChartExercise(template?.exercises?.[0]?.exerciseName ?? null);
  }, [splitDay, template?.exercises]);

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

  const chooseRest = (seconds) => {
    setRestSeconds(seconds);
    storage.set(REST_PREF_KEY, seconds);
  };

  const handleSetLogged = ({ exerciseName, finishedExercise }) => {
    setChartExercise(exerciseName);
    setHistoryTick((tick) => tick + 1);
    reloadRecovery();
    if (!finishedExercise) {
      setTimer({ seconds: restSeconds, exerciseName });
    }
  };

  const finishSession = async () => {
    if (!sessionId) {
      setCompleteError(new Error('Log at least one set before finishing the session.'));
      return;
    }
    setCompleting(true);
    setCompleteError(null);
    setCompleteOk(false);
    try {
      await workoutsApi.complete(sessionId);
      setCompleteOk(true);
      setSessionId(null);
      reloadTemplate();
      reloadRecovery();
      setHistoryTick((tick) => tick + 1);
    } catch (err) {
      setCompleteError(err);
    } finally {
      setCompleting(false);
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

        {splitDay !== 'REST' && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rest</span>
            {REST_OPTIONS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                onClick={() => chooseRest(seconds)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                  restSeconds === seconds
                    ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {seconds}s
              </button>
            ))}
          </div>
        )}
      </Card>

      {splitDay !== 'REST' && (
        <Card title="Volume progression" subtitle={chartExercise ?? 'Pick an exercise by logging a set'}>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(template?.exercises ?? []).map((exercise) => (
              <button
                key={exercise.exerciseName}
                type="button"
                onClick={() => setChartExercise(exercise.exerciseName)}
                className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                  chartExercise === exercise.exerciseName
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {exercise.exerciseName.split(' ').slice(0, 3).join(' ')}
              </button>
            ))}
          </div>
          <WorkoutAnalyticsChart key={`${chartExercise}-${historyTick}`} exerciseName={chartExercise} />
        </Card>
      )}

      <Card
        title={SPLIT_DAY_LABELS[splitDay]}
        subtitle="Check a set to auto-save · rest timer notifies you when time is up"
      >
        <ErrorMessage error={templateError} onRetry={reloadTemplate} />
        {timer && (
          <RestTimerOverlay
            seconds={timer.seconds}
            exerciseName={timer.exerciseName}
            onDone={() => setTimer(null)}
            onSkip={() => setTimer(null)}
          />
        )}
        {templateLoading && !template ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-800/40" aria-busy="true" />
        ) : splitDay === 'REST' ? (
          <p className="text-sm text-slate-400">Rest day. Recover, hit water/creatine, and keep the food log closed clean.</p>
        ) : (
          <ul className={`space-y-3 ${timer ? 'mt-3' : ''}`}>
            {(template?.exercises ?? []).map((exercise) => (
              <ExerciseSetCard
                key={exercise.exerciseName}
                exercise={exercise}
                splitDay={splitDay}
                sessionId={sessionId}
                restSeconds={restSeconds}
                onSession={setSessionId}
                onSetLogged={handleSetLogged}
              />
            ))}
          </ul>
        )}

        {splitDay !== 'REST' && (
          <div className="mt-4 space-y-2">
            <ErrorMessage error={completeError} />
            {completeOk && <p className="text-xs text-brand-300">Session finished. Recovery badges refreshed.</p>}
            <Button type="button" className="w-full" disabled={completing || !sessionId} onClick={finishSession}>
              {completing ? 'Finishing…' : 'Finish session'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
