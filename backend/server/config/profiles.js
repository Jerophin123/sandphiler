/**
 * Security Profile Definitions
 * These configurations translate to Linux prlimit constraints:
 * - cpuLimitSeconds: prlimit --cpu (CPU seconds allowed for execution)
 * - memoryLimitKb: prlimit --as (Virtual memory address space limit in KB)
 * - maxProcesses: prlimit --nproc (Maximum concurrent processes/threads under execution context)
 * - maxFileSize: prlimit --fsize (Maximum file sizes created/written in bytes)
 * - timeoutMs: Wall-clock timeout checked by Node.js process monitor
 */

const profiles = {
  'competitive-programming': {
    cpuLimitSeconds: 2,
    memoryLimitKb: 64 * 1024,      // 64 MB
    maxProcesses: 10,
    maxFileSize: 1024 * 1024,      // 1 MB
    timeoutMs: 3000,               // 3 seconds
  },
  'high-memory': {
    cpuLimitSeconds: 30,
    memoryLimitKb: 2048 * 1024,    // 2 GB
    maxProcesses: 50,
    maxFileSize: 50 * 1024 * 1024, // 50 MB
    timeoutMs: 45000,              // 45 seconds
  },
  'quick-execution': {
    cpuLimitSeconds: 1,
    memoryLimitKb: 32 * 1024,      // 32 MB
    maxProcesses: 5,
    maxFileSize: 512 * 1024,       // 512 KB
    timeoutMs: 1500,               // 1.5 seconds
  },
  'interactive-terminal': {
    cpuLimitSeconds: 300,
    memoryLimitKb: 1024 * 1024,    // 1 GB
    maxProcesses: 30,
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    timeoutMs: 300000,             // 5 minutes
  },
  'restricted-mode': {
    cpuLimitSeconds: 5,
    memoryLimitKb: 16 * 1024,      // 16 MB
    maxProcesses: 2,
    maxFileSize: 64 * 1024,        // 64 KB
    timeoutMs: 10000,              // 10 seconds
  }
};

module.exports = {
  profiles,
  getProfile: (name) => {
    return profiles[name] || profiles['interactive-terminal'];
  }
};
