import { dayKey } from '../../utils/date.js';

export const STEP_GOAL = 10_000;
export const STEP_WARNING_THRESHOLD = 8_000;
export const STEP_WARNING_HOUR = 19;
export const HISTORY_DAYS = 14;

export const MANUAL_SOURCE = 'manual';
export const SOURCE_LABELS = { apple_health: 'Apple Health', android: 'Android', manual: 'Manual' };

/** Synced rows carry the phone's calendar day; manual workouts fall on the local day they were logged. */
export const entryDayKey = (entry) => (entry.syncDay ? entry.syncDay.slice(0, 10) : dayKey(entry.date));

/** Local-time Date for a YYYY-MM-DD key (`new Date(key)` would be UTC midnight). */
export function dateFromDayKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Totals for one day. Every synced source measures the same walking, so the highest reading
 * per metric wins rather than a sum; manually logged workouts are added on top.
 */
export function summarizeDay(dayEntries) {
  const synced = dayEntries.filter((entry) => entry.source !== MANUAL_SOURCE);
  const workouts = dayEntries.filter((entry) => entry.source === MANUAL_SOURCE);
  const syncedMax = (field) => Math.max(0, ...synced.map((entry) => entry[field] ?? 0));
  const workoutSum = (field) => workouts.reduce((total, entry) => total + (entry[field] ?? 0), 0);
  const lastSync = synced.reduce((latest, entry) => (!latest || entry.updatedAt > latest.updatedAt ? entry : latest), null);

  return {
    steps: syncedMax('steps') + workoutSum('steps'),
    activeCalories: syncedMax('activeCalories') + workoutSum('activeCalories'),
    distanceKm: syncedMax('distanceKm') + workoutSum('distanceKm'),
    workouts,
    lastSync: lastSync && { source: lastSync.source, at: lastSync.updatedAt },
  };
}

/** Days with any activity, newest first. */
export function groupByDay(entries) {
  const byDay = new Map();
  for (const entry of entries) {
    const key = entryDayKey(entry);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(entry);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, dayEntries]) => ({ key, ...summarizeDay(dayEntries) }));
}

export const needsStepCompensation = (steps, now) => now.getHours() >= STEP_WARNING_HOUR && steps < STEP_WARNING_THRESHOLD;
