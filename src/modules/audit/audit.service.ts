import prisma from '../../config/prisma';
import { HttpError } from '../../common/errors/http-error';
import type { ListAuditLogsQuery } from './audit.validation';

const auditLogSelect = {
  id: true,
  userId: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
    },
  },
} as const;

export async function listAuditLogs(query: ListAuditLogsQuery) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.action) {
    where.action = query.action;
  }

  if (query.entityType) {
    where.entityType = query.entityType;
  }

  if (query.userId) {
    where.userId = query.userId;
  }

  if (query.entityId) {
    where.entityId = query.entityId;
  }

  if (query.startDate || query.endDate) {
    where.createdAt = {
      ...(query.startDate ? { gte: query.startDate } : {}),
      ...(query.endDate ? { lte: query.endDate } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: limit,
      select: auditLogSelect,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getAuditLogById(id: string) {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    select: auditLogSelect,
  });

  if (!log) {
    throw new HttpError(404, 'Audit log not found');
  }

  return log;
}
