import { ActivityIcon, RouteIcon, SmartphoneIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { formatDay, formatTime } from '../../utils/date.js';
import { formatFixed, formatNumber } from '../../utils/number.js';
import { ACTIVE_CALORIE_GOAL, needsStepCompensation, SOURCE_LABELS } from './activityStats.js';

const RING_SIZE = 132;
const RING_STROKE = 11;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function CalorieRing({ calories, goal }) {
  const progress = Math.min(1, calories / goal);
  const goalMet = calories >= goal;

  return (
    <div
      role="progressbar"
      aria-label="Active calories today against daily burn target"
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-valuenow={Math.min(calories, goal)}
      aria-valuetext={`${formatNumber(calories)} of ${formatNumber(goal)} active kcal`}
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
          className={`transition-[stroke-dashoffset] duration-700 ease-out ${goalMet ? 'stroke-amber-300' : 'stroke-amber-400'}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold tabular-nums text-slate-50">{formatNumber(calories)}</span>
        <span className="text-[11px] text-slate-400">{goalMet ? 'Burn target' : `of ${formatNumber(goal)} kcal`}</span>
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

function describeSync(lastSync, hasEverSynced, day) {
  if (lastSync) return `Synced from ${SOURCE_LABELS[lastSync.source] ?? lastSync.source} at ${formatTime(lastSync.at)}`;
  return hasEverSynced ? `No sync for ${formatDay(day)}` : formatDay(day);
}

export function ActivitySummaryCard({
  title = "Today's activity",
  summary,
  now,
  hasEverSynced,
  onConnect,
  isLoading = false,
  isCached = false,
  isRefreshing = false,
}) {
  const { steps, activeCalories, distanceKm, lastSync } = summary;
  const showStepWarning = !isLoading && needsStepCompensation(steps, now);

  return (
    <Card
      title={title}
      subtitle={describeSync(lastSync, hasEverSynced, now ?? new Date())}
      action={
        <Button variant="ghost" className="shrink-0 border border-slate-700 px-3 py-1.5 text-xs" onClick={onConnect}>
          <SmartphoneIcon className="size-4" />
          iPhone sync
        </Button>
      }
    >
      <div aria-busy={isLoading} className={`space-y-4 transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
        {isCached && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-800/40 px-3 py-2 text-xs text-slate-400"
          >
            <span aria-hidden className={`size-1.5 shrink-0 rounded-full bg-amber-400 ${isRefreshing ? 'motion-safe:animate-pulse' : ''}`} />
            Cached from last sync{isRefreshing ? ' · refreshing…' : ''}
          </p>
        )}

        <div className="flex items-center gap-4">
          <CalorieRing calories={activeCalories} goal={ACTIVE_CALORIE_GOAL} />
          <div className="grid min-w-0 flex-1 gap-2">
            <StatTile
              Icon={ActivityIcon}
              label="Steps"
              value={formatNumber(steps)}
              unit=""
              iconClassName="bg-brand-500/15 text-brand-300"
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
            <span className="font-semibold text-slate-200">Connect iPhone Health</span> to fill in active calories automatically.
            It’s free and takes about 5 minutes.
          </button>
        )}
      </div>
    </Card>
  );
}
