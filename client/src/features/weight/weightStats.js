import { addDays, dayKey, startOfDay } from '../../utils/date.js';
import { roundTo } from '../../utils/number.js';
import { MIN_ENTRIES_FOR_RATE, RATE_STATUS, ROLLING_WINDOW_DAYS } from './constants.js';

const byLoggedAtAsc = (a, b) => new Date(a.loggedAt) - new Date(b.loggedAt);
const mean = (values) => values.reduce((total, value) => total + value, 0) / values.length;

/** Averages each calendar day first so multiple weigh-ins on one day don't outweigh other days. */
function averageOfDailyMeans(entries) {
  if (entries.length === 0) return { average: null, days: 0 };

  const weightsByDay = new Map();
  for (const entry of entries) {
    const key = dayKey(entry.loggedAt);
    weightsByDay.set(key, [...(weightsByDay.get(key) ?? []), entry.weightKg]);
  }

  const dailyMeans = [...weightsByDay.values()].map(mean);
  return { average: mean(dailyMeans), days: dailyMeans.length };
}

/**
 * Computes cut-protocol weight stats using local calendar-day windows anchored on `now`:
 * current window = today and the 6 days before it; previous window = days 8–14.
 */
export function calculateWeightStats(entries, now = new Date()) {
  const sorted = (entries ?? [])
    .filter((entry) => entry?.loggedAt && Number.isFinite(Number(entry.weightKg)))
    .map((entry) => ({ ...entry, weightKg: Number(entry.weightKg) }))
    .sort(byLoggedAtAsc);

  const windowEnd = addDays(startOfDay(now), 1);
  const currentStart = addDays(windowEnd, -ROLLING_WINDOW_DAYS);
  const previousStart = addDays(currentStart, -ROLLING_WINDOW_DAYS);

  const within = (from, to) =>
    sorted.filter((entry) => {
      const loggedAt = new Date(entry.loggedAt);
      return loggedAt >= from && loggedAt < to;
    });

  const currentEntries = within(currentStart, windowEnd);
  const previousEntries = within(previousStart, currentStart);
  const current = averageOfDailyMeans(currentEntries);
  const previous = averageOfDailyMeans(previousEntries);

  return {
    sorted,
    latest: sorted.at(-1) ?? null,
    currentAvg: current.average,
    currentDays: current.days,
    previousAvg: previous.average,
    previousDays: previous.days,
    weeklyDelta: current.average != null && previous.average != null ? current.average - previous.average : null,
    recentEntryCount: currentEntries.length + previousEntries.length,
  };
}

export function getRateStatus({ recentEntryCount, weeklyDelta }) {
  if (recentEntryCount < MIN_ENTRIES_FOR_RATE) return RATE_STATUS.COLLECTING;
  if (weeklyDelta == null) return RATE_STATUS.NEEDS_PRIOR_WEEK;

  const delta = roundTo(weeklyDelta, 2);
  if (delta < -0.7) return RATE_STATUS.DROPPING_FAST;
  if (delta < -0.6) return RATE_STATUS.SLIGHTLY_FAST;
  if (delta <= -0.4) return RATE_STATUS.TARGET;
  if (delta <= -0.2) return RATE_STATUS.SLOW_LOSS;
  return RATE_STATUS.STABLE;
}

/**
 * Picks the weigh-in that quick adjustments are relative to: the most recent entry
 * from before today (ideally yesterday), falling back to today's latest entry.
 */
export function findReferenceEntry(sortedEntries, now = new Date()) {
  if (sortedEntries.length === 0) return null;

  const todayStart = startOfDay(now);
  const yesterdayStart = addDays(todayStart, -1);
  const beforeToday = sortedEntries.filter((entry) => new Date(entry.loggedAt) < todayStart);
  const entry = beforeToday.at(-1) ?? sortedEntries.at(-1);
  const loggedAt = new Date(entry.loggedAt);

  let relation = 'earlier';
  if (loggedAt >= todayStart) relation = 'today';
  else if (loggedAt >= yesterdayStart) relation = 'yesterday';

  return { entry, relation };
}
