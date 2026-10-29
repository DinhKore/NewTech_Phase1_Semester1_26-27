import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { PROMPTS_DIR } from '../../src/config/paths';
import { PromptNames, PromptRepository } from '../../src/infrastructure/prompts/prompt-repository';

function withTempPrompts(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompts-'));
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, `${name}.txt`), content);
  return dir;
}

describe('PromptRepository', () => {
  it('replaces placeholders and inserts values literally', () => {
    const repo = new PromptRepository(withTempPrompts({ greet: 'Hello {{ name }}! Q: {{question}}' }));
    const rendered = repo.render('greet', { name: 'An', question: 'cost $& {{name}}?' });
    assert.equal(rendered, 'Hello An! Q: cost $& {{name}}?');
  });

  it('throws when a variable is missing or the template does not exist', () => {
    const repo = new PromptRepository(withTempPrompts({ greet: 'Hello {{name}}' }));
    assert.throws(() => repo.render('greet', {}), /requires variable "name"/);
    assert.throws(() => repo.assertAvailable(['missing']), /not found/i);
  });

  it('ships every prompt referenced by PromptNames and they render with their variables', () => {
    const repo = new PromptRepository(PROMPTS_DIR);
    repo.assertAvailable(Object.values(PromptNames));

    const chat = repo.render(PromptNames.chatRag, { context: 'CTX', question: 'QUESTION' });
    assert.match(chat, /CTX/);
    assert.match(chat, /QUESTION/);

    const quiz = repo.render(PromptNames.quizGenerator, { count: '5', context: 'CTX' });
    assert.match(quiz, /đúng 5 câu/);
  });
});
