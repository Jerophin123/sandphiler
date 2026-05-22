'use strict';

const express = require('express');
const crypto = require('crypto');
const executionManager = require('../services/executionManager');
const processManager = require('../services/processManager');
const queueManager = require('../queue/queueManager');
const monitoringService = require('../monitoring/monitoringService');
const runtimeDetector = require('../utils/runtimeDetector');
const { RUNTIMES } = require('../utils/runtimeConfig');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/languages
 *
 * Returns the list of supported languages with real-time runtime availability,
 * resolved binary paths, and version strings.
 *
 * Frontend can use this to grey out unavailable runtimes and show install hints.
 */
router.get('/languages', (req, res) => {
  const cache = runtimeDetector.getCache();

  const languages = executionManager.supportedLanguages.map((lang) => {
    const entry  = cache[lang] || {};
    const config = RUNTIMES[lang] || {};

    return {
      language:     lang,
      label:        config.label || lang,
      available:    entry.available || false,
      version:      entry.version  || null,
      compilerPath: entry.compilerPath || null,
      runtimePath:  entry.path || null,
      installHint:  entry.available ? null : (config.installHint || null)
    };
  });

  res.json({ languages });
});

/**
 * POST /api/run
 * Non-interactive execution REST entrypoint.
 * Enqueues compile/run task and awaits completion, then responds with captured logs.
 */
router.post('/run', async (req, res) => {
  const { files, mainFilename, language, profile, priority } = req.body;
  const sessionId = req.body.sessionId || crypto.randomUUID();

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Source files array is required' });
  }

  // Reject requests for unavailable runtimes early with a useful message
  if (language) {
    const langKey = language.toLowerCase();
    const cache = runtimeDetector.getCache();
    const entry = cache[langKey];
    if (entry && !entry.available) {
      const cfg = RUNTIMES[langKey] || {};
      return res.status(422).json({
        sessionId,
        success: false,
        error: `Runtime '${langKey}' is not installed on this server. ` +
               `Install with: ${cfg.installHint || 'see server documentation'}`
      });
    }
  }

  logger.info('Received REST run request', { sessionId, language, filesCount: files.length });

  let stdoutBuffer = '';
  let stderrBuffer = '';
  let compileOutput = '';

  const runTask = () => {
    return executionManager.executeCode({
      sessionId,
      files,
      mainFilename,
      language,
      profile,
      callbacks: {
        onCompileOutput: (data) => { compileOutput += data; },
        onStdout:        (data) => { stdoutBuffer  += data; },
        onStderr:        (data) => { stderrBuffer  += data; },
        onExit: (code, signal) => {
          logger.info('REST process complete', { sessionId, code, signal });
        }
      }
    });
  };

  try {
    const executionResult = await queueManager.enqueue(sessionId, runTask, priority);

    if (!executionResult.success) {
      return res.status(400).json({
        sessionId,
        success: false,
        phase: executionResult.phase,
        compileOutput,
        error: executionResult.error || 'Execution failed'
      });
    }

    const stateManager = executionResult.stateManager;

    const checkCompletion = setInterval(() => {
      const state = stateManager.getState();
      const finishedStates = ['completed', 'timeout', 'killed', 'crashed'];

      if (finishedStates.includes(state)) {
        clearInterval(checkCompletion);
        res.json({
          sessionId,
          success: state === 'completed',
          state,
          durationMs:    stateManager.getDuration(),
          compileOutput,
          stdout:        stdoutBuffer,
          stderr:        stderrBuffer,
          error:         stateManager.error || null
        });
      }
    }, 50);

  } catch (err) {
    logger.error('Error queuing/executing REST task', { sessionId, error: err.message });
    res.status(500).json({ sessionId, success: false, error: err.message });
  }
});

/**
 * POST /api/stop
 * Terminates an active execution process
 */
router.post('/stop', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const killed = processManager.killProcess(sessionId, 'SIGKILL');
  if (killed) {
    res.json({ sessionId, status: 'termination_signal_sent' });
  } else {
    const removed = queueManager.removeFromQueue(sessionId);
    if (removed) {
      res.json({ sessionId, status: 'removed_from_queue' });
    } else {
      res.status(404).json({ sessionId, error: 'Active process or queued session not found' });
    }
  }
});

/**
 * GET /api/stats
 * Health checks, active session profiles, queue states, and load metrics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await monitoringService.getSystemMetrics();
    res.json(stats);
  } catch (err) {
    logger.error('Failed to retrieve system statistics', { error: err.message });
    res.status(500).json({ error: 'Internal system metrics failure' });
  }
});

module.exports = router;
