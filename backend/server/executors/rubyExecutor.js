'use strict';

const BaseExecutor = require('./baseExecutor');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class RubyExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
  }

  getExecuteCommand() {
    // Resolve ruby absolute path
    const rubyPath = runtimeDetector.getRuntimePath('ruby') || 'ruby';

    // NOTE: The --sync flag is NOT a valid Ruby CLI option and causes:
    //   "ruby: invalid option --sync (-h will show valid options)"
    // Output flushing is handled by stdbuf wrapping (see below).
    //
    // Correct invocation: stdbuf -oL -eL ruby main.rb
    const stdbufPath = runtimeDetector.getRuntimePath('stdbuf') || 'stdbuf';

    return {
      command: stdbufPath,
      args: ['-oL', '-eL', rubyPath, this.mainFile],
      env: buildSpawnEnv({
        // Force Ruby to use UTF-8 for stdin/stdout/stderr
        RUBYOPT: '-W0',
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8'
      })
    };
  }
}

module.exports = RubyExecutor;
