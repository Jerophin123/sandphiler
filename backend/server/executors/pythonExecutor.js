'use strict';

const BaseExecutor = require('./baseExecutor');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class PythonExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
  }

  getExecuteCommand() {
    const python3Path = runtimeDetector.getRuntimePath('python') || 'python3';
    return {
      command: python3Path,
      // -u: force unbuffered binary stdout/stderr for real-time streaming
      args: ['-u', this.mainFile],
      env: buildSpawnEnv({
        PYTHONUNBUFFERED: '1',
        PYTHONDONTWRITEBYTECODE: '1'
      })
    };
  }
}

module.exports = PythonExecutor;
