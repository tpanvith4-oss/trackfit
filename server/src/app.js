import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env, isProduction } from './config/env.js';
import { getHealth } from './controllers/health.controller.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import apiRouter from './routes/index.js';
import { HttpError } from './utils/HttpError.js';

// Capacitor WebView origins (Android https/http schemes, iOS).
const NATIVE_APP_ORIGINS = ['https://localhost', 'http://localhost', 'capacitor://localhost'];

// Always allowed browser origins (local Vite + Firebase Hosting).
const DEFAULT_WEB_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://trackfit-apk.web.app',
  'https://trackfit-apk.firebaseapp.com',
];

const allowedOrigins = new Set([...DEFAULT_WEB_ORIGINS, ...NATIVE_APP_ORIGINS, ...env.corsOrigins]);

const corsOptions = {
  origin(origin, callback) {
    // No Origin (curl, same-origin, native HTTP) — always allow.
    if (!origin) {
      callback(null, true);
      return;
    }
    // Explicit allowlist: Firebase, localhost, Capacitor, plus CORS_ORIGINS env.
    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    // Unset CORS_ORIGINS keeps open access for ad-hoc preview URLs.
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

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(morgan(isProduction ? 'combined' : 'dev'));
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '100kb' }));

  // Liveness first — no auth, no DB — so cold-start probes succeed immediately.
  app.get('/health', getHealth);
  app.get('/api/health', getHealth);

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
