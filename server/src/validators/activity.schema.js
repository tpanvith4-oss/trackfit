import { z } from 'zod';

export const HEALTH_SYNC_SOURCES = ['apple_health', 'android'];

const DAY_MS = 86_400_000;
const DEFAULT_RANGE_DAYS = 14;
const MAX_RANGE_DAYS = 366;
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The sender's calendar day as UTC midnight, read from the start of an ISO date or datetime
 * ("2026-10-10" or "2026-10-10T21:00:00+05:30") so the phone's time zone decides the day.
 */
const calendarDay = z
  .string({ error: 'date must be a string like "2026-10-10"' })
  .trim()
  .transform((value, ctx) => {
    const match = CALENDAR_DATE.exec(value);
    const [year, month, day] = match ? match.slice(1).map(Number) : [];
    const date = match && new Date(Date.UTC(year, month - 1, day));
    if (!date || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      ctx.addIssue({ code: 'custom', message: 'Use a calendar date like "2026-10-10"' });
      return z.NEVER;
    }
    return date;
  })
  .refine((date) => date.getUTCFullYear() >= 2000 && date.getTime() <= Date.now() + DAY_MS, 'date is out of range');

const isBlank = (value) => value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

/**
 * Omitted dates mean today in UTC. Senders far from UTC should still send their own date around
 * local midnight, or a sync can land on the neighbouring day and overwrite its totals.
 */
const syncDate = z.preprocess((value) => (isBlank(value) ? new Date().toISOString().split('T')[0] : value), calendarDay);

// Shortcuts may send numbers as JSON numbers or numeric strings; separators like "8,234" are rejected.
const metric = (max) => z.coerce.number({ error: 'Must be a number' }).min(0).max(max);
const wholeMetric = (max) => metric(max).transform(Math.round);

export const healthSyncSchema = z
  .object({
    date: syncDate,
    steps: wholeMetric(200_000).optional(),
    activeCalories: wholeMetric(20_000).optional(),
    distanceKm: metric(1_000)
      .transform((km) => Math.round(km * 100) / 100)
      .optional(),
    exerciseType: z.string().trim().min(1).max(60).nullable().optional(),
    durationMinutes: wholeMetric(1_440).nullable().optional(),
    source: z.enum(HEALTH_SYNC_SOURCES).default('apple_health'),
  })
  .refine(
    (body) => ['steps', 'activeCalories', 'distanceKm', 'durationMinutes'].some((key) => body[key] != null),
    'Send at least one of steps, activeCalories, distanceKm or durationMinutes',
  );

export const manualActivitySchema = z.object({
  exerciseType: z.string().trim().min(1).max(60),
  durationMinutes: z.number().int().min(1).max(1_440),
  activeCalories: z.number().int().min(0).max(10_000),
  distanceKm: z.number().min(0).max(500).nullable().optional(),
  steps: z.number().int().min(0).max(100_000).optional(),
  date: z.coerce
    .date()
    .refine((date) => date.getTime() <= Date.now() + 5 * 60_000, 'Workouts can’t be logged in the future')
    .optional(),
});

/** A bare `endDate` day is inclusive, so it becomes the following midnight (UTC). */
const rangeEnd = z.preprocess(
  (value) => (typeof value === 'string' && DATE_ONLY.test(value) ? new Date(Date.parse(value) + DAY_MS) : value),
  z.coerce.date(),
);

export const activityQuerySchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: rangeEnd.optional(),
  })
  .transform(({ startDate, endDate }) => {
    // Runs a day ahead by default so today's synced totals (stored at noon UTC) are included in every time zone.
    const end = endDate ?? new Date(Date.now() + DAY_MS);
    const start = startDate ?? new Date((endDate ? end.getTime() : Date.now()) - DEFAULT_RANGE_DAYS * DAY_MS);
    return { startDate: start, endDate: end };
  })
  .refine(({ startDate, endDate }) => startDate < endDate, { message: '`startDate` must be before `endDate`', path: ['startDate'] })
  .refine(({ startDate, endDate }) => endDate - startDate <= MAX_RANGE_DAYS * DAY_MS, {
    message: `Date range can be at most ${MAX_RANGE_DAYS} days`,
    path: ['startDate'],
  });

export const activityIdParamsSchema = z.object({
  id: z.cuid(),
});
