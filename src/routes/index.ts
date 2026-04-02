import { Router } from 'express';
import healthRouter from '../modules/health/health.routes';

const apiRouter = Router();

apiRouter.use(healthRouter);

export default apiRouter;
