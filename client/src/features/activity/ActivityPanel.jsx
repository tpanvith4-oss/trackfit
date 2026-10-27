import { useCallback, useEffect, useMemo, useState } from 'react';
import { activityApi } from '../../api/activityApi.js';
import { WeeklyCaloriesBarChart } from '../../components/charts/WeeklyCaloriesBarChart.jsx';
import { CloudOffIcon, RefreshIcon } from '../../components/icons.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorMessage, ListSkeleton } from '../../components/ui/StatusMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { useNow } from '../../hooks/useNow.js';
import { dateFromKey, getDayLabel, shiftDayKey, timestampForDay } from '../../hooks/useSelectedDate.js';
import { useSyncQueue } from '../../hooks/useSyncQueue.js';
import { removeQueuedRequest } from '../../services/syncQueue.js';
import { addDays, dayKey } from '../../utils/date.js';
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

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

export function ActivityPanel({ selectedDate }) {
  const userId = useAuth().user.id;
  const now = useNow(60_000);
  const todayKey = dayKey(now);
  const viewKey = selectedDate && selectedDate < todayKey ? selectedDate : todayKey;
  const isViewingToday = viewKey === todayKey;
  // A day of slack each side: synced totals sit at noon UTC, which can cross local midnight.
  const { data, error, loading, reload, setData } = useAsyncData(
    (signal) => {
      const anchor = dateFromKey(viewKey);
      return activityApi.list({ startDate: addDays(anchor, -HISTORY_DAYS), endDate: addDays(anchor, 2) }, { signal });
    },
    [viewKey],
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

  const today = useMemo(() => summarizeDay(entries.filter((entry) => entryDayKey(entry) === viewKey)), [entries, viewKey]);
  const allDays = useMemo(() => groupByDay(entries), [entries]);
  const days = useMemo(() => {
    const oldestKey = shiftDayKey(viewKey, -(HISTORY_DAYS - 1));
    return allDays.filter((day) => day.key >= oldestKey && day.key <= viewKey);
  }, [allDays, viewKey]);
  const week = useMemo(() => {
    const byKey = new Map(allDays.map((day) => [day.key, day]));
    return Array.from({ length: 7 }, (_, index) => {
      const key = shiftDayKey(viewKey, index - 6);
      const day = byKey.get(key);
      return { day: weekdayFormatter.format(dateFromKey(key)), label: getDayLabel(key), steps: day?.steps ?? 0, activeCalories: day?.activeCalories ?? 0 };
    });
  }, [allDays, viewKey]);
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
    if (data && isViewingToday) saveActivityCache(userId, todayKey, { summary: today, hasEverSynced });
  }, [data, isViewingToday, userId, todayKey, today, hasEverSynced]);

  const showCached = isViewingToday && !data && Boolean(cached);

  const handleCreate = useCallback(
    async (payload) => {
      const entry = isViewingToday ? payload : { ...payload, date: timestampForDay(viewKey).toISOString() };
      const result = await activityApi.logManual(entry);
      if (!result.queued) setData((prev) => [result.entry, ...(prev ?? [])].sort(byDateDesc));
    },
    [setData, isViewingToday, viewKey],
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
        title={isViewingToday ? "Today's activity" : `Activity · ${getDayLabel(viewKey)}`}
        summary={showCached ? cached.summary : today}
        now={isViewingToday ? now : dateFromKey(viewKey)}
        hasEverSynced={showCached ? cached.hasEverSynced : hasEverSynced}
        onConnect={() => setSyncOpen(true)}
        isLoading={isInitialLoad && !showCached}
        isCached={showCached}
        isRefreshing={loading}
      />

      <Card title="Weekly active calories" subtitle="7 days ending on the selected day">
        {isInitialLoad ? <div className="h-48 animate-pulse rounded-xl bg-slate-800/40" aria-busy="true" /> : <WeeklyCaloriesBarChart data={week} />}
      </Card>

      <Card
        title={isViewingToday ? 'Log a workout' : `Log a workout for ${getDayLabel(viewKey)}`}
        subtitle="Gym sessions, treadmill runs, anything your phone missed"
      >
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
