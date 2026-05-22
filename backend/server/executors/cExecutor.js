'use strict';

const BaseExecutor = require('./baseExecutor');
const secureSpawn = require('../utils/secureSpawn');
const path = require('path');
const fs = require('fs');
const compileCache = require('../cache/compileCache');
const logger = require('../utils/logger');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class CExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
    this.compiledBinary = path.join(this.sandboxDir, 'c_executable');
  }

  async compile() {
    const gccPath = runtimeDetector.getCompilerPath('c') || 'gcc';

    if (!runtimeDetector.isAvailable('c')) {
      return {
        success: false,
        output: `[Runtime Error] C compiler (gcc) not found on this server.\n` +
                `Install with: sudo apt install gcc\n`
      };
    }

    // 1. Check compiler cache first
    const cachedPath = compileCache.getCachedBinary(this.codeHash);
    if (cachedPath) {
      this.restoreCachedBinary(cachedPath, this.compiledBinary);
      this.isCompiled = true;
      logger.info('Reusing C cached binary', { sessionId: this.sessionId });
      return { success: true, output: 'Cached compilation reused.\n' };
    }

    // 2. Fresh compilation
    return new Promise((resolve) => {
      logger.info('Starting fresh C compilation', { sessionId: this.sessionId, gccPath });

      const args = ['-O2', '-Wall', this.mainFile, '-o', this.compiledBinary, '-lm'];
      const compilerProcess = secureSpawn(gccPath, args, {
        env: buildSpawnEnv(),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let compileOutput = '';
      compilerProcess.stdout.on('data', (d) => { compileOutput += d.toString(); });
      compilerProcess.stderr.on('data', (d) => { compileOutput += d.toString(); });

      compilerProcess.on('close', (code) => {
        if (code === 0) {
          this.isCompiled = true;
          try { fs.chmodSync(this.compiledBinary, 0o755); } catch (_) {}
          compileCache.storeCachedBinary(this.codeHash, this.compiledBinary, 'c');
          resolve({ success: true, output: compileOutput || 'C compilation successful.\n' });
        } else {
          this.isCompiled = false;
          resolve({ success: false, output: compileOutput || `gcc failed with exit code ${code}\n` });
        }
      });

      compilerProcess.on('error', (err) => {
        this.isCompiled = false;
        resolve({
          success: false,
          output: `[Runtime Error] Failed to invoke C compiler (gcc): ${err.message}\n` +
                  `Install with: sudo apt install gcc\n`
        });
      });
    });
  }

  getExecuteCommand() {
    if (!this.isCompiled) throw new Error('C code is not compiled yet.');
    const stdbufPath = runtimeDetector.getRuntimePath('stdbuf') || 'stdbuf';
    return {
      command: stdbufPath,
      args: ['-oL', '-eL', this.compiledBinary],
      env: buildSpawnEnv()
    };
  }
}

module.exports = CExecutor;
