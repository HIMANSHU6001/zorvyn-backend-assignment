import type { Role, UserStatus } from '../../generated/prisma/enums';

export type AuthTokenPayload = {
  userId: string;
  role: Role;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
};
