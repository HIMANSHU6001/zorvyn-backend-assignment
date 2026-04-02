import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../common/errors/http-error';
import { sendError, sendSuccess } from '../../common/utils/response';
import { getAuditLogById, listAuditLogs } from './audit.service';
import { auditLogIdParamsSchema, listAuditLogsQuerySchema } from './audit.validation';

export async function listAuditLogsHandler(req: Request, res: Response, next: NextFunction) {
  const parsed = listAuditLogsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return sendError(res, 'Validation failed', 400, parsed.error.issues);
  }

  try {
    const result = await listAuditLogs(parsed.data);
    return sendSuccess(res, { logs: result.logs }, 200, result.meta);
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}

export async function getAuditLogByIdHandler(req: Request, res: Response, next: NextFunction) {
  const parsed = auditLogIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    return sendError(res, 'Validation failed', 400, parsed.error.issues);
  }

  try {
    const log = await getAuditLogById(parsed.data.id);
    return sendSuccess(res, { log });
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}
