import { useMemo, useState } from 'react';
import { weightApi } from '../../api/weightApi.js';
import { RefreshIcon } from '../../components/icons.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorMessage, ListSkeleton } from '../../components/ui/StatusMessage.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { WeightEntryList } from './WeightEntryList.jsx';
import { WeightForm } from './WeightForm.jsx';
import { WeightSummaryCard } from './WeightSummaryCard.jsx';
import { calculateWeightStats, findReferenceEntry, getRateStatus } from './weightStats.js';

const HISTORY_LIMIT = 90;

const byLoggedAtDesc = (a, b) => new Date(b.loggedAt) - new Date(a.loggedAt);

export function LogWeightPanel() {
  const { data, error, loading, reload, setData } = useAsyncData((signal) =>
    weightApi.list({ limit: HISTORY_LIMIT }, { signal }),
  );
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const entries = useMemo(() => data ?? [], [data]);

  const stats = useMemo(() => calculateWeightStats(entries), [entries]);
  const status = useMemo(() => getRateStatus(stats), [stats]);
  const reference = useMemo(() => findReferenceEntry(stats.sorted), [stats]);

  const handleCreate = async (payload) => {
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
      <WeightSummaryCard stats={stats} status={status} isLoading={isInitialLoad} />

      <Card title="Log weight" subtitle="Weigh in after waking, before food or water">
        <WeightForm onSubmit={handleCreate} reference={reference} />
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
