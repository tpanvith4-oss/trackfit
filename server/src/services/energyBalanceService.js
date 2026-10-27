import { prisma } from '../config/db.js';

const MS_PER_DAY = 86_400_000;
const WALK_OVERLAP = /steps|walk|treadmill/i;
const COMPLETE_MIN_ENTRIES = 3;
const COMPLETE_MIN_CALORIES = 1200;

const dayKeyUtc = (date) => date.toISOString().slice(0, 10);

function startOfUtcDay(date) {
  return new Date(`${dayKeyUtc(date)}T00:00:00.000Z`);
}

function addUtcDays(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Deduplicate apple_health passive burn vs manual walk/treadmill logs for one day.
 */
export function sumActiveCalories(entries) {
  const synced = entries.filter((e) => e.source !== 'manual');
  const manual = entries.filter((e) => e.source === 'manual');
  const syncedCalories = Math.max(0, ...synced.map((e) => e.activeCalories ?? 0), 0);
  let manualCalories = manual.reduce((sum, e) => sum + (e.activeCalories ?? 0), 0);

  for (const workout of manual) {
    if (WALK_OVERLAP.test(workout.exerciseType ?? '') && workout.durationMinutes) {
      manualCalories -= workout.durationMinutes * 4.5;
    }
  }

  return Math.max(0, Math.round(syncedCalories + Math.max(0, manualCalories)));
}

function isDayComplete(checkin, foodCount, foodCalories) {
  if (checkin?.isFoodLogComplete) return true;
  return foodCount >= COMPLETE_MIN_ENTRIES && foodCalories >= COMPLETE_MIN_CALORIES;
}

export async function getRollingEnergyBalance(userId, { days = 7, endDate = new Date() } = {}) {
  const end = startOfUtcDay(endDate);
  const start = addUtcDays(end, -(days - 1));
  const rangeEnd = addUtcDays(end, 1);

  const [foodEntries, checkins, activityEntries] = await Promise.all([
    prisma.foodEntry.findMany({
      where: { userId, loggedAt: { gte: start, lt: rangeEnd } },
      select: { loggedAt: true, calories: true, proteinG: true, effectiveProteinG: true },
    }),
    prisma.dailyCheckin.findMany({
      where: { userId, date: { gte: start, lt: rangeEnd } },
    }),
    prisma.activityEntry.findMany({
      where: { userId, date: { gte: start, lt: rangeEnd } },
    }),
  ]);

  const checkinByDay = new Map(checkins.map((c) => [dayKeyUtc(c.date), c]));
  const dayBuckets = [];

  for (let i = 0; i < days; i += 1) {
    const dayStart = addUtcDays(start, i);
    const key = dayKeyUtc(dayStart);
    const next = addUtcDays(dayStart, 1);
    const foods = foodEntries.filter((e) => e.loggedAt >= dayStart && e.loggedAt < next);
    const activities = activityEntries.filter((e) => {
      const k = e.syncDay ? dayKeyUtc(e.syncDay) : dayKeyUtc(e.date);
      return k === key;
    });

    const calories = foods.reduce((sum, e) => sum + (e.calories || 0), 0);
    const proteinG = foods.reduce((sum, e) => sum + (e.effectiveProteinG ?? e.proteinG ?? 0), 0);
    const checkin = checkinByDay.get(key) ?? null;
    const complete = isDayComplete(checkin, foods.length, calories);

    dayBuckets.push({
      date: key,
      calories,
      proteinG: Number(proteinG.toFixed(1)),
      foodCount: foods.length,
      activeCalories: sumActiveCalories(activities),
      complete,
      checkin,
    });
  }

  const completeDays = dayBuckets.filter((d) => d.complete);
  const avg = (rows, field) =>
    rows.length === 0 ? null : Number((rows.reduce((sum, row) => sum + row[field], 0) / rows.length).toFixed(1));

  return {
    days: dayBuckets,
    completeDaysCount: completeDays.length,
    verifiedAverage: {
      calories: avg(completeDays, 'calories'),
      proteinG: avg(completeDays, 'proteinG'),
      activeCalories: avg(completeDays, 'activeCalories'),
    },
    rawAverage: {
      calories: avg(dayBuckets, 'calories'),
      proteinG: avg(dayBuckets, 'proteinG'),
      activeCalories: avg(dayBuckets, 'activeCalories'),
    },
  };
}

export async function upsertDailyCheckin(userId, dateInput, patch) {
  const date = startOfUtcDay(new Date(dateInput));
  return prisma.dailyCheckin.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, ...patch },
    update: patch,
  });
}

export async function getDailyCheckin(userId, dateInput) {
  const date = startOfUtcDay(new Date(dateInput));
  return (
    (await prisma.dailyCheckin.findUnique({ where: { userId_date: { userId, date } } })) ?? {
      userId,
      date,
      isFoodLogComplete: false,
      waterMl: 0,
      creatineTaken: false,
      vacuumSetsCompleted: 0,
      soyaTripleRinsed: false,
    }
  );
}
