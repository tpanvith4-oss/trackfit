import { Router } from 'express';
import * as activityController from '../controllers/activity.controller.js';
import { requireAuth, requireHealthSyncAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { healthSyncSchema } from '../validators/activity.schema.js';

const router = Router();

/** Browser/Shortcut probes often hit GET; point them at the real POST sync contract. */
router.get('/health', (_req, res) => {
  res.set('Allow', 'POST');
  res.status(405).json({
    error: {
      message:
        'Use POST /api/sync/health (not GET). In Shortcuts → Get Contents of URL → Method: POST, header Authorization: Bearer <sync token>, JSON body with date, steps, activeCalories, distanceKm.',
    },
  });
});

router.post('/health', requireHealthSyncAuth, validate({ body: healthSyncSchema }), activityController.syncHealth);
router.post('/token', requireAuth, activityController.issueHealthSyncToken);

export default router;
