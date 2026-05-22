'use strict';

const BaseExecutor = require('./baseExecutor');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const compileCache = require('../cache/compileCache');
const logger = require('../utils/logger');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class KotlinExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
    this.compiledBinary = path.join(this.sandboxDir, 'kotlin_output.jar');
  }

  async compile() {
    // Resolve kotlinc absolute path (snap install --classic kotlin → /snap/bin/kotlinc)
    const kotlincPath = runtimeDetector.getCompilerPath('kotlin') || 'kotlinc';

    if (!runtimeDetector.isAvailable('kotlin')) {
      return {
        success: false,
        output: `[Runtime Error] Kotlin compiler (kotlinc) not found on this server.\n` +
                `Install with: sudo snap install --classic kotlin\n` +
                `Then ensure /snap/bin is in PATH.\n`
      };
    }

    // 1. Check compiler cache first
    const cachedPath = compileCache.getCachedBinary(this.codeHash);
    if (cachedPath) {
      fs.copyFileSync(cachedPath, this.compiledBinary);
      this.isCompiled = true;
      logger.info('Reusing Kotlin cached JAR file', { sessionId: this.sessionId });
      return { success: true, output: 'Cached Kotlin compile reused.\n' };
    }

    // 2. Fresh compilation:  kotlinc main.kt -include-runtime -d output.jar
    return new Promise((resolve) => {
      logger.info('Starting fresh Kotlin compilation', {
        sessionId: this.sessionId,
        kotlincPath
      });

      const args = [
        this.mainFile,
        '-include-runtime',
        '-d', this.compiledBinary
      ];

      const compilerProcess = spawn(kotlincPath, args, {
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
        if (code === 0 && fs.existsSync(this.compiledBinary)) {
          this.isCompiled = true;
          compileCache.storeCachedBinary(this.codeHash, this.compiledBinary, 'kotlin');
          resolve({ success: true, output: compileOutput || 'Kotlin compilation successful.\n' });
        } else {
          this.isCompiled = false;
          resolve({
            success: false,
            output: compileOutput || `kotlinc failed with exit code ${code}\n`
          });
        }
      });

      compilerProcess.on('error', (err) => {
        this.isCompiled = false;
        resolve({
          success: false,
          output: `[Runtime Error] Failed to invoke Kotlin compiler (kotlinc): ${err.message}\n` +
                  `Resolved path: ${kotlincPath}\n` +
                  `Install with: sudo snap install --classic kotlin\n`
        });
      });
    });
  }

  getExecuteCommand() {
    if (!this.isCompiled) {
      throw new Error('Kotlin code is not compiled.');
    }

    // java -jar output.jar
    const javaPath = runtimeDetector.getRuntimePath('kotlin') || 'java';
    return {
      command: javaPath,
      args: ['-jar', this.compiledBinary],
      env: buildSpawnEnv()
    };
  }
}

module.exports = KotlinExecutor;
