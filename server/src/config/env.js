import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const parsePort = (value, fallback) => {
  const port = Number.parseInt(value ?? '', 10);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback;
};

const parseList = (value) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const nodeEnv = process.env.NODE_ENV ?? 'development';
// Render sets RENDER=true on every service, so a missing NODE_ENV there still counts as deployed.
const isDeployed = nodeEnv === 'production' || Boolean(process.env.RENDER);

const LOCAL_DEV_JWT_SECRET = 'trackfit-local-dev-only-secret-never-use-in-production';
const MIN_JWT_SECRET_LENGTH = 32;

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) {
    if (isDeployed && secret.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters in deployed environments.`);
    }
    return secret;
  }
  if (isDeployed) {
    throw new Error('JWT_SECRET is required in deployed environments. Set it in the service environment settings.');
  }
  console.warn('[auth] JWT_SECRET is not set; using the local development secret.');
  return LOCAL_DEV_JWT_SECRET;
}

export const env = Object.freeze({
  nodeEnv,
  port: parsePort(process.env.PORT, 3000),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL?.trim() || null,
  corsOrigins: parseList(process.env.CORS_ORIGINS),
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '30d',
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || null,
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-4-hydrogen',
  transcribeModel: process.env.GEMINI_TRANSCRIBE_MODEL?.trim() || 'gemini-3.5-transcribe',
  liveModel: process.env.GEMINI_LIVE_MODEL?.trim() || 'gemini-3.8-live',
  // Optional OpenAI-compatible fallback (NVIDIA NIM). Used when Gemini is unset or the Gemini call fails.
  nvidiaApiKey: process.env.NVIDIA_API_KEY?.trim() || null,
  nvidiaModel: process.env.NVIDIA_MODEL?.trim() || 'nvidia/llama-3.1-nemotron-70b-instruct',
  nvidiaBaseUrl: process.env.NVIDIA_BASE_URL?.trim() || 'https://integrate.api.nvidia.com/v1',
});

export const isProduction = nodeEnv === 'production';
