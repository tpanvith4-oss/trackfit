import { Router } from 'express';
import * as checkinController from '../controllers/checkin.controller.js';
import { validate } from '../middleware/validate.js';
import { checkinPatchSchema, checkinQuerySchema, energyQuerySchema } from '../validators/cut.schema.js';

const router = Router();

router.get('/', validate({ query: checkinQuerySchema }), checkinController.get);
router.patch('/', validate({ body: checkinPatchSchema }), checkinController.upsert);
router.get('/energy', validate({ query: energyQuerySchema }), checkinController.energyBalance);

export default router;
