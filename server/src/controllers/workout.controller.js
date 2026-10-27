import * as workoutService from '../services/workoutService.js';

export async function template(req, res) {
  const data = await workoutService.getWorkoutTemplate(req.userId, req.validated.params.splitDay);
  res.json({ data });
}

export async function recovery(req, res) {
  const data = await workoutService.getMuscleRecovery(req.userId);
  res.json({ data });
}

export async function list(req, res) {
  const data = await workoutService.listWorkoutSessions(req.userId);
  res.json({ data });
}

export async function create(req, res) {
  const data = await workoutService.createWorkoutSession(req.userId, req.validated.body);
  res.status(201).json({ data });
}

export async function complete(req, res) {
  const data = await workoutService.completeWorkoutSession(req.userId, req.validated.params.id, req.validated.body);
  res.json({ data });
}

export async function defaultSplit(req, res) {
  res.json({ data: { splitDay: workoutService.defaultSplitForDate(new Date()) } });
}
