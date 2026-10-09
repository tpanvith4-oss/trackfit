import * as foodService from '../services/food.service.js';

export async function list(req, res) {
  const entries = await foodService.listFoodEntries(req.validated.query);
  res.json({ data: entries });
}

export async function create(req, res) {
  const entry = await foodService.createFoodEntry(req.validated.body);
  res.status(201).json({ data: entry });
}

export async function remove(req, res) {
  await foodService.deleteFoodEntry(req.validated.params.id);
  res.status(204).end();
}
