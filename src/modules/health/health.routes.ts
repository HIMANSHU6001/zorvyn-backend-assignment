import { Router } from 'express';
import { getHealth, getRedisHealth } from './health.controller';

const healthRouter = Router();

healthRouter.get('/health', getHealth);
healthRouter.get('/health/redis', getRedisHealth);

export default healthRouter;
