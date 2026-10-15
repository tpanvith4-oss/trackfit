import { z } from 'zod';

export const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

const macroGrams = z.number().min(0).max(1000).nullable().optional();

export const createFoodSchema = z.object({
  name: z.string().trim().min(1).max(120),
  calories: z.number().int().min(0).max(10000),
  proteinG: macroGrams,
  carbsG: macroGrams,
  fatG: macroGrams,
  mealType: z.enum(MEAL_TYPES).default('SNACK'),
  loggedAt: z.coerce.date().optional(),
});

export const aiParseSchema = z.object({
  description: z.string().trim().min(2, 'Describe what you ate').max(500, 'Keep the description under 500 characters'),
  /** The user's local wall-clock time ("HH:mm"), used to guess the meal when the text doesn't say. */
  localTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'localTime must be HH:mm')
    .optional(),
});
