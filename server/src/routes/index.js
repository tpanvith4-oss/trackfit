import { Router } from 'express';
import foodRoutes from './food.routes.js';
import weightRoutes from './weight.routes.js';

const apiRouter = Router();

apiRouter.use('/food', foodRoutes);
apiRouter.use('/weight', weightRoutes);

export default apiRouter;
