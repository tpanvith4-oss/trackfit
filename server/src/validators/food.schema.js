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
