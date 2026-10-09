import { z } from 'zod';

export const createWeightSchema = z.object({
  weightKg: z.number().positive().max(500),
  note: z.string().trim().max(280).nullable().optional(),
  loggedAt: z.coerce.date().optional(),
});
