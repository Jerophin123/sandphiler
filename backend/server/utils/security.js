const path = require('path');
const logger = require('./logger');

// Forbidden commands that low-privilege sandbox should never run
const BLOCKED_COMMANDS = new Set([
  'sudo', 'su', 'chown', 'chmod', 'dd', 'rmdir', 'mkfs', 'fdisk', 'parted',
  'shutdown', 'reboot', 'init', 'systemctl', 'service', 'iptables', 'ufw',
  'passwd', 'useradd', 'userdel', 'groupadd', 'groupdel', 'visudo', 'crontab'
]);

// Allowed execution commands/compilers
const ALLOWED_COMMANDS = new Set([
  'python', 'python3', 'gcc', 'g++', 'clang', 'clang++', 'java', 'javac',
  'node', 'npm', 'tsc', 'go', 'rustc', 'cargo', 'php', 'ruby', 'mcs', 'mono',
  'kotlinc', 'kotlin', 'dotnet', 'stdbuf', 'prlimit', 'rscript'
]);

/**
 * Sanitizes a filename, permitting only alphanumeric characters, underscores, hyphens, and dots.
 */
function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return '';
  // Remove path traversal elements and bad characters
  let clean = path.basename(filename);
  clean = clean.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  return clean;
}

/**
 * Validates that a target path is strictly contained within the allowed base directory.
 * Prevents directory traversal attacks.
 */
function isPathSafe(targetPath, baseDirectory) {
  try {
    const resolvedBase = path.resolve(baseDirectory);
    const resolvedTarget = path.resolve(targetPath);
    
    // Target must start with the base directory path
    return resolvedTarget.startsWith(resolvedBase) && resolvedTarget !== resolvedBase;
  } catch (err) {
    logger.error('Error validating path safety', { targetPath, baseDirectory, error: err.message });
    return false;
  }
}

/**
 * Checks if the binary to execute is on the blocked list or missing from whitelist.
 */
function isCommandSafe(executable) {
  if (typeof executable !== 'string') return false;
  
  const baseBinary = path.basename(executable).toLowerCase();
  
  // Check blacklist
  if (BLOCKED_COMMANDS.has(baseBinary)) {
    logger.security('Blocked command execution attempt', { executable });
    return false;
  }
  
  // Check whitelist
  if (!ALLOWED_COMMANDS.has(baseBinary)) {
    logger.warn('Executing non-whitelisted binary', { executable });
  }
  
  return true;
}

/**
 * Detects highly suspicious contents inside source codes (defense-in-depth warning, not blocker).
 */
function checkSourceSafety(code, language) {
  const result = { safe: true, reason: '' };
  
  if (typeof code !== 'string') {
    return { safe: false, reason: 'Invalid code content' };
  }

  // Look for dangerous terminal escapes or shell invocation constructs if code is run directly (optional helper)
  const forkBombPattern = /:(\(\)\{\s*:\|\s*&\s*\};:)/;
  if (forkBombPattern.test(code)) {
    result.safe = false;
    result.reason = 'Fork bomb pattern detected in source';
  }
  
  return result;
}

module.exports = {
  sanitizeFilename,
  isPathSafe,
  isCommandSafe,
  checkSourceSafety
};
