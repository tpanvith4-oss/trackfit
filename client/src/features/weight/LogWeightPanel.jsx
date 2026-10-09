import { useMemo, useState } from 'react';
import { weightApi } from '../../api/weightApi.js';
import { RefreshIcon } from '../../components/icons.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorMessage, ListSkeleton } from '../../components/ui/StatusMessage.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { formatDay } from '../../utils/date.js';
import { formatNumber } from '../../utils/number.js';
import { WeightEntryForm } from './WeightEntryForm.jsx';
import { WeightEntryList } from './WeightEntryList.jsx';

const HISTORY_LIMIT = 30;

const byLoggedAtDesc = (a, b) => new Date(b.loggedAt) - new Date(a.loggedAt);

export function LogWeightPanel() {
  const { data, error, loading, reload, setData } = useAsyncData((signal) =>
    weightApi.list({ limit: HISTORY_LIMIT }, { signal }),
  );
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const entries = useMemo(() => data ?? [], [data]);

  const latest = entries[0];
  const oldest = entries.at(-1);
  const change = latest && oldest && latest !== oldest ? latest.weightKg - oldest.weightKg : null;

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

  return (
    <div className="space-y-4">
      <Card title="Current weight" subtitle={latest ? `Last logged ${formatDay(latest.loggedAt)}` : 'No data yet'}>
        <div className="flex items-end justify-between">
          <p className="text-4xl font-bold tabular-nums text-slate-100">
            {latest ? formatNumber(latest.weightKg) : '—'}
            <span className="ml-1 text-base font-medium text-slate-400">kg</span>
          </p>
          {change != null && (
            <p className="text-right text-sm text-slate-400">
              <span className={`font-semibold ${change > 0 ? 'text-amber-400' : 'text-brand-400'}`}>
                {change > 0 ? '+' : ''}
                {formatNumber(change)} kg
              </span>
              <br />
              over last {entries.length} entries
            </p>
          )}
        </div>
      </Card>

      <Card title="Log weight" subtitle="Weigh in at the same time each day for best accuracy">
        <WeightEntryForm onSubmit={handleCreate} lastWeightKg={latest?.weightKg} />
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
          {loading && !data ? (
            <ListSkeleton />
          ) : (
            !error && <WeightEntryList entries={entries} onDelete={handleDelete} deletingId={deletingId} />
          )}
        </div>
      </Card>
    </div>
  );
}
