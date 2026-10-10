import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env, isProduction } from './config/env.js';
import { getHealth } from './controllers/health.controller.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import apiRouter from './routes/index.js';
import { HttpError } from './utils/HttpError.js';

// Origins of the Capacitor WebView (Android https/http schemes, iOS), i.e. the TrackFit app itself.
const NATIVE_APP_ORIGINS = ['https://localhost', 'http://localhost', 'capacitor://localhost'];

const corsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header (curl, native HTTP, same-origin) are always allowed.
    if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin) || NATIVE_APP_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new HttpError(403, `Origin ${origin} is not allowed by CORS`));
  },
};

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(morgan(isProduction ? 'combined' : 'dev'));
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', getHealth);
  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
