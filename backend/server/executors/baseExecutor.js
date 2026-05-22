const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const security = require('../utils/security');
const logger = require('../utils/logger');
const compileCache = require('../cache/compileCache');

class BaseExecutor {
  constructor(sessionId, language, profile) {
    this.sessionId = sessionId;
    this.language = language;
    this.profile = profile;
    this.sandboxDir = path.join(config.sandbox.root, sessionId);
    this.mainFile = '';
    this.compiledBinary = '';
    this.isCompiled = false;
    this.codeHash = '';
  }

  /**
   * Initializes the session sandbox environment
   */
  async prepare(files, mainFilename) {
    // 1. Create sandbox directory
    if (!fs.existsSync(this.sandboxDir)) {
      fs.mkdirSync(this.sandboxDir, { recursive: true });
    }

    // 2. Validate and write execution files
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('No source files provided for execution.');
    }

    for (const file of files) {
      const sanitizedName = security.sanitizeFilename(file.name);
      if (!sanitizedName) {
        throw new Error(`Invalid filename: ${file.name}`);
      }

      const filePath = path.join(this.sandboxDir, sanitizedName);
      
      // Strict path safety check (prevent traversal)
      if (!security.isPathSafe(filePath, this.sandboxDir)) {
        throw new Error(`Path traversal violation detected: ${file.name}`);
      }

      // Check source content safety (defense in depth check)
      const safetyCheck = security.checkSourceSafety(file.content, this.language);
      if (!safetyCheck.safe) {
        throw new Error(`Security Violation: ${safetyCheck.reason}`);
      }

      // Write code file
      fs.writeFileSync(filePath, file.content, 'utf8');
      logger.debug(`File written to sandbox`, { sessionId: this.sessionId, file: sanitizedName });
    }

    // Determine the main entrypoint file
    const sanitizedMain = security.sanitizeFilename(mainFilename || files[0].name);
    this.mainFile = path.join(this.sandboxDir, sanitizedMain);

    // Calculate code hash for compile caching
    this.codeHash = compileCache.getCodeHash(this.language, files);
    
    logger.execution(`Sandbox workspace prepared`, {
      sessionId: this.sessionId,
      language: this.language,
      sandboxDir: this.sandboxDir,
      mainFile: this.mainFile
    });
  }

  /**
   * Compiles the source files if necessary.
   * Can be overridden by compiler executors (C++, Java, Rust, Go, TypeScript).
   * Returns object { success: true/false, output: string }
   */
  async compile() {
    return { success: true, output: '' };
  }

  /**
   * Abstract method: Returns the executable binary/file path and execution argument array.
   * Must be overridden by subclasses.
   * @returns {{ command: string, args: Array<string>, env?: Object }}
   */
  getExecuteCommand() {
    throw new Error('getExecuteCommand() must be implemented by language executor subclasses');
  }

  /**
   * Sanitizes compiler or runtime output by removing sandbox directory paths
   */
  sanitizeOutput(output) {
    if (!output) return '';
    let sanitized = output;
    
    try {
      // Replace absolute sandbox path with relative path or empty string
      const escapedSandboxDir = this.sandboxDir.replace(/\\/g, '\\\\');
      const regex = new RegExp(escapedSandboxDir + '[/\\\\]?', 'g');
      sanitized = sanitized.replace(regex, '');
      
      // Also handle unix slashes if on windows
      const unixSandboxDir = this.sandboxDir.replace(/\\/g, '/');
      const unixRegex = new RegExp(unixSandboxDir + '/?', 'g');
      sanitized = sanitized.replace(unixRegex, '');
    } catch (e) {
      // safe fallback
    }
    
    return sanitized;
  }

  /**
   * Cleans up files in the sandbox workspace directory.
   */
  async cleanup() {
    try {
      if (fs.existsSync(this.sandboxDir)) {
        // We do not delete the cache directory under sandbox root!
        // We delete the specific sessionId folder
        fs.readdirSync(this.sandboxDir).forEach((file) => {
          const curPath = path.join(this.sandboxDir, file);
          if (fs.lstatSync(curPath).isDirectory()) {
            this._deleteFolderRecursive(curPath);
          } else {
            fs.unlinkSync(curPath);
          }
        });
        fs.rmdirSync(this.sandboxDir);
        logger.execution(`Sandbox workspace cleaned up`, { sessionId: this.sessionId });
      }
    } catch (err) {
      logger.error('Error during executor workspace cleanup', { sessionId: this.sessionId, error: err.message });
    }
  }

  _deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
      fs.readdirSync(folderPath).forEach((file) => {
        const curPath = path.join(folderPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          this._deleteFolderRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(folderPath);
    }
  }
}

module.exports = BaseExecutor;
