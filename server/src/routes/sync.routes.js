import { Router } from 'express';
import * as activityController from '../controllers/activity.controller.js';
import { requireAuth, requireHealthSyncAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { healthSyncSchema } from '../validators/activity.schema.js';

const router = Router();

router.post('/health', requireHealthSyncAuth, validate({ body: healthSyncSchema }), activityController.syncHealth);
router.post('/token', requireAuth, activityController.issueHealthSyncToken);

export default router;
