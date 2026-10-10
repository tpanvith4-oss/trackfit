import { useMemo } from 'react';
import { BedIcon, CheckIcon, CoffeeIcon, SmartphoneIcon, ThermometerIcon, UtensilsIcon } from '../../components/icons.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { useNow } from '../../hooks/useNow.js';
import { buildNightPlan, formatClockLabel, formatDuration } from '../../services/circadianService.js';

const STEP_ICONS = {
  caffeine: CoffeeIcon,
  digestion: UtensilsIcon,
  cooldown: ThermometerIcon,
  screens: SmartphoneIcon,
  bedtime: BedIcon,
};

const STATUS_STYLES = {
  done: { dot: 'bg-slate-800 text-slate-500 ring-slate-700', title: 'text-slate-500', time: 'text-slate-600' },
  next: { dot: 'bg-indigo-500/20 text-indigo-300 ring-indigo-400/50', title: 'text-slate-50', time: 'text-indigo-300' },
  upcoming: { dot: 'bg-slate-900 text-slate-400 ring-slate-700', title: 'text-slate-200', time: 'text-slate-400' },
};

export function WindDownTimeline({ schedule }) {
  const now = useNow(30_000);
  const plan = useMemo(() => buildNightPlan(schedule, now), [schedule, now]);
  const allDone = plan.steps.every((step) => step.status === 'done');

  return (
    <Card
      title="Tonight’s wind-down"
      subtitle={`In bed by ${formatClockLabel(plan.bedtime)} · up at ${formatClockLabel(schedule.targetWakeTime)}`}
    >
      {allDone && (
        <p className="mb-4 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-100">
          It’s past bedtime. Lights out. Your alarm is in {formatDuration(plan.wakeAt - now)}.
        </p>
      )}
      <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[19.5px] before:w-px before:bg-slate-800">
        {plan.steps.map((step) => {
          const Icon = STEP_ICONS[step.id];
          const styles = STATUS_STYLES[step.status];
          return (
            <li key={step.id} className="relative flex gap-3" aria-current={step.status === 'next' ? 'step' : undefined}>
              <span className={`relative flex size-10 shrink-0 items-center justify-center rounded-full ring-1 ${styles.dot}`}>
                {step.status === 'done' ? <CheckIcon className="size-4" /> : <Icon className="size-4" />}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`text-sm font-semibold ${styles.title}`}>{step.title}</p>
                  <p className={`shrink-0 text-xs font-semibold tabular-nums ${styles.time}`}>{step.label}</p>
                </div>
                {step.status !== 'done' && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{step.description}</p>}
                {step.status === 'next' && (
                  <p className="mt-1 text-xs font-medium text-indigo-300">in {formatDuration(step.at - now)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
