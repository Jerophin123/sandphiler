/**
 * runtimeConfig.js
 *
 * Centralized registry of all supported language runtimes.
 * Stores executable names, possible path candidates, and install hints.
 * Used by runtimeDetector.js for resolution and by executors for invocation.
 */

const os = require('os');

const HOME = process.env.HOME || os.homedir();

/**
 * Global PATH string that covers all common Ubuntu installation locations.
 * This is injected into every spawn() call to guarantee executables are found
 * even when the process was started from systemd / pm2 with a stripped PATH.
 */
const GLOBAL_PATH = [
  process.env.PATH || '',
  '/snap/bin',                         // Snap-installed binaries (kotlinc, etc.)
  `${HOME}/.cargo/bin`,               // Rust toolchain (rustc, cargo)
  '/usr/local/bin',                    // npm global installs (tsc, ts-node)
  '/usr/bin',
  '/bin',
  '/usr/local/sbin',
  '/usr/sbin',
  '/sbin'
].filter(Boolean).join(':');

/**
 * Build a fully enriched process.env for spawn() calls.
 * Merges the global PATH with any executor-specific env vars.
 *
 * @param {Object} extraEnv  - Executor-specific environment overrides.
 * @returns {Object}          - Merged environment object.
 */
function buildSpawnEnv(extraEnv = {}) {
  return {
    ...process.env,
    PATH: GLOBAL_PATH,
    HOME,
    ...extraEnv
  };
}

/**
 * Runtime descriptor table.
 *
 * Fields:
 *  - label        : Human-readable display name
 *  - compilerBin  : Primary compiler executable name (null for interpreters)
 *  - runtimeBin   : Runtime/interpreter executable name
 *  - candidates   : Ordered list of absolute paths to probe (first found wins)
 *  - installHint  : How to install on Ubuntu if missing
 */
const RUNTIMES = {
  python: {
    label: 'Python 3',
    compilerBin: null,
    runtimeBin: 'python3',
    candidates: ['/usr/bin/python3', '/usr/local/bin/python3'],
    installHint: 'sudo apt install python3'
  },

  javascript: {
    label: 'Node.js',
    compilerBin: null,
    runtimeBin: 'node',
    candidates: ['/usr/bin/node', '/usr/local/bin/node'],
    installHint: 'sudo apt install nodejs   OR   nvm install --lts'
  },

  typescript: {
    label: 'TypeScript (tsc)',
    compilerBin: 'tsc',
    runtimeBin: 'node',
    candidates: {
      compiler: [
        '/usr/local/bin/tsc',
        `${HOME}/.npm-global/bin/tsc`,
        '/usr/bin/tsc'
      ],
      runtime: ['/usr/bin/node', '/usr/local/bin/node']
    },
    installHint: 'npm install -g typescript'
  },

  c: {
    label: 'C (GCC)',
    compilerBin: 'gcc',
    runtimeBin: null,
    candidates: ['/usr/bin/gcc', '/usr/local/bin/gcc'],
    installHint: 'sudo apt install gcc'
  },

  cpp: {
    label: 'C++ (G++)',
    compilerBin: 'g++',
    runtimeBin: null,
    candidates: ['/usr/bin/g++', '/usr/local/bin/g++'],
    installHint: 'sudo apt install g++'
  },

  java: {
    label: 'Java (javac/java)',
    compilerBin: 'javac',
    runtimeBin: 'java',
    candidates: {
      compiler: ['/usr/bin/javac', '/usr/local/bin/javac'],
      runtime: ['/usr/bin/java', '/usr/local/bin/java']
    },
    installHint: 'sudo apt install default-jdk'
  },

  kotlin: {
    label: 'Kotlin (kotlinc)',
    compilerBin: 'kotlinc',
    runtimeBin: 'java',
    candidates: {
      compiler: [
        '/snap/bin/kotlinc',       // snap install --classic kotlin
        '/usr/local/bin/kotlinc',
        '/usr/bin/kotlinc'
      ],
      runtime: ['/usr/bin/java', '/usr/local/bin/java']
    },
    installHint: 'sudo snap install --classic kotlin'
  },

  rust: {
    label: 'Rust (rustc)',
    compilerBin: 'rustc',
    runtimeBin: null,
    candidates: [
      `${HOME}/.cargo/bin/rustc`,   // rustup default install
      '/usr/bin/rustc',
      '/usr/local/bin/rustc'
    ],
    installHint: 'curl https://sh.rustup.rs -sSf | sh -s -- -y'
  },

  go: {
    label: 'Go',
    compilerBin: 'go',
    runtimeBin: null,
    candidates: ['/usr/local/go/bin/go', '/usr/bin/go', '/usr/local/bin/go'],
    installHint: 'sudo apt install golang-go   OR   download from https://go.dev'
  },

  php: {
    label: 'PHP',
    compilerBin: null,
    runtimeBin: 'php',
    candidates: ['/usr/bin/php', '/usr/local/bin/php'],
    installHint: 'sudo apt install php'
  },

  ruby: {
    label: 'Ruby',
    compilerBin: null,
    runtimeBin: 'ruby',
    candidates: ['/usr/bin/ruby', '/usr/local/bin/ruby'],
    installHint: 'sudo apt install ruby'
  },

  csharp: {
    label: 'C# (Mono)',
    compilerBin: 'mcs',
    runtimeBin: 'mono',
    candidates: {
      compiler: ['/usr/bin/mcs', '/usr/local/bin/mcs'],
      runtime: ['/usr/bin/mono', '/usr/local/bin/mono']
    },
    installHint: 'sudo apt install mono-complete'
  },

  dart: {
    label: 'Dart',
    compilerBin: null,
    runtimeBin: 'dart',
    candidates: [
      '/usr/bin/dart',
      '/usr/local/bin/dart',
      '/usr/lib/dart/bin/dart',
      '/snap/bin/dart'
    ],
    installHint: 'sudo snap install dart --classic'
  },

  bash: {
    label: 'Bash',
    compilerBin: null,
    runtimeBin: 'bash',
    candidates: ['/bin/bash', '/usr/bin/bash'],
    installHint: 'sudo apt install bash'
  },

  mysql: {
    label: 'MySQL',
    compilerBin: null,
    runtimeBin: 'mysql',
    candidates: ['/usr/bin/mysql', '/usr/local/bin/mysql'],
    installHint: 'sudo apt install mysql-server'
  },

  r: {
    label: 'R',
    compilerBin: null,
    runtimeBin: 'Rscript',
    candidates: ['/usr/bin/Rscript', '/usr/local/bin/Rscript'],
    installHint: 'sudo apt install r-base'
  },

  stdbuf: {
    label: 'stdbuf (output unbuffering)',
    compilerBin: null,
    runtimeBin: 'stdbuf',
    candidates: ['/usr/bin/stdbuf', '/usr/local/bin/stdbuf'],
    installHint: 'sudo apt install coreutils'
  }
};

module.exports = {
  GLOBAL_PATH,
  buildSpawnEnv,
  RUNTIMES
};
