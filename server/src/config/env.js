import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const REQUIRED_VARS = ['DATABASE_URL'];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(', ')}. ` +
      'Copy server/.env.example to server/.env and fill in the values.',
  );
}

const parsePort = (value, fallback) => {
  const port = Number.parseInt(value ?? '', 10);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback;
};

const parseList = (value) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsePort(process.env.PORT, 4000),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL,
  corsOrigins: parseList(process.env.CORS_ORIGINS),
});

export const isProduction = env.nodeEnv === 'production';
