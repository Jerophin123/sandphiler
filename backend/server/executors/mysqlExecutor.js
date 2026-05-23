'use strict';

const fs = require('fs');
const path = require('path');
const BaseExecutor = require('./baseExecutor');
const runtimeDetector = require('../utils/runtimeDetector');
const { buildSpawnEnv } = require('../utils/runtimeConfig');

class MySqlExecutor extends BaseExecutor {
  constructor(sessionId, language, profile) {
    super(sessionId, language, profile);
  }

  async prepare(files, mainFilename) {
    // 1. Proactively load the runSql.js runner code from local directory
    // This is injected into the files array so that super.prepare() writes it 
    // atomically during sandbox directory creation. This avoids permission clashes 
    // after the directory is locked down to 755.
    try {
      const runSqlSrc = path.join(__dirname, 'runSql.js');
      const runSqlCode = fs.readFileSync(runSqlSrc, 'utf8');

      const enrichedFiles = [
        ...files,
        { name: 'runSql.js', content: runSqlCode }
      ];

      // 2. Run standard file prep (creates sandbox directory, writes all files, and locks down permissions)
      await super.prepare(enrichedFiles, mainFilename);
    } catch (err) {
      throw new Error(`MySQL Sandboxed Environment Setup failed: ${err.message}`);
    }
  }

  getExecuteCommand() {
    const nodePath = runtimeDetector.getRuntimePath('javascript') || 'node';
    const runSqlDest = path.join(this.sandboxDir, 'runSql.js');

    // Run the helper inside secure sandbox:  node runSql.js <mainFile>
    return {
      command: nodePath,
      args: [runSqlDest, this.mainFile],
      env: buildSpawnEnv({
        MYSQL_HOST: process.env.MYSQL_HOST || 'localhost',
        MYSQL_PORT: process.env.MYSQL_PORT || '3306',
        MYSQL_USER: process.env.MYSQL_USER || 'sql_sandbox',
        MYSQL_PASSWORD: process.env.MYSQL_PASSWORD || '1168mysql'
      })
    };
  }
}

module.exports = MySqlExecutor;
