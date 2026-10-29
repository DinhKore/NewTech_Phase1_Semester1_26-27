/** Normalized error for every failed API call, so UI code never parses raw responses. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | undefined;

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Best-effort user-facing message for any thrown value. */
export function getErrorMessage(error: unknown, fallback = 'Đã xảy ra lỗi, vui lòng thử lại.'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
