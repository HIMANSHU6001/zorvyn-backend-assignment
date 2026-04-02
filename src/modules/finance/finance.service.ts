import { AuditAction, EntityType, Role } from '../../generated/prisma/enums';
import prisma from '../../config/prisma';
import { HttpError } from '../../common/errors/http-error';
import type { AuthenticatedUser } from '../../common/types/auth.types';
import { invalidateDashboardSummaryCache } from '../dashboard/dashboard.service';
import type {
  CreateCategoryBody,
  CreateRecordBody,
  ListCategoriesQuery,
  ListRecordsQuery,
  UpdateRecordBody,
} from './finance.validation';

const categorySelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

const financialRecordSelect = {
  id: true,
  userId: true,
  amount: true,
  type: true,
  category: true,
  categoryId: true,
  date: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  categoryRef: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

type SelectedFinancialRecord = {
  id: string;
  userId: string;
  amount: { toString(): string };
  type: string;
  category: string;
  categoryId: string | null;
  date: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  categoryRef: {
    id: string;
    name: string;
  } | null;
};

export async function createCategory(user: AuthenticatedUser, payload: CreateCategoryBody) {
  const name = payload.name.trim();
  const normalizedName = normalizeCategoryName(name);

  const existing = await prisma.category.findFirst({
    where: {
      userId: user.id,
      normalizedName,
    },
    select: {
      id: true,
      deletedAt: true,
    },
  });

  if (existing && !existing.deletedAt) {
    throw new HttpError(409, 'Category already exists');
  }

  if (existing?.deletedAt) {
    return prisma.category.update({
      where: { id: existing.id },
      data: {
        name,
        deletedAt: null,
      },
      select: categorySelect,
    });
  }

  return prisma.category.create({
    data: {
      userId: user.id,
      name,
      normalizedName,
    },
    select: categorySelect,
  });
}

export async function listCategories(user: AuthenticatedUser, query: ListCategoriesQuery) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    userId: user.id,
    deletedAt: null,
  };

  if (query.search) {
    where.name = {
      contains: query.search,
      mode: 'insensitive',
    };
  }

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ name: 'asc' }],
      select: categorySelect,
    }),
    prisma.category.count({ where }),
  ]);

  return {
    categories,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function softDeleteCategory(user: AuthenticatedUser, id: string) {
  const category = await prisma.category.findFirst({
    where: {
      id,
      userId: user.id,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!category) {
    throw new HttpError(404, 'Category not found');
  }

  await prisma.category.update({
    where: { id: category.id },
    data: {
      deletedAt: new Date(),
    },
  });
}

export async function createRecord(user: AuthenticatedUser, payload: CreateRecordBody) {
  const category = await getAccessibleCategory(user, payload.categoryId);

  const created = await prisma.$transaction(async (tx) => {
    const record = await tx.financialRecord.create({
      data: {
        userId: user.id,
        amount: payload.amount,
        type: payload.type,
        categoryId: category.id,
        category: category.name,
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
          category: record.categoryRef?.name ?? record.category,
        },
      },
    });

    return record;
  });

  await invalidateDashboardSummaryCache(user.id);

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
      categoryId: true,
      date: true,
      note: true,
    },
  });

  if (!existing) {
    throw new HttpError(404, 'Record not found');
  }

  ensureRecordAccess(user, existing.userId);

  const updatedData: Record<string, unknown> = {
    amount: payload.amount,
    type: payload.type,
    date: payload.date,
    note: payload.note,
  };

  if (payload.categoryId) {
    const category = await getAccessibleCategory(user, payload.categoryId);
    updatedData.categoryId = category.id;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.financialRecord.update({
      where: { id: existing.id },
      data: updatedData,
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
            categoryId: existing.categoryId,
            date: existing.date.toISOString(),
            note: existing.note,
          },
          updatedFields: Object.keys(payload),
        },
      },
    });

    return record;
  });

  await invalidateDashboardSummaryCache(user.id);

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
      categoryRef: {
        select: {
          id: true,
          name: true,
        },
      },
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
          categoryId: existing.categoryRef?.id ?? null,
          category: existing.categoryRef?.name ?? existing.category,
          softDeleted: true,
        },
      },
    });
  });

  await invalidateDashboardSummaryCache(user.id);
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

  if (query.categoryId) {
    where.categoryId = query.categoryId;
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
        categoryRef: {
          is: {
            name: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
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
    id: record.id,
    userId: record.userId,
    amount: record.amount.toString(),
    type: record.type,
    category: {
      id: record.categoryRef?.id ?? record.categoryId,
      name: record.categoryRef?.name ?? record.category,
    },
    date: record.date,
    note: record.note,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  };
}

function normalizeCategoryName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function getAccessibleCategory(user: AuthenticatedUser, categoryId: string) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId: user.id,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!category) {
    throw new HttpError(404, 'Category not found');
  }

  return category;
}
