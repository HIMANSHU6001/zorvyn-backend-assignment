import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../common/errors/http-error';
import { sendError, sendSuccess } from '../../common/utils/response';
import {
  createCategory,
  createRecord,
  getRecordById,
  listCategories,
  listRecords,
  softDeleteCategory,
  softDeleteRecord,
  updateRecord,
} from './finance.service';
import {
  categoryIdParamsSchema,
  createCategoryBodySchema,
  createRecordBodySchema,
  listCategoriesQuerySchema,
  listRecordsQuerySchema,
  recordIdParamsSchema,
  updateRecordBodySchema,
} from './finance.validation';

export async function createCategoryHandler(req: Request, res: Response, next: NextFunction) {
  const parsed = createCategoryBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, 'Validation failed', 400, parsed.error.issues);
  }

  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const category = await createCategory(req.user, parsed.data);
    return sendSuccess(res, { category }, 201);
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}

export async function listCategoriesHandler(req: Request, res: Response, next: NextFunction) {
  const parsed = listCategoriesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return sendError(res, 'Validation failed', 400, parsed.error.issues);
  }

  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const result = await listCategories(req.user, parsed.data);
    return sendSuccess(res, { categories: result.categories }, 200, result.meta);
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}

export async function deleteCategoryHandler(req: Request, res: Response, next: NextFunction) {
  const parsed = categoryIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    return sendError(res, 'Validation failed', 400, parsed.error.issues);
  }

  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    await softDeleteCategory(req.user, parsed.data.id);
    return sendSuccess(res, { message: 'Category deleted successfully' });
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}

export async function createRecordHandler(req: Request, res: Response, next: NextFunction) {
  const parsed = createRecordBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, 'Validation failed', 400, parsed.error.issues);
  }

  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const record = await createRecord(req.user, parsed.data);
    return sendSuccess(res, { record }, 201);
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}

export async function listRecordsHandler(req: Request, res: Response, next: NextFunction) {
  const parsed = listRecordsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return sendError(res, 'Validation failed', 400, parsed.error.issues);
  }

  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const result = await listRecords(req.user, parsed.data);
    return sendSuccess(res, { records: result.records }, 200, result.meta);
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}

export async function getRecordByIdHandler(req: Request, res: Response, next: NextFunction) {
  const parsedParams = recordIdParamsSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return sendError(res, 'Validation failed', 400, parsedParams.error.issues);
  }

  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const record = await getRecordById(req.user, parsedParams.data.id);
    return sendSuccess(res, { record });
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}

export async function updateRecordHandler(req: Request, res: Response, next: NextFunction) {
  const parsedParams = recordIdParamsSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return sendError(res, 'Validation failed', 400, parsedParams.error.issues);
  }

  const parsedBody = updateRecordBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return sendError(res, 'Validation failed', 400, parsedBody.error.issues);
  }

  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const record = await updateRecord(req.user, parsedParams.data.id, parsedBody.data);
    return sendSuccess(res, { record });
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}

export async function deleteRecordHandler(req: Request, res: Response, next: NextFunction) {
  const parsedParams = recordIdParamsSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return sendError(res, 'Validation failed', 400, parsedParams.error.issues);
  }

  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    await softDeleteRecord(req.user, parsedParams.data.id);
    return sendSuccess(res, { message: 'Record deleted successfully' });
  } catch (error) {
    if (error instanceof HttpError) {
      return sendError(res, error.message, error.statusCode, error.details);
    }

    return next(error);
  }
}
