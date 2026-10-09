import { useMemo, useState } from 'react';
import { foodApi } from '../../api/foodApi.js';
import { RefreshIcon } from '../../components/icons.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorMessage, ListSkeleton } from '../../components/ui/StatusMessage.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { formatDay, startOfToday, startOfTomorrow } from '../../utils/date.js';
import { formatNumber } from '../../utils/number.js';
import { FoodEntryForm } from './FoodEntryForm.jsx';
import { FoodEntryList } from './FoodEntryList.jsx';

const sum = (entries, field) => entries.reduce((total, entry) => total + (entry[field] ?? 0), 0);

export function LogFoodPanel() {
  const { data, error, loading, reload, setData } = useAsyncData(
    (signal) => foodApi.list({ from: startOfToday(), to: startOfTomorrow(), limit: 200 }, { signal }),
  );
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const entries = useMemo(() => data ?? [], [data]);

  const totals = useMemo(
    () => ({
      calories: sum(entries, 'calories'),
      proteinG: sum(entries, 'proteinG'),
      carbsG: sum(entries, 'carbsG'),
      fatG: sum(entries, 'fatG'),
    }),
    [entries],
  );

  const handleCreate = async (payload) => {
    const created = await foodApi.create(payload);
    setData((prev) => [created, ...(prev ?? [])]);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await foodApi.remove(id);
      setData((prev) => prev.filter((entry) => entry.id !== id));
    } catch (err) {
      setDeleteError(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Today" subtitle={formatDay(new Date())}>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            ['kcal', totals.calories],
            ['Protein', totals.proteinG],
            ['Carbs', totals.carbsG],
            ['Fat', totals.fatG],
          ].map(([label, value], index) => (
            <div key={label} className={`rounded-xl py-2.5 ${index === 0 ? 'bg-brand-500/15' : 'bg-slate-800/60'}`}>
              <p className={`text-lg font-bold tabular-nums ${index === 0 ? 'text-brand-400' : 'text-slate-100'}`}>
                {formatNumber(value)}
                {index > 0 && <span className="text-xs font-medium text-slate-400">g</span>}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Log food" subtitle="Add what you just ate">
        <FoodEntryForm onSubmit={handleCreate} />
      </Card>

      <Card
        title="Today's entries"
        action={
          <IconButton label="Refresh" onClick={reload} disabled={loading}>
            <RefreshIcon className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </IconButton>
        }
      >
        <div className="space-y-3">
          <ErrorMessage error={error} onRetry={reload} />
          <ErrorMessage error={deleteError} />
          {loading && !data ? (
            <ListSkeleton />
          ) : (
            !error && <FoodEntryList entries={entries} onDelete={handleDelete} deletingId={deletingId} />
          )}
        </div>
      </Card>
    </div>
  );
}
