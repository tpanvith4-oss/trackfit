import * as weightService from '../services/weight.service.js';

export async function list(req, res) {
  const entries = await weightService.listWeightEntries(req.validated.query);
  res.json({ data: entries });
}

export async function create(req, res) {
  const entry = await weightService.createWeightEntry(req.validated.body);
  res.status(201).json({ data: entry });
}

export async function remove(req, res) {
  await weightService.deleteWeightEntry(req.validated.params.id);
  res.status(204).end();
}
