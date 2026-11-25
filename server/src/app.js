import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env, isProduction } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { HttpError } from './utils/HttpError.js';

const CLIENT_DIST_DIR = fileURLToPath(new URL('../../client/dist', import.meta.url));
const CLIENT_INDEX_HTML = path.join(CLIENT_DIST_DIR, 'index.html');

// Capacitor WebView origins (Android https/http schemes; iOS https + capacitor schemes).
const NATIVE_APP_ORIGINS = [
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  'ionic://localhost',
];

// Always allowed browser origins (local Vite + Firebase Hosting).
const DEFAULT_WEB_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://trackfit-apk.web.app',
  'https://trackfit-apk.firebaseapp.com',
];

const allowedOrigins = new Set([...DEFAULT_WEB_ORIGINS, ...NATIVE_APP_ORIGINS, ...env.corsOrigins]);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    if (env.corsOrigins.length === 0) {
      callback(null, true);
      return;
    }
    callback(new HttpError(403, `Origin ${origin} is not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 204,
};

/** Instant 200 — no DB, no auth. Must stay free of Prisma / AI imports. */
function sendOk(_req, res) {
  res.status(200).json({ status: 'ok' });
}

/**
 * Minimal app that can bind a port immediately for Render's 30s proxy window.
 * Heavy `/api/*` routers are mounted later via `mountApiRoutes`.
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // CORS before health so Capacitor WebViews (https://localhost) can read the response.
  // Keep this ahead of body parsers / heavy routers so Render wake checks stay cheap.
  app.use(cors(corsOptions));

  app.get('/health', sendOk);
  app.get('/api/health', sendOk);

  app.use(morgan(isProduction ? 'combined' : 'dev'));
  app.use('/api/food/transcribe', express.json({ limit: '12mb' }));
  app.use(express.json({ limit: '256kb' }));

  return app;
}

/** Mounts authenticated API routes, static client bundle, and 404/error handlers. */
export async function mountApiRoutes(app) {
  const { default: apiRouter } = await import('./routes/index.js');
  app.use('/api', apiRouter);

  if (fs.existsSync(CLIENT_INDEX_HTML)) {
    app.use(express.static(CLIENT_DIST_DIR));
    app.use((req, res, next) => {
      if ((req.method === 'GET' || req.method === 'HEAD') && !req.path.startsWith('/api')) {
        res.sendFile(CLIENT_INDEX_HTML);
        return;
      }
      next();
    });
  }

  app.use(notFound);
  app.use(errorHandler);
}
