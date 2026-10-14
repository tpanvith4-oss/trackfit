import { useCallback, useEffect, useMemo, useState } from 'react';
import { activityApi } from '../../api/activityApi.js';
import { CloudOffIcon, RefreshIcon } from '../../components/icons.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorMessage, ListSkeleton } from '../../components/ui/StatusMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { useNow } from '../../hooks/useNow.js';
import { useSyncQueue } from '../../hooks/useSyncQueue.js';
import { removeQueuedRequest } from '../../services/syncQueue.js';
import { addDays, dayKey, startOfDay } from '../../utils/date.js';
import { loadActivityCache, saveActivityCache } from './activityCache.js';
import { ActivityHistory } from './ActivityHistory.jsx';
import { ActivitySummaryCard } from './ActivitySummaryCard.jsx';
import { entryDayKey, groupByDay, HISTORY_DAYS, MANUAL_SOURCE, summarizeDay } from './activityStats.js';
import { IosSyncModal } from './IosSyncModal.jsx';
import { ManualActivityForm } from './ManualActivityForm.jsx';

const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);
const MANUAL_ENDPOINT = '/api/activity/manual';

const isQueuedWorkout = (item) =>
  item.endpoint === MANUAL_ENDPOINT && item.method === 'POST' && Boolean(item.payload) && typeof item.payload === 'object';

const toPendingWorkout = (item) => ({
  ...item.payload,
  id: item.id,
  source: MANUAL_SOURCE,
  syncDay: null,
  date: item.payload.date ?? new Date(item.timestamp).toISOString(),
  pending: true,
});

export function ActivityPanel() {
  const userId = useAuth().user.id;
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
  const queue = useSyncQueue(userId, { onSynced: reload });

  // Workouts waiting in the offline queue count right away; once saved they arrive with the
  // same clientId, so they're shown once even before the queue event lands.
  const entries = useMemo(() => {
    const saved = data ?? [];
    const savedClientIds = new Set(saved.map((entry) => entry.clientId).filter(Boolean));
    const pending = queue.items
      .filter(isQueuedWorkout)
      .map(toPendingWorkout)
      .filter((workout) => !savedClientIds.has(workout.clientId));
    return pending.length > 0 ? [...pending, ...saved].sort(byDateDesc) : saved;
  }, [data, queue.items]);

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

  // Shown while the API is unreachable or Render is still waking, until the first response lands.
  const [cached, setCached] = useState(null);
  useEffect(() => {
    let active = true;
    loadActivityCache(userId, todayKey).then((next) => active && setCached(next));
    return () => {
      active = false;
    };
  }, [userId, todayKey]);

  useEffect(() => {
    if (data) saveActivityCache(userId, todayKey, { summary: today, hasEverSynced });
  }, [data, userId, todayKey, today, hasEverSynced]);

  const showCached = !data && Boolean(cached);

  const handleCreate = useCallback(
    async (payload) => {
      const result = await activityApi.logManual(payload);
      if (!result.queued) setData((prev) => [result.entry, ...(prev ?? [])].sort(byDateDesc));
    },
    [setData],
  );

  const handleDelete = async (id) => {
    setDeletingId(id);
    setDeleteError(null);
    try {
      if (queue.items.some((item) => item.id === id)) {
        await removeQueuedRequest(id);
        return;
      }
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
        summary={showCached ? cached.summary : today}
        now={now}
        hasEverSynced={showCached ? cached.hasEverSynced : hasEverSynced}
        onConnect={() => setSyncOpen(true)}
        isLoading={isInitialLoad && !showCached}
        isCached={showCached}
        isRefreshing={loading}
      />

      <Card title="Log a workout" subtitle="Gym sessions, treadmill runs, anything your phone missed">
        <ManualActivityForm onSubmit={handleCreate} />
        {queue.items.length > 0 && (
          <p
            role="status"
            className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90"
          >
            <CloudOffIcon className="size-4 shrink-0 text-amber-300" />
            Changes saved offline. Syncing once backend wakes up.
          </p>
        )}
        {queue.rejected.length > 0 && (
          <div className="mt-3">
            <ErrorMessage
              error={
                new Error(
                  `${queue.rejected.length === 1 ? 'A workout' : `${queue.rejected.length} workouts`} saved offline couldn’t be synced: ${queue.rejected[0].error}`,
                )
              }
            />
          </div>
        )}
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
