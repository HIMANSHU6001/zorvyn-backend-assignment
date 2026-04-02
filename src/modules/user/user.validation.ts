import { z } from 'zod';
import { Role, UserStatus } from '../../generated/prisma/enums';

export const updateUserStatusParamsSchema = z.object({
  id: z.string().uuid(),
});

export const updateUserStatusBodySchema = z.object({
  status: z.nativeEnum(UserStatus),
});

export const updateUserRoleBodySchema = z.object({
  role: z.nativeEnum(Role),
});

export type UpdateUserStatusParams = z.infer<typeof updateUserStatusParamsSchema>;
export type UpdateUserStatusBody = z.infer<typeof updateUserStatusBodySchema>;
export type UpdateUserRoleBody = z.infer<typeof updateUserRoleBodySchema>;
