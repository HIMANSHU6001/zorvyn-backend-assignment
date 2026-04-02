import { AuditAction, EntityType, Role } from '../../generated/prisma/enums';
import prisma from '../../config/prisma';
import { HttpError } from '../../common/errors/http-error';
import type { AuthenticatedUser } from '../../common/types/auth.types';
import type { CreateRecordBody, ListRecordsQuery, UpdateRecordBody } from './finance.validation';

const financialRecordSelect = {
  id: true,
  userId: true,
  amount: true,
  type: true,
  category: true,
  date: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

type SelectedFinancialRecord = {
  id: string;
  userId: string;
  amount: { toString(): string };
  type: string;
  category: string;
  date: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export async function createRecord(user: AuthenticatedUser, payload: CreateRecordBody) {
  const created = await prisma.$transaction(async (tx) => {
    const record = await tx.financialRecord.create({
      data: {
        userId: user.id,
        amount: payload.amount,
        type: payload.type,
        category: payload.category,
        date: payload.date,
        note: payload.note,
      },
      select: financialRecordSelect,
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.CREATE,
        entityType: EntityType.FINANCIAL_RECORD,
        entityId: record.id,
        metadata: {
          type: record.type,
          category: record.category,
        },
      },
    });

    return record;
  });

  return mapRecord(created);
}

export async function listRecords(user: AuthenticatedUser, query: ListRecordsQuery) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where = buildWhere(user, query);

  const [records, total] = await Promise.all([
    prisma.financialRecord.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
      select: financialRecordSelect,
    }),
    prisma.financialRecord.count({ where }),
  ]);

  return {
    records: records.map(mapRecord),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getRecordById(user: AuthenticatedUser, id: string) {
  const record = await prisma.financialRecord.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: financialRecordSelect,
  });

  if (!record) {
    throw new HttpError(404, 'Record not found');
  }

  ensureRecordAccess(user, record.userId);

  return mapRecord(record);
}

export async function updateRecord(user: AuthenticatedUser, id: string, payload: UpdateRecordBody) {
  const existing = await prisma.financialRecord.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: {
      id: true,
      userId: true,
      amount: true,
      type: true,
      category: true,
      date: true,
      note: true,
    },
  });

  if (!existing) {
    throw new HttpError(404, 'Record not found');
  }

  ensureRecordAccess(user, existing.userId);

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.financialRecord.update({
      where: { id: existing.id },
      data: payload,
      select: financialRecordSelect,
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.UPDATE,
        entityType: EntityType.FINANCIAL_RECORD,
        entityId: record.id,
        metadata: {
          previous: {
            amount: existing.amount.toString(),
            type: existing.type,
            category: existing.category,
            date: existing.date.toISOString(),
            note: existing.note,
          },
          updatedFields: Object.keys(payload),
        },
      },
    });

    return record;
  });

  return mapRecord(updated);
}

export async function softDeleteRecord(user: AuthenticatedUser, id: string) {
  const existing = await prisma.financialRecord.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: {
      id: true,
      userId: true,
      type: true,
      category: true,
    },
  });

  if (!existing) {
    throw new HttpError(404, 'Record not found');
  }

  ensureRecordAccess(user, existing.userId);

  await prisma.$transaction(async (tx) => {
    await tx.financialRecord.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.DELETE,
        entityType: EntityType.FINANCIAL_RECORD,
        entityId: existing.id,
        metadata: {
          type: existing.type,
          category: existing.category,
          softDeleted: true,
        },
      },
    });
  });
}

function ensureRecordAccess(user: AuthenticatedUser, recordUserId: string) {
  if (user.role !== Role.ADMIN && user.id !== recordUserId) {
    throw new HttpError(403, 'You are not allowed to access this record');
  }
}

function buildWhere(user: AuthenticatedUser, query: ListRecordsQuery) {
  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (user.role !== Role.ADMIN) {
    where.userId = user.id;
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.category) {
    where.category = {
      contains: query.category,
      mode: 'insensitive',
    };
  }

  if (query.startDate || query.endDate) {
    where.date = {
      ...(query.startDate ? { gte: query.startDate } : {}),
      ...(query.endDate ? { lte: query.endDate } : {}),
    };
  }

  if (query.search) {
    where.OR = [
      {
        category: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
      {
        note: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
    ];
  }

  return where;
}

function mapRecord(record: SelectedFinancialRecord) {
  return {
    ...record,
    amount: record.amount.toString(),
  };
}
