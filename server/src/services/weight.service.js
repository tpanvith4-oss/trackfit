import { prisma } from '../config/db.js';

export function listWeightEntries(userId, { from, to, limit }) {
  return prisma.weightEntry.findMany({
    where: { userId, loggedAt: { gte: from, lt: to } },
    orderBy: { loggedAt: 'desc' },
    take: limit,
  });
}

export function createWeightEntry(userId, data) {
  return prisma.weightEntry.create({ data: { ...data, userId } });
}

export function deleteWeightEntry(userId, id) {
  return prisma.weightEntry.delete({ where: { id, userId } });
}
