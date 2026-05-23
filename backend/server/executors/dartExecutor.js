'use strict';

const BaseExecutor = require('./baseExecutor');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class DartExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
  }

  getExecuteCommand() {
    const dartPath = runtimeDetector.getRuntimePath('dart') || 'dart';
    return {
      command: dartPath,
      args: [this.mainFile],
      env: buildSpawnEnv()
    };
  }
}

module.exports = DartExecutor;
