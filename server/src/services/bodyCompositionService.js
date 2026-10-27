import { prisma } from '../config/db.js';
import { CUT_MILESTONES, getMesocycleWeek, getMilestoneForWeek } from '../constants/cutProtocol.js';

/** Metric male US Navy body-fat %; clamps to a sane physiological range. */
export function computeUsNavyBfPct(waistUmbilicalCm, neckCm, heightCm) {
  const waist = Number(waistUmbilicalCm);
  const neck = Number(neckCm);
  const height = Number(heightCm);
  if (!(waist > neck) || !(height > 0)) {
    throw new Error('Waist must exceed neck and height must be positive for US Navy BF%');
  }

  const bfPct = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
  return Math.min(45, Math.max(4, Number(bfPct.toFixed(2))));
}

export function deriveComposition({ weightKg, waistUmbilicalCm, neckCm, heightCm }) {
  const estimatedBfPct = computeUsNavyBfPct(waistUmbilicalCm, neckCm, heightCm);
  const fatMassKg = Number(((weightKg * estimatedBfPct) / 100).toFixed(2));
  const leanMassKg = Number((weightKg - fatMassKg).toFixed(2));
  const whtr = Number((waistUmbilicalCm / heightCm).toFixed(3));
  return { estimatedBfPct, fatMassKg, leanMassKg, whtr };
}

export function compareToTrajectory({ weightKg, waistUmbilicalCm, now = Date.now() }) {
  const mesocycleWeek = getMesocycleWeek(now);
  const milestone = getMilestoneForWeek(mesocycleWeek);
  return {
    mesocycleWeek,
    milestone,
    deltas: {
      weightKg: Number((weightKg - milestone.weightKg).toFixed(2)),
      waistCm: Number((waistUmbilicalCm - milestone.waistCm).toFixed(1)),
    },
    onTrack: waistUmbilicalCm <= milestone.waistCm + 1.0 && weightKg <= milestone.weightKg + 0.8,
    milestones: CUT_MILESTONES,
  };
}

export async function createMeasurement(userId, input) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { heightCm: true, neckCm: true },
  });
  if (!user) throw new Error('User not found');

  const neckCm = input.neckCm ?? user.neckCm;
  const heightCm = user.heightCm;
  const composition = deriveComposition({
    weightKg: input.weightKg,
    waistUmbilicalCm: input.waistUmbilicalCm,
    neckCm,
    heightCm,
  });
  const trajectory = compareToTrajectory({
    weightKg: input.weightKg,
    waistUmbilicalCm: input.waistUmbilicalCm,
  });

  const loggedAt = input.loggedAt ? new Date(input.loggedAt) : new Date();

  const [measurement] = await prisma.$transaction([
    prisma.bodyMeasurement.create({
      data: {
        userId,
        loggedAt,
        weightKg: input.weightKg,
        waistUmbilicalCm: input.waistUmbilicalCm,
        waistNarrowestCm: input.waistNarrowestCm ?? null,
        neckCm,
        estimatedBfPct: composition.estimatedBfPct,
        fatMassKg: composition.fatMassKg,
        leanMassKg: composition.leanMassKg,
        whtr: composition.whtr,
        isFasted: input.isFasted ?? true,
        giBloatScore: input.giBloatScore ?? 1,
        note: input.note ?? null,
      },
    }),
    prisma.weightEntry.create({
      data: {
        userId,
        weightKg: input.weightKg,
        loggedAt,
        note: input.note ? `Waist check-in: ${input.note}` : 'Synced from waist / BF check-in',
      },
    }),
  ]);

  return { measurement, trajectory };
}

export function listMeasurements(userId, { limit = 30 } = {}) {
  return prisma.bodyMeasurement.findMany({
    where: { userId },
    orderBy: { loggedAt: 'desc' },
    take: limit,
  });
}

export async function getTrajectorySummary(userId) {
  const latest = await prisma.bodyMeasurement.findFirst({
    where: { userId },
    orderBy: { loggedAt: 'desc' },
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      heightCm: true,
      neckCm: true,
      targetWaistCm: true,
      baselineWeight: true,
      targetWeightMin: true,
      targetWeightMax: true,
      protocolStart: true,
      targetDeadline: true,
    },
  });

  const mesocycleWeek = getMesocycleWeek();
  const milestone = getMilestoneForWeek(mesocycleWeek);

  return {
    user,
    latest,
    mesocycleWeek,
    milestone,
    milestones: CUT_MILESTONES,
    trajectory: latest
      ? compareToTrajectory({ weightKg: latest.weightKg, waistUmbilicalCm: latest.waistUmbilicalCm })
      : null,
  };
}
