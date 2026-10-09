import { TrashIcon } from '../../components/icons.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/StatusMessage.jsx';
import { formatDay, formatTime } from '../../utils/date.js';
import { formatNumber } from '../../utils/number.js';

function Delta({ value }) {
  if (value == null || value === 0) return null;
  const up = value > 0;
  return (
    <span className={`text-xs font-medium tabular-nums ${up ? 'text-amber-400' : 'text-brand-400'}`}>
      {up ? '▲' : '▼'} {formatNumber(Math.abs(value))}
    </span>
  );
}

export function WeightEntryList({ entries, onDelete, deletingId }) {
  if (entries.length === 0) {
    return <EmptyState>No weigh-ins yet. Log your first one above.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-slate-800">
      {entries.map((entry, index) => {
        const previous = entries[index + 1];
        const delta = previous ? entry.weightKg - previous.weightKg : null;
        return (
          <li key={entry.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-100">
                {formatDay(entry.loggedAt)} <span className="text-xs text-slate-500">{formatTime(entry.loggedAt)}</span>
              </p>
              {entry.note && <p className="truncate text-xs text-slate-500">{entry.note}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <span className="text-sm font-semibold tabular-nums text-slate-200">{formatNumber(entry.weightKg)} kg</span>
              <Delta value={delta} />
            </div>
            <IconButton
              label={`Delete weigh-in from ${formatDay(entry.loggedAt)}`}
              onClick={() => onDelete(entry.id)}
              disabled={deletingId === entry.id}
            >
              <TrashIcon className="size-4" />
            </IconButton>
          </li>
        );
      })}
    </ul>
  );
}
