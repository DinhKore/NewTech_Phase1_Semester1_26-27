export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'PAYLOAD_TOO_LARGE'
  | 'NO_DOCUMENTS'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_OUTPUT'
  | 'INTERNAL_ERROR';

interface AppErrorOptions {
  details?: unknown;
  cause?: unknown;
}

/**
 * Base class for every error that is safe to show to API clients.
 * Anything that is NOT an AppError is treated as a bug and reported as a generic 500.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dữ liệu không hợp lệ.', details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, { details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Vui lòng đăng nhập để tiếp tục.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Bạn không có quyền thực hiện thao tác này.') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'tài nguyên') {
    super(404, 'NOT_FOUND', `Không tìm thấy ${resource}.`);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Dữ liệu gửi lên vượt quá giới hạn cho phép.') {
    super(413, 'PAYLOAD_TOO_LARGE', message);
  }
}

export class NoDocumentsError extends AppError {
  constructor() {
    super(400, 'NO_DOCUMENTS', 'Bạn chưa tải tài liệu nào. Vui lòng upload file PDF trước.');
  }
}

export class AiUnavailableError extends AppError {
  constructor(cause?: unknown) {
    super(503, 'AI_UNAVAILABLE', 'Hệ thống AI đang bận, vui lòng thử lại sau ít phút.', { cause });
  }
}

export class AiInvalidOutputError extends AppError {
  constructor(message = 'AI trả về dữ liệu không hợp lệ, vui lòng thử lại.', cause?: unknown) {
    super(502, 'AI_INVALID_OUTPUT', message, { cause });
  }
}
