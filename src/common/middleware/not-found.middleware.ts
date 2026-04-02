import { Request, Response } from 'express';
import { sendError } from '../utils/response';

export function notFoundMiddleware(_req: Request, res: Response) {
  return sendError(res, 'Route not found', 404);
}
