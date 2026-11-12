const { AgentInputQueue } = require('./AgentInputQueue.cjs');
let queue = new AgentInputQueue();
module.exports = {
  configure(directory) { queue = new AgentInputQueue(directory); },
  get queue() { return queue; },
};
