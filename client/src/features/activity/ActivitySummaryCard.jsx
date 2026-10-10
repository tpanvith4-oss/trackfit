import { FlameIcon, RouteIcon, SmartphoneIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { formatDay, formatTime } from '../../utils/date.js';
import { formatFixed, formatNumber } from '../../utils/number.js';
import { needsStepCompensation, SOURCE_LABELS, STEP_GOAL } from './activityStats.js';

const RING_SIZE = 132;
const RING_STROKE = 11;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function StepRing({ steps, goal }) {
  const progress = Math.min(1, steps / goal);
  const goalMet = steps >= goal;

  return (
    <div
      role="progressbar"
      aria-label="Steps today against daily goal"
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-valuenow={Math.min(steps, goal)}
      aria-valuetext={`${formatNumber(steps)} of ${formatNumber(goal)} steps`}
      className="relative shrink-0"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <svg viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="size-full -rotate-90" aria-hidden>
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={RING_STROKE} className="stroke-slate-800" />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
          className={`transition-[stroke-dashoffset] duration-700 ease-out ${goalMet ? 'stroke-brand-400' : 'stroke-brand-500'}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold tabular-nums text-slate-50">{formatNumber(steps)}</span>
        <span className="text-[11px] text-slate-400">{goalMet ? 'Goal hit' : `of ${formatNumber(goal)} steps`}</span>
      </div>
    </div>
  );
}

function StatTile({ Icon, label, value, unit, iconClassName }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-2.5">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-lg font-bold tabular-nums text-slate-100">
          {value}
          <span className="ml-0.5 text-xs font-medium text-slate-400">{unit}</span>
        </p>
      </div>
    </div>
  );
}

function describeSync(lastSync, hasEverSynced) {
  if (lastSync) return `Synced from ${SOURCE_LABELS[lastSync.source] ?? lastSync.source} at ${formatTime(lastSync.at)}`;
  return hasEverSynced ? 'No sync yet today' : formatDay(new Date());
}

export function ActivitySummaryCard({ summary, now, hasEverSynced, onConnect, isLoading = false }) {
  const { steps, activeCalories, distanceKm, lastSync } = summary;
  const showStepWarning = !isLoading && needsStepCompensation(steps, now);

  return (
    <Card
      title="Today's activity"
      subtitle={describeSync(lastSync, hasEverSynced)}
      action={
        <Button variant="ghost" className="shrink-0 border border-slate-700 px-3 py-1.5 text-xs" onClick={onConnect}>
          <SmartphoneIcon className="size-4" />
          iPhone sync
        </Button>
      }
    >
      <div aria-busy={isLoading} className={`space-y-4 transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-4">
          <StepRing steps={steps} goal={STEP_GOAL} />
          <div className="grid min-w-0 flex-1 gap-2">
            <StatTile
              Icon={FlameIcon}
              label="Active burn"
              value={formatNumber(activeCalories)}
              unit="kcal"
              iconClassName="bg-amber-400/15 text-amber-300"
            />
            <StatTile
              Icon={RouteIcon}
              label="Distance"
              value={formatFixed(distanceKm)}
              unit="km"
              iconClassName="bg-sky-400/15 text-sky-300"
            />
          </div>
        </div>

        {showStepWarning && (
          <p role="status" className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs leading-relaxed text-amber-200/90">
            Compensate today: 20-min brisk walk needed to reach cut deficit target
          </p>
        )}

        {!hasEverSynced && !isLoading && (
          <button
            type="button"
            onClick={onConnect}
            className="w-full rounded-xl border border-dashed border-slate-700 px-3 py-3 text-left text-sm text-slate-400 transition hover:border-slate-500 hover:text-slate-300"
          >
            <span className="font-semibold text-slate-200">Connect iPhone Health</span> to fill in steps automatically.
            It’s free and takes about 5 minutes.
          </button>
        )}
      </div>
    </Card>
  );
}
