import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseQuizOutput } from '../../src/modules/quiz/quiz.output';
import { AiInvalidOutputError } from '../../src/shared/errors/app-error';

const item = (overrides: Record<string, unknown> = {}) => ({
  question: 'Quang hợp diễn ra ở đâu?',
  options: ['A. Lục lạp', 'Ti thể', 'Nhân', 'Ribosome'],
  answer: 'A',
  explanation: 'Lục lạp chứa diệp lục.',
  ...overrides,
});

describe('parseQuizOutput', () => {
  it('maps a valid response to keyed options and strips "A." prefixes', () => {
    const [question] = parseQuizOutput(JSON.stringify({ questions: [item()] }), 3);
    assert.ok(question);
    assert.equal(question.id, 1);
    assert.deepEqual(
      question.options.map((option) => option.key),
      ['A', 'B', 'C', 'D'],
    );
    assert.equal(question.options[0]?.text, 'Lục lạp');
    assert.equal(question.answer, 'A');
  });

  it('accepts a bare array and markdown code fences', () => {
    const raw = '```json\n' + JSON.stringify([item(), item()]) + '\n```';
    assert.equal(parseQuizOutput(raw, 5).length, 2);
  });

  it('keeps at most maxQuestions', () => {
    const raw = JSON.stringify({ questions: [item(), item(), item()] });
    assert.equal(parseQuizOutput(raw, 2).length, 2);
  });

  it('rejects non-JSON, wrong option counts and unknown answer keys', () => {
    assert.throws(() => parseQuizOutput('not json', 3), AiInvalidOutputError);
    assert.throws(
      () => parseQuizOutput(JSON.stringify({ questions: [item({ options: ['a', 'b'] })] }), 3),
      AiInvalidOutputError,
    );
    assert.throws(
      () => parseQuizOutput(JSON.stringify({ questions: [item({ answer: 'E' })] }), 3),
      AiInvalidOutputError,
    );
  });
});
