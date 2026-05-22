'use strict';

const BaseExecutor = require('./baseExecutor');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class PhpExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
  }

  getExecuteCommand() {
    const phpPath = runtimeDetector.getRuntimePath('php') || 'php';
    // Use PHP's built-in implicit_flush and output_buffering=0 for real-time streaming.
    // stdbuf is not needed here as PHP's own flags handle line-flushing correctly.
    return {
      command: phpPath,
      args: [
        '-d', 'implicit_flush=On',
        '-d', 'output_buffering=0',
        this.mainFile
      ],
      env: buildSpawnEnv()
    };
  }
}

module.exports = PhpExecutor;
