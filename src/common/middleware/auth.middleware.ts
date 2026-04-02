import { NextFunction, Request, Response } from 'express';
import prisma from '../../config/prisma';
import { UserStatus } from '../../generated/prisma/enums';
import { HttpError } from '../errors/http-error';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new HttpError(401, 'Invalid or expired token');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new HttpError(403, 'User account is inactive');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return sendError(res, 'Authentication failed', 401);
  }
}

function extractBearerToken(authorization?: string) {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new HttpError(401, 'Missing or invalid authorization token');
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    throw new HttpError(401, 'Missing or invalid authorization token');
  }

  return token;
}
