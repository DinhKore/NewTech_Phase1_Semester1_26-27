import fs from 'node:fs';
import path from 'node:path';

/** Prompt template file names (without extension). Bump the suffix to introduce a new version. */
export const PromptNames = {
  chatRag: 'chat-rag.v1',
  quizGenerator: 'quiz-generator.v1',
} as const;

export type PromptName = (typeof PromptNames)[keyof typeof PromptNames];

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

/**
 * Loads prompt templates from `backend/prompts/*.txt` so they are versioned in Git
 * and can be edited without touching TypeScript code.
 */
export class PromptRepository {
  private readonly directory: string;
  private readonly cache = new Map<string, string>();

  constructor(directory: string) {
    this.directory = directory;
  }

  /** Fails fast at startup if a required template is missing. */
  assertAvailable(names: readonly string[]): void {
    for (const name of names) this.load(name);
  }

  render(name: string, variables: Record<string, string>): string {
    const template = this.load(name);
    // Single pass with a replacer function: values containing "{{x}}" or "$&" are inserted literally.
    return template.replace(PLACEHOLDER, (_match, key: string) => {
      const value = variables[key];
      if (value === undefined) {
        throw new Error(`Prompt "${name}" requires variable "${key}"`);
      }
      return value;
    });
  }

  private load(name: string): string {
    const cached = this.cache.get(name);
    if (cached !== undefined) return cached;

    const filePath = path.join(this.directory, `${name}.txt`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Prompt template not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8').trim();
    this.cache.set(name, content);
    return content;
  }
}
