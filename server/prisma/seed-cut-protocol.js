import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { MEAL_TEMPLATE_SEEDS, PROTOCOL_DEADLINE_ISO, PROTOCOL_START_ISO } from '../src/constants/cutProtocol.js';

const prisma = new PrismaClient();

const TARGET_USERNAME = 'anvith';
const TARGET_USER_ID = 'cmv263f2q0000f921j7i6d548';

async function seed() {
  const user =
    (await prisma.user.findUnique({ where: { id: TARGET_USER_ID } })) ??
    (await prisma.user.findUnique({ where: { username: TARGET_USERNAME } }));

  if (!user) {
    throw new Error(`User ${TARGET_USERNAME} (${TARGET_USER_ID}) not found. Register/login first, then re-run seed.`);
  }

  console.log(`[seed] Updating protocol profile for @${user.username} (${user.id})`);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      heightCm: 165.0,
      neckCm: 37.0,
      baselineWeight: 63.9,
      targetWeightMin: 56.5,
      targetWeightMax: 57.5,
      targetWaistCm: 76.2,
      dailyCalories: 1550,
      dailyProtein: 138,
      protocolStart: new Date(PROTOCOL_START_ISO),
      targetDeadline: new Date(PROTOCOL_DEADLINE_ISO),
    },
  });

  const existingBaseline = await prisma.bodyMeasurement.findFirst({
    where: { userId: user.id },
    orderBy: { loggedAt: 'asc' },
  });

  if (!existingBaseline) {
    console.log('[seed] Creating Week 0 baseline body measurement');
    await prisma.bodyMeasurement.create({
      data: {
        userId: user.id,
        loggedAt: new Date('2026-10-24T06:35:00.000Z'),
        weightKg: 63.9,
        waistUmbilicalCm: 85.5,
        neckCm: 37.0,
        estimatedBfPct: 19.84,
        fatMassKg: 12.68,
        leanMassKg: 51.22,
        whtr: 0.518,
        isFasted: true,
        giBloatScore: 3,
        note: 'Week 0 Baseline (~2.5cm GI distension)',
      },
    });
  } else {
    console.log('[seed] Baseline body measurement already exists — skipping');
  }

  const existingTemplates = await prisma.mealTemplate.count({ where: { userId: user.id } });
  if (existingTemplates === 0) {
    console.log('[seed] Creating 7 meal templates');
    await prisma.mealTemplate.createMany({
      data: MEAL_TEMPLATE_SEEDS.map((template) => ({
        userId: user.id,
        ...template,
        isRawWeight: true,
      })),
    });
  } else {
    console.log(`[seed] ${existingTemplates} meal templates already exist — skipping`);
  }

  console.log('[seed] Done.');
}

seed()
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
