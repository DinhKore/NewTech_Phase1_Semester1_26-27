import { z } from 'zod';

export const GenerateQuizBodySchema = z.object({
  questionCount: z.coerce.number().int().min(1).max(10).default(3),
  documentId: z.coerce.number().int().positive().optional(),
});
