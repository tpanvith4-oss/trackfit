import { Router } from 'express';
import * as measurementController from '../controllers/measurement.controller.js';
import { validate } from '../middleware/validate.js';
import { createMeasurementSchema } from '../validators/cut.schema.js';

const router = Router();

router.get('/', measurementController.list);
router.get('/trajectory', measurementController.trajectory);
router.post('/', validate({ body: createMeasurementSchema }), measurementController.create);

export default router;
