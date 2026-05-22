const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');

// Cache index map: hash -> { binaryPath, language, cachedAt, lastUsed }
const cacheIndex = new Map();
const cacheDir = path.join(config.sandbox.root, 'cache');

// Ensure cache directory exists
if (!fs.existsSync(cacheDir)) {
  try {
    if (config.sandbox.useSudo) {
      const { execSync } = require('child_process');
      execSync(`sudo -u ${config.sandbox.user} mkdir -p "${cacheDir}"`);
      execSync(`sudo -u ${config.sandbox.user} chmod 777 "${cacheDir}"`);
    } else {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  } catch (err) {
    logger.error('Failed to create compilation cache directory', { error: err.message });
  }
}

/**
 * Computes SHA-256 hash from code input files and compiler parameters
 */
function getCodeHash(language, files, compilerArgs = []) {
  const hash = crypto.createHash('sha256');
  hash.update(language);
  
  // Sort files to make sure order does not affect the hash
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));
  for (const file of sortedFiles) {
    hash.update(file.name);
    hash.update(file.content);
  }
  
  hash.update(JSON.stringify(compilerArgs));
  return hash.digest('hex');
}

/**
 * Retrieves a cached binary if it exists and is valid
 */
function getCachedBinary(hash) {
  const entry = cacheIndex.get(hash);
  if (!entry) return null;

  // Check if target binary file actually exists on disk
  if (fs.existsSync(entry.binaryPath)) {
    entry.lastUsed = Date.now();
    logger.execution('Compilation Cache Hit', { hash, binaryPath: entry.binaryPath });
    return entry.binaryPath;
  }

  // Binary was deleted, invalidate cache entry
  cacheIndex.delete(hash);
  return null;
}

/**
 * Stores a compiled binary in cache
 */
function storeCachedBinary(hash, currentBinaryPath, language) {
  try {
    if (!fs.existsSync(currentBinaryPath)) {
      return null;
    }

    const fileExtension = path.extname(currentBinaryPath);
    const cachedFileName = `${hash}${fileExtension}`;
    const destinationPath = path.join(cacheDir, cachedFileName);

    // Copy binary to cache directory
    if (config.sandbox.useSudo) {
      const { execSync } = require('child_process');
      execSync(`sudo -u ${config.sandbox.user} cp "${currentBinaryPath}" "${destinationPath}"`);
      execSync(`sudo -u ${config.sandbox.user} chmod 755 "${destinationPath}"`);
    } else {
      fs.copyFileSync(currentBinaryPath, destinationPath);
    }

    cacheIndex.set(hash, {
      binaryPath: destinationPath,
      language,
      cachedAt: Date.now(),
      lastUsed: Date.now()
    });

    logger.execution('Compilation Cached Successfully', { hash, destinationPath });
    return destinationPath;
  } catch (err) {
    logger.error('Error caching binary', { hash, currentBinaryPath, error: err.message });
    return null;
  }
}

/**
 * Clears old cache entries
 */
function cleanStaleCache(maxAgeMs = 24 * 60 * 60 * 1000) { // Default 24 hours
  const now = Date.now();
  let clearedCount = 0;

  for (const [hash, entry] of cacheIndex.entries()) {
    if (now - entry.lastUsed > maxAgeMs) {
      try {
        if (fs.existsSync(entry.binaryPath)) {
          if (config.sandbox.useSudo) {
            const { execSync } = require('child_process');
            execSync(`sudo -u ${config.sandbox.user} rm -f "${entry.binaryPath}"`);
          } else {
            fs.unlinkSync(entry.binaryPath);
          }
        }
        cacheIndex.delete(hash);
        clearedCount++;
      } catch (err) {
        logger.error('Error deleting cached binary during cleanup', { hash, binaryPath: entry.binaryPath, error: err.message });
      }
    }
  }

  if (clearedCount > 0) {
    logger.info(`Compilation Cache Cleaned`, { clearedCount, remaining: cacheIndex.size });
  }
}

module.exports = {
  getCodeHash,
  getCachedBinary,
  storeCachedBinary,
  cleanStaleCache,
  cacheIndex
};
