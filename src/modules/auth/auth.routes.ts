import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware';
import { login, me, register } from './auth.controller';

const authRouter = Router();

authRouter.post('/auth/register', register);
authRouter.post('/auth/login', login);
authRouter.get('/auth/me', authenticate, me);

export default authRouter;
