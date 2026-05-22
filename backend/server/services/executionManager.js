const PythonExecutor = require('../executors/pythonExecutor');
const CExecutor = require('../executors/cExecutor');
const CppExecutor = require('../executors/cppExecutor');
const JavaExecutor = require('../executors/javaExecutor');
const NodeExecutor = require('../executors/nodeExecutor');
const TypeScriptExecutor = require('../executors/typescriptExecutor');
const GoExecutor = require('../executors/goExecutor');
const RustExecutor = require('../executors/rustExecutor');
const PhpExecutor = require('../executors/phpExecutor');
const RubyExecutor = require('../executors/rubyExecutor');
const KotlinExecutor = require('../executors/kotlinExecutor');
const CSharpExecutor = require('../executors/csharpExecutor');

const logger = require('../utils/logger');
const security = require('../utils/security');
const profiles = require('../config/profiles');
const languageDetector = require('../utils/languageDetector');
const ExecutionStateManager = require('../state/executionStateManager');
const processManager = require('./processManager');

const EXECUTOR_MAP = {
  python: PythonExecutor,
  c: CExecutor,
  cpp: CppExecutor,
  java: JavaExecutor,
  javascript: NodeExecutor,
  typescript: TypeScriptExecutor,
  go: GoExecutor,
  rust: RustExecutor,
  php: PhpExecutor,
  ruby: RubyExecutor,
  kotlin: KotlinExecutor,
  csharp: CSharpExecutor
};

/**
 * Creates and returns the appropriate language executor instance
 */
function createExecutor(sessionId, language, profileName) {
  const ExecutorClass = EXECUTOR_MAP[language.toLowerCase()];
  if (!ExecutorClass) {
    throw new Error(`Unsupported language: ${language}`);
  }
  
  const profile = profiles.getProfile(profileName);
  return new ExecutorClass(sessionId, language, profile);
}

/**
 * Orchestrates code preparation, caching check, compilation, and execution.
 * @param {Object} params Execution parameters
 * @param {string} params.sessionId Unique execution ID
 * @param {string} [params.language] Target language
 * @param {Array<{name: string, content: string}>} params.files Array of files
 * @param {string} [params.mainFilename] Entry file
 * @param {string} [params.profile] Resource profile name
 * @param {Object} [params.callbacks] Execution state/data callbacks
 */
async function executeCode(params) {
  const { sessionId, files, mainFilename, callbacks } = params;
  let { language, profile } = params;

  // 1. Initialize State Machine
  const stateManager = new ExecutionStateManager(sessionId, callbacks?.onStateChange);
  
  try {
    // 2. Auto-detect language if missing
    if (!language) {
      const mainName = mainFilename || (files && files[0]?.name);
      const codeSnippet = files && files[0]?.content;
      language = languageDetector.detectLanguage(mainName, codeSnippet);
      
      if (!language) {
        throw new Error('Could not auto-detect language. Please specify language explicitly.');
      }
      logger.info('Auto-detected language', { sessionId, language });
    }

    if (!EXECUTOR_MAP[language.toLowerCase()]) {
      throw new Error(`Language '${language}' is not supported.`);
    }

    stateManager.transitionTo('preparing');

    // 3. Resolve execution profile
    profile = profile || 'interactive-terminal';
    const resolvedProfile = profiles.getProfile(profile);

    // 4. Instantiate language executor
    const executor = createExecutor(sessionId, language, profile);
    
    // Prepare directory and write source files
    await executor.prepare(files, mainFilename);

    // 5. Run compilation (if needed)
    stateManager.transitionTo('compiling');
    const compileResult = await executor.compile();
    
    if (callbacks?.onCompileOutput) {
      callbacks.onCompileOutput(compileResult.output);
    }

    if (!compileResult.success) {
      stateManager.transitionTo('crashed', { error: 'Compilation Failed' });
      await executor.cleanup();
      return { success: false, phase: 'compilation', output: compileResult.output };
    }

    // 6. Spawn running process using processManager
    stateManager.transitionTo('running');
    
    const execDetails = executor.getExecuteCommand();
    
    const spawnOptions = {
      sessionId,
      command: execDetails.command,
      args: execDetails.args,
      env: execDetails.env || {},
      profile: resolvedProfile,
      sandboxDir: executor.sandboxDir,
      stateManager,
      callbacks: {
        onSpawn: (child) => {
          if (callbacks?.onSpawn) {
            callbacks.onSpawn(child, stateManager, executor.sandboxDir);
          }
        },
        onStdout: callbacks?.onStdout,
        onStderr: callbacks?.onStderr,
        onExit: async (code, signal) => {
          // Cleanup sandbox folders after process exit
          await executor.cleanup();
          if (callbacks?.onExit) {
            callbacks.onExit(code, signal);
          }
        }
      }
    };

    const child = await processManager.spawnSecureProcess(spawnOptions);
    
    return {
      success: true,
      phase: 'execution',
      childProcess: child,
      sandboxDir: executor.sandboxDir,
      stateManager
    };

  } catch (err) {
    logger.error('Execution initiation failed', { sessionId, error: err.message });
    stateManager.transitionTo('crashed', { error: err.message });
    return { success: false, phase: 'initiation', error: err.message };
  }
}

module.exports = {
  executeCode,
  createExecutor,
  supportedLanguages: Object.keys(EXECUTOR_MAP)
};
