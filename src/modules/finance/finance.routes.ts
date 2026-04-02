import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware';
import { requireRoles } from '../../common/middleware/rbac.middleware';
import { Role } from '../../generated/prisma/enums';
import {
  createRecordHandler,
  deleteRecordHandler,
  getRecordByIdHandler,
  listRecordsHandler,
  updateRecordHandler,
} from './finance.controller';

const financeRouter = Router();

financeRouter.post('/records', authenticate, requireRoles(Role.ANALYST, Role.ADMIN), createRecordHandler);
financeRouter.get('/records', authenticate, listRecordsHandler);
financeRouter.get('/records/:id', authenticate, getRecordByIdHandler);
financeRouter.patch('/records/:id', authenticate, requireRoles(Role.ANALYST, Role.ADMIN), updateRecordHandler);
financeRouter.delete('/records/:id', authenticate, requireRoles(Role.ANALYST, Role.ADMIN), deleteRecordHandler);

export default financeRouter;
