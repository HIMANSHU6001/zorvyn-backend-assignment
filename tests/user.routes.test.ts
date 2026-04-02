import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpError } from '../src/common/errors/http-error';

const mockUpdateUserStatus = jest.fn();
const mockUpdateUserRole = jest.fn();

jest.mock('../src/modules/user/user.service', () => ({
  updateUserStatus: mockUpdateUserStatus,
  updateUserRole: mockUpdateUserRole,
}));

jest.mock('../src/common/middleware/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const roleHeader = req.headers['x-test-role'];
    const userIdHeader = req.headers['x-test-user-id'];

    req.user = {
      id: typeof userIdHeader === 'string' ? userIdHeader : '11111111-1111-4111-8111-111111111111',
      email: 'actor@example.com',
      role: typeof roleHeader === 'string' ? roleHeader : 'ADMIN',
      status: 'ACTIVE',
    };

    next();
  },
}));

import { createApp } from '../src/app';

describe('User role routes', () => {
  const app = createApp();
  const targetUserId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows admin to assign role to another user', async () => {
    mockUpdateUserRole.mockImplementationOnce(async () => ({
      id: targetUserId,
      email: 'target@example.com',
      role: 'ANALYST',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const response = await request(app)
      .patch(`/api/users/${targetUserId}/role`)
      .set('Authorization', 'Bearer token')
      .set('x-test-role', 'ADMIN')
      .send({ role: 'ANALYST' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.role).toBe('ANALYST');
    expect(mockUpdateUserRole).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'ADMIN' }),
      targetUserId,
      'ANALYST'
    );
  });

  it('returns 403 for self-role assignment', async () => {
    mockUpdateUserRole.mockImplementationOnce(async () => {
      throw new HttpError(403, 'You cannot assign a role to yourself');
    });

    const response = await request(app)
      .patch(`/api/users/${targetUserId}/role`)
      .set('Authorization', 'Bearer token')
      .set('x-test-role', 'ADMIN')
      .set('x-test-user-id', targetUserId)
      .send({ role: 'ADMIN' });

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe('You cannot assign a role to yourself');
  });

  it('returns 403 when target user is inactive', async () => {
    mockUpdateUserRole.mockImplementationOnce(async () => {
      throw new HttpError(403, 'Only active users can be assigned a role');
    });

    const response = await request(app)
      .patch(`/api/users/${targetUserId}/role`)
      .set('Authorization', 'Bearer token')
      .set('x-test-role', 'ADMIN')
      .send({ role: 'VIEWER' });

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe('Only active users can be assigned a role');
  });

  it('returns 404 when target user does not exist', async () => {
    mockUpdateUserRole.mockImplementationOnce(async () => {
      throw new HttpError(404, 'User not found');
    });

    const response = await request(app)
      .patch(`/api/users/${targetUserId}/role`)
      .set('Authorization', 'Bearer token')
      .set('x-test-role', 'ADMIN')
      .send({ role: 'VIEWER' });

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('User not found');
  });

  it('returns 403 when non-admin tries to assign role', async () => {
    const response = await request(app)
      .patch(`/api/users/${targetUserId}/role`)
      .set('Authorization', 'Bearer token')
      .set('x-test-role', 'ANALYST')
      .send({ role: 'VIEWER' });

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe('You are not allowed to perform this action');
    expect(mockUpdateUserRole).not.toHaveBeenCalled();
  });
});
