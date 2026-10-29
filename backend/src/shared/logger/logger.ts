export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
export type LogContext = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

export function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(cause === undefined ? {} : { cause: serializeError(cause) }),
    };
  }
  return error;
}

function normalizeContext(context: LogContext): LogContext {
  const normalized: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    normalized[key] = value instanceof Error ? serializeError(value) : value;
  }
  return normalized;
}

/** Minimal structured logger: JSON lines in production, readable lines in development. */
export class Logger {
  private readonly level: LogLevel;
  private readonly pretty: boolean;
  private readonly bindings: LogContext;

  constructor(level: LogLevel, pretty: boolean, bindings: LogContext = {}) {
    this.level = level;
    this.pretty = pretty;
    this.bindings = bindings;
  }

  /** Returns a logger that adds `bindings` (e.g. requestId) to every entry. */
  child(bindings: LogContext): Logger {
    return new Logger(this.level, this.pretty, { ...this.bindings, ...bindings });
  }

  debug(message: string, context?: LogContext): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.write('error', message, context);
  }

  private write(level: Exclude<LogLevel, 'silent'>, message: string, context: LogContext = {}): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) return;

    const time = new Date().toISOString();
    const fields = { ...this.bindings, ...normalizeContext(context) };
    const line = this.pretty
      ? `${time} ${level.toUpperCase().padEnd(5)} ${message}${
          Object.keys(fields).length > 0 ? ` ${JSON.stringify(fields)}` : ''
        }`
      : JSON.stringify({ time, level, message, ...fields });

    (level === 'error' ? process.stderr : process.stdout).write(`${line}\n`);
  }
}
