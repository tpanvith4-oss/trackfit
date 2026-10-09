import { Router } from 'express';
import * as foodController from '../controllers/food.controller.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema, listQuerySchema } from '../validators/common.schema.js';
import { createFoodSchema } from '../validators/food.schema.js';

const router = Router();

router.get('/', validate({ query: listQuerySchema }), foodController.list);
router.post('/', validate({ body: createFoodSchema }), foodController.create);
router.delete('/:id', validate({ params: idParamsSchema }), foodController.remove);

export default router;
