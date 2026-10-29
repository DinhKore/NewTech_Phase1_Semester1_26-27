import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

export interface RateLimiters {
  general: RequestHandler;
  auth: RequestHandler;
  ai: RequestHandler;
}

const passThrough: RequestHandler = (_req, _res, next) => next();

function limiter(windowMs: number, limit: number): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.' },
    },
  });
}

export function createRateLimiters(enabled: boolean): RateLimiters {
  if (!enabled) return { general: passThrough, auth: passThrough, ai: passThrough };
  return {
    general: limiter(15 * 60_000, 600),
    auth: limiter(15 * 60_000, 30),
    ai: limiter(60_000, 40),
  };
}
