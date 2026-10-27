import { Router } from 'express';
import * as mealTemplateController from '../controllers/mealTemplate.controller.js';

const router = Router();

router.get('/', mealTemplateController.list);

export default router;
