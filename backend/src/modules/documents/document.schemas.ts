import { z } from 'zod';

export const ListDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(100).optional(),
});

export const DocumentIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
