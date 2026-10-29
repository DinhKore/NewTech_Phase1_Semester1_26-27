import type { Request, Response } from 'express';
import { requireUser } from '../auth/auth.middleware';
import { GenerateQuizBodySchema } from './quiz.schemas';
import type { QuizService } from './quiz.service';

export class QuizController {
  private readonly quizService: QuizService;

  constructor(quizService: QuizService) {
    this.quizService = quizService;
  }

  generate = async (req: Request, res: Response): Promise<void> => {
    const user = requireUser(req);
    const input = GenerateQuizBodySchema.parse(req.body ?? {});
    const questions = await this.quizService.generate(user, input);
    res.status(200).json({ questions });
  };
}
