import * as energyBalanceService from '../services/energyBalanceService.js';

export async function get(req, res) {
  const date = req.validated.query.date ?? new Date();
  const data = await energyBalanceService.getDailyCheckin(req.userId, date);
  res.json({ data });
}

export async function upsert(req, res) {
  const { date, ...patch } = req.validated.body;
  const data = await energyBalanceService.upsertDailyCheckin(req.userId, date ?? new Date(), patch);
  res.json({ data });
}

export async function energyBalance(req, res) {
  const data = await energyBalanceService.getRollingEnergyBalance(req.userId, req.validated.query);
  res.json({ data });
}
