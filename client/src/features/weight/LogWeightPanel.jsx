import { useMemo, useState } from 'react';
import { weightApi } from '../../api/weightApi.js';
import { WeightTrendAreaChart } from '../../components/charts/WeightTrendAreaChart.jsx';
import { RefreshIcon } from '../../components/icons.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorMessage, ListSkeleton } from '../../components/ui/StatusMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { getDayLabel, shiftDayKey, timestampForDay, todayKey } from '../../hooks/useSelectedDate.js';
import { dayKey } from '../../utils/date.js';
import { getCutProtocol } from './constants.js';
import { WeightEntryList } from './WeightEntryList.jsx';
import { WeightForm } from './WeightForm.jsx';
import { WeightSummaryCard } from './WeightSummaryCard.jsx';
import { calculateWeightStats, findReferenceEntry, getRateStatus } from './weightStats.js';

const HISTORY_LIMIT = 90;
const TREND_DAYS = 30;

const byLoggedAtDesc = (a, b) => new Date(b.loggedAt) - new Date(a.loggedAt);

export function LogWeightPanel({ selectedDate = todayKey() }) {
  const { user } = useAuth();
  const protocol = useMemo(() => getCutProtocol(user), [user]);
  const { data, error, loading, reload, setData } = useAsyncData((signal) =>
    weightApi.list({ limit: HISTORY_LIMIT }, { signal }),
  );
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const entries = useMemo(() => data ?? [], [data]);

  const stats = useMemo(() => calculateWeightStats(entries), [entries]);
  const status = useMemo(() => getRateStatus(stats), [stats]);
  const reference = useMemo(() => findReferenceEntry(stats.sorted), [stats]);
  const isToday = selectedDate === todayKey();

  const trend = useMemo(() => {
    const oldestKey = shiftDayKey(selectedDate, -(TREND_DAYS - 1));
    return entries
      .filter((entry) => {
        const key = entry?.loggedAt ? dayKey(entry.loggedAt) : '';
        return key >= oldestKey && key <= selectedDate;
      })
      .map((entry) => ({ date: entry.loggedAt, weight: Number(entry.weightKg) }));
  }, [entries, selectedDate]);
  const { targetMinKg, targetMaxKg } = protocol ?? {};
  const targetWeight = Number.isFinite(targetMinKg) && Number.isFinite(targetMaxKg) ? (targetMinKg + targetMaxKg) / 2 : undefined;

  const handleCreate = async (formValues) => {
    const payload = isToday ? formValues : { ...formValues, loggedAt: timestampForDay(selectedDate).toISOString() };
    const created = await weightApi.create(payload);
    setData((prev) => [created, ...(prev ?? [])].sort(byLoggedAtDesc).slice(0, HISTORY_LIMIT));
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await weightApi.remove(id);
      setData((prev) => prev.filter((entry) => entry.id !== id));
    } catch (err) {
      setDeleteError(err);
    } finally {
      setDeletingId(null);
    }
  };

  const isInitialLoad = loading && !data;

  return (
    <div className="space-y-4">
      <WeightSummaryCard stats={stats} status={status} protocol={protocol} isLoading={isInitialLoad} />

      <Card title="30-day trend" subtitle={`Through ${getDayLabel(selectedDate)}`}>
        {isInitialLoad ? (
          <div className="h-48 animate-pulse rounded-xl bg-slate-800/40" aria-busy="true" />
        ) : (
          <WeightTrendAreaChart data={trend} targetWeight={targetWeight} />
        )}
      </Card>

      <Card
        title={isToday ? 'Log weight' : `Log weight for ${getDayLabel(selectedDate)}`}
        subtitle="Weigh in after waking, before food or water"
      >
        <WeightForm onSubmit={handleCreate} reference={reference} fallbackWeightKg={protocol.baselineKg} />
      </Card>

      <Card
        title="History"
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
            !error && <WeightEntryList entries={entries} onDelete={handleDelete} deletingId={deletingId} />
          )}
        </div>
      </Card>
    </div>
  );
}
