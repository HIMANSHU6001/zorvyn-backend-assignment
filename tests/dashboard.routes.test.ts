import request from 'supertest';
import type { Express } from 'express';
import { beforeAll, describe, expect, it, jest } from '@jest/globals';

describe('Dashboard routes', () => {
  let app: Express;

  beforeAll(async () => {
    jest.resetModules();

    jest.doMock('../src/common/middleware/auth.middleware', () => ({
      authenticate: (req: any, _res: any, next: any) => {
        req.user = { id: 'u1', email: 'viewer@example.com', role: 'VIEWER', status: 'ACTIVE' };
        next();
      },
    }));

    jest.doMock('../src/modules/dashboard/dashboard.service', () => ({
      getDashboardSummary: jest.fn(async () => ({
        range: {
          startDate: '2026-04-01T00:00:00.000Z',
          endDate: '2026-04-02T12:00:00.000Z',
          type: 'MTD',
        },
        summary: {
          totalIncome: 1000,
          totalExpenses: 250,
          netBalance: 750,
        },
        categoryTotals: [],
        recentActivity: {
          data: [],
          pagination: { page: 1, limit: 5, total: 0 },
        },
        trends: [],
      })),
      invalidateDashboardSummaryCache: jest.fn(async () => undefined),
    }));

    const appModule = await import('../src/app');
    app = appModule.createApp();
  });

  it('returns dashboard summary for authenticated users', async () => {
    const response = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('range');
    expect(response.body.data).toHaveProperty('summary');
    expect(response.body.data).toHaveProperty('recentActivity');
    expect(response.body.data).toHaveProperty('trends');
  });

  it('returns 400 for incomplete custom date range', async () => {
    const response = await request(app)
      .get('/api/dashboard/summary?startDate=2026-04-01T00:00:00.000Z')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
