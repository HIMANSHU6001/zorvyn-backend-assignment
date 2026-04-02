import request from 'supertest';
import type { Express } from 'express';

describe('Auth routes', () => {
  let app: Express;

  beforeAll(async () => {
    jest.resetModules();

    jest.doMock('../src/modules/auth/auth.service', () => ({
      registerUser: jest.fn(async () => ({ user: { id: 'u1', email: 'test@example.com' } })),
      loginUser: jest.fn(async () => ({ accessToken: 'token-123' })),
      getCurrentUser: jest.fn(async () => ({ id: 'u1', email: 'test@example.com', role: 'ADMIN' })),
    }));

    jest.doMock('../src/common/middleware/auth.middleware', () => ({
      authenticate: (req: any, _res: any, next: any) => {
        req.user = { id: 'u1', email: 'test@example.com', role: 'ADMIN', status: 'ACTIVE' };
        next();
      },
    }));

    const appModule = await import('../src/app');
    app = appModule.createApp();
  });

  it('registers a user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password@123' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('user');
  });

  it('logs in a user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password@123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('accessToken');
  });

  it('returns current user profile', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-123');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('user');
  });
});
