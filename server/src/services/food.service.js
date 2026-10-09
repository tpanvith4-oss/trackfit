import { prisma } from '../config/db.js';

export function listFoodEntries({ from, to, limit }) {
  return prisma.foodEntry.findMany({
    where: { loggedAt: { gte: from, lt: to } },
    orderBy: { loggedAt: 'desc' },
    take: limit,
  });
}

export function createFoodEntry(data) {
  return prisma.foodEntry.create({ data });
}

export function deleteFoodEntry(id) {
  return prisma.foodEntry.delete({ where: { id } });
}
