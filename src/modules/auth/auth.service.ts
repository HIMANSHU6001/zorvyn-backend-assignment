import { Role, UserStatus } from '../../generated/prisma/enums';
import prisma from '../../config/prisma';
import { HttpError } from '../../common/errors/http-error';
import { signAccessToken } from '../../common/utils/jwt';
import { comparePassword, hashPassword } from '../../common/utils/password';
import type { LoginInput, RegisterInput } from './auth.validation';

const safeUserSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function registerUser(input: RegisterInput) {
  const email = normalizeEmail(input.email);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new HttpError(409, 'Email is already registered');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.VIEWER,
      status: UserStatus.ACTIVE,
    },
    select: safeUserSelect,
  });

  const accessToken = signAccessToken({ userId: user.id, role: user.role });

  return { user, accessToken };
}

export async function loginUser(input: LoginInput) {
  const email = normalizeEmail(input.email);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const isPasswordValid = await comparePassword(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new HttpError(401, 'Invalid email or password');
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new HttpError(403, 'User account is inactive');
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const { passwordHash: _passwordHash, ...safeUser } = user;

  return { user: safeUser, accessToken };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect,
  });

  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new HttpError(403, 'User account is inactive');
  }

  return user;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
