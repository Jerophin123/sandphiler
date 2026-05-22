'use strict';

const { spawn } = require('child_process');
const config = require('../config/config');
const { buildSpawnEnv } = require('./runtimeConfig');
const logger = require('./logger');

/**
 * Centrally manages secure spawn execution wrapped under the sandbox user.
 * Standardizes secure execution, path preservation, and privilege downgrade.
 *
 * @param {string} command The command/binary to run
 * @param {Array<string>} args Command arguments
 * @param {Object} options Standard child_process.spawn options
 */
function secureSpawn(command, args = [], options = {}) {
  let spawnCmd = command;
  let spawnArgs = [...args];
  
  // Build fully enriched environment
  const mergedEnv = buildSpawnEnv(options.env || {});
  delete mergedEnv.PWD; // Prevent privilege leakage / directory traversal errors in sandboxed tools
  
  const spawnOptions = {
    ...options,
    env: mergedEnv
  };

  // If running in production Linux environment, apply sudo wrapping
  if (config.sandbox.useSudo) {
    spawnCmd = 'sudo';
    spawnArgs = [
      '-u', config.sandbox.user,
      'env',
    ];

    const hostHome = mergedEnv.HOME || '/home/ubuntu';

    // Redirect caching and toolchain home directories to the secure, writable /sandbox area
    mergedEnv.HOME = '/sandbox';
    mergedEnv.GOCACHE = '/sandbox/.cache/go-build';
    mergedEnv.GOPATH = '/sandbox/go';
    
    // Redirect toolchain configurations to the host user's home so rustup/cargo find default toolchains
    mergedEnv.RUSTUP_HOME = process.env.RUSTUP_HOME || `${hostHome}/.rustup`;
    mergedEnv.CARGO_HOME = process.env.CARGO_HOME || `${hostHome}/.cargo`;
    
    // Remove host user config/cache variables to enforce falling back to secure /sandbox area
    delete mergedEnv.XDG_CACHE_HOME;
    delete mergedEnv.XDG_CONFIG_HOME;
    delete mergedEnv.XDG_DATA_HOME;
    delete mergedEnv.XDG_STATE_HOME;
    delete mergedEnv.XDG_RUNTIME_DIR;
    delete mergedEnv.npm_config_cache;
    delete mergedEnv.NODE_REPL_HISTORY;
    
    // Inject the full enriched environment (including PATH and HOME) into the sudo context
    Object.entries(mergedEnv).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        spawnArgs.push(`${k}=${v}`);
      }
    });
    
    // Append actual compiler/runtime command and its arguments
    spawnArgs.push(command, ...args);

    // Default current working directory to safe sandbox area so sandbox user can read/stat it
    if (!spawnOptions.cwd) {
      spawnOptions.cwd = '/sandbox';
    }
  }
  
  logger.info(`[SecureSpawn] Wrapping execution`, {
    original: command,
    spawnCmd,
    args: spawnArgs,
    cwd: spawnOptions.cwd
  });
  
  return spawn(spawnCmd, spawnArgs, spawnOptions);
}

module.exports = secureSpawn;
