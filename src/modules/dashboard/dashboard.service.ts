import { Prisma } from '../../generated/prisma/client';
import { RecordType } from '../../generated/prisma/enums';
import prisma from '../../config/prisma';
import { delCacheByPattern, getCache, setCache } from '../../config/cache';
import type { AuthenticatedUser } from '../../common/types/auth.types';
import type { DashboardSummaryQuery } from './dashboard.validation';

type ResolvedRangeType = 'MTD' | 'MONTH' | 'CUSTOM';
type TrendGroupBy = 'day' | 'month';

type DashboardSummaryResponse = {
  range: {
    startDate: string;
    endDate: string;
    type: ResolvedRangeType;
  };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
  };
  categoryTotals: Array<{
    categoryId: string;
    categoryName: string;
    income: number;
    expenses: number;
    total: number;
    count: number;
  }>;
  recentActivity: {
    data: Array<{
      id: string;
      amount: number;
      type: RecordType;
      date: Date;
      note: string | null;
      createdAt: Date;
      category: {
        id: string;
        name: string;
      };
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
  trends: Array<{
    bucket: string;
    income: number;
    expenses: number;
    netBalance: number;
  }>;
};

type TrendsRow = {
  bucket: Date;
  income: string | number;
  expenses: string | number;
};

export async function getDashboardSummary(user: AuthenticatedUser, query: DashboardSummaryQuery) {
  const { startDate, endDate, type } = resolveDateRange(query);
  const groupBy = resolveGroupBy(query.groupBy, startDate, endDate);
  const recentPage = query.recentPage;
  const recentLimit = query.recentLimit;

  const cacheKey = buildDashboardCacheKey({
    userId: user.id,
    startDate,
    endDate,
    page: recentPage,
    limit: recentLimit,
    groupBy,
  });

  const cached = await getCache<DashboardSummaryResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const where = {
    userId: user.id,
    deletedAt: null,
    date: {
      gte: startDate,
      lte: endDate,
    },
  } as const;

  const [totalsByType, categoryRows, recentRows, recentTotal, trendsRows] = await Promise.all([
    prisma.financialRecord.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
    }),
    prisma.financialRecord.groupBy({
      by: ['categoryId', 'type'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.financialRecord.findMany({
      where,
      select: {
        id: true,
        amount: true,
        type: true,
        date: true,
        note: true,
        createdAt: true,
        categoryId: true,
        categoryRef: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      skip: (recentPage - 1) * recentLimit,
      take: recentLimit,
    }),
    prisma.financialRecord.count({ where }),
    getTrendRows(user.id, startDate, endDate, groupBy),
  ]);

  const summary = getSummary(totalsByType);
  const categoryTotals = await getCategoryTotals(categoryRows);

  const response: DashboardSummaryResponse = {
    range: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      type,
    },
    summary,
    categoryTotals,
    recentActivity: {
      data: recentRows.map((row) => ({
        id: row.id,
        amount: parseDecimalToNumber(row.amount),
        type: row.type,
        date: row.date,
        note: row.note,
        createdAt: row.createdAt,
        category: {
          id: row.categoryRef?.id ?? row.categoryId ?? 'uncategorized',
          name: row.categoryRef?.name ?? 'Unknown',
        },
      })),
      pagination: {
        page: recentPage,
        limit: recentLimit,
        total: recentTotal,
      },
    },
    trends: trendsRows.map((row) => {
      const income = parseDecimalToNumber(row.income);
      const expenses = parseDecimalToNumber(row.expenses);
      return {
        bucket: row.bucket.toISOString(),
        income,
        expenses,
        netBalance: income - expenses,
      };
    }),
  };

  await setCache(cacheKey, response);

  return response;
}

export async function invalidateDashboardSummaryCache(userId: string) {
  await delCacheByPattern(`dashboard:${userId}:*`);
}

async function getTrendRows(
  userId: string,
  startDate: Date,
  endDate: Date,
  groupBy: TrendGroupBy
): Promise<TrendsRow[]> {
  const dayQuery = Prisma.sql`
    SELECT
      date_trunc('day', "date") AS bucket,
      COALESCE(SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END), 0)::numeric AS income,
      COALESCE(SUM(CASE WHEN "type" = 'EXPENSE' THEN "amount" ELSE 0 END), 0)::numeric AS expenses
    FROM "financial_records"
    WHERE "userId" = ${userId}
      AND "deletedAt" IS NULL
      AND "date" >= ${startDate}
      AND "date" <= ${endDate}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  const monthQuery = Prisma.sql`
    SELECT
      date_trunc('month', "date") AS bucket,
      COALESCE(SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END), 0)::numeric AS income,
      COALESCE(SUM(CASE WHEN "type" = 'EXPENSE' THEN "amount" ELSE 0 END), 0)::numeric AS expenses
    FROM "financial_records"
    WHERE "userId" = ${userId}
      AND "deletedAt" IS NULL
      AND "date" >= ${startDate}
      AND "date" <= ${endDate}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  if (groupBy === 'day') {
    return prisma.$queryRaw<TrendsRow[]>(dayQuery);
  }

  return prisma.$queryRaw<TrendsRow[]>(monthQuery);
}

function resolveDateRange(query: DashboardSummaryQuery): {
  startDate: Date;
  endDate: Date;
  type: ResolvedRangeType;
} {
  if (query.startDate && query.endDate) {
    return {
      startDate: toUtcStartOfDay(query.startDate),
      endDate: toUtcEndOfDay(query.endDate),
      type: 'CUSTOM',
    };
  }

  if (query.month) {
    const [year, month] = query.month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    return {
      startDate,
      endDate,
      type: 'MONTH',
    };
  }

  const now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

  return {
    startDate,
    endDate: now,
    type: 'MTD',
  };
}

function resolveGroupBy(
  requested: DashboardSummaryQuery['groupBy'],
  startDate: Date,
  endDate: Date
): TrendGroupBy {
  if (requested) {
    return requested;
  }

  const isSingleMonth =
    startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
    startDate.getUTCMonth() === endDate.getUTCMonth();

  return isSingleMonth ? 'day' : 'month';
}

function buildDashboardCacheKey(params: {
  userId: string;
  startDate: Date;
  endDate: Date;
  page: number;
  limit: number;
  groupBy: TrendGroupBy;
}) {
  return [
    'dashboard',
    params.userId,
    params.startDate.toISOString(),
    params.endDate.toISOString(),
    String(params.page),
    String(params.limit),
    params.groupBy,
  ].join(':');
}

function getSummary(
  totalsByType: Array<{
    type: RecordType;
    _sum: { amount: unknown };
  }>
) {
  const incomeRow = totalsByType.find((item) => item.type === RecordType.INCOME);
  const expensesRow = totalsByType.find((item) => item.type === RecordType.EXPENSE);

  const totalIncome = parseDecimalToNumber(incomeRow?._sum.amount);
  const totalExpenses = parseDecimalToNumber(expensesRow?._sum.amount);

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
  };
}

