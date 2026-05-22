'use strict';

const BaseExecutor = require('./baseExecutor');
const secureSpawn = require('../utils/secureSpawn');
const path = require('path');
const fs = require('fs');
const compileCache = require('../cache/compileCache');
const logger = require('../utils/logger');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class CppExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
    this.compiledBinary = path.join(this.sandboxDir, 'cpp_executable');
  }

  async compile() {
    const gppPath = runtimeDetector.getCompilerPath('cpp') || 'g++';

    if (!runtimeDetector.isAvailable('cpp')) {
      return {
        success: false,
        output: `[Runtime Error] C++ compiler (g++) not found.\nInstall with: sudo apt install g++\n`
      };
    }

    const cachedPath = compileCache.getCachedBinary(this.codeHash);
    if (cachedPath) {
      this.restoreCachedBinary(cachedPath, this.compiledBinary);
      this.isCompiled = true;
      logger.info('Reusing C++ cached binary', { sessionId: this.sessionId });
      return { success: true, output: 'Cached compilation reused.\n' };
    }

    return new Promise((resolve) => {
      logger.info('Starting fresh C++ compilation', { sessionId: this.sessionId, gppPath });
      const args = ['-std=c++17', '-O2', '-Wall', this.mainFile, '-o', this.compiledBinary];
      const proc = secureSpawn(gppPath, args, { env: buildSpawnEnv(), stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      proc.stdout.on('data', (d) => { out += d.toString(); });
      proc.stderr.on('data', (d) => { out += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) {
          this.isCompiled = true;
          try { fs.chmodSync(this.compiledBinary, 0o755); } catch (_) {}
          compileCache.storeCachedBinary(this.codeHash, this.compiledBinary, 'cpp');
          resolve({ success: true, output: out || 'C++ compilation successful.\n' });
        } else {
          this.isCompiled = false;
          resolve({ success: false, output: out || `g++ failed with exit code ${code}\n` });
        }
      });
      proc.on('error', (err) => {
        this.isCompiled = false;
        resolve({ success: false, output: `[Runtime Error] g++: ${err.message}\nInstall: sudo apt install g++\n` });
      });
    });
  }

  getExecuteCommand() {
    if (!this.isCompiled) throw new Error('C++ code is not compiled yet.');
    const stdbufPath = runtimeDetector.getRuntimePath('stdbuf') || 'stdbuf';
    return {
      command: stdbufPath,
      args: ['-oL', '-eL', this.compiledBinary],
      env: buildSpawnEnv()
    };
  }
}

module.exports = CppExecutor;
