import { Request, Response } from 'express';
import { redis } from '../../config/redis';
import { sendError, sendSuccess } from '../../common/utils/response';

export function getHealth(_req: Request, res: Response) {
  return sendSuccess(res, { message: 'Finance Dashboard API is up and running' });
}

export async function getRedisHealth(_req: Request, res: Response) {
  try {
    await redis.ping();
    return sendSuccess(res, { message: 'Redis is connected' });
  } catch {
    return sendError(res, 'Redis is not connected', 503);
  }
}
