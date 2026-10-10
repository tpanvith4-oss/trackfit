import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import activityRoutes from './activity.routes.js';
import authRoutes from './auth.routes.js';
import foodRoutes from './food.routes.js';
import sleepRoutes from './sleep.routes.js';
import syncRoutes from './sync.routes.js';
import weightRoutes from './weight.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/food', requireAuth, foodRoutes);
apiRouter.use('/weight', requireAuth, weightRoutes);
apiRouter.use('/sleep', requireAuth, sleepRoutes);
apiRouter.use('/activity', requireAuth, activityRoutes);
// Each sync route declares its own auth: /health also accepts health-sync tokens.
apiRouter.use('/sync', syncRoutes);

export default apiRouter;
