import { NextFunction, Request, Response } from 'express';
import { sendError } from '../utils/response';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const message = err instanceof Error ? err.message : 'Internal server error';
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment && err instanceof Error) {
    return sendError(res, message, 500, { stack: err.stack });
  }

  return sendError(res, message, 500);
}
