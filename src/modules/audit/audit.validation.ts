import { z } from 'zod';
import { AuditAction, EntityType } from '../../generated/prisma/enums';

export const auditLogIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  action: z.nativeEnum(AuditAction).optional(),
  entityType: z.nativeEnum(EntityType).optional(),
  userId: z.string().uuid().optional(),
  entityId: z.string().trim().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type AuditLogIdParams = z.infer<typeof auditLogIdParamsSchema>;
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
