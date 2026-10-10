import * as authService from '../services/auth.service.js';
import { HttpError } from '../utils/HttpError.js';

export async function register(req, res) {
  const session = await authService.registerUser(req.validated.body);
  res.status(201).json(session);
}

export async function login(req, res) {
  const session = await authService.authenticateUser(req.validated.body);
  res.json(session);
}

export async function me(req, res) {
  const user = await authService.findProfile(req.userId);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  res.json({ user });
}
