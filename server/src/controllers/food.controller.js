import * as foodService from '../services/food.service.js';
import { estimateMeal } from '../services/mealEstimator.service.js';
import { enrichFoodMacros } from '../services/nutritionValidator.js';
import { HttpError } from '../utils/HttpError.js';

export async function list(req, res) {
  const entries = await foodService.listFoodEntries(req.userId, req.validated.query);
  res.json({ data: entries });
}

export async function recommendations(req, res) {
  const meals = await foodService.listFrequentMeals(req.userId, req.validated.query);
  res.json({ data: meals });
}

export async function create(req, res) {
  const { forceOverride, ...body } = req.validated.body;
  const enriched = enrichFoodMacros({ ...body, forceOverride });
  if (enriched._nutrition.warning && !forceOverride) {
    throw new HttpError(422, enriched._nutrition.warning, [
      {
        path: 'carbsG',
        message: enriched._nutrition.warning,
        atwaterCalories: enriched._nutrition.atwaterCalories,
      },
    ]);
  }

  const { _nutrition, ...payload } = enriched;
  const entry = await foodService.createFoodEntry(req.userId, payload);
  res.status(201).json({ data: entry, nutrition: _nutrition });
}

export async function aiParse(req, res) {
  const estimate = await estimateMeal(req.userId, req.validated.body);
  res.json({ success: true, data: estimate });
}

export async function remove(req, res) {
  await foodService.deleteFoodEntry(req.userId, req.validated.params.id);
  res.status(204).end();
}
