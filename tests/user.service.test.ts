import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpError } from '../src/common/errors/http-error';
import { AuditAction, EntityType, Role, UserStatus } from '../src/generated/prisma/enums';
import type { AuthenticatedUser } from '../src/common/types/auth.types';

const mockFindUnique: any = jest.fn();
const mockUserUpdate: any = jest.fn();
const mockAuditLogCreate: any = jest.fn();
const mockTransaction: any = jest.fn();

jest.mock('../src/config/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: mockFindUnique,
    },
    $transaction: mockTransaction,
  },
}));

import { updateUserRole } from '../src/modules/user/user.service';

describe('updateUserRole service', () => {
  const adminUser: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@example.com',
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransaction.mockImplementation(async (callback: any) =>
      callback({
        user: {
          update: mockUserUpdate,
        },
        auditLog: {
          create: mockAuditLogCreate,
        },
      })
    );
  });

  it('updates role and writes an audit log entry', async () => {
    const targetUserId = '22222222-2222-4222-8222-222222222222';

    mockFindUnique.mockResolvedValueOnce({
      id: targetUserId,
      email: 'target@example.com',
      role: Role.VIEWER,
      status: UserStatus.ACTIVE,
    });

    mockUserUpdate.mockResolvedValueOnce({
      id: targetUserId,
      email: 'target@example.com',
      role: Role.ANALYST,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await updateUserRole(adminUser, targetUserId, Role.ANALYST);

    expect(result.role).toBe(Role.ANALYST);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: targetUserId },
      data: { role: Role.ANALYST },
      select: expect.any(Object),
    });

    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: adminUser.id,
        action: AuditAction.UPDATE,
        entityType: EntityType.USER,
        entityId: targetUserId,
      }),
    });

    const auditCall: any = mockAuditLogCreate.mock.calls[0][0].data;
    expect(auditCall.metadata).toMatchObject({
      previous: { role: Role.VIEWER },
      updated: { role: Role.ANALYST },
      targetUser: {
        id: targetUserId,
        email: 'target@example.com',
      },
      actor: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      },
    });
  });

  it('throws 403 when non-admin tries to assign roles', async () => {
    const nonAdminUser: AuthenticatedUser = {
      ...adminUser,
      role: Role.ANALYST,
    };

    await expect(
      updateUserRole(nonAdminUser, '22222222-2222-4222-8222-222222222222', Role.VIEWER)
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Only admins can assign roles',
    });

    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('throws 403 for self-assignment', async () => {
    await expect(updateUserRole(adminUser, adminUser.id, Role.ANALYST)).rejects.toMatchObject({
      statusCode: 403,
      message: 'You cannot assign a role to yourself',
    });

    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('throws 404 when target user does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await expect(
      updateUserRole(adminUser, '22222222-2222-4222-8222-222222222222', Role.ANALYST)
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found',
    });

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('throws 403 when target user is inactive', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: '22222222-2222-4222-8222-222222222222',
      email: 'target@example.com',
      role: Role.VIEWER,
      status: UserStatus.INACTIVE,
    });

    await expect(
      updateUserRole(adminUser, '22222222-2222-4222-8222-222222222222', Role.ANALYST)
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Only active users can be assigned a role',
    });

    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
