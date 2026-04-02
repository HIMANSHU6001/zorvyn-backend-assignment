import { Router } from 'express';
import auditRouter from '../modules/audit/audit.routes';
import authRouter from '../modules/auth/auth.routes';
import dashboardRouter from '../modules/dashboard/dashboard.routes';
import financeRouter from '../modules/finance/finance.routes';
import healthRouter from '../modules/health/health.routes';
import userRouter from '../modules/user/user.routes';

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(dashboardRouter);
apiRouter.use(auditRouter);
apiRouter.use(financeRouter);
apiRouter.use(userRouter);

export default apiRouter;
