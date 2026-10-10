import * as activityService from '../services/activity.service.js';
import { signHealthSyncToken } from '../services/auth.service.js';

export async function list(req, res) {
  const entries = await activityService.listActivity(req.userId, req.validated.query);
  res.json({ data: entries });
}

export async function createManual(req, res) {
  const entry = await activityService.createManualActivity(req.userId, req.validated.body);
  res.status(201).json({ data: entry });
}

export async function remove(req, res) {
  await activityService.deleteManualActivity(req.userId, req.validated.params.id);
  res.status(204).end();
}

export async function syncHealth(req, res) {
  const entry = await activityService.upsertSyncedActivity(req.userId, req.validated.body);
  res.json({ success: true, entry });
}

export function issueHealthSyncToken(req, res) {
  res.status(201).json({ data: signHealthSyncToken(req.userId) });
}
