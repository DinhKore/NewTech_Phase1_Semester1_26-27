import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError, NotFoundError, PayloadTooLargeError, ValidationError } from '../shared/errors/app-error';
import type { Logger } from '../shared/logger/logger';

function hasStringType(error: unknown): error is { type: string } {
  return typeof error === 'object' && error !== null && typeof (error as { type?: unknown }).type === 'string';
}

/** Converts any thrown value into an AppError. Unknown errors become opaque 500s (details are only logged). */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new ValidationError(
      'Dữ liệu không hợp lệ.',
      error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }

  if (error instanceof multer.MulterError) {
    return error.code === 'LIMIT_FILE_SIZE'
      ? new PayloadTooLargeError('File vượt quá dung lượng cho phép.')
      : new ValidationError(`Upload không hợp lệ: ${error.message}`);
  }

  if (hasStringType(error)) {
    // body-parser errors
    if (error.type === 'entity.parse.failed') return new ValidationError('Body JSON không hợp lệ.');
    if (error.type === 'entity.too.large') return new PayloadTooLargeError();
  }

  return new AppError(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.', { cause: error });
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError('endpoint'));
};

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, next) => {
    if (res.headersSent) {
      // Response (e.g. an SSE stream) already started: nothing sensible left to send.
      next(error);
      return;
    }

    const appError = toAppError(error);
    const log = req.log ?? logger;
    if (appError.statusCode >= 500) {
      log.error('request failed', { err: error, code: appError.code });
    } else {
      log.warn('request rejected', { code: appError.code, message: appError.message });
    }

    res.status(appError.statusCode).json({
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
        requestId: req.id,
      },
    });
  };
}
