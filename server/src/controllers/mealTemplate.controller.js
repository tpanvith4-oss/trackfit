import { prisma } from '../config/db.js';

export async function list(req, res) {
  const data = await prisma.mealTemplate.findMany({
    where: { userId: req.userId },
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ data });
}
