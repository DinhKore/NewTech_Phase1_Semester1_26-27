import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cosineSimilarity, decodeEmbedding, dot, encodeEmbedding, normalize } from '../../src/shared/math/vector';

describe('vector math', () => {
  it('dot multiplies component-wise and rejects mismatched dimensions', () => {
    assert.equal(dot([1, 2, 3], [4, 5, 6]), 32);
    assert.throws(() => dot([1, 2], [1, 2, 3]), /dimension mismatch/i);
  });

  it('normalize returns a unit vector and keeps the zero vector', () => {
    const unit = normalize([3, 4]);
    assert.ok(Math.abs(dot(unit, unit) - 1) < 1e-6);
    assert.deepEqual([...normalize([0, 0])], [0, 0]);
  });

  it('cosineSimilarity is 1 for parallel and 0 for orthogonal vectors', () => {
    assert.ok(Math.abs(cosineSimilarity([1, 2], [2, 4]) - 1) < 1e-6);
    assert.ok(Math.abs(cosineSimilarity([1, 0], [0, 1])) < 1e-6);
  });

  it('embedding encode/decode round-trips through a BLOB-compatible byte array', () => {
    const original = [0.5, -1.25, 3, 0];
    const decoded = decodeEmbedding(encodeEmbedding(original));
    assert.deepEqual([...decoded], original);
  });
});
