const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const config = require('./server/config/config');
const logger = require('./server/utils/logger');
const apiRoutes = require('./server/routes/api');
const registerSocketHandlers = require('./server/socket/socketHandler');
const cleanupService = require('./server/cleanup/cleanupService');
const processManager = require('./server/services/processManager');

// ─── Runtime Detection (runs once at startup) ────────────────────────────────
// Must be required BEFORE any executor is instantiated so the cache is warm.
const runtimeDetector = require('./server/utils/runtimeDetector');

logger.info('Detecting installed language runtimes...');
runtimeDetector.detectAll();
runtimeDetector.printStartupTable();
// ─────────────────────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// REST routes
app.use('/api', apiRoutes);

// Base health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    env: config.env,
    platform: process.platform
  });
});

// Set up Socket.IO event registrations
registerSocketHandlers(io);

// Create required root directories
const requiredDirs = [
  config.sandbox.root,
  path.join(__dirname, 'logs')
];

requiredDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      logger.error(`Failed to create directory: ${dir}`, { error: err.message });
    }
  }
});

// Start cleanup cron scheduler
cleanupService.start();

// Boot application
const PORT = config.port;
server.listen(PORT, () => {
  logger.info(`Compiler execution backend running on port ${PORT}`, {
    env: config.env,
    platform: process.platform,
    sandboxRoot: config.sandbox.root,
    useSudo: config.sandbox.useSudo
  });
});

// Handle uncaught errors to prevent complete process crash
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception occurred', { error: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at promise', { reason: String(reason) });
});

// Graceful Shutdown
function handleShutdown(signal) {
  logger.warn(`Shutdown signal received (${signal}). Cleaning up processes...`);

  // Stop background cron sweeps
  cleanupService.stop();

  // Terminate all remaining running execution child processes
  const pids = Array.from(processManager.activeProcesses.keys());
  pids.forEach((sid) => {
    processManager.killProcess(sid, 'SIGKILL');
  });

  server.close(() => {
    logger.info('HTTP server closed. Exiting.');
    process.exit(0);
  });

  // Force exit if server shutdown hangs
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 3000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
