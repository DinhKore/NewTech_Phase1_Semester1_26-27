import { z } from 'zod';
import { AiInvalidOutputError } from '../../shared/errors/app-error';

export const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];

export interface QuizOption {
  key: OptionKey;
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
  answer: OptionKey;
  explanation: string;
}

/** Schema the LLM output must satisfy (structured-output validation). */
const LlmQuizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().trim().min(5),
        options: z.array(z.string().trim().min(1)).length(4),
        answer: z.enum(OPTION_KEYS),
        explanation: z.string().trim().min(1),
      }),
    )
    .min(1),
});

const OPTION_PREFIX = /^[A-D][.):]\s+/;

function stripCodeFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
}

/** Parses and validates raw LLM text. Throws AiInvalidOutputError when it does not match the schema. */
export function parseQuizOutput(raw: string, maxQuestions: number): QuizQuestion[] {
  let data: unknown;
  try {
    data = JSON.parse(stripCodeFences(raw));
  } catch (error) {
    throw new AiInvalidOutputError('AI không trả về JSON hợp lệ.', error);
  }

  // Accept both {"questions":[...]} and a bare array.
  const candidate = Array.isArray(data) ? { questions: data } : data;
  const parsed = LlmQuizSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new AiInvalidOutputError('Cấu trúc câu hỏi AI trả về không đúng định dạng.', parsed.error);
  }

  return parsed.data.questions.slice(0, maxQuestions).map((item, index) => ({
    id: index + 1,
    question: item.question,
    options: item.options.map((text, position) => ({
      key: OPTION_KEYS[position] as OptionKey,
      text: text.replace(OPTION_PREFIX, ''),
    })),
    answer: item.answer,
    explanation: item.explanation,
  }));
}
