import { httpClient } from '../../shared/api/http-client';
import type { QuizGenerateParams, QuizQuestion } from './quiz.types';

export const quizApi = {
  async generate(params: QuizGenerateParams): Promise<QuizQuestion[]> {
    const res = await httpClient.request<{ questions: QuizQuestion[] }>('/api/quiz', {
      method: 'POST',
      json: params,
    });
    return res.questions;
  },
};
