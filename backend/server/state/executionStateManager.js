const logger = require('../utils/logger');

const VALID_STATES = new Set([
  'queued',
  'preparing',
  'compiling',
  'running',
  'completed',
  'timeout',
  'killed',
  'crashed',
  'cleanup'
]);

class ExecutionStateManager {
  constructor(sessionId, onStateChangeCallback) {
    this.sessionId = sessionId;
    this.state = 'queued';
    this.history = [];
    this.timestamps = {
      queued: Date.now()
    };
    this.onStateChange = onStateChangeCallback;
    this.error = null;
    
    logger.debug(`Execution State Created`, { sessionId: this.sessionId, state: this.state });
  }

  transitionTo(newState, meta = {}) {
    if (!VALID_STATES.has(newState)) {
      throw new Error(`Invalid state transition requested: ${newState}`);
    }

    const previousState = this.state;
    this.state = newState;
    this.timestamps[newState] = Date.now();
    
    const entry = {
      from: previousState,
      to: newState,
      timestamp: this.timestamps[newState],
      meta
    };
    this.history.push(entry);

    logger.execution(`State Transition`, {
      sessionId: this.sessionId,
      from: previousState,
      to: newState,
      durationMs: this.timestamps[newState] - this.timestamps[previousState],
      ...meta
    });

    if (meta.error) {
      this.error = meta.error;
    }

    if (this.onStateChange) {
      try {
        this.onStateChange(this.sessionId, newState, entry);
      } catch (err) {
        logger.error('Error executing state change callback', { sessionId: this.sessionId, error: err.message });
      }
    }
  }

  getState() {
    return this.state;
  }

  getTimestamps() {
    return this.timestamps;
  }

  getHistory() {
    return this.history;
  }

  getDuration() {
    const endState = this.timestamps['completed'] || 
                     this.timestamps['timeout'] || 
                     this.timestamps['killed'] || 
                     this.timestamps['crashed'] || 
                     Date.now();
    return endState - this.timestamps.queued;
  }
}

module.exports = ExecutionStateManager;
