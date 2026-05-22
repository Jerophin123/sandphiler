const config = require('../config/config');
const logger = require('../utils/logger');

class QueueManager {
  constructor() {
    this.queue = []; // Array of { sessionId, taskFn, priority, enqueuedAt, resolve, reject }
    this.activeExecutions = new Map(); // sessionId -> executionDetails
    this.maxConcurrent = config.queue.maxConcurrent;
    this.queueTimeoutMs = config.queue.timeoutMs;

    logger.info(`Queue Manager Initialized`, { maxConcurrent: this.maxConcurrent, timeoutMs: this.queueTimeoutMs });
  }

  /**
   * Enqueues an execution task
   * @param {string} sessionId Unique session ID
   * @param {Function} taskFn Function returning a promise that starts the execution
   * @param {string} priority 'high' | 'normal' | 'low'
   */
  enqueue(sessionId, taskFn, priority = 'normal') {
    return new Promise((resolve, reject) => {
      // Check if session is already running or queued
      if (this.activeExecutions.has(sessionId) || this.queue.some(item => item.sessionId === sessionId)) {
        return reject(new Error(`Session ${sessionId} is already active or in queue`));
      }

      const enqueuedAt = Date.now();
      const queueItem = { sessionId, taskFn, priority, enqueuedAt, resolve, reject };

      // Insert based on priority
      if (priority === 'high') {
        // Insert after existing high priority items
        const lastHighIndex = this.queue.findLastIndex(item => item.priority === 'high');
        if (lastHighIndex === -1) {
          this.queue.unshift(queueItem);
        } else {
          this.queue.splice(lastHighIndex + 1, 0, queueItem);
        }
      } else if (priority === 'low') {
        this.queue.push(queueItem);
      } else {
        // 'normal' priority
        // Insert before low priority items, but after other normal items
        const firstLowIndex = this.queue.findIndex(item => item.priority === 'low');
        if (firstLowIndex === -1) {
          this.queue.push(queueItem);
        } else {
          this.queue.splice(firstLowIndex, 0, queueItem);
        }
      }

      logger.execution(`Task Enqueued`, { sessionId, priority, queueSize: this.queue.length });
      
      // Set a timeout for queue wait time
      setTimeout(() => {
        this._handleQueueTimeout(sessionId);
      }, this.queueTimeoutMs);

      // Trigger scheduler
      this.processNext();
    });
  }

  /**
   * Schedules next execution if slots are available
   */
  processNext() {
    if (this.activeExecutions.size >= this.maxConcurrent) {
      logger.debug('Queue capacity reached. Execution deferred.', {
        active: this.activeExecutions.size,
        queued: this.queue.length
      });
      return;
    }

    if (this.queue.length === 0) return;

    const nextItem = this.queue.shift();
    const { sessionId, taskFn, resolve, reject, enqueuedAt } = nextItem;
    const waitTime = Date.now() - enqueuedAt;

    logger.execution(`Dispatching Task from Queue`, { sessionId, waitTimeMs: waitTime });

    this.activeExecutions.set(sessionId, {
      startedAt: Date.now(),
      enqueuedAt
    });

    // Execute the task
    taskFn()
      .then((result) => {
        this.release(sessionId);
        resolve(result);
      })
      .catch((err) => {
        this.release(sessionId);
        reject(err);
      });

    // Run again in case there are more open slots
    this.processNext();
  }

  /**
   * Release execution slot
   */
  release(sessionId) {
    if (this.activeExecutions.delete(sessionId)) {
      logger.execution(`Execution Slot Released`, { sessionId, activeCount: this.activeExecutions.size });
      // Schedule next item
      setImmediate(() => this.processNext());
    }
  }

  /**
   * Handles items waiting too long in the queue
   */
  _handleQueueTimeout(sessionId) {
    const index = this.queue.findIndex(item => item.sessionId === sessionId);
    if (index !== -1) {
      const [timedOutItem] = this.queue.splice(index, 1);
      logger.execution(`Queue Wait Timeout`, { sessionId });
      timedOutItem.reject(new Error(`Queue wait timeout exceeded (${this.queueTimeoutMs}ms)`));
    }
  }

  /**
   * Force removes a session from queue
   */
  removeFromQueue(sessionId) {
    const index = this.queue.findIndex(item => item.sessionId === sessionId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      logger.execution(`Removed manually from queue`, { sessionId });
      return true;
    }
    return false;
  }

  getStats() {
    return {
      activeCount: this.activeExecutions.size,
      queuedCount: this.queue.length,
      maxConcurrent: this.maxConcurrent
    };
  }
}

// Singleton Queue Manager
module.exports = new QueueManager();
