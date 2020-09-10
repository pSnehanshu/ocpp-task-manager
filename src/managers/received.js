const _ = require('lodash');

function ReceivedCallsManager(intialStore = {}) {
  const store = _.cloneDeep(intialStore);

  function add(action, handler) {
    store[action] = _.isFunction(handler) ? handler : _.noop;
  }

  function remove(action) {
    store[action] = _.noop;
  }

  function execute(action, ...args) {
    return _.invoke(store, action, ...args);
  }

  return { add, remove, execute };
}

module.exports = ReceivedCallsManager;
