/**
 * Structured Logger with Pino
 * 
 * Provides centralized logging with structured JSON output.
 * In development: uses pino-pretty for human-readable output
 * In production: uses JSON format for log aggregation systems
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Configure pino logger
 * - Development: pretty-printed, colorized output
 * - Production: JSON output with timestamp
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  
  // Base configuration
  base: {
    env: process.env.NODE_ENV || 'development',
  },
  
  // Timestamp configuration
  timestamp: pino.stdTimeFunctions.isoTime,
  
  // Format error objects properly
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  
  // Pretty print in development
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname,env',
      singleLine: false,
    },
  } : undefined,
});

/**
 * Create a child logger with correlation ID
 * Use this for request-scoped logging
 */
export function createLoggerWithCorrelationId(correlationId: string) {
  return logger.child({ correlationId });
}

/**
 * Default logger instance
 */
export default logger;

