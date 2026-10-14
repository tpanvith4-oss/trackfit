import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { HttpError } from '../utils/HttpError.js';

const MANUAL_SOURCE = 'manual';
const LIST_LIMIT = 500;
const NOON_UTC_MS = 12 * 60 * 60_000;

export function listActivity(userId, { startDate, endDate }) {
  return prisma.activityEntry.findMany({
    where: { userId, date: { gte: startDate, lt: endDate } },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: LIST_LIMIT,
  });
}

/**
 * Health apps report running totals for the day, so a sync never adds to the stored row: each
 * metric keeps the highest value seen for that day and source. Late or replayed payloads (an
 * offline queue, a Shortcut run twice) therefore can't lower a total, and metrics left out of
 * the payload keep their stored value. Both statements are atomic, so concurrent syncs are safe.
 */
export async function upsertSyncedActivity(userId, { date: syncDay, source, ...metrics }) {
  const { steps = null, activeCalories = null, distanceKm = null, durationMinutes = null, exerciseType = null } = metrics;

  await prisma.activityEntry.createMany({
    // Noon UTC falls on the same calendar day for UTC-12 through UTC+11, so date-range queries stay intuitive.
    data: [{ ...metrics, userId, source, syncDay, date: new Date(syncDay.getTime() + NOON_UTC_MS) }],
    skipDuplicates: true,
  });

  // GREATEST ignores NULL, so an omitted metric leaves the column as it is.
  await prisma.$executeRaw`
    UPDATE activity_entries SET
      steps = GREATEST(steps, ${steps}::int),
      active_calories = GREATEST(active_calories, ${activeCalories}::int),
      distance_km = GREATEST(distance_km, ${distanceKm}::double precision),
      duration_minutes = GREATEST(duration_minutes, ${durationMinutes}::int),
      exercise_type = COALESCE(${exerciseType}::varchar, exercise_type),
      updated_at = NOW()
    WHERE user_id = ${userId}
      AND source = ${source}
      AND sync_day = ${syncDay.toISOString().slice(0, 10)}::date`;

  return prisma.activityEntry.findUnique({ where: { userId_source_syncDay: { userId, source, syncDay } } });
}

/** Logs a workout once per `clientId`: a retry of the same request returns the original entry. */
export async function createManualActivity(userId, data) {
  const { clientId } = data;
  const findRetried = () => prisma.activityEntry.findUnique({ where: { userId_clientId: { userId, clientId } } });

  if (clientId) {
    const existing = await findRetried();
    if (existing) return existing;
  }
  try {
    return await prisma.activityEntry.create({ data: { ...data, userId, source: MANUAL_SOURCE } });
  } catch (err) {
    // Two copies of the same request racing: the loser returns the winner's entry.
    const lostRace = clientId && err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
    const existing = lostRace && (await findRetried());
    if (!existing) throw err;
    return existing;
  }
}

export async function deleteManualActivity(userId, id) {
  const { count } = await prisma.activityEntry.deleteMany({ where: { id, userId, source: MANUAL_SOURCE } });
  if (count > 0) return;

  const synced = await prisma.activityEntry.findFirst({ where: { id, userId }, select: { id: true } });
  throw synced
    ? new HttpError(409, 'Synced activity comes from your phone and can’t be deleted here')
    : new HttpError(404, 'Activity entry not found');
}
