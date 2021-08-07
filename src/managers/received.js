const _ = require('lodash');

function ReceivedCallsManager(intialStore = {}) {
  const store = _.cloneDeep(intialStore);

  // catch all (similar to 404 not found handler)
  store['*'] = (payload, { callError }) => {
    callError('NotImplemented', "Action isn't supported yet");
  };

  function add(action, handler) {
    store[action] = _.isFunction(handler) ? handler : _.noop;
  }

  function remove(action) {
    store[action] = _.noop;
  }

  function execute(action, ...args) {
    const handler = _.isFunction(store[action]) ? store[action] : store['*'];
    return handler(...args);
  }

  return { add, remove, execute };
}

module.exports = ReceivedCallsManager;
