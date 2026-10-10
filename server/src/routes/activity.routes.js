import { Router } from 'express';
import * as activityController from '../controllers/activity.controller.js';
import { validate } from '../middleware/validate.js';
import { activityIdParamsSchema, activityQuerySchema, manualActivitySchema } from '../validators/activity.schema.js';

const router = Router();

router.get('/', validate({ query: activityQuerySchema }), activityController.list);
router.post('/manual', validate({ body: manualActivitySchema }), activityController.createManual);
router.delete('/:id', validate({ params: activityIdParamsSchema }), activityController.remove);

export default router;
