const call = require('./call');
const callResult = require('./callResult');
const callError = require('./callError');

function builder(version, uniqueIdGenerator) {
  return {
    call(action, payload) {
      return call(version, action, payload, uniqueIdGenerator);
    },
    callResult(id, payload) {
      return callResult(version, id, payload);
    },
    callError(id, errorCode, errorDescription, errorDetails) {
      return callError(version, id, errorCode, errorDescription, errorDetails);
    },
  };
}

module.exports = builder;
