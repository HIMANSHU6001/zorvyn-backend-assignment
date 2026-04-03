import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpError } from '../src/common/errors/http-error';

const mockListAuditLogs: any = jest.fn();
const mockGetAuditLogById: any = jest.fn();

jest.mock('../src/modules/audit/audit.service', () => ({
  listAuditLogs: mockListAuditLogs,
  getAuditLogById: mockGetAuditLogById,
}));

jest.mock('../src/common/middleware/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const roleHeader = req.headers['x-test-role'];

    req.user = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'actor@example.com',
      role: typeof roleHeader === 'string' ? roleHeader : 'ADMIN',
      status: 'ACTIVE',
    };

    next();
  },
}));

import { createApp } from '../src/app';

describe('Audit routes', () => {
  const app = createApp();
  const logId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows admin to list audit logs', async () => {
    mockListAuditLogs.mockResolvedValueOnce({
      logs: [
        {
          id: logId,
          action: 'UPDATE',
          entityType: 'USER',
        },
      ],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/audit-logs?page=1&limit=10')
      .set('Authorization', 'Bearer token')
      .set('x-test-role', 'ADMIN');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('logs');
    expect(response.body.meta).toMatchObject({ page: 1, limit: 10, total: 1, totalPages: 1 });
    expect(mockListAuditLogs).toHaveBeenCalled();
  });

  it('returns 403 when non-admin tries to list audit logs', async () => {
    const response = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', 'Bearer token')
      .set('x-test-role', 'ANALYST');

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe('You are not allowed to perform this action');
    expect(mockListAuditLogs).not.toHaveBeenCalled();
  });

  it('allows admin to fetch audit log by id', async () => {
    mockGetAuditLogById.mockResolvedValueOnce({
      id: logId,
      action: 'UPDATE',
      entityType: 'USER',
    });

    const response = await request(app)
      .get(`/api/audit-logs/${logId}`)
      .set('Authorization', 'Bearer token')
      .set('x-test-role', 'ADMIN');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.log.id).toBe(logId);
    expect(mockGetAuditLogById).toHaveBeenCalledWith(logId);
  });

  it('returns 404 when audit log is not found', async () => {
    mockGetAuditLogById.mockImplementationOnce(async () => {
      throw new HttpError(404, 'Audit log not found');
    });

    const response = await request(app)
      .get(`/api/audit-logs/${logId}`)
      .set('Authorization', 'Bearer token')
      .set('x-test-role', 'ADMIN');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe('Audit log not found');
  });

  it('returns 400 for invalid query params', async () => {
    const response = await request(app)
      .get('/api/audit-logs?page=0&limit=101')
      .set('Authorization', 'Bearer token')
      .set('x-test-role', 'ADMIN');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe('Validation failed');
    expect(mockListAuditLogs).not.toHaveBeenCalled();
  });
});
