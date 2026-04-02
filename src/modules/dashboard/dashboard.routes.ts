import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware';
import { getDashboardSummaryHandler } from './dashboard.controller';

const dashboardRouter = Router();

dashboardRouter.get('/dashboard/summary', authenticate, getDashboardSummaryHandler);

export default dashboardRouter;
