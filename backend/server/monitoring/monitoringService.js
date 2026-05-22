const os = require('os');
const pidusage = require('pidusage');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');
const sessionStore = require('../state/sessionStore');
const queueManager = require('../queue/queueManager');

/**
 * Resolves system memory details
 */
function getSystemMemory() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  return {
    totalMb: Math.round(totalMem / (1024 * 1024)),
    usedMb: Math.round(usedMem / (1024 * 1024)),
    freeMb: Math.round(freeMem / (1024 * 1024)),
    usagePercent: Math.round((usedMem / totalMem) * 100)
  };
}

/**
 * Evaluates disk space in sandbox root directory
 */
function getSandboxDiskUsage() {
  try {
    const root = config.sandbox.root;
    if (!fs.existsSync(root)) return { sizeBytes: 0, countFiles: 0 };

    let totalSize = 0;
    let fileCount = 0;

    function walkDir(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            walkDir(filePath);
          } else {
            totalSize += stats.size;
            fileCount++;
          }
        } catch (e) {
          // Ignore files that are deleted mid-process or inaccessible
        }
      }
    }

    walkDir(root);
    return {
      sizeMb: parseFloat((totalSize / (1024 * 1024)).toFixed(2)),
      fileCount
    };
  } catch (err) {
    logger.error('Failed to calculate disk usage', { error: err.message });
    return { sizeMb: 0, fileCount: 0 };
  }
}

/**
 * Asynchronously checks CPU and memory usage of a specific child process pid
 */
async function getProcessUsage(pid) {
  try {
    if (!pid) return null;
    const stats = await pidusage(pid);
    return {
      pid: stats.pid,
      cpuPercent: parseFloat(stats.cpu.toFixed(1)),
      memoryMb: parseFloat((stats.memory / (1024 * 1024)).toFixed(1)),
      elapsedSeconds: Math.round(stats.elapsed / 1000)
    };
  } catch (err) {
    // Avoid spamming logs if process is already dead when checked
    logger.debug('Pidusage failed or process exited', { pid, error: err.message });
    return null;
  }
}

/**
 * Returns complete server health report
 */
async function getSystemMetrics() {
  const activeSessions = sessionStore.listSessions();
  const processStatsPromises = activeSessions
    .filter(s => s.childProcess && s.childProcess.pid)
    .map(s => getProcessUsage(s.childProcess.pid).then(stats => ({ sessionId: s.sessionId, stats })));

  const resolvedProcessStats = await Promise.all(processStatsPromises);
  const activeProcessUsage = resolvedProcessStats.filter(p => p.stats !== null);

  const loadAvg = os.loadavg();
  const systemCpuPercent = Math.round((loadAvg[0] / os.cpus().length) * 100);

  return {
    timestamp: Date.now(),
    system: {
      platform: os.platform(),
      uptimeSeconds: Math.round(os.uptime()),
      cpu: {
        cores: os.cpus().length,
        loadAvg,
        usagePercent: Math.min(systemCpuPercent, 100)
      },
      memory: getSystemMemory()
    },
    sandbox: {
      disk: getSandboxDiskUsage(),
      activeSessions: activeSessions.length,
      queue: queueManager.getStats()
    },
    processes: activeProcessUsage
  };
}

module.exports = {
  getSystemMetrics,
  getProcessUsage
};
