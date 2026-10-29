export type OptionKey = 'A' | 'B' | 'C' | 'D';

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

export interface QuizGenerateParams {
  questionCount: number;
  documentId?: number;
}
