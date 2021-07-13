const _ = require('lodash');

function SentCallsManager(intialStore = {}) {
  const store = _.cloneDeep(intialStore);

  function add(id, onSuccess, onFailure) {
    store[id] = { onSuccess, onFailure };
  }

  function remove(id) {
    delete store[id];
  }

  function success(id, ...args) {
    const output = _.invoke(store, `${id}.onSuccess`, ...args);
    remove(id);
    return output;
  }

  function failure(id, ...args) {
    const output = _.invoke(store, `${id}.onFailure`, ...args);
    remove(id);
    return output;
  }

  return {
    add,
    remove,
    success,
    failure,
  };
}

module.exports = SentCallsManager;
