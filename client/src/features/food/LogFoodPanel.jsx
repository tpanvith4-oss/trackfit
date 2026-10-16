import { useCallback, useMemo, useState } from 'react';
import { foodApi } from '../../api/foodApi.js';
import { RefreshIcon } from '../../components/icons.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorMessage, ListSkeleton } from '../../components/ui/StatusMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { dateFromKey, getDayLabel, timestampForDay, todayKey } from '../../hooks/useSelectedDate.js';
import { addDays } from '../../utils/date.js';
import { getDailyTargets } from './constants.js';
import { MacroCard } from './MacroCard.jsx';
import { MealForm } from './MealForm.jsx';
import { MealHistory } from './MealHistory.jsx';

const sumBy = (entries, field) => entries.reduce((total, entry) => total + (Number(entry[field]) || 0), 0);

const createOptimisticId = () => `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function LogFoodPanel({ selectedDate = todayKey() }) {
  const { user } = useAuth();
  const targets = useMemo(() => getDailyTargets(user), [user]);
  const { data, error, loading, reload, setData } = useAsyncData(
    (signal) => {
      const dayStart = dateFromKey(selectedDate);
      return foodApi.list({ from: dayStart, to: addDays(dayStart, 1), limit: 200 }, { signal });
    },
    [selectedDate],
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
    async (formValues) => {
      const payload = { ...formValues, loggedAt: timestampForDay(selectedDate).toISOString() };
      const optimisticId = createOptimisticId();
      const optimisticEntry = { ...payload, id: optimisticId, isPending: true };
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
    [setData, selectedDate],
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
      <MacroCard totals={totals} targets={targets} isLoading={isInitialLoad} date={dateFromKey(selectedDate)} title={getDayLabel(selectedDate)} />

      <Card
        title={selectedDate === todayKey() ? 'Log a meal' : `Log a meal for ${getDayLabel(selectedDate)}`}
        subtitle="Describe it for an AI estimate or tap a staple, then tweak anything"
      >
        <MealForm onSubmit={handleCreate} />
      </Card>

      <Card
        title={selectedDate === todayKey() ? "Today's meals" : `Meals · ${getDayLabel(selectedDate)}`}
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
