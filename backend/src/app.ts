import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { requestIdMiddleware, requestLogger, errorLogger, errorHandler } from './middleware/logging';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import healthRoutes from './routes/healthRoutes';
import { healthController } from './controllers/healthController';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS middleware
  app.use(cors({
    origin: config.cors.origin,
  }));

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request ID middleware (must be before logging)
  app.use(requestIdMiddleware);

  // Logging middleware
  app.use(requestLogger);

  // Health and metrics endpoints (outside /api prefix)
  app.use('/api', healthRoutes);
  app.get('/metrics', (req, res) => healthController.metrics(req, res));

  // API routes
  app.use('/api', productRoutes);
  app.use('/api', orderRoutes);

  // Error logging middleware (must be after all routes)
  app.use(errorLogger);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
