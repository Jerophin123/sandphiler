'use strict';

const BaseExecutor = require('./baseExecutor');
const secureSpawn = require('../utils/secureSpawn');
const path = require('path');
const fs = require('fs');
const compileCache = require('../cache/compileCache');
const logger = require('../utils/logger');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class TypeScriptExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
    this.compiledJsFile = '';
  }

  async compile() {
    const fileBase = path.basename(this.mainFile, '.ts');
    this.compiledJsFile = path.join(this.sandboxDir, `${fileBase}.js`);
    this.compiledBinary = this.compiledJsFile; // cache storage compatibility

    // Resolve tsc absolute path from detector cache
    const tscPath = runtimeDetector.getCompilerPath('typescript') || 'tsc';

    if (!runtimeDetector.isAvailable('typescript')) {
      return {
        success: false,
        output: `[Runtime Error] TypeScript compiler (tsc) not found on this server.\n` +
                `Install with: npm install -g typescript\n` +
                `Then ensure /usr/local/bin (or npm global bin) is in PATH.\n`
      };
    }

    // 1. Check compiler cache first
    const cachedPath = compileCache.getCachedBinary(this.codeHash);
    if (cachedPath) {
      this.restoreCachedBinary(cachedPath, this.compiledJsFile);
      this.isCompiled = true;
      logger.info('Reusing TypeScript compiled JS file from cache', { sessionId: this.sessionId });
      return { success: true, output: 'Cached TS compilation reused.\n' };
    }

    // 2. Perform fresh compilation using resolved absolute tsc path
    return new Promise((resolve) => {
      logger.info('Starting fresh TypeScript compilation', {
        sessionId: this.sessionId,
        tscPath
      });

      const args = [
        '--target', 'ES2022',
        '--module', 'commonjs',
        '--skipLibCheck',
        '--strict', 'false',
        '--outDir', this.sandboxDir,
        this.mainFile
      ];

      const compilerProcess = secureSpawn(tscPath, args, {
        env: buildSpawnEnv(),
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
        if (code === 0 && fs.existsSync(this.compiledJsFile)) {
          this.isCompiled = true;
          compileCache.storeCachedBinary(this.codeHash, this.compiledJsFile, 'typescript');
          resolve({ success: true, output: compileOutput || 'TypeScript compilation successful.\n' });
        } else {
          this.isCompiled = false;
          resolve({
            success: false,
            output: compileOutput || `tsc compilation failed with exit code ${code}\n`
          });
        }
      });

      compilerProcess.on('error', (err) => {
        this.isCompiled = false;
        resolve({
          success: false,
          output: `[Runtime Error] Failed to invoke TypeScript compiler (tsc): ${err.message}\n` +
                  `Resolved path: ${tscPath}\n` +
                  `Install with: npm install -g typescript\n`
        });
      });
    });
  }

  getExecuteCommand() {
    if (!this.isCompiled) {
      throw new Error('TypeScript code is not compiled.');
    }

    // Run compiled JS with Node.js
    const nodePath = runtimeDetector.getRuntimePath('typescript') || 'node';
    return {
      command: nodePath,
      args: [this.compiledJsFile],
      env: buildSpawnEnv()
    };
  }
}

module.exports = TypeScriptExecutor;
