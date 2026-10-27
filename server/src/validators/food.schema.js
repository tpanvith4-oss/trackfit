import { z } from 'zod';

export const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

export const recommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

const macroGrams = z.number().min(0).max(1000).nullable().optional();

export const createFoodSchema = z.object({
  name: z.string().trim().min(1).max(120),
  calories: z.number().int().min(0).max(10000),
  proteinG: macroGrams,
  carbsG: macroGrams,
  fatG: macroGrams,
  mealType: z.enum(MEAL_TYPES).default('SNACK'),
  weightG: z.number().min(0).max(5000).optional().nullable(),
  isRawWeight: z.boolean().optional(),
  fiberG: z.number().min(0).max(200).optional(),
  addedOilMl: z.number().min(0).max(100).optional(),
  diaasScore: z.number().min(0).max(2).optional(),
  forceOverride: z.boolean().optional(),
  loggedAt: z.coerce.date().optional(),
});

const mealText = z.string().trim().min(2, 'Describe what you ate').max(500, 'Keep the description under 500 characters');

// `description` is what the app sends. `query` is accepted as the same field.
export const aiParseSchema = z
  .object({
    description: mealText.optional(),
    query: mealText.optional(),
    /** The user's local wall-clock time ("HH:mm"), used to guess the meal when the text doesn't say. */
    localTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'localTime must be HH:mm')
      .optional(),
  })
  .refine((body) => Boolean(body.description || body.query), {
    message: 'Describe what you ate',
    path: ['query'],
  })
  .transform((body) => ({
    description: body.description || body.query,
    localTime: body.localTime,
  }));
