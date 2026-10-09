import { Router } from 'express';
import * as weightController from '../controllers/weight.controller.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema, listQuerySchema } from '../validators/common.schema.js';
import { createWeightSchema } from '../validators/weight.schema.js';

const router = Router();

router.get('/', validate({ query: listQuerySchema }), weightController.list);
router.post('/', validate({ body: createWeightSchema }), weightController.create);
router.delete('/:id', validate({ params: idParamsSchema }), weightController.remove);

export default router;
