'use strict';

const BaseExecutor = require('./baseExecutor');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class BashExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
  }

  getExecuteCommand() {
    const bashPath = runtimeDetector.getRuntimePath('bash') || 'bash';
    return {
      command: bashPath,
      args: [this.mainFile],
      env: buildSpawnEnv()
    };
  }
}

module.exports = BashExecutor;
