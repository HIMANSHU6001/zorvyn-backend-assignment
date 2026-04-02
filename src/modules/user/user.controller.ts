import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../common/errors/http-error';
import { sendError, sendSuccess } from '../../common/utils/response';
import { updateUserStatus } from './user.service';
import { updateUserStatusBodySchema, updateUserStatusParamsSchema } from './user.validation';

export async function patchUserStatus(req: Request, res: Response, next: NextFunction) {
  const parsedParams = updateUserStatusParamsSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return sendError(res, 'Validation failed', 400, parsedParams.error.issues);
  }

  const parsedBody = updateUserStatusBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return sendError(res, 'Validation failed', 400, parsedBody.error.issues);
  }

  try {
    const user = await updateUserStatus(parsedParams.data.id, parsedBody.data.status);
    return sendSuccess(res, { user });
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}
