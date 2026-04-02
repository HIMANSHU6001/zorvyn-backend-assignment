import { Router } from 'express';
import authRouter from '../modules/auth/auth.routes';
import healthRouter from '../modules/health/health.routes';
import userRouter from '../modules/user/user.routes';

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(userRouter);

export default apiRouter;
