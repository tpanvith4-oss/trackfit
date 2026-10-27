import { useCallback, useMemo, useState } from 'react';
import { checkinsApi } from '../../api/checkinsApi.js';
import { foodApi } from '../../api/foodApi.js';
import { mealTemplatesApi } from '../../api/mealTemplatesApi.js';
import { RefreshIcon } from '../../components/icons.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorMessage, ListSkeleton } from '../../components/ui/StatusMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { dateFromKey, getDayLabel, timestampForDay, todayKey } from '../../hooks/useSelectedDate.js';
import { addDays } from '../../utils/date.js';
import { BlueprintMealBar } from './BlueprintMealBar.jsx';
import { getDailyTargets } from './constants.js';
import { DailyHabitPills } from './DailyHabitPills.jsx';
import { MacroCard } from './MacroCard.jsx';
import { MealForm } from './MealForm.jsx';
import { MealHistory } from './MealHistory.jsx';

const sumBy = (entries, field) => entries.reduce((total, entry) => total + (Number(entry[field]) || 0), 0);

const createOptimisticId = () => `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const EMPTY_CHECKIN = {
  isFoodLogComplete: false,
  waterMl: 0,
  creatineTaken: false,
  vacuumSetsCompleted: 0,
  soyaTripleRinsed: false,
};

export function LogFoodPanel({ selectedDate = todayKey() }) {
  const { user } = useAuth();
  const targets = useMemo(() => getDailyTargets(user), [user]);
  const dayStart = useMemo(() => dateFromKey(selectedDate), [selectedDate]);
  const { data, error, loading, reload, setData } = useAsyncData(
    (signal) => foodApi.list({ from: dayStart, to: addDays(dayStart, 1), limit: 200 }, { signal }),
    [selectedDate],
  );
  const { data: templates } = useAsyncData((signal) => mealTemplatesApi.list({ signal }), []);
  const { data: checkin, setData: setCheckin } = useAsyncData(
    (signal) => checkinsApi.get(dayStart.toISOString(), { signal }),
    [selectedDate],
  );
  const [deletingIds, setDeletingIds] = useState(() => new Set());
  const [deleteError, setDeleteError] = useState(null);
  const [pendingTemplate, setPendingTemplate] = useState(null);
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
        setPendingTemplate(null);
      } catch (err) {
        setData((prev) => (prev ?? []).filter((entry) => entry.id !== optimisticId));
        throw err;
      }
    },
    [setData, selectedDate],
  );

  const handleTemplateTap = useCallback(
    async (template) => {
      setPendingTemplate(template.id);
      try {
        await handleCreate({
          name: template.name.slice(0, 120),
          mealType: template.mealType,
          calories: template.calories,
          proteinG: template.proteinG,
          carbsG: template.carbsG,
          fatG: template.fatG,
          fiberG: template.fiberG,
          diaasScore: template.diaasScore,
          isRawWeight: template.isRawWeight,
          forceOverride: true,
        });
      } catch {
        // MealForm-style errors aren't shown here; leave history unchanged.
      } finally {
        setPendingTemplate(null);
      }
    },
    [handleCreate],
  );

  const handleCheckinPatch = useCallback(
    async (patch) => {
      const previous = checkin ?? EMPTY_CHECKIN;
      setCheckin({ ...previous, ...patch });
      try {
        const saved = await checkinsApi.update({ date: dayStart.toISOString(), ...patch });
        setCheckin(saved);
      } catch {
        setCheckin(previous);
      }
    },
    [checkin, dayStart, setCheckin],
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

      <Card title="Protocol habits" subtitle="Water, creatine, soya rinse, vacuums">
        <DailyHabitPills checkin={checkin ?? EMPTY_CHECKIN} onPatch={handleCheckinPatch} />
        <div className="mt-4">
          <BlueprintMealBar templates={templates ?? []} disabled={Boolean(pendingTemplate)} onSelect={handleTemplateTap} />
        </div>
      </Card>

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
