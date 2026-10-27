import { Router } from 'express';
import * as foodController from '../controllers/food.controller.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema, listQuerySchema } from '../validators/common.schema.js';
import { aiParseSchema, createFoodSchema, recommendationsQuerySchema } from '../validators/food.schema.js';

const router = Router();

router.get('/', validate({ query: listQuerySchema }), foodController.list);
router.get('/recommendations', validate({ query: recommendationsQuerySchema }), foodController.recommendations);
router.post('/', validate({ body: createFoodSchema }), foodController.create);
router.post('/ai-parse', validate({ body: aiParseSchema }), foodController.aiParse);
router.delete('/:id', validate({ params: idParamsSchema }), foodController.remove);

export default router;
