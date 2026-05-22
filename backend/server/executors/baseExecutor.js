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
    const { execSync } = require('child_process');

    // 1. Create sandbox directory
    if (!fs.existsSync(this.sandboxDir)) {
      if (config.sandbox.useSudo) {
        execSync(`sudo -u ${config.sandbox.user} mkdir -p "${this.sandboxDir}"`);
        execSync(`sudo -u ${config.sandbox.user} chmod 777 "${this.sandboxDir}"`);
      } else {
        fs.mkdirSync(this.sandboxDir, { recursive: true });
      }
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
      fs.chmodSync(filePath, 0o777); // Ensure sandbox has full rights
      logger.debug(`File written to sandbox`, { sessionId: this.sessionId, file: sanitizedName });
    }

    // Restore secure permissions on the workspace folder owned by sandbox
    if (config.sandbox.useSudo) {
      execSync(`sudo -u ${config.sandbox.user} chmod 755 "${this.sandboxDir}"`);
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
   * Safely restores a cached binary file to the sandbox session directory,
   * honoring sudo/permissions boundaries.
   */
  restoreCachedBinary(cachedPath, destinationPath) {
    if (config.sandbox.useSudo) {
      const { execSync } = require('child_process');
      // Execute the file copy under the sandbox user who owns the destination folder
      execSync(`sudo -u ${config.sandbox.user} cp "${cachedPath}" "${destinationPath}"`);
      execSync(`sudo -u ${config.sandbox.user} chmod 755 "${destinationPath}"`);
    } else {
      fs.copyFileSync(cachedPath, destinationPath);
      try { fs.chmodSync(destinationPath, 0o755); } catch (_) {}
    }
  }

  async cleanup() {
    try {
      if (fs.existsSync(this.sandboxDir)) {
        if (config.sandbox.useSudo) {
          const { execSync } = require('child_process');
          execSync(`sudo -u ${config.sandbox.user} rm -rf "${this.sandboxDir}"`);
        } else {
          // Fallback to normal recursive deletion
          this._deleteFolderRecursive(this.sandboxDir);
        }
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
