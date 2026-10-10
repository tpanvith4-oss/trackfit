import { disconnectDb, prisma } from '../src/config/db.js';

const LEGACY_OWNER_ID = 'legacy-owner';

const username = process.argv[2]?.trim().toLowerCase();
if (!username) {
  console.error('Usage: npm run claim-legacy-data --workspace server -- <username>');
  process.exit(1);
}

try {
  const result = await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { username }, select: { id: true, username: true } });
    if (!target) throw new Error(`No account named "${username}". Create the profile in the app first.`);

    const legacy = await tx.user.findUnique({ where: { id: LEGACY_OWNER_ID }, select: { id: true } });
    if (!legacy) return null;

    const food = await tx.foodEntry.updateMany({ where: { userId: LEGACY_OWNER_ID }, data: { userId: target.id } });
    const weight = await tx.weightEntry.updateMany({ where: { userId: LEGACY_OWNER_ID }, data: { userId: target.id } });
    await tx.user.delete({ where: { id: LEGACY_OWNER_ID } });

    return { username: target.username, food: food.count, weight: weight.count };
  });

  if (result) {
    console.log(`Moved ${result.food} food and ${result.weight} weight entries to "${result.username}".`);
  } else {
    console.log('No pre-account data to claim.');
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
