import * as bodyCompositionService from '../services/bodyCompositionService.js';
import { HttpError } from '../utils/HttpError.js';

export async function list(req, res) {
  const data = await bodyCompositionService.listMeasurements(req.userId, req.validated?.query ?? {});
  res.json({ data });
}

export async function trajectory(req, res) {
  const data = await bodyCompositionService.getTrajectorySummary(req.userId);
  res.json({ data });
}

export async function create(req, res) {
  try {
    const result = await bodyCompositionService.createMeasurement(req.userId, req.validated.body);
    res.status(201).json({ data: result });
  } catch (err) {
    if (err.message?.includes('Waist must exceed')) throw new HttpError(400, err.message);
    throw err;
  }
}
