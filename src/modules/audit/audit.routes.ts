import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware';
import { requireRoles } from '../../common/middleware/rbac.middleware';
import { Role } from '../../generated/prisma/enums';
import { getAuditLogByIdHandler, listAuditLogsHandler } from './audit.controller';

const auditRouter = Router();

auditRouter.get('/audit-logs', authenticate, requireRoles(Role.ADMIN), listAuditLogsHandler);
auditRouter.get('/audit-logs/:id', authenticate, requireRoles(Role.ADMIN), getAuditLogByIdHandler);

export default auditRouter;
