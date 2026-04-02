import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authRateLimiter } from '../../common/middleware/rate-limit.middleware';
import { login, me, register } from './auth.controller';

const authRouter = Router();

authRouter.post('/auth/register', authRateLimiter, register);
authRouter.post('/auth/login', authRateLimiter, login);
authRouter.get('/auth/me', authenticate, me);

export default authRouter;
