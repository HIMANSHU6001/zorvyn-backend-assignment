import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../common/errors/http-error';
import { sendError, sendSuccess } from '../../common/utils/response';
import { getCurrentUser, loginUser, registerUser } from './auth.service';
import { loginSchema, registerSchema } from './auth.validation';

export async function register(req: Request, res: Response, next: NextFunction) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, 'Validation failed', 400, parsed.error.issues);
  }

  try {
    const result = await registerUser(parsed.data);
    return sendSuccess(res, result, 201);
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, 'Validation failed', 400, parsed.error.issues);
  }

  try {
    const result = await loginUser(parsed.data);
    return sendSuccess(res, result);
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const user = await getCurrentUser(req.user.id);
    return sendSuccess(res, { user });
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}
