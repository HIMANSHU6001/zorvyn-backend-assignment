import { Response } from 'express';

type ApiError = {
  message: string;
  details?: unknown;
};

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta: Record<string, unknown> | null = null
) {
  return res.status(statusCode).json({
    success: true,
    data,
    meta,
    error: null,
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  details?: unknown
) {
  const error: ApiError = details === undefined ? { message } : { message, details };

  return res.status(statusCode).json({
    success: false,
    data: null,
    meta: null,
    error,
  });
}
