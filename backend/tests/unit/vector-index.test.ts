import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InMemoryVectorIndex, type VectorRecord } from '../../src/infrastructure/vector/vector-index';

function record(id: number, userId: number, documentId: number, embedding: number[]): VectorRecord {
  return { id, userId, documentId, filename: `doc-${documentId}.pdf`, pageNumber: 1, content: `chunk ${id}`, embedding };
}

describe('InMemoryVectorIndex', () => {
  it('ranks by cosine similarity, best first', () => {
    const index = new InMemoryVectorIndex();
    index.addMany([record(1, 1, 1, [1, 0]), record(2, 1, 1, [0.9, 0.1]), record(3, 1, 1, [0, 1])]);

    const hits = index.search(1, [1, 0], 2);
    assert.deepEqual(
      hits.map((hit) => hit.id),
      [1, 2],
    );
    assert.ok((hits[0]?.score ?? 0) > (hits[1]?.score ?? 1));
  });

  it("never returns another user's chunks (data isolation)", () => {
    const index = new InMemoryVectorIndex();
    index.addMany([record(1, 1, 1, [1, 0]), record(2, 2, 2, [1, 0])]);

    assert.deepEqual(
      index.search(1, [1, 0], 10).map((hit) => hit.userId),
      [1],
    );
    assert.deepEqual(index.search(3, [1, 0], 10), []);
    assert.equal(index.countForUser(2), 1);
    assert.equal(index.list(2).length, 1);
  });

  it('removes only the requested document of the requested user', () => {
    const index = new InMemoryVectorIndex();
    index.addMany([record(1, 1, 10, [1, 0]), record(2, 1, 11, [0, 1]), record(3, 2, 10, [1, 1])]);

    index.removeDocument(1, 10);

    assert.deepEqual(
      index.list(1).map((item) => item.id),
      [2],
    );
    assert.equal(index.countForUser(2), 1);
  });

  it('filters list() by document', () => {
    const index = new InMemoryVectorIndex();
    index.addMany([record(1, 1, 10, [1, 0]), record(2, 1, 11, [0, 1])]);
    assert.deepEqual(
      index.list(1, { documentId: 11 }).map((item) => item.id),
      [2],
    );
  });
});
