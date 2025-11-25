/**
 * Logger utility for structured logging in the frontend
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: any;
}

class Logger {
  private static sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'api_key', 'apikey', 'credit_card'];
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

  private static formatLogEntry(level: LogLevel, message: string, metadata?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(metadata && { metadata: this.sanitizeData(metadata) }),
    };
  }

  static info(message: string, metadata?: any): void {
    const logEntry = this.formatLogEntry('info', message, metadata);
    console.log(JSON.stringify(logEntry));
  }

  static warn(message: string, metadata?: any): void {
    const logEntry = this.formatLogEntry('warn', message, metadata);
    console.warn(JSON.stringify(logEntry));
  }

  static error(message: string, error?: Error | any, metadata?: any): void {
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

    const logEntry = this.formatLogEntry('error', message, errorMetadata);
    console.error(JSON.stringify(logEntry));
  }
}

export default Logger;
