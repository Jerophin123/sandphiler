'use strict';

const BaseExecutor = require('./baseExecutor');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const compileCache = require('../cache/compileCache');
const logger = require('../utils/logger');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class GoExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
    this.compiledBinary = path.join(this.sandboxDir, 'go_binary');
  }

  async compile() {
    const goPath = runtimeDetector.getCompilerPath('go') || 'go';

    if (!runtimeDetector.isAvailable('go')) {
      return {
        success: false,
        output: `[Runtime Error] Go compiler not found.\nInstall from: https://go.dev/dl/  OR  sudo apt install golang-go\n`
      };
    }

    const cachedPath = compileCache.getCachedBinary(this.codeHash);
    if (cachedPath) {
      fs.copyFileSync(cachedPath, this.compiledBinary);
      try { fs.chmodSync(this.compiledBinary, 0o755); } catch (_) {}
      this.isCompiled = true;
      logger.info('Reusing Go cached binary', { sessionId: this.sessionId });
      return { success: true, output: 'Cached Go binary reused.\n' };
    }

    return new Promise((resolve) => {
      logger.info('Starting fresh Go compilation', { sessionId: this.sessionId, goPath });
      const args = ['build', '-o', this.compiledBinary, this.mainFile];
      const proc = spawn(goPath, args, { env: buildSpawnEnv({ GOPATH: process.env.GOPATH || '/root/go' }), stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      proc.stdout.on('data', (d) => { out += d.toString(); });
      proc.stderr.on('data', (d) => { out += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) {
          this.isCompiled = true;
          try { fs.chmodSync(this.compiledBinary, 0o755); } catch (_) {}
          compileCache.storeCachedBinary(this.codeHash, this.compiledBinary, 'go');
          resolve({ success: true, output: out || 'Go compilation successful.\n' });
        } else {
          this.isCompiled = false;
          resolve({ success: false, output: out || `go build failed with exit code ${code}\n` });
        }
      });
      proc.on('error', (err) => {
        this.isCompiled = false;
        resolve({ success: false, output: `[Runtime Error] go: ${err.message}\nInstall: sudo apt install golang-go\n` });
      });
    });
  }

  getExecuteCommand() {
    if (!this.isCompiled) throw new Error('Go code is not compiled.');
    const stdbufPath = runtimeDetector.getRuntimePath('stdbuf') || 'stdbuf';
    return {
      command: stdbufPath,
      args: ['-oL', '-eL', this.compiledBinary],
      env: buildSpawnEnv()
    };
  }
}

module.exports = GoExecutor;
