import { useCallback, useMemo, useState } from 'react';
import { foodApi } from '../../api/foodApi.js';
import { RefreshIcon } from '../../components/icons.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorMessage, ListSkeleton } from '../../components/ui/StatusMessage.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { startOfToday, startOfTomorrow } from '../../utils/date.js';
import { MacroCard } from './MacroCard.jsx';
import { MealForm } from './MealForm.jsx';
import { MealHistory } from './MealHistory.jsx';

const sumBy = (entries, field) => entries.reduce((total, entry) => total + (Number(entry[field]) || 0), 0);

const createOptimisticId = () => `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function LogFoodPanel() {
  const { data, error, loading, reload, setData } = useAsyncData((signal) =>
    foodApi.list({ from: startOfToday(), to: startOfTomorrow(), limit: 200 }, { signal }),
  );
  const [deletingIds, setDeletingIds] = useState(() => new Set());
  const [deleteError, setDeleteError] = useState(null);
  const entries = useMemo(() => data ?? [], [data]);

  const totals = useMemo(
    () => ({
      calories: sumBy(entries, 'calories'),
      proteinG: sumBy(entries, 'proteinG'),
      carbsG: sumBy(entries, 'carbsG'),
      fatG: sumBy(entries, 'fatG'),
    }),
    [entries],
  );

  const handleCreate = useCallback(
    async (payload) => {
      const optimisticId = createOptimisticId();
      const optimisticEntry = { ...payload, id: optimisticId, loggedAt: new Date().toISOString(), isPending: true };
      setData((prev) => [optimisticEntry, ...(prev ?? [])]);

      try {
        const created = await foodApi.create(payload);
        setData((prev) => {
          const rest = (prev ?? []).filter((entry) => entry.id !== optimisticId && entry.id !== created.id);
          return [created, ...rest];
        });
      } catch (err) {
        setData((prev) => (prev ?? []).filter((entry) => entry.id !== optimisticId));
        throw err;
      }
    },
    [setData],
  );

  const handleDelete = useCallback(
    async (id) => {
      setDeletingIds((prev) => new Set(prev).add(id));
      setDeleteError(null);
      try {
        await foodApi.remove(id);
        setData((prev) => (prev ?? []).filter((entry) => entry.id !== id));
      } catch (err) {
        if (err.status === 404) {
          setData((prev) => (prev ?? []).filter((entry) => entry.id !== id));
        } else {
          setDeleteError(err);
        }
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [setData],
  );

  const isInitialLoad = loading && !data;

  return (
    <div className="space-y-4">
      <MacroCard totals={totals} isLoading={isInitialLoad} />

      <Card title="Log a meal" subtitle="Tap a staple to pre-fill, then tweak anything">
        <MealForm onSubmit={handleCreate} />
      </Card>

      <Card
        title="Today's meals"
        action={
          <IconButton label="Refresh" onClick={reload} disabled={loading}>
            <RefreshIcon className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </IconButton>
        }
      >
        <div className="space-y-3">
          <ErrorMessage error={error} onRetry={reload} />
          <ErrorMessage error={deleteError} />
          {isInitialLoad ? (
            <ListSkeleton />
          ) : (
            (data || !error) && <MealHistory entries={entries} deletingIds={deletingIds} onDelete={handleDelete} />
          )}
        </div>
      </Card>
    </div>
  );
}
