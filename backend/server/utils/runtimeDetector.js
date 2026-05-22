/**
 * runtimeDetector.js
 *
 * Probes the Ubuntu VM filesystem at backend startup to resolve absolute paths
 * for every supported language runtime. Caches the results so executors can
 * pick up fully-qualified binary paths instead of relying on PATH alone.
 *
 * The detector also falls back to PATH lookup via `which` so it works even
 * when the binary is not at a well-known location.
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const { RUNTIMES, GLOBAL_PATH } = require('./runtimeConfig');
const logger = require('./logger');

/** @type {Object.<string, {available: boolean, path: string|null, version: string|null}>} */
const runtimeCache = {};

/**
 * Try to resolve an absolute path from a list of candidate paths.
 * Candidate values can be a string or an array of strings.
 *
 * @param {string|string[]} candidates
 * @returns {string|null}
 */
function resolveCandidates(candidates) {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  for (const p of list) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return p;
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Attempt a `which <bin>` lookup using the enriched GLOBAL_PATH.
 * Returns the trimmed absolute path string or null on failure.
 *
 * @param {string} bin
 * @returns {string|null}
 */
function whichBin(bin) {
  try {
    const result = execSync(`which ${bin}`, {
      env: { ...process.env, PATH: GLOBAL_PATH },
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 4000
    });
    const p = result.toString().trim();
    return p.length > 0 ? p : null;
  } catch (_) {
    return null;
  }
}

/**
 * Read a version string from a binary using --version / -version flags.
 *
 * @param {string} binPath  - Absolute path to the binary.
 * @param {string[]} [flags] - Version flags to try in order.
 * @returns {string|null}
 */
function readVersion(binPath, flags = ['--version', '-version']) {
  for (const flag of flags) {
    try {
      const out = execSync(`"${binPath}" ${flag} 2>&1`, {
        env: { ...process.env, PATH: GLOBAL_PATH },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 6000
      });
      const firstLine = out.toString().trim().split('\n')[0] || '';
      if (firstLine.length > 0) return firstLine;
    } catch (_) {}
  }
  return null;
}

/**
 * Resolve the absolute path for a single binary key.
 * Strategy:
 *   1. Check well-known candidate paths from RUNTIMES config.
 *   2. Fall back to `which` in the enriched GLOBAL_PATH environment.
 *
 * @param {string} binKey       - A label for logging (e.g. 'rustc', 'kotlinc').
 * @param {string|string[]} candidates
 * @returns {string|null}
 */
function resolveBin(binKey, candidates) {
  const fromCandidates = resolveCandidates(candidates);
  if (fromCandidates) return fromCandidates;

  const fromWhich = whichBin(binKey);
  return fromWhich || null;
}

/**
 * Run detection for all runtimes registered in RUNTIMES.
 * Results are stored in runtimeCache and returned.
 *
 * @returns {Object} runtimeCache snapshot
 */
function detectAll() {
  for (const [lang, cfg] of Object.entries(RUNTIMES)) {
    if (lang === 'stdbuf') {
      // Handle stdbuf separately — it's a utility, not a language
      const p = resolveBin('stdbuf', cfg.candidates);
      runtimeCache['stdbuf'] = { available: !!p, path: p, version: null };
      continue;
    }

    const entry = { available: false, path: null, version: null, compilerPath: null };

    // Determine candidates shape (flat array vs { compiler, runtime } object)
    const hasSplit = cfg.candidates && !Array.isArray(cfg.candidates) && typeof cfg.candidates === 'object';

    if (hasSplit) {
      // Resolve compiler path
      if (cfg.compilerBin && cfg.candidates.compiler) {
        const cp = resolveBin(cfg.compilerBin, cfg.candidates.compiler);
        entry.compilerPath = cp;
      }
      // Resolve runtime/interpreter path
      if (cfg.runtimeBin && cfg.candidates.runtime) {
        const rp = resolveBin(cfg.runtimeBin, cfg.candidates.runtime);
        entry.path = rp;
      }
      // Available if at least one of them is found
      entry.available = !!(entry.compilerPath || entry.path);
    } else {
      // Flat array — used for both compiler and runtime
      const bin = cfg.compilerBin || cfg.runtimeBin;
      const p = resolveBin(bin, cfg.candidates || []);
      entry.path = p;
      entry.available = !!p;
    }

    // Read version string from the most relevant binary
    const versionBin = entry.compilerPath || entry.path;
    if (versionBin) {
      entry.version = readVersion(versionBin);
    }

    runtimeCache[lang] = entry;
  }

  return runtimeCache;
}

/**
 * Get the resolved absolute path for a compiler binary.
 *
 * @param {string} lang
 * @returns {string|null}
 */
function getCompilerPath(lang) {
  const e = runtimeCache[lang];
  if (!e) return null;
  return e.compilerPath || e.path || null;
}

/**
 * Get the resolved absolute path for a runtime/interpreter binary.
 *
 * @param {string} lang
 * @returns {string|null}
 */
function getRuntimePath(lang) {
  const e = runtimeCache[lang];
  if (!e) return null;
  return e.path || null;
}

/**
 * Check whether a given runtime was detected as available.
 *
 * @param {string} lang
 * @returns {boolean}
 */
function isAvailable(lang) {
  const e = runtimeCache[lang];
  return e ? e.available : false;
}

/**
 * Return a snapshot of the full runtime cache for API exposure.
 *
 * @returns {Object}
 */
function getCache() {
  return { ...runtimeCache };
}

/**
 * Print a formatted availability table to the console at startup.
 */
function printStartupTable() {
  const lines = ['\n╔══════════════════════════════════════════════════════╗'];
  lines.push('║           Runtime Detection Results                  ║');
  lines.push('╠══════════════════════════════════════════════════════╣');

  for (const [lang, entry] of Object.entries(runtimeCache)) {
    if (lang === 'stdbuf') continue; // utility, not a language

    const cfg = RUNTIMES[lang];
    if (!cfg) continue;

    const tick   = entry.available ? '✓' : '✗';
    const color  = entry.available ? '\x1b[32m' : '\x1b[31m';
    const reset  = '\x1b[0m';
    const label  = (cfg.label || lang).padEnd(20);
    const status = entry.available
      ? `${color}${tick}${reset}  ${(entry.version || '').substring(0, 28)}`
      : `${color}${tick}${reset}  Not found — ${cfg.installHint}`;

    lines.push(`║  ${label}  ${status}`);
  }

  lines.push('╚══════════════════════════════════════════════════════╝\n');
  console.log(lines.join('\n'));
}

module.exports = {
  detectAll,
  getCompilerPath,
  getRuntimePath,
  isAvailable,
  getCache,
  printStartupTable
};