async function getCategoryTotals(
  categoryRows: Array<{
    categoryId: string | null;
    type: RecordType;
    _sum: { amount: unknown };
    _count: { _all: number };
  }>
) {
  if (categoryRows.length === 0) {
    return [];
  }

  const categoryIds = [
    ...new Set(
      categoryRows
        .map((row) => row.categoryId)
        .filter((categoryId): categoryId is string => Boolean(categoryId))
    ),
  ];
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: {
      id: true,
      name: true,
    },
  });

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const totalsMap = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      income: number;
      expenses: number;
      total: number;
      count: number;
    }
  >();

  for (const row of categoryRows) {
    const categoryId = row.categoryId ?? 'uncategorized';
    const amount = parseDecimalToNumber(row._sum.amount);
    const current =
      totalsMap.get(categoryId) ??
      {
        categoryId,
        categoryName: categoryNameById.get(categoryId) ?? 'Unknown',
        income: 0,
        expenses: 0,
        total: 0,
        count: 0,
      };

    if (row.type === RecordType.INCOME) {
      current.income += amount;
    } else {
      current.expenses += amount;
    }

    current.total += amount;
    current.count += row._count._all;

    totalsMap.set(categoryId, current);
  }

  return Array.from(totalsMap.values()).sort((a, b) => b.total - a.total);
}

function parseDecimalToNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return Number(value.toString());
  }

  return 0;
}

function toUtcStartOfDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  );
}

function toUtcEndOfDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
  );
}
