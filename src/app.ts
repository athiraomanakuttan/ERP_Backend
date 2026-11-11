import 'express-async-errors';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import apiRouter from './routes/index';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '8mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (env.nodeEnv !== 'test') {
    app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
  }

  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, message: 'EMS API is healthy', data: { env: env.nodeEnv } });
  });

  app.use(env.apiPrefix, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
