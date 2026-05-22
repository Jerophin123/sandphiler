'use strict';

const BaseExecutor = require('./baseExecutor');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class NodeExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
  }

  getExecuteCommand() {
    const nodePath = runtimeDetector.getRuntimePath('javascript') || 'node';
    return {
      command: nodePath,
      args: [this.mainFile],
      env: buildSpawnEnv({ NODE_ENV: 'sandbox' })
    };
  }
}

module.exports = NodeExecutor;
