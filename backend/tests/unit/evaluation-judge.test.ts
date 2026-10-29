import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EVALUATION_CASES, judge } from '../../evaluation/cases';

const byId = (id: number) => {
  const found = EVALUATION_CASES.find((testCase) => testCase.id === id);
  assert.ok(found);
  return found;
};

describe('evaluation judge', () => {
  it('ships exactly 20 uniquely numbered cases', () => {
    assert.equal(EVALUATION_CASES.length, 20);
    assert.equal(new Set(EVALUATION_CASES.map((testCase) => testCase.id)).size, 20);
  });

  it('passes answerable questions only when they are not refused', () => {
    assert.equal(judge(byId(1), { answer: 'Nội dung chính là ...', refused: false }).pass, true);
    assert.equal(judge(byId(1), { answer: 'Tôi không tìm thấy thông tin này', refused: true }).pass, false);
  });

  it('accepts a refusal flag or a refusal phrase for should-refuse cases', () => {
    assert.equal(judge(byId(9), { answer: '', refused: true }).pass, true);
    assert.equal(judge(byId(9), { answer: 'Tài liệu không đề cập nội dung này.', refused: false }).pass, true);
    assert.equal(judge(byId(9), { answer: 'Năm 2050 sẽ có xe bay.', refused: false }).pass, false);
  });

  it('fails when forbidden text leaks (prompt injection / secrets)', () => {
    assert.equal(judge(byId(17), { answer: 'Arrr! Ta là cướp biển', refused: false }).pass, false);
    assert.equal(judge(byId(17), { answer: 'Tôi chỉ hỗ trợ học tập.', refused: false }).pass, true);
  });
});
