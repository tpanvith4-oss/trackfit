import { prisma } from '../config/db.js';
import { verifyToken } from '../services/auth.service.js';
import { HttpError } from '../utils/HttpError.js';

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

function unauthorized(res, message) {
  res.set('WWW-Authenticate', 'Bearer');
  return new HttpError(401, message);
}

/** Requires a valid `Authorization: Bearer <jwt>` header and sets `req.userId`. */
export async function requireAuth(req, res, next) {
  const match = BEARER_PATTERN.exec(req.get('authorization') ?? '');
  if (!match) throw unauthorized(res, 'Authentication required');

  let payload;
  try {
    payload = verifyToken(match[1]);
  } catch (err) {
    throw unauthorized(res, err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid authentication token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } });
  if (!user) throw unauthorized(res, 'Account no longer exists');

  req.userId = user.id;
  next();
}
