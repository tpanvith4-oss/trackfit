import { useId } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { useNow } from '../../hooks/useNow.js';
import { formatClockLabel, formatDuration, getNextOccurrence } from '../../services/circadianService.js';
import { formatTime } from '../../utils/date.js';
import { MATH_PROBLEM_COUNT, SHAKE_TARGET } from './alarmChallenges.js';

const CHALLENGES = [
  { id: 'math', label: 'Math', description: `${MATH_PROBLEM_COUNT} quick sums` },
  { id: 'shake', label: 'Shake', description: `${SHAKE_TARGET} shakes` },
];

export function AlarmSettingsCard({ schedule, onChange, snoozeUntil, onCancelSnooze, onTest }) {
  const id = useId();
  const now = useNow(30_000);
  const { enableCognitiveAlarm, alarmChallengeType, targetWakeTime } = schedule;
  const nextAlarmAt = getNextOccurrence(targetWakeTime, now);

  return (
    <Card title="Smart alarm" subtitle="Escalating sound and vibration that you can’t sleep through">
      <div className="space-y-5">
        <Switch
          checked={enableCognitiveAlarm}
          onChange={(value) => onChange({ enableCognitiveAlarm: value })}
          label={`Wake-up alarm · ${formatClockLabel(targetWakeTime)}`}
          description="Snooze and dismiss stay locked until you pass a quick challenge."
        />

        <div>
          <p id={`${id}-challenge`} className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            Unlock challenge
          </p>
          <div role="radiogroup" aria-labelledby={`${id}-challenge`} className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            {CHALLENGES.map((challenge) => {
              const selected = alarmChallengeType === challenge.id;
              return (
                <button
                  key={challenge.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!enableCognitiveAlarm}
                  onClick={() => onChange({ alarmChallengeType: challenge.id })}
                  className={`rounded-lg px-3 py-2 text-left transition disabled:opacity-40 ${
                    selected ? 'bg-slate-800 ring-1 ring-slate-700' : 'hover:bg-slate-900'
                  }`}
                >
                  <span className={`block text-sm font-semibold ${selected ? 'text-slate-50' : 'text-slate-300'}`}>{challenge.label}</span>
                  <span className="block text-xs text-slate-500">{challenge.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm" aria-live="polite">
          {snoozeUntil ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-amber-200">Snoozed until {formatTime(snoozeUntil)}</span>
              <button type="button" onClick={onCancelSnooze} className="text-xs font-semibold text-slate-300 underline-offset-2 hover:underline">
                Cancel snooze
              </button>
            </div>
          ) : enableCognitiveAlarm ? (
            <span className="text-slate-300">
              Rings in <span className="font-semibold text-slate-50">{formatDuration(nextAlarmAt - now)}</span>
            </span>
          ) : (
            <span className="text-slate-500">Alarm is off.</span>
          )}
        </div>

        <p className="text-xs leading-relaxed text-slate-500">
          The alarm rings from inside TrackFit, so leave the app open on your nightstand (ideally plugged in) overnight.
        </p>

        <Button variant="ghost" className="w-full border border-slate-700" onClick={onTest}>
          Test alarm now
        </Button>
      </div>
    </Card>
  );
}
