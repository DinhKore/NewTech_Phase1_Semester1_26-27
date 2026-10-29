import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapWithConcurrency } from '../../src/shared/utils/concurrency';
import { withRetry } from '../../src/shared/utils/retry';
import { normalizeUploadedFilename, sampleEvenly, truncate } from '../../src/shared/utils/text';

describe('withRetry', () => {
  it('retries with exponential backoff until the operation succeeds', async () => {
    const delays: number[] = [];
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error('transient');
        return 'ok';
      },
      { attempts: 5, baseDelayMs: 100, shouldRetry: () => true, sleep: async (ms) => void delays.push(ms) },
    );

    assert.equal(result, 'ok');
    assert.equal(calls, 3);
    assert.deepEqual(delays, [100, 200]);
  });

  it('does not retry when shouldRetry returns false', async () => {
    let calls = 0;
    await assert.rejects(
      withRetry(
        async () => {
          calls += 1;
          throw new Error('fatal');
        },
        { attempts: 5, baseDelayMs: 1, shouldRetry: () => false, sleep: async () => undefined },
      ),
      /fatal/,
    );
    assert.equal(calls, 1);
  });

  it('gives up after the configured number of attempts', async () => {
    let calls = 0;
    await assert.rejects(
      withRetry(
        async () => {
          calls += 1;
          throw new Error('still failing');
        },
        { attempts: 3, baseDelayMs: 1, shouldRetry: () => true, sleep: async () => undefined },
      ),
      /still failing/,
    );
    assert.equal(calls, 3);
  });
});

describe('mapWithConcurrency', () => {
  it('limits parallelism and preserves order', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (value) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return value * 10;
    });

    assert.deepEqual(results, [10, 20, 30, 40, 50, 60]);
    assert.ok(maxInFlight <= 2);
  });
});

describe('text utils', () => {
  it('truncate collapses whitespace and adds an ellipsis only when needed', () => {
    assert.equal(truncate('a  b\n c', 10), 'a b c');
    assert.equal(truncate('abcdefghij', 5), 'abcd…');
  });

  it('sampleEvenly spreads picks across the list', () => {
    assert.deepEqual(sampleEvenly([1, 2, 3, 4, 5, 6, 7, 8], 4), [1, 3, 5, 7]);
    assert.deepEqual(sampleEvenly([1, 2], 5), [1, 2]);
  });

  it('normalizeUploadedFilename repairs latin1-decoded UTF-8 and strips paths', () => {
    const mojibake = Buffer.from('Bài giảng.pdf', 'utf8').toString('latin1');
    assert.equal(normalizeUploadedFilename(mojibake), 'Bài giảng.pdf');
    assert.equal(normalizeUploadedFilename('Bài giảng.pdf'), 'Bài giảng.pdf');
    assert.equal(normalizeUploadedFilename('C:\\fakepath\\notes.pdf'), 'notes.pdf');
    assert.equal(normalizeUploadedFilename('../../etc/passwd.pdf'), 'passwd.pdf');
  });
});
