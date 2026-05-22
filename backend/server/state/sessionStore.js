const logger = require('../utils/logger');

// Maps sessionId -> SessionData
// SessionData: {
//   sessionId: string,
//   childProcess: ChildProcess,
//   stateManager: ExecutionStateManager,
//   socketId: string,              // Currently connected socket client
//   disconnectedAt: number|null,   // Timestamp for reconnect grace period
//   stdinHistory: Array<string>,
//   outputHistory: Array<{type: 'stdout'|'stderr', text: string, time: number}>,
//   language: string,
//   profileName: string,
//   sandboxDir: string,
//   lastActivity: number
// }
const activeSessions = new Map();

function createSession(sessionId, details) {
  const session = {
    sessionId,
    childProcess: details.childProcess || null,
    stateManager: details.stateManager || null,
    socketId: details.socketId || null,
    disconnectedAt: null,
    stdinHistory: [],
    outputHistory: [],
    language: details.language || '',
    profileName: details.profileName || '',
    sandboxDir: details.sandboxDir || '',
    lastActivity: Date.now()
  };
  activeSessions.set(sessionId, session);
  logger.info(`Session registered in store`, { sessionId });
  return session;
}

function getSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
  }
  return session;
}

function updateSession(sessionId, updates) {
  const session = activeSessions.get(sessionId);
  if (session) {
    Object.assign(session, updates);
    session.lastActivity = Date.now();
    activeSessions.set(sessionId, session);
    return session;
  }
  return null;
}

function removeSession(sessionId) {
  const deleted = activeSessions.delete(sessionId);
  if (deleted) {
    logger.info(`Session removed from store`, { sessionId });
  }
  return deleted;
}

function listSessions() {
  return Array.from(activeSessions.values());
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  removeSession,
  listSessions,
  activeSessions
};
