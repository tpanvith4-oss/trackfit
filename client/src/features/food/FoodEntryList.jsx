import { TrashIcon } from '../../components/icons.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/StatusMessage.jsx';
import { formatTime } from '../../utils/date.js';
import { formatNumber } from '../../utils/number.js';
import { MEAL_LABELS } from './constants.js';

function macroSummary({ proteinG, carbsG, fatG }) {
  return [
    ['P', proteinG],
    ['C', carbsG],
    ['F', fatG],
  ]
    .filter(([, grams]) => grams != null)
    .map(([key, grams]) => `${key} ${formatNumber(grams)}g`)
    .join(' · ');
}

export function FoodEntryList({ entries, onDelete, deletingId }) {
  if (entries.length === 0) {
    return <EmptyState>Nothing logged today yet.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-slate-800">
      {entries.map((entry) => {
        const macros = macroSummary(entry);
        return (
          <li key={entry.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-100">{entry.name}</p>
              <p className="text-xs text-slate-500">
                {MEAL_LABELS[entry.mealType]} · {formatTime(entry.loggedAt)}
                {macros && ` · ${macros}`}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-200">{entry.calories} kcal</span>
            <IconButton
              label={`Delete ${entry.name}`}
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
