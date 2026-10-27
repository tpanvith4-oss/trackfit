import { prisma } from '../config/db.js';
import { getMesocycleWeek, SPLIT_DAY_LABELS, WEEKDAY_SPLIT, WORKOUT_SPLIT_PRESETS } from '../constants/cutProtocol.js';
import { HttpError } from '../utils/HttpError.js';

const MUSCLE_GROUPS = [
  'CHEST',
  'LATS',
  'UPPER_BACK',
  'SPINAL_ERECTORS',
  'FRONT_DELTS',
  'SIDE_DELTS',
  'REAR_DELTS',
  'BICEPS',
  'TRICEPS',
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'RECTUS_ABDOMINIS',
  'OBLIQUES',
  'TVA',
];

const HARD_SET_THRESHOLD = 3;
const MS_PER_HOUR = 3_600_000;

function recoveryStatus(hoursSinceHardVolume) {
  if (hoursSinceHardVolume == null) return 'READY';
  if (hoursSinceHardVolume < 24) return 'CONFLICT';
  if (hoursSinceHardVolume < 48) return 'RECOVERING';
  return 'READY';
}

export function defaultSplitForDate(date = new Date()) {
  return WEEKDAY_SPLIT[date.getDay()] ?? 'REST';
}

export async function getWorkoutTemplate(userId, splitDay) {
  const presets = WORKOUT_SPLIT_PRESETS[splitDay];
  if (!presets) throw new HttpError(400, `Unknown split day: ${splitDay}`);

  const recentSets = await prisma.workoutSet.findMany({
    where: {
      isCompleted: true,
      isWarmup: false,
      session: { userId, splitDay },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      exerciseName: true,
      weightKg: true,
      reps: true,
      rir: true,
      setNumber: true,
      createdAt: true,
    },
  });

  const ghostByExercise = new Map();
  for (const set of recentSets) {
    if (ghostByExercise.has(set.exerciseName)) continue;
    ghostByExercise.set(set.exerciseName, set);
  }

  const exercises = presets.map((preset) => {
    const ghost = ghostByExercise.get(preset.exerciseName) ?? null;
    const overloadHint = ghost && ghost.rir >= 2 ? '+1 rep' : ghost ? 'Hold load' : 'Establish baseline';
    return {
      ...preset,
      label: preset.exerciseName,
      ghost: ghost
        ? {
            weightKg: ghost.weightKg,
            reps: ghost.reps,
            rir: ghost.rir,
            setNumber: ghost.setNumber,
            loggedAt: ghost.createdAt,
          }
        : null,
      overloadHint,
    };
  });

  return {
    splitDay,
    label: SPLIT_DAY_LABELS[splitDay],
    mesocycleWeek: getMesocycleWeek(),
    exercises,
  };
}

export async function getMuscleRecovery(userId, { now = new Date() } = {}) {
  const since = new Date(now.getTime() - 72 * MS_PER_HOUR);
  const sets = await prisma.workoutSet.findMany({
    where: {
      isCompleted: true,
      isWarmup: false,
      createdAt: { gte: since },
      session: { userId },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      primaryMuscle: true,
      secondaryMuscles: true,
      createdAt: true,
    },
  });

  const hits = Object.fromEntries(MUSCLE_GROUPS.map((muscle) => [muscle, []]));
  for (const set of sets) {
    hits[set.primaryMuscle]?.push(set.createdAt);
    for (const secondary of set.secondaryMuscles ?? []) {
      hits[secondary]?.push(set.createdAt);
    }
  }

  const recovery = {};
  for (const muscle of MUSCLE_GROUPS) {
    const timestamps = hits[muscle];
    if (timestamps.length < HARD_SET_THRESHOLD) {
      recovery[muscle] = { status: 'READY', hardSets72h: timestamps.length, hoursSinceHardVolume: null };
      continue;
    }
    const thirdNewest = timestamps[HARD_SET_THRESHOLD - 1];
    const hoursSinceHardVolume = Number(((now - thirdNewest) / MS_PER_HOUR).toFixed(1));
    recovery[muscle] = {
      status: recoveryStatus(hoursSinceHardVolume),
      hardSets72h: timestamps.length,
      hoursSinceHardVolume,
    };
  }

  return { asOf: now.toISOString(), recovery };
}

export async function createWorkoutSession(userId, { splitDay, notes, sets = [], sessionRpe } = {}) {
  if (!WORKOUT_SPLIT_PRESETS[splitDay]) throw new HttpError(400, `Unknown split day: ${splitDay}`);

  const startedAt = new Date();
  return prisma.workoutSession.create({
    data: {
      userId,
      splitDay,
      mesocycleWeek: getMesocycleWeek(),
      startedAt,
      notes: notes ?? null,
      sessionRpe: sessionRpe ?? null,
      sets: {
        create: sets.map((set, index) => ({
          exerciseName: set.exerciseName,
          primaryMuscle: set.primaryMuscle,
          secondaryMuscles: set.secondaryMuscles ?? [],
          setNumber: set.setNumber ?? index + 1,
          weightKg: set.weightKg ?? 0,
          reps: set.reps,
          rir: set.rir ?? 1,
          isWarmup: set.isWarmup ?? false,
          isCompleted: set.isCompleted ?? true,
        })),
      },
    },
    include: { sets: { orderBy: [{ exerciseName: 'asc' }, { setNumber: 'asc' }] } },
  });
}

export async function completeWorkoutSession(userId, sessionId, { sessionRpe, notes } = {}) {
  const existing = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!existing) throw new HttpError(404, 'Workout session not found');

  const endedAt = new Date();
  const durationMinutes = Math.max(1, Math.round((endedAt - existing.startedAt) / 60_000));

  return prisma.workoutSession.update({
    where: { id: sessionId },
    data: {
      endedAt,
      durationMinutes,
      sessionRpe: sessionRpe ?? existing.sessionRpe,
      notes: notes ?? existing.notes,
    },
    include: { sets: true },
  });
}

export function listWorkoutSessions(userId, { limit = 20 } = {}) {
  return prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    take: limit,
    include: { sets: { orderBy: [{ exerciseName: 'asc' }, { setNumber: 'asc' }] } },
  });
}
