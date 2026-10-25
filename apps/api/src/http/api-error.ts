export interface ErrorDetail {
  path: string;
  message: string;
}

/** An error whose status, code and message are safe to return to clients. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
