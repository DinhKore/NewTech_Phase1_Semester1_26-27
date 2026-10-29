export interface RetryOptions {
  /** Total number of attempts (including the first one). */
  attempts: number;
  /** Delay before the 2nd attempt; doubles after each failure. */
  baseDelayMs: number;
  shouldRetry: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function parseRetryDelayMs(error: unknown): number | null {
  if (typeof error === 'object' && error !== null) {
    const msg = (error as { message?: string }).message ?? '';
    const match = msg.match(/retry in (\d+(?:\.\d+)?)s/i) || msg.match(/retryDelay"?:\s*"?(\d+)s/i);
    if (match && match[1]) {
      return Math.ceil(parseFloat(match[1]) * 1000);
    }
  }
  return null;
}

export async function withRetry<T>(operation: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;
  let attempt = 0;

  for (;;) {
    attempt += 1;
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= options.attempts || !options.shouldRetry(error)) throw error;
      const googleHintMs = parseRetryDelayMs(error);
      const delayMs = googleHintMs ? Math.min(googleHintMs + 300, 10000) : options.baseDelayMs * 2 ** (attempt - 1);
      options.onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }
}
