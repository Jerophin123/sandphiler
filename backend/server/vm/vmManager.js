const config = require('../config/config');
const logger = require('../utils/logger');

class VMManager {
  constructor() {
    this.enabled = config.vm.remoteEnabled;
    this.vmPool = config.vm.pool;
    this.currentIndex = 0;

    logger.info(`VM Routing Manager Initialized`, {
      remoteEnabled: this.enabled,
      poolSize: this.vmPool.length
    });
  }

  /**
   * Selects the next available VM node using simple load or round-robin logic
   */
  selectVM() {
    if (!this.enabled || this.vmPool.length === 0) {
      return 'local';
    }

    // Round-robin selection
    const vm = this.vmPool[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.vmPool.length;
    return vm;
  }

  /**
   * Abstract layer for dispatching compile/run payload to a remote VM worker.
   * This is ready to be integrated with Axios or node-fetch.
   */
  async routeExecution(sessionId, executionPayload) {
    const targetVM = this.selectVM();

    if (targetVM === 'local') {
      logger.debug('Routing execution to local sandbox', { sessionId });
      return { local: true };
    }

    logger.info('Routing execution to remote VM', { sessionId, targetVM });
    
    // Remote payload delivery mockup (to be expanded when deploying remote workers)
    try {
      // Example implementation:
      // const response = await fetch(`${targetVM}/api/run`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(executionPayload)
      // });
      // return await response.json();
      
      throw new Error(`Remote VM worker interface at ${targetVM} not fully implemented yet.`);
    } catch (err) {
      logger.error('Failed to route execution to remote VM, falling back to local sandbox', {
        sessionId,
        targetVM,
        error: err.message
      });
      return { local: true, fallback: true };
    }
  }

  getStats() {
    return {
      remoteEnabled: this.enabled,
      vmPool: this.vmPool,
      activeRouter: this.enabled ? 'Round-Robin load router' : 'Local loopback'
    };
  }
}

module.exports = new VMManager();
