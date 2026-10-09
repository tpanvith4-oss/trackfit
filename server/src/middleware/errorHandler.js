import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { isProduction } from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';

const PRISMA_ERROR_MAP = {
  P2002: [409, 'A record with the same unique value already exists'],
  P2025: [404, 'Resource not found'],
};

function toHttpError(err) {
  if (err instanceof HttpError) return err;

  if (err instanceof ZodError) {
    return new HttpError(
      400,
      'Validation failed',
      err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && PRISMA_ERROR_MAP[err.code]) {
    const [status, message] = PRISMA_ERROR_MAP[err.code];
    return new HttpError(status, message);
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return new HttpError(503, 'Database is unavailable');
  }

  // body-parser / http-errors style errors (e.g. malformed JSON, payload too large)
  if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500 && err.expose) {
    return new HttpError(err.status, err.type === 'entity.parse.failed' ? 'Malformed JSON body' : err.message);
  }

  return null;
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  const httpError = toHttpError(err);

  if (!httpError || httpError.status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  const status = httpError?.status ?? 500;
  const message = httpError?.message ?? (isProduction ? 'Internal server error' : err.message);

  res.status(status).json({
    error: {
      message,
      ...(httpError?.details && { details: httpError.details }),
    },
  });
}
