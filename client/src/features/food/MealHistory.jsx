import { useMemo } from 'react';
import { SpinnerIcon, TrashIcon } from '../../components/icons.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/StatusMessage.jsx';
import { formatTime } from '../../utils/date.js';
import { formatNumber } from '../../utils/number.js';
import { MEAL_TYPES } from './constants.js';

const byLoggedAtAsc = (a, b) => new Date(a.loggedAt) - new Date(b.loggedAt);
const sumBy = (items, field) => items.reduce((total, item) => total + (item[field] ?? 0), 0);

function groupByMeal(entries) {
  return MEAL_TYPES.map(({ value, label }) => {
    const items = entries.filter((entry) => entry.mealType === value).sort(byLoggedAtAsc);
    return {
      mealType: value,
      label,
      items,
      calories: sumBy(items, 'calories'),
      proteinG: sumBy(items, 'proteinG'),
    };
  }).filter((group) => group.items.length > 0);
}

function MealEntryRow({ entry, isDeleting, onDelete }) {
  const secondary = [
    entry.isPending ? 'Saving…' : formatTime(entry.loggedAt),
    entry.carbsG ? `C ${formatNumber(entry.carbsG)}g` : null,
    entry.fatG ? `F ${formatNumber(entry.fatG)}g` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className={`flex items-center gap-3 py-2.5 transition-opacity ${entry.isPending || isDeleting ? 'opacity-60' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-100">{entry.name}</p>
        <p className="text-xs text-slate-500">{secondary}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone="brand">{formatNumber(entry.calories)} kcal</Badge>
        <Badge tone="sky">{formatNumber(entry.proteinG ?? 0)}g P</Badge>
      </div>
      {entry.isPending ? (
        <span className="inline-flex size-9 items-center justify-center text-slate-500" aria-label="Saving">
          <SpinnerIcon className="size-4" />
        </span>
      ) : (
        <IconButton
          label={isDeleting ? `Deleting ${entry.name}` : `Delete ${entry.name}`}
          aria-busy={isDeleting}
          disabled={isDeleting}
          onClick={() => onDelete(entry.id)}
          className="hover:text-rose-400"
        >
          {isDeleting ? <SpinnerIcon className="size-4" /> : <TrashIcon className="size-4" />}
        </IconButton>
      )}
    </li>
  );
}

export function MealHistory({ entries, deletingIds, onDelete }) {
  const groups = useMemo(() => groupByMeal(entries), [entries]);

  if (groups.length === 0) {
    return <EmptyState>Nothing logged today yet. Tap a staple above to get started.</EmptyState>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.mealType} aria-labelledby={`meal-group-${group.mealType}`}>
          <header className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <h3 id={`meal-group-${group.mealType}`} className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {group.label}
              <span className="ml-1.5 font-normal normal-case text-slate-600">
                {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
              </span>
            </h3>
            <div className="flex gap-1.5">
              <Badge tone="brand">{formatNumber(group.calories)} kcal</Badge>
              <Badge tone="sky">{formatNumber(group.proteinG)}g P</Badge>
            </div>
          </header>
          <ul className="divide-y divide-slate-800/70">
            {group.items.map((entry) => (
              <MealEntryRow key={entry.id} entry={entry} isDeleting={deletingIds.has(entry.id)} onDelete={onDelete} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
