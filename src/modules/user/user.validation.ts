import { z } from 'zod';
import { UserStatus } from '../../generated/prisma/enums';

export const updateUserStatusParamsSchema = z.object({
  id: z.string().uuid(),
});

export const updateUserStatusBodySchema = z.object({
  status: z.nativeEnum(UserStatus),
});

export type UpdateUserStatusParams = z.infer<typeof updateUserStatusParamsSchema>;
export type UpdateUserStatusBody = z.infer<typeof updateUserStatusBodySchema>;
