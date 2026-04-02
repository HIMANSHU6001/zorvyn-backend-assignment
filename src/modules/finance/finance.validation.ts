import { z } from 'zod';
import { RecordType } from '../../generated/prisma/enums';

export const recordIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const categoryIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const listCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().min(1).max(120).optional(),
});

export const createRecordBodySchema = z.object({
  amount: z.coerce.number().positive(),
  type: z.nativeEnum(RecordType),
  categoryId: z.string().uuid(),
  date: z.coerce.date(),
  note: z.string().trim().max(1000).optional().nullable(),
});

export const updateRecordBodySchema = z
  .object({
    amount: z.coerce.number().positive().optional(),
    type: z.nativeEnum(RecordType).optional(),
    categoryId: z.string().uuid().optional(),
    date: z.coerce.date().optional(),
    note: z.string().trim().max(1000).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required to update a record',
  });

export const listRecordsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  type: z.nativeEnum(RecordType).optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(200).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type RecordIdParams = z.infer<typeof recordIdParamsSchema>;
export type CategoryIdParams = z.infer<typeof categoryIdParamsSchema>;
export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CreateRecordBody = z.infer<typeof createRecordBodySchema>;
export type UpdateRecordBody = z.infer<typeof updateRecordBodySchema>;
export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>;
