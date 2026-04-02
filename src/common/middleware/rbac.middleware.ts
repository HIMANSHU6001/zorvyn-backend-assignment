import { NextFunction, Request, Response } from 'express';
import type { Role } from '../../generated/prisma/enums';
import { sendError } from '../utils/response';

export function requireRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 'You are not allowed to perform this action', 403);
    }

    next();
  };
}
