import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors/http-error';
import { sendError } from '../utils/response';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (err instanceof HttpError) {
    const details = isDevelopment ? err.details : undefined;
    return sendError(res, err.message, err.statusCode, details);
  }

  if (isDevelopment && err instanceof Error) {
    return sendError(res, err.message, 500, { stack: err.stack });
  }

  return sendError(res, 'Internal server error', 500);
}
