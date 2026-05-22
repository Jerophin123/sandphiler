const crypto = require('crypto');
const executionManager = require('../services/executionManager');
const processManager = require('../services/processManager');
const queueManager = require('../queue/queueManager');
const sessionStore = require('../state/sessionStore');
const logger = require('../utils/logger');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.info(`Socket client connected`, { socketId: socket.id });

    let currentSessionId = null;

    // Heartbeat ping-pong
    socket.on('ping', () => {
      socket.emit('pong');
    });

    /**
     * Start execution or reconnect to a running session
     */
    socket.on('execute', async (payload) => {
      const { files, mainFilename, language, profile, priority } = payload;
      
      // Allow client to pass existing sessionId for reconnecting, or create a new one
      const sessionId = payload.sessionId || crypto.randomUUID();
      currentSessionId = sessionId;

      logger.info('Socket execution command received', { sessionId, socketId: socket.id });

      // 1. Check if session already exists (reconnect attempt)
      const existingSession = sessionStore.getSession(sessionId);
      if (existingSession) {
        logger.info('Reconnecting client to active execution session', { sessionId, socketId: socket.id });
        
        // Update session's socket connection reference
        sessionStore.updateSession(sessionId, {
          socketId: socket.id,
          disconnectedAt: null
        });

        // Send execution sync parameters
        socket.emit('execution_sync', {
          sessionId,
          state: existingSession.stateManager.getState(),
          language: existingSession.language,
          profileName: existingSession.profileName
        });

        // Replay history logs (synchronize terminal view)
        existingSession.outputHistory.forEach((log) => {
          socket.emit(log.type === 'stdout' ? 'stdout' : 'stderr', log.text);
        });

        return;
      }

      // 2. New execution: register session state in store
      const sessionData = sessionStore.createSession(sessionId, {
        socketId: socket.id,
        language: language || 'unknown',
        profileName: profile || 'interactive-terminal'
      });

      // Emitted when task starts executing
      const startExecutionTask = () => {
        socket.emit('state_change', { state: 'preparing' });
        
        return executionManager.executeCode({
          sessionId,
          files,
          mainFilename,
          language,
          profile,
          callbacks: {
            onSpawn: (child, stateMgr, sandboxDir) => {
              sessionStore.updateSession(sessionId, {
                childProcess: child,
                stateManager: stateMgr,
                sandboxDir
              });
            },
            onStateChange: (sid, state, meta) => {
              socket.emit('state_change', { state, ...meta });
            },
            onCompileOutput: (output) => {
              socket.emit('compile_output', output);
            },
            onStdout: (data) => {
              // Log history for reconnects
              sessionData.outputHistory.push({ type: 'stdout', text: data, time: Date.now() });
              socket.emit('stdout', data);
            },
            onStderr: (data) => {
              // Log history for reconnects
              sessionData.outputHistory.push({ type: 'stderr', text: data, time: Date.now() });
              socket.emit('stderr', data);
            },
            onExit: (code, signal) => {
              socket.emit('exit', { code, signal });
              // Clear process trackers from memory immediately.
              // Note: sandbox directory cleanup is handled inside executionManager.js exit callback
              sessionStore.removeSession(sessionId);
            }
          }
        }).then((execResult) => {
          if (execResult.success) {
            return execResult;
          } else {
            // Initiate phase error
            socket.emit('execution_error', execResult.error);
            sessionStore.removeSession(sessionId);
            throw new Error(execResult.error);
          }
        });
      };

      try {
        socket.emit('state_change', { state: 'queued' });
        // Enqueue compilation and execution in FIFO scheduler
        await queueManager.enqueue(sessionId, startExecutionTask, priority);
      } catch (err) {
        logger.error('Failed to queue WebSocket execution task', { sessionId, error: err.message });
        socket.emit('execution_error', `Queue/Execution error: ${err.message}`);
        sessionStore.removeSession(sessionId);
      }
    });

    /**
     * Standard input forwarding (stdin)
     */
    socket.on('stdin', (data) => {
      if (!currentSessionId) return;

      const session = sessionStore.getSession(currentSessionId);
      if (session && session.childProcess && session.childProcess.stdin && session.childProcess.stdin.writable) {
        // Record stdin history for analytics/replay
        session.stdinHistory.push(data);
        session.childProcess.stdin.write(data);
      } else {
        socket.emit('stderr', '\n[System Error: No active process receiving stdin]\n');
      }
    });

    /**
     * Interruption Handling (Ctrl+C trigger / SIGINT signal)
     */
    socket.on('kill', (signal = 'SIGINT') => {
      if (!currentSessionId) return;
      logger.info('Execution kill requested via socket', { sessionId: currentSessionId, signal });
      processManager.killProcess(currentSessionId, signal);
    });

    /**
     * Pseudo-terminal Resize Stub
     */
    socket.on('resize', (dimensions) => {
      if (!currentSessionId) return;
      const { cols, rows } = dimensions;
      logger.info('Terminal resize received (stubbed)', { sessionId: currentSessionId, cols, rows });
      socket.emit('resize_ack', { cols, rows });
    });

    /**
     * Handle client WebSocket disconnect
     */
    socket.on('disconnect', () => {
      logger.info(`Socket client disconnected`, { socketId: socket.id });
      
      if (currentSessionId) {
        const session = sessionStore.getSession(currentSessionId);
        if (session) {
          logger.info(`Detaching socket reference, keeping session alive for grace period`, { sessionId: currentSessionId });
          // Clear socket reference, and record disconnect timestamp
          sessionStore.updateSession(currentSessionId, {
            socketId: null,
            disconnectedAt: Date.now()
          });
        }
      }
    });
  });
}

module.exports = registerSocketHandlers;
