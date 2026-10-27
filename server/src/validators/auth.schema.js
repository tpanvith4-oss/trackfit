import { z } from 'zod';

// bcrypt only uses the first 72 bytes of a password.
const MAX_PASSWORD_LENGTH = 72;

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-z0-9_.]+$/, 'Username can only contain letters, numbers, dots and underscores');

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name must be at most 80 characters'),
  username,
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`),
  baselineWeight: z.number().min(20).max(500).optional(),
  dailyCalories: z.number().int().min(800).max(10000).optional(),
});

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, 'Username is required').max(100),
  password: z.string().min(1, 'Password is required').max(MAX_PASSWORD_LENGTH),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(80, 'Name must be at most 80 characters'),
    baselineWeight: z.number().min(20, 'Weight must be at least 20 kg').max(500, 'Weight must be at most 500 kg'),
    targetWeightMin: z.number().min(20, 'Target must be at least 20 kg').max(500, 'Target must be at most 500 kg'),
    targetWeightMax: z.number().min(20, 'Target must be at least 20 kg').max(500, 'Target must be at most 500 kg'),
    dailyCalories: z.number().int().min(800, 'Calories must be at least 800').max(10000, 'Calories must be at most 10,000'),
    dailyProtein: z.number().int().min(20, 'Protein must be at least 20 g').max(500, 'Protein must be at most 500 g'),
  })
  .refine((body) => body.targetWeightMin <= body.targetWeightMax, {
    message: 'Min target must be less than or equal to max target',
    path: ['targetWeightMin'],
  });
