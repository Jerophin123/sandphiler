'use strict';

const BaseExecutor = require('./baseExecutor');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const compileCache = require('../cache/compileCache');
const logger = require('../utils/logger');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv, GLOBAL_PATH } = require('../utils/runtimeConfig');

class RustExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
    this.compiledBinary = path.join(this.sandboxDir, 'rust_binary');
  }

  async compile() {
    // Resolve rustc absolute path from the detector cache
    const rustcPath = runtimeDetector.getCompilerPath('rust') || 'rustc';

    if (!runtimeDetector.isAvailable('rust')) {
      return {
        success: false,
        output: `[Runtime Error] Rust compiler (rustc) not found on this server.\n` +
                `Install with: curl https://sh.rustup.rs -sSf | sh -s -- -y\n` +
                `Then ensure ~/.cargo/bin is in PATH.\n`
      };
    }

    // 1. Check compiler cache first
    const cachedPath = compileCache.getCachedBinary(this.codeHash);
    if (cachedPath) {
      fs.copyFileSync(cachedPath, this.compiledBinary);
      fs.chmodSync(this.compiledBinary, 0o755);
      this.isCompiled = true;
      logger.info('Reusing Rust cached binary', { sessionId: this.sessionId });
      return { success: true, output: 'Cached Rust binary reused.\n' };
    }

    // 2. Perform fresh compilation using resolved absolute path
    return new Promise((resolve) => {
      logger.info('Starting fresh Rust compilation', {
        sessionId: this.sessionId,
        rustcPath
      });

      // rustc -O <source.rs> -o <output_binary>
      const args = ['-O', this.mainFile, '-o', this.compiledBinary];
      const compilerProcess = spawn(rustcPath, args, {
        env: buildSpawnEnv({ RUSTUP_HOME: process.env.RUSTUP_HOME }),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let compileOutput = '';

      compilerProcess.stdout.on('data', (data) => {
        compileOutput += data.toString();
      });

      compilerProcess.stderr.on('data', (data) => {
        compileOutput += data.toString();
      });

      compilerProcess.on('close', (code) => {
        if (code === 0) {
          this.isCompiled = true;
          try { fs.chmodSync(this.compiledBinary, 0o755); } catch (_) {}
          compileCache.storeCachedBinary(this.codeHash, this.compiledBinary, 'rust');
          resolve({ success: true, output: compileOutput || 'Rust compilation successful.\n' });
        } else {
          this.isCompiled = false;
          resolve({
            success: false,
            output: compileOutput || `rustc failed with exit code ${code}\n`
          });
        }
      });

      compilerProcess.on('error', (err) => {
        this.isCompiled = false;
        resolve({
          success: false,
          output: `[Runtime Error] Failed to invoke Rust compiler (rustc): ${err.message}\n` +
                  `Resolved path: ${rustcPath}\n` +
                  `Install with: curl https://sh.rustup.rs -sSf | sh -s -- -y\n`
        });
      });
    });
  }

  getExecuteCommand() {
    if (!this.isCompiled) {
      throw new Error('Rust binary is not compiled.');
    }

    // Use stdbuf for unbuffered streaming output
    const stdbufPath = runtimeDetector.getRuntimePath('stdbuf') || 'stdbuf';
    return {
      command: stdbufPath,
      args: ['-oL', '-eL', this.compiledBinary],
      env: buildSpawnEnv({ RUST_BACKTRACE: '1' })
    };
  }
}

module.exports = RustExecutor;
