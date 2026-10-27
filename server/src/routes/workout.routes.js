import { Router } from 'express';
import * as workoutController from '../controllers/workout.controller.js';
import { validate } from '../middleware/validate.js';
import { completeWorkoutSchema, createWorkoutSchema, cuidParamsSchema, splitDayParamsSchema } from '../validators/cut.schema.js';

const router = Router();

router.get('/default-split', workoutController.defaultSplit);
router.get('/template/:splitDay', validate({ params: splitDayParamsSchema }), workoutController.template);
router.get('/recovery', workoutController.recovery);
router.get('/', workoutController.list);
router.post('/', validate({ body: createWorkoutSchema }), workoutController.create);
router.patch('/:id/complete', validate({ params: cuidParamsSchema, body: completeWorkoutSchema }), workoutController.complete);

export default router;
