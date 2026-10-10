import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';

const BCRYPT_ROUNDS = 10;
const TOKEN_ALGORITHM = 'HS256';
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

// Compared against when the username doesn't exist so failed logins take the same time either way.
const TIMING_EQUALIZER_HASH = bcrypt.hashSync('trackfit-timing-equalizer', BCRYPT_ROUNDS);

export const PROFILE_SELECT = Object.freeze({
  id: true,
  name: true,
  username: true,
  baselineWeight: true,
  targetWeightMin: true,
  targetWeightMax: true,
  dailyCalories: true,
  dailyProtein: true,
});

const usernameTaken = () => new HttpError(409, 'Username already taken');
const invalidCredentials = () => new HttpError(401, 'Invalid username or password');

/** Scope of tokens handed to iOS Shortcuts: they can only post activity to the sync endpoint. */
export const HEALTH_SYNC_SCOPE = 'health-sync';
const HEALTH_SYNC_TOKEN_TTL = '365d';

export function signToken(user) {
  return jwt.sign({ userId: user.id, username: user.username }, env.jwtSecret, {
    algorithm: TOKEN_ALGORITHM,
    expiresIn: env.jwtExpiresIn,
  });
}

export function signHealthSyncToken(userId) {
  const token = jwt.sign({ userId, scope: HEALTH_SYNC_SCOPE }, env.jwtSecret, {
    algorithm: TOKEN_ALGORITHM,
    expiresIn: HEALTH_SYNC_TOKEN_TTL,
  });
  return { token, expiresAt: new Date(jwt.decode(token).exp * 1000) };
}

/** Returns the token payload, or throws a jsonwebtoken error if it is invalid or expired. */
export function verifyToken(token) {
  const payload = jwt.verify(token, env.jwtSecret, { algorithms: [TOKEN_ALGORITHM] });
  if (typeof payload !== 'object' || typeof payload.userId !== 'string') {
    throw new jwt.JsonWebTokenError('Token payload is missing userId');
  }
  return payload;
}

export async function registerUser({ name, username, password, baselineWeight, dailyCalories }) {
  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing) throw usernameTaken();

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: { name, username, passwordHash, baselineWeight, dailyCalories },
      select: PROFILE_SELECT,
    });
    return { token: signToken(user), user };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw usernameTaken();
    throw err;
  }
}

export async function authenticateUser({ username, password }) {
  const record = await prisma.user.findUnique({
    where: { username },
    select: { ...PROFILE_SELECT, passwordHash: true },
  });

  const hasUsableHash = Boolean(record && BCRYPT_HASH_PATTERN.test(record.passwordHash));
  const matches = await bcrypt.compare(password, hasUsableHash ? record.passwordHash : TIMING_EQUALIZER_HASH);
  if (!hasUsableHash || !matches) throw invalidCredentials();

  const { passwordHash: _passwordHash, ...user } = record;
  return { token: signToken(user), user };
}

export function findProfile(userId) {
  return prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
}
