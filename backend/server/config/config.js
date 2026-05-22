const path = require('path');
require('dotenv').config();

const isWindows = process.platform === 'win32';

// Set root path for sandbox based on platform and env settings
let sandboxRoot = process.env.SANDBOX_ROOT || path.join(__dirname, '../../sandbox');
if (!path.isAbsolute(sandboxRoot)) {
  sandboxRoot = path.resolve(sandboxRoot);
}

module.exports = {
  port: parseInt(process.env.PORT || '5000', 10),
  env: process.env.NODE_ENV || 'development',
  isWindows,

  sandbox: {
    root: sandboxRoot,
    useSudo: process.env.USE_SUDO === 'true' && !isWindows,
    user: process.env.SANDBOX_USER || 'sandbox',
  },

  queue: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || '10', 10),
    timeoutMs: parseInt(process.env.QUEUE_TIMEOUT_MS || '30000', 10),
  },

  cleanup: {
    intervalMs: parseInt(process.env.CLEANUP_INTERVAL_MS || '60000', 10),
    staleMs: parseInt(process.env.STALE_THRESHOLD_MS || '300000', 10),
  },

  defaultProfile: process.env.DEFAULT_PROFILE || 'interactive-terminal',

  vm: {
    remoteEnabled: process.env.REMOTE_VM_ENABLED === 'true',
    pool: (process.env.REMOTE_VM_POOL || '').split(',').filter(Boolean),
  },

  // Global output limits (to prevent DOS via spam stdout/stderr)
  output: {
    maxBufferBytes: 5 * 1024 * 1024, // 5MB limit
    throttleMs: 100,                // Throttle streams if they emit too fast
    maxLinesPerSecond: 1000,        // Line spam limit
  }
};
