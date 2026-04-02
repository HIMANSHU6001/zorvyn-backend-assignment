import { AuditAction, EntityType, Role, UserStatus } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../../common/types/auth.types';
import { HttpError } from '../../common/errors/http-error';
import prisma from '../../config/prisma';

const safeUserSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function updateUserStatus(userId: string, status: UserStatus) {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!existingUser) {
    throw new HttpError(404, 'User not found');
  }

  return prisma.user.update({
    where: { id: userId },
    data: { status },
    select: safeUserSelect,
  });
}

export async function updateUserRole(
  actorUser: AuthenticatedUser,
  userId: string,
  role: Role
) {
  if (actorUser.role !== Role.ADMIN) {
    throw new HttpError(403, 'Only admins can assign roles');
  }

  if (actorUser.id === userId) {
    throw new HttpError(403, 'You cannot assign a role to yourself');
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!existingUser) {
    throw new HttpError(404, 'User not found');
  }

  if (existingUser.status !== UserStatus.ACTIVE) {
    throw new HttpError(403, 'Only active users can be assigned a role');
  }

  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { role },
      select: safeUserSelect,
    });

    await tx.auditLog.create({
      data: {
        userId: actorUser.id,
        action: AuditAction.UPDATE,
        entityType: EntityType.USER,
        entityId: existingUser.id,
        metadata: {
          previous: {
            role: existingUser.role,
          },
          updated: {
            role: updatedUser.role,
          },
          targetUser: {
            id: existingUser.id,
            email: existingUser.email,
          },
          actor: {
            id: actorUser.id,
            email: actorUser.email,
            role: actorUser.role,
          },
        },
      },
    });

    return updatedUser;
  });
}
