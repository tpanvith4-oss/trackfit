import { TrashIcon } from '../../components/icons.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/StatusMessage.jsx';
import { formatDay } from '../../utils/date.js';
import { formatFixed, formatNumber } from '../../utils/number.js';
import { dateFromDayKey, SOURCE_LABELS, STEP_GOAL } from './activityStats.js';

function WorkoutRow({ workout, onDelete, deleting }) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-slate-800/50 py-1.5 pr-1 pl-3">
      <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{workout.exerciseType}</span>
      <span className="shrink-0 text-xs tabular-nums text-slate-400">
        {workout.durationMinutes} min · {formatNumber(workout.activeCalories)} kcal
        {workout.distanceKm ? ` · ${formatFixed(workout.distanceKm)} km` : ''}
      </span>
      <IconButton label={`Delete ${workout.exerciseType}`} onClick={() => onDelete(workout.id)} disabled={deleting} className="size-8">
        <TrashIcon className="size-4" />
      </IconButton>
    </li>
  );
}

export function ActivityHistory({ days, onDelete, deletingId }) {
  if (days.length === 0) {
    return <EmptyState>No activity in the last two weeks. Sync your iPhone or log a workout above.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-slate-800">
      {days.map((day) => (
        <li key={day.key} className="py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-medium text-slate-100">{formatDay(dateFromDayKey(day.key))}</p>
            <p className={`text-sm font-semibold tabular-nums ${day.steps >= STEP_GOAL ? 'text-brand-400' : 'text-slate-200'}`}>
              {formatNumber(day.steps)} <span className="text-xs font-normal text-slate-500">steps</span>
            </p>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatNumber(day.activeCalories)} kcal active · {formatFixed(day.distanceKm)} km
            {day.lastSync && ` · ${SOURCE_LABELS[day.lastSync.source] ?? day.lastSync.source}`}
          </p>
          {day.workouts.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {day.workouts.map((workout) => (
                <WorkoutRow key={workout.id} workout={workout} onDelete={onDelete} deleting={deletingId === workout.id} />
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
