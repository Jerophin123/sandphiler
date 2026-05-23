'use strict';

const BaseExecutor = require('./baseExecutor');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class RExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
  }

  getExecuteCommand() {
    const rscriptPath = runtimeDetector.getRuntimePath('r') || 'Rscript';
    return {
      command: rscriptPath,
      args: [this.mainFile],
      env: buildSpawnEnv()
    };
  }
}

module.exports = RExecutor;
