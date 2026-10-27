import { prisma } from '../config/db.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FREQUENT_LOOKBACK_DAYS = 90;
const FREQUENT_SCAN_LIMIT = 500;
const MIN_FREQUENCY = 2;

const normalizeMealName = (name) => name.trim().toLowerCase().replace(/\s+/g, ' ');

const roundMacro = (value) => Math.round((Number(value) || 0) * 10) / 10;

export function listFoodEntries(userId, { from, to, limit }) {
  return prisma.foodEntry.findMany({
    where: { userId, loggedAt: { gte: from, lt: to } },
    orderBy: { loggedAt: 'desc' },
    take: limit,
  });
}

/** Meals the user logs often, ranked for the quick-add recommendation chips. */
export async function listFrequentMeals(userId, { limit = 8 } = {}) {
  const since = new Date(Date.now() - FREQUENT_LOOKBACK_DAYS * MS_PER_DAY);
  const entries = await prisma.foodEntry.findMany({
    where: { userId, loggedAt: { gte: since } },
    orderBy: { loggedAt: 'desc' },
    take: FREQUENT_SCAN_LIMIT,
    select: {
      name: true,
      mealType: true,
      calories: true,
      proteinG: true,
      carbsG: true,
      fatG: true,
      loggedAt: true,
    },
  });

  const groups = new Map();
  for (const entry of entries) {
    const key = `${normalizeMealName(entry.name)}::${entry.mealType}`;
    const group = groups.get(key);
    if (!group) {
      groups.set(key, {
        key,
        name: entry.name.trim(),
        mealType: entry.mealType,
        frequency: 1,
        caloriesSum: entry.calories,
        proteinSum: entry.proteinG ?? 0,
        carbsSum: entry.carbsG ?? 0,
        fatSum: entry.fatG ?? 0,
        lastLoggedAt: entry.loggedAt,
      });
      continue;
    }
    group.frequency += 1;
    group.caloriesSum += entry.calories;
    group.proteinSum += entry.proteinG ?? 0;
    group.carbsSum += entry.carbsG ?? 0;
    group.fatSum += entry.fatG ?? 0;
    if (entry.loggedAt > group.lastLoggedAt) {
      group.name = entry.name.trim();
      group.lastLoggedAt = entry.loggedAt;
    }
  }

  return [...groups.values()]
    .filter((group) => group.frequency >= MIN_FREQUENCY)
    .sort((a, b) => b.frequency - a.frequency || b.lastLoggedAt - a.lastLoggedAt)
    .slice(0, limit)
    .map((group) => ({
      id: `frequent:${group.key}`,
      name: group.name,
      mealType: group.mealType,
      calories: Math.round(group.caloriesSum / group.frequency),
      proteinG: roundMacro(group.proteinSum / group.frequency),
      carbsG: roundMacro(group.carbsSum / group.frequency),
      fatG: roundMacro(group.fatSum / group.frequency),
      frequency: group.frequency,
      source: 'frequent',
    }));
}

export function createFoodEntry(userId, data) {
  const {
    name,
    calories,
    proteinG,
    carbsG,
    fatG,
    mealType,
    loggedAt,
    weightG,
    isRawWeight,
    fiberG,
    addedOilMl,
    diaasScore,
    effectiveProteinG,
    atwaterCalories,
    isMacroVerified,
  } = data;

  return prisma.foodEntry.create({
    data: {
      userId,
      name,
      calories,
      proteinG,
      carbsG,
      fatG,
      mealType,
      loggedAt,
      weightG: weightG ?? null,
      isRawWeight: isRawWeight ?? true,
      fiberG: fiberG ?? 0,
      addedOilMl: addedOilMl ?? 0,
      diaasScore: diaasScore ?? 1.0,
      effectiveProteinG: effectiveProteinG ?? null,
      atwaterCalories: atwaterCalories ?? null,
      isMacroVerified: isMacroVerified ?? true,
    },
  });
}

export function deleteFoodEntry(userId, id) {
  return prisma.foodEntry.delete({ where: { id, userId } });
}
