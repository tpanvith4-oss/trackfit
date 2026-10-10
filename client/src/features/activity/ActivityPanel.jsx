import { useCallback, useEffect, useMemo, useState } from 'react';
import { activityApi } from '../../api/activityApi.js';
import { RefreshIcon } from '../../components/icons.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorMessage, ListSkeleton } from '../../components/ui/StatusMessage.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { useNow } from '../../hooks/useNow.js';
import { addDays, dayKey, startOfDay } from '../../utils/date.js';
import { ActivityHistory } from './ActivityHistory.jsx';
import { ActivitySummaryCard } from './ActivitySummaryCard.jsx';
import { entryDayKey, groupByDay, HISTORY_DAYS, MANUAL_SOURCE, summarizeDay } from './activityStats.js';
import { IosSyncModal } from './IosSyncModal.jsx';
import { ManualActivityForm } from './ManualActivityForm.jsx';

const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);

export function ActivityPanel() {
  const now = useNow(60_000);
  const todayKey = dayKey(now);
  // A day of slack each side: synced totals sit at noon UTC, which can cross local midnight.
  const { data, error, loading, reload, setData } = useAsyncData(
    (signal) => {
      const today = startOfDay(new Date());
      return activityApi.list({ startDate: addDays(today, -HISTORY_DAYS), endDate: addDays(today, 2) }, { signal });
    },
    [todayKey],
  );
  const [syncOpen, setSyncOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const entries = useMemo(() => data ?? [], [data]);

  // Shortcuts runs outside the app, so pick up fresh totals whenever TrackFit comes back into view.
  useEffect(() => {
    const reloadWhenVisible = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', reloadWhenVisible);
    return () => document.removeEventListener('visibilitychange', reloadWhenVisible);
  }, [reload]);

  const today = useMemo(() => summarizeDay(entries.filter((entry) => entryDayKey(entry) === todayKey)), [entries, todayKey]);
  const days = useMemo(() => {
    const oldestKey = dayKey(addDays(now, -(HISTORY_DAYS - 1)));
    return groupByDay(entries).filter((day) => day.key >= oldestKey && day.key <= todayKey);
  }, [entries, now, todayKey]);
  const hasEverSynced = entries.some((entry) => entry.source !== MANUAL_SOURCE);

  const handleCreate = useCallback(
    async (payload) => {
      const created = await activityApi.logManual(payload);
      setData((prev) => [created, ...(prev ?? [])].sort(byDateDesc));
    },
    [setData],
  );

  const handleDelete = async (id) => {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await activityApi.remove(id);
      setData((prev) => (prev ?? []).filter((entry) => entry.id !== id));
    } catch (err) {
      if (err.status === 404) setData((prev) => (prev ?? []).filter((entry) => entry.id !== id));
      else setDeleteError(err);
    } finally {
      setDeletingId(null);
    }
  };

  const isInitialLoad = loading && !data;

  return (
    <div className="space-y-4">
      <ActivitySummaryCard
        summary={today}
        now={now}
        hasEverSynced={hasEverSynced}
        onConnect={() => setSyncOpen(true)}
        isLoading={isInitialLoad}
      />

      <Card title="Log a workout" subtitle="Gym sessions, treadmill runs, anything your phone missed">
        <ManualActivityForm onSubmit={handleCreate} />
      </Card>

      <Card
        title="Last 14 days"
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
            (data || !error) && <ActivityHistory days={days} onDelete={handleDelete} deletingId={deletingId} />
          )}
        </div>
      </Card>

      {syncOpen && <IosSyncModal onClose={() => setSyncOpen(false)} />}
    </div>
  );
}
