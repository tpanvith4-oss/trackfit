import { Router } from 'express';
import * as sleepController from '../controllers/sleep.controller.js';
import { validate } from '../middleware/validate.js';
import { sleepScheduleSchema } from '../validators/sleep.schema.js';

const router = Router();

router.get('/schedule', sleepController.getSchedule);
router.put('/schedule', validate({ body: sleepScheduleSchema }), sleepController.saveSchedule);

export default router;
