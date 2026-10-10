import { prisma } from '../config/db.js';

export function listFoodEntries(userId, { from, to, limit }) {
  return prisma.foodEntry.findMany({
    where: { userId, loggedAt: { gte: from, lt: to } },
    orderBy: { loggedAt: 'desc' },
    take: limit,
  });
}

export function createFoodEntry(userId, data) {
  return prisma.foodEntry.create({ data: { ...data, userId } });
}

export function deleteFoodEntry(userId, id) {
  return prisma.foodEntry.delete({ where: { id, userId } });
}
