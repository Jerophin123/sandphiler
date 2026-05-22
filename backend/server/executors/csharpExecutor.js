'use strict';

const BaseExecutor = require('./baseExecutor');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const compileCache = require('../cache/compileCache');
const logger = require('../utils/logger');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class CSharpExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
    this.compiledBinary = path.join(this.sandboxDir, 'csharp_output.exe');
  }

  async compile() {
    // Resolve mcs (Mono C# compiler) absolute path
    const mcsPath = runtimeDetector.getCompilerPath('csharp') || 'mcs';

    if (!runtimeDetector.isAvailable('csharp')) {
      return {
        success: false,
        output: `[Runtime Error] Mono C# compiler (mcs) not found on this server.\n` +
                `Install with: sudo apt install mono-complete\n`
      };
    }

    // 1. Check compiler cache first
    const cachedPath = compileCache.getCachedBinary(this.codeHash);
    if (cachedPath) {
      fs.copyFileSync(cachedPath, this.compiledBinary);
      this.isCompiled = true;
      logger.info('Reusing C# cached executable (.exe)', { sessionId: this.sessionId });
      return { success: true, output: 'Cached C# assembly reused.\n' };
    }

    // 2. Fresh compilation:  mcs -out:output.exe main.cs
    return new Promise((resolve) => {
      logger.info('Starting fresh C# compilation', {
        sessionId: this.sessionId,
        mcsPath
      });

      const args = [`-out:${this.compiledBinary}`, this.mainFile];

      const compilerProcess = spawn(mcsPath, args, {
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
          compileCache.storeCachedBinary(this.codeHash, this.compiledBinary, 'csharp');
          resolve({ success: true, output: compileOutput || 'C# compilation successful.\n' });
        } else {
          this.isCompiled = false;
          resolve({
            success: false,
            output: compileOutput || `mcs compilation failed with exit code ${code}\n`
          });
        }
      });

      compilerProcess.on('error', (err) => {
        this.isCompiled = false;
        resolve({
          success: false,
          output: `[Runtime Error] Failed to invoke Mono compiler (mcs): ${err.message}\n` +
                  `Resolved path: ${mcsPath}\n` +
                  `Install with: sudo apt install mono-complete\n`
        });
      });
    });
  }

  getExecuteCommand() {
    if (!this.isCompiled) {
      throw new Error('C# code is not compiled.');
    }

    // mono output.exe
    const monoPath = runtimeDetector.getRuntimePath('csharp') || 'mono';
    return {
      command: monoPath,
      args: [this.compiledBinary],
      env: buildSpawnEnv({ MONO_GC_PARAMS: 'nursery-size=64m' })
    };
  }
}

module.exports = CSharpExecutor;
