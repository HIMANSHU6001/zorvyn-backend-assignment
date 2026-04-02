import request from 'supertest';
import type { Express } from 'express';

describe('Finance routes', () => {
  let app: Express;

  beforeAll(async () => {
    jest.resetModules();

    jest.doMock('../src/common/middleware/auth.middleware', () => ({
      authenticate: (req: any, _res: any, next: any) => {
        req.user = { id: 'u1', email: 'analyst@example.com', role: 'ANALYST', status: 'ACTIVE' };
        next();
      },
    }));

    jest.doMock('../src/modules/finance/finance.service', () => ({
      createCategory: jest.fn(async (_user: any, payload: any) => ({ id: 'c1', name: payload.name })),
      listCategories: jest.fn(async () => ({
        categories: [{ id: 'c1', name: 'Groceries' }],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      })),
      softDeleteCategory: jest.fn(async () => undefined),
      createRecord: jest.fn(async () => ({ id: 'r1', amount: '100.00' })),
      listRecords: jest.fn(async () => ({
        records: [{ id: 'r1', amount: '100.00' }],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      })),
      getRecordById: jest.fn(async () => ({ id: 'r1' })),
      updateRecord: jest.fn(async () => ({ id: 'r1', amount: '120.00' })),
      softDeleteRecord: jest.fn(async () => undefined),
    }));

    const appModule = await import('../src/app');
    app = appModule.createApp();
  });

  it('creates a category', async () => {
    const response = await request(app)
      .post('/api/categories')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Groceries' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('category');
  });

  it('lists categories for dropdown', async () => {
    const response = await request(app)
      .get('/api/categories?page=1&limit=50')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('categories');
  });

  it('lists records', async () => {
    const response = await request(app)
      .get('/api/records?page=1&limit=10')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('records');
  });
});
