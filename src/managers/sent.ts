import _ from 'lodash';

function SentCallsManager(intialStore = {}) {
  const store = _.cloneDeep(intialStore);

  function add(id: string, onSuccess: Function, onFailure: Function) {
    store[id] = { onSuccess, onFailure };
  }

  function remove(id: string) {
    delete store[id];
  }

  function success(id: string, ...args) {
    const output = _.invoke(store, `${id}.onSuccess`, ...args);
    remove(id);
    return output;
  }

  function failure(id: string, ...args) {
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
