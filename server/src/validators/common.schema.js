import { z } from 'zod';

export const idParamsSchema = z.object({
  id: z.uuid(),
});

export const listQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .refine((q) => !q.from || !q.to || q.from < q.to, {
    message: '`from` must be earlier than `to`',
    path: ['from'],
  });
