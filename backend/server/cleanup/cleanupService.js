const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');
const sessionStore = require('../state/sessionStore');
const compileCache = require('../cache/compileCache');

let cleanupIntervalHandle = null;

/**
 * Helper to recursively delete files and directories safely
 */
function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        try {
          fs.unlinkSync(curPath);
        } catch (e) {
          logger.warn(`Could not delete file during cleanup`, { file: curPath, error: e.message });
        }
      }
    });
    try {
      fs.rmdirSync(folderPath);
    } catch (e) {
      logger.warn(`Could not delete folder during cleanup`, { folder: folderPath, error: e.message });
    }
  }
}

/**
 * Sweeps inactive execution sessions, zombie sandbox directories, and stale caches.
 */
function performCleanup() {
  logger.info('Running system cleanup sweep...');
  const now = Date.now();
  const staleThreshold = config.cleanup.staleMs;
  const activeSessionList = sessionStore.listSessions();
  
  // 1. Clean up stale sessions
  activeSessionList.forEach((session) => {
    const isStale = (session.disconnectedAt && (now - session.disconnectedAt > staleThreshold)) ||
                    (!session.socketId && (now - session.lastActivity > staleThreshold));
                    
    if (isStale) {
      logger.info(`Cleaning up stale/disconnected session`, { sessionId: session.sessionId });
      
      // Kill child process if still active
      if (session.childProcess) {
        try {
          // Negative PID kills the process group
          process.kill(-session.childProcess.pid, 'SIGKILL');
        } catch (e) {
          try {
            session.childProcess.kill('SIGKILL');
          } catch (err) {
            // Process might be dead already
          }
        }
      }

      // Remove sandbox folder
      if (session.sandboxDir && fs.existsSync(session.sandboxDir)) {
        deleteFolderRecursive(session.sandboxDir);
      }

      // Deregister from store
      sessionStore.removeSession(session.sessionId);
    }
  });

  // 2. Clean up orphan folders in the sandbox root directory
  try {
    const sandboxRoot = config.sandbox.root;
    if (fs.existsSync(sandboxRoot)) {
      const folders = fs.readdirSync(sandboxRoot);
      const activeIds = new Set(sessionStore.listSessions().map(s => s.sessionId));
      
      folders.forEach((folder) => {
        // Skip compile cache folder
        if (folder === 'cache') return;
        
        const folderPath = path.join(sandboxRoot, folder);
        
        // If it's a directory and not linked to any active session, clean it up
        if (fs.lstatSync(folderPath).isDirectory() && !activeIds.has(folder)) {
          logger.info(`Cleaning up orphan sandbox directory`, { directory: folder });
          deleteFolderRecursive(folderPath);
        }
      });
    }
  } catch (err) {
    logger.error('Error cleaning up orphan sandbox directories', { error: err.message });
  }

  // 3. Clean up stale compiler caches (older than 24 hours)
  try {
    compileCache.cleanStaleCache();
  } catch (err) {
    logger.error('Error cleaning stale compile caches', { error: err.message });
  }
  
  logger.info('Cleanup sweep completed.');
}

/**
 * Starts the cleanup service interval loop
 */
function start() {
  if (cleanupIntervalHandle) return;
  
  const interval = config.cleanup.intervalMs;
  cleanupIntervalHandle = setInterval(performCleanup, interval);
  logger.info(`Cleanup service started`, { intervalMs: interval });
  
  // Run an initial sweep on boot
  setImmediate(performCleanup);
}

/**
 * Stops the cleanup service
 */
function stop() {
  if (cleanupIntervalHandle) {
    clearInterval(cleanupIntervalHandle);
    cleanupIntervalHandle = null;
    logger.info('Cleanup service stopped.');
  }
}

module.exports = {
  start,
  stop,
  performCleanup
};
