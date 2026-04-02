import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../common/errors/http-error';
import { sendError, sendSuccess } from '../../common/utils/response';
import { getDashboardSummary } from './dashboard.service';
import { dashboardSummaryQuerySchema } from './dashboard.validation';

export async function getDashboardSummaryHandler(req: Request, res: Response, next: NextFunction) {
  const parsed = dashboardSummaryQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return sendError(res, 'Validation failed', 400, parsed.error.issues);
  }

  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const summary = await getDashboardSummary(req.user, parsed.data);
    return sendSuccess(res, summary);
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}
