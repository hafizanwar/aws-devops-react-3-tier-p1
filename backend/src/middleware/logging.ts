import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/metrics';
import crypto from 'crypto';

// Extend Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Logger utility for structured logging
 */
export class Logger {
  private static sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'api_key', 'apikey'];
    const sanitized: any = Array.isArray(data) ? [] : {};

    for (const key in data) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        sanitized[key] = this.sanitizeData(data[key]);
      } else {
        sanitized[key] = data[key];
      }
    }

    return sanitized;
  }

  static log(level: 'info' | 'warn' | 'error', message: string, metadata?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(metadata && { metadata: this.sanitizeData(metadata) }),
    };

    console.log(JSON.stringify(logEntry));
  }

  static info(message: string, metadata?: any) {
    this.log('info', message, metadata);
  }

  static warn(message: string, metadata?: any) {
    this.log('warn', message, metadata);
  }

  static error(message: string, error?: Error | any, metadata?: any) {
    const errorMetadata = {
      ...metadata,
      ...(error instanceof Error && {
        error_message: error.message,
        error_stack: error.stack,
        error_name: error.name,
      }),
      ...(error && !(error instanceof Error) && {
        error_details: error,
      }),
    };

    this.log('error', message, errorMetadata);
  }
}

/**
 * Middleware to add request ID to each request
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Use existing request ID from header or generate new one
  req.requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
}

/**
 * Middleware to log HTTP requests and responses
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Log incoming request
  Logger.info('Incoming request', {
    request_id: req.requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    user_agent: req.headers['user-agent'],
  });

  // Capture response
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route?.path || req.path;

    // Log response
    Logger.info('Request completed', {
      request_id: req.requestId,
      method: req.method,
      path: req.path,
      status_code: res.statusCode,
      response_time_seconds: parseFloat(duration.toFixed(3)),
      response_time: `${duration.toFixed(3)}s`,
    });

    // Update metrics
    metricsService.httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });

    metricsService.httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode,
      },
      duration
    );

    // Track errors
    if (res.statusCode >= 400) {
      metricsService.httpErrorCounter.inc({
        method: req.method,
        route,
        status_code: res.statusCode,
      });
    }
  });

  next();
}

/**
 * Error handling middleware - must be added after all routes
 */
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  Logger.error('Request error', err, {
    request_id: req.requestId,
    method: req.method,
    path: req.path,
    query: req.query,
  });

  // Pass error to next error handler
  next(err);
}

/**
 * Global error handler - must be the last middleware
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    request_id: req.requestId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
