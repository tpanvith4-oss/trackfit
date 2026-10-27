import { z } from 'zod';

export const cuidParamsSchema = z.object({
  id: z.string().cuid(),
});

export const SPLIT_DAYS = [
  'PUSH',
  'PULL_ABS_A',
  'LEGS_QUAD',
  'HIIT_ABS_B',
  'UPPER',
  'LEGS_POSTERIOR_ABS_C',
  'REST',
];

export const MUSCLE_GROUPS = [
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

export const createMeasurementSchema = z.object({
  weightKg: z.number().min(20).max(500),
  waistUmbilicalCm: z.number().min(40).max(200),
  waistNarrowestCm: z.number().min(40).max(200).optional().nullable(),
  neckCm: z.number().min(20).max(80).optional(),
  isFasted: z.boolean().optional(),
  giBloatScore: z.number().int().min(1).max(5).optional(),
  note: z.string().trim().max(280).optional().nullable(),
  loggedAt: z.coerce.date().optional(),
});

export const checkinPatchSchema = z.object({
  date: z.coerce.date().optional(),
  isFoodLogComplete: z.boolean().optional(),
  waterMl: z.number().int().min(0).max(10000).optional(),
  creatineTaken: z.boolean().optional(),
  vacuumSetsCompleted: z.number().int().min(0).max(20).optional(),
  soyaTripleRinsed: z.boolean().optional(),
  bedtimeAt: z.coerce.date().optional().nullable(),
  wakeAt: z.coerce.date().optional().nullable(),
  actualSleepHours: z.number().min(0).max(24).optional().nullable(),
  alarmSolvedAt: z.coerce.date().optional().nullable(),
  alarmSolveDurationSec: z.number().int().min(0).max(3600).optional().nullable(),
});

export const splitDayParamsSchema = z.object({
  splitDay: z.enum(SPLIT_DAYS),
});

export const workoutSetSchema = z.object({
  exerciseName: z.string().trim().min(1).max(120),
  primaryMuscle: z.enum(MUSCLE_GROUPS),
  secondaryMuscles: z.array(z.enum(MUSCLE_GROUPS)).default([]),
  setNumber: z.number().int().min(1).max(20).optional(),
  weightKg: z.number().min(0).max(500).optional(),
  reps: z.number().int().min(0).max(100),
  rir: z.number().int().min(0).max(10).optional(),
  isWarmup: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
});

export const createWorkoutSchema = z.object({
  splitDay: z.enum(SPLIT_DAYS),
  notes: z.string().trim().max(500).optional().nullable(),
  sessionRpe: z.number().int().min(1).max(10).optional().nullable(),
  sets: z.array(workoutSetSchema).default([]),
});

export const completeWorkoutSchema = z.object({
  sessionRpe: z.number().int().min(1).max(10).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const energyQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
  endDate: z.coerce.date().optional(),
});

export const checkinQuerySchema = z.object({
  date: z.coerce.date().optional(),
});
