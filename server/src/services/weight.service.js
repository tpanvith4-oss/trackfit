import { prisma } from '../config/db.js';

export function listWeightEntries({ from, to, limit }) {
  return prisma.weightEntry.findMany({
    where: { loggedAt: { gte: from, lt: to } },
    orderBy: { loggedAt: 'desc' },
    take: limit,
  });
}

export function createWeightEntry(data) {
  return prisma.weightEntry.create({ data });
}

export function deleteWeightEntry(id) {
  return prisma.weightEntry.delete({ where: { id } });
}
