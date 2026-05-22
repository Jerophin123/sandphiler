const { spawn } = require('child_process');
const config = require('../config/config');
const logger = require('../utils/logger');
const sessionStore = require('../state/sessionStore');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

// Map of sessionId -> ChildProcess
const activeProcesses = new Map();

/**
 * Spawns a secured subprocess with resource limit protection and optional sudo execution.
 *
 * The merged environment always includes the globally resolved PATH that covers:
 *   ~/.cargo/bin  (Rust / rustc)
 *   /snap/bin     (Kotlin / kotlinc)
 *   /usr/local/bin (npm global binaries: tsc, ts-node)
 *   standard system dirs
 */
function spawnSecureProcess(options) {
  return new Promise((resolve, reject) => {
    const {
      sessionId,
      command,
      args: rawArgs,
      env: customEnv,
      profile,
      sandboxDir,
      stateManager,
      callbacks
    } = options;

    let spawnCmd = command;
    let spawnArgs = [...rawArgs];

    // Build enriched environment: global PATH + executor-specific vars
    const mergedEnv = buildSpawnEnv(customEnv);

    // If running in production Linux environment, apply sudo & prlimit wrapping
    if (config.sandbox.useSudo) {
      spawnCmd = 'sudo';
      spawnArgs = [
        '-u', config.sandbox.user,
        'env',
      ];

      // Inject the full enriched environment (including GLOBAL_PATH) into sudo context
      Object.entries(mergedEnv).forEach(([k, v]) => {
        // Sanitize values: skip undefined/null
        if (v !== undefined && v !== null) {
          spawnArgs.push(`${k}=${v}`);
        }
      });

      // Wrap with prlimit constraints
      spawnArgs.push(
        'prlimit',
        `--as=${profile.memoryLimitKb * 1024}`, // Address space (Virtual Memory) in bytes
        `--nproc=${profile.maxProcesses}`,      // Max process count
        `--fsize=${profile.maxFileSize}`,       // Max file size outputs in bytes
        `--cpu=${profile.cpuLimitSeconds}`,     // CPU limit in seconds
        command,
        ...rawArgs
      );
    }

    logger.execution('Spawning process', {
      sessionId,
      cmd: spawnCmd,
      args: spawnArgs,
      platform: process.platform,
      useSudo: config.sandbox.useSudo
    });

    let child;
    try {
      child = spawn(spawnCmd, spawnArgs, {
        cwd: sandboxDir,
        env: mergedEnv,
        // Detach process to spawn a new process group.
        // This is critical on Linux to kill child trees (like shell script spawning binaries).
        detached: process.platform !== 'win32'
      });
    } catch (err) {
      logger.error('Failed to spawn child process', { sessionId, error: err.message });
      return reject(err);
    }

    activeProcesses.set(sessionId, child);

    if (callbacks && callbacks.onSpawn) {
      try {
        callbacks.onSpawn(child);
      } catch (err) {
        logger.error('Error in onSpawn callback', { sessionId, error: err.message });
      }
    }

    // Track output bytes for safety limits (Large Output Protection)
    let totalOutputBytes = 0;
    const maxBytes = config.output.maxBufferBytes;
    let limitExceeded = false;

    // Output buffering logic to avoid event loops spamming
    const streamHandler = (data, type) => {
      if (limitExceeded) return;

      const dataStr = data.toString();
      totalOutputBytes += Buffer.byteLength(data, 'utf8');

      if (totalOutputBytes > maxBytes) {
        limitExceeded = true;
        logger.security('Large output limit exceeded, terminating process', { sessionId, totalOutputBytes });
        
        // Push warning message to output stream
        if (callbacks.onStderr) {
          callbacks.onStderr(`\n[Execution Error: Output limit of ${maxBytes / (1024 * 1024)}MB exceeded. Execution terminated.]\n`);
        }
        
        killProcess(sessionId, 'SIGKILL');
        stateManager.transitionTo('timeout', { error: 'Output Limit Exceeded' });
        return;
      }

      if (type === 'stdout' && callbacks.onStdout) {
        callbacks.onStdout(dataStr);
      } else if (type === 'stderr' && callbacks.onStderr) {
        callbacks.onStderr(dataStr);
      }
    };

    child.stdout.on('data', (data) => streamHandler(data, 'stdout'));
    child.stderr.on('data', (data) => streamHandler(data, 'stderr'));

    // Set Wall-Clock Timeout monitor
    const timeoutHandle = setTimeout(() => {
      logger.execution('Execution timeout hit', { sessionId, limitMs: profile.timeoutMs });
      
      if (callbacks.onStderr) {
        callbacks.onStderr(`\n[Execution Timeout: Maximum limit of ${profile.timeoutMs / 1000}s reached. Terminated.]\n`);
      }
      
      killProcess(sessionId, 'SIGKILL');
      stateManager.transitionTo('timeout', { error: 'Timeout Exceeded' });
    }, profile.timeoutMs);

    child.on('error', (err) => {
      logger.error('Process error event', { sessionId, error: err.message });
      clearTimeout(timeoutHandle);
      activeProcesses.delete(sessionId);
      stateManager.transitionTo('crashed', { error: err.message });
      reject(err);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timeoutHandle);
      activeProcesses.delete(sessionId);
      
      logger.execution('Process closed', { sessionId, code, signal });

      // Only transition to completed if we didn't crash or hit timeout state earlier
      const currentState = stateManager.getState();
      if (currentState === 'running') {
        if (code === 0) {
          stateManager.transitionTo('completed');
        } else if (signal === 'SIGKILL' || signal === 'SIGTERM') {
          stateManager.transitionTo('killed');
        } else {
          stateManager.transitionTo('crashed', { exitCode: code });
        }
      }

      // Execute exit callbacks (which includes folder cleanup)
      if (callbacks.onExit) {
        callbacks.onExit(code, signal);
      }
      
      resolve(child);
    });
  });
}

/**
 * Kills execution process safely. If running on Linux/macOS, kills process group.
 */
function killProcess(sessionId, signal = 'SIGTERM') {
  const child = activeProcesses.get(sessionId);
  if (!child) return false;

  logger.info('Terminating running process', { sessionId, signal });

  try {
    if (process.platform !== 'win32' && child.pid) {
      // Negative PID kills the process group (child and all its forks)
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
    return true;
  } catch (err) {
    logger.warn('Failed to kill process clean', { sessionId, pid: child.pid, error: err.message });
    // Fallback direct kill
    try {
      child.kill('SIGKILL');
    } catch (e) {}
    return true;
  }
}

module.exports = {
  spawnSecureProcess,
  killProcess,
  activeProcesses
};
