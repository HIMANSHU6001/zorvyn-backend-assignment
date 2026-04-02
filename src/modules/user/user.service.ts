import type { UserStatus } from '../../generated/prisma/enums';
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
