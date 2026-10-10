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
 * Health apps report running totals for the day, so each sync overwrites that day's row for
 * the source instead of adding to it. Metrics left out of the payload keep their stored value.
 */
export function upsertSyncedActivity(userId, { date: syncDay, source, ...metrics }) {
  return prisma.activityEntry.upsert({
    where: { userId_source_syncDay: { userId, source, syncDay } },
    // Noon UTC falls on the same calendar day for UTC-12 through UTC+11, so date-range queries stay intuitive.
    create: { ...metrics, userId, source, syncDay, date: new Date(syncDay.getTime() + NOON_UTC_MS) },
    update: metrics,
  });
}

export function createManualActivity(userId, data) {
  return prisma.activityEntry.create({ data: { ...data, userId, source: MANUAL_SOURCE } });
}

export async function deleteManualActivity(userId, id) {
  const { count } = await prisma.activityEntry.deleteMany({ where: { id, userId, source: MANUAL_SOURCE } });
  if (count > 0) return;

  const synced = await prisma.activityEntry.findFirst({ where: { id, userId }, select: { id: true } });
  throw synced
    ? new HttpError(409, 'Synced activity comes from your phone and can’t be deleted here')
    : new HttpError(404, 'Activity entry not found');
}
