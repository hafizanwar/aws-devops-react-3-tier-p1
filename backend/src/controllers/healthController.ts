import { Request, Response } from 'express';
import { database } from '../services/database';
import { metricsService } from '../services/metrics';
import { Logger } from '../middleware/logging';

export class HealthController {
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const dbHealthy = await database.healthCheck();

      if (!dbHealthy) {
        Logger.warn('Health check failed - database disconnected', {
          request_id: req.requestId,
        });
        res.status(503).json({
          status: 'unhealthy',
          database: 'disconnected',
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
        });
        return;
      }

      res.json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      Logger.error('Health check failed', error, {
        request_id: req.requestId,
      });
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    }
  }

  async metrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await metricsService.getMetrics();
      res.set('Content-Type', metricsService.register.contentType);
      res.send(metrics);
    } catch (error) {
      Logger.error('Error fetching metrics', error, {
        request_id: req.requestId,
      });
      res.status(500).json({
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        request_id: req.requestId,
      });
    }
  }
}

export const healthController = new HealthController();
