import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware';
import { requireRoles } from '../../common/middleware/rbac.middleware';
import { Role } from '../../generated/prisma/enums';
import { patchUserStatus } from './user.controller';

const userRouter = Router();

userRouter.patch('/users/:id/status', authenticate, requireRoles(Role.ADMIN), patchUserStatus);

export default userRouter;
