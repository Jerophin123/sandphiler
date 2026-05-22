const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const logDir = path.join(__dirname, '../../../logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaString}`;
  })
);

const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    // Info and general system logs
    new DailyRotateFile({
      filename: path.join(logDir, 'system-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),
    // Separate error logs
    new DailyRotateFile({
      filename: path.join(logDir, 'errors-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error'
    })
  ]
});

// If not in production, log to console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Dedicated logging categories for analytics & security
const securityLogger = winston.createLogger({
  level: 'warn',
  format: logFormat,
  transports: [
    new DailyRotateFile({
      filename: path.join(logDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '90d'
    })
  ]
});

const executionLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new DailyRotateFile({
      filename: path.join(logDir, 'executions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '50m',
      maxFiles: '7d'
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  securityLogger.add(new winston.transports.Console({ format: consoleFormat }));
  executionLogger.add(new winston.transports.Console({ format: consoleFormat }));
}

module.exports = {
  info: (msg, meta) => logger.info(msg, meta),
  error: (msg, meta) => logger.error(msg, meta),
  warn: (msg, meta) => logger.warn(msg, meta),
  debug: (msg, meta) => logger.debug(msg, meta),
  
  security: (msg, meta) => securityLogger.warn(`[SECURITY] ${msg}`, meta),
  execution: (msg, meta) => executionLogger.info(`[EXECUTION] ${msg}`, meta)
};
