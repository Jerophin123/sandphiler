'use strict';

const BaseExecutor = require('./baseExecutor');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const compileCache = require('../cache/compileCache');
const logger = require('../utils/logger');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class JavaExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
    this.mainClassName = '';
  }

  async compile() {
    const javacPath = runtimeDetector.getCompilerPath('java') || 'javac';

    if (!runtimeDetector.isAvailable('java')) {
      return {
        success: false,
        output: `[Runtime Error] Java compiler (javac) not found.\nInstall with: sudo apt install default-jdk\n`
      };
    }

    const baseName = path.basename(this.mainFile, '.java');
    
    // Dynamically parse the public class name or first class defined to handle custom class names correctly
    let className = baseName;
    try {
      if (fs.existsSync(this.mainFile)) {
        const code = fs.readFileSync(this.mainFile, 'utf8');
        const publicClassMatch = code.match(/public\s+class\s+(\w+)/);
        const classMatch = code.match(/class\s+(\w+)/);
        if (publicClassMatch) {
          className = publicClassMatch[1];
        } else if (classMatch) {
          className = classMatch[1];
        }
      }
    } catch (e) {
      // safe fallback
    }

    this.mainClassName = className;
    this.compiledBinary = path.join(this.sandboxDir, `${className}.class`);

    // 1. Check compiler cache first
    const cachedPath = compileCache.getCachedBinary(this.codeHash);
    if (cachedPath) {
      fs.copyFileSync(cachedPath, this.compiledBinary);
      this.isCompiled = true;
      logger.info('Reusing Java cached binary (.class)', { sessionId: this.sessionId, className });
      return { success: true, output: 'Cached Java class file reused.\n' };
    }

    // 2. Fresh compilation: javac -d <sandboxDir> Main.java
    return new Promise((resolve) => {
      logger.info('Starting fresh Java compilation', { sessionId: this.sessionId, javacPath });
      const args = ['-d', this.sandboxDir, this.mainFile];
      const proc = spawn(javacPath, args, { env: buildSpawnEnv(), stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      proc.stdout.on('data', (d) => { out += d.toString(); });
      proc.stderr.on('data', (d) => { out += d.toString(); });
      proc.on('close', (code) => {
        const sanitizedOut = this.sanitizeOutput(out);
        if (code === 0 && fs.existsSync(this.compiledBinary)) {
          this.isCompiled = true;
          compileCache.storeCachedBinary(this.codeHash, this.compiledBinary, 'java');
          resolve({ success: true, output: sanitizedOut || 'Java compilation successful.\n' });
        } else {
          this.isCompiled = false;
          resolve({ success: false, output: sanitizedOut || `javac failed with exit code ${code}\n` });
        }
      });
      proc.on('error', (err) => {
        this.isCompiled = false;
        resolve({ success: false, output: `[Runtime Error] javac: ${err.message}\nInstall: sudo apt install default-jdk\n` });
      });
    });
  }

  getExecuteCommand() {
    if (!this.isCompiled) throw new Error('Java code is not compiled.');
    // java -cp <sandboxDir> ClassName
    const javaPath = runtimeDetector.getRuntimePath('java') || 'java';
    return {
      command: javaPath,
      args: ['-cp', this.sandboxDir, this.mainClassName],
      env: buildSpawnEnv()
    };
  }
}

module.exports = JavaExecutor;
