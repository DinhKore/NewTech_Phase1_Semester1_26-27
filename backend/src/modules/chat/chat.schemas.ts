import { z } from 'zod';

export const StreamChatBodySchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Câu hỏi không được để trống.')
    .max(2000, 'Câu hỏi tối đa 2000 ký tự.')
    .refine((value) => /[\p{L}\p{N}]/u.test(value), 'Câu hỏi phải có nội dung hợp lệ.'),
  sessionId: z.string().uuid().optional(),
});

export const SessionIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const CreateSessionBodySchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
});

export const RenameSessionBodySchema = z.object({
  title: z.string().trim().min(1).max(100),
});
