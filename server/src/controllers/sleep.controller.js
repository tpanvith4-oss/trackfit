import * as sleepService from '../services/sleep.service.js';

export async function getSchedule(req, res) {
  const schedule = await sleepService.getSleepSchedule(req.userId);
  res.json({ data: schedule });
}

export async function saveSchedule(req, res) {
  const schedule = await sleepService.saveSleepSchedule(req.userId, req.validated.body);
  res.json({ data: schedule });
}
