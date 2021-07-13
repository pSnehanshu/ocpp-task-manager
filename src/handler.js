const _ = require('lodash');

/**
 * This function returns the actual received  OCPP messages handler.
 * @param {Function} parser OCPP message parser function
 * @param {Object} sentCallsHandler It should have properties `success` and `error`, both functions
 * @param {Function} callHandler A function that handles received CALLS
 * @param {Function} sender A function that can send OCPP messages
 * @param {Object} builders It should have properties `callResult` and `callError`, both functions
 * @returns A handler function
 */
function MessageHandler(
  parser,
  sentCallsHandler,
  callHandler,
  sender,
  builders,
) {
  /**
   * Handler function that returns a thunk
   * @param {String} message The OCPP message received
   * @returns Thunk that when executed performs the actual task
   */
  return function handler(message) {
    const parsed = parser(message);
    switch (parsed.type) {
      case 'CALL':
        return () =>
          callHandler(parsed.action, parsed.payload, {
            callResult(payload) {
              // Send response using the sender
              const message2send = _.invoke(
                builders,
                'callResult',
                parsed.id,
                payload,
              );
              if (!_.isUndefined(message2send)) {
                sender(message2send.message);
              }
            },
            callError(code, description, details) {
              // Send response using the sender
              const message2send = _.invoke(
                builders,
                'callError',
                parsed.id,
                code,
                description,
                details,
              );
              if (!_.isUndefined(message2send)) {
                sender(message2send.message);
              }
            },
          });
      case 'CALLRESULT':
        return () => sentCallsHandler.success(parsed.id, parsed.payload);
      case 'CALLERROR':
        return () => sentCallsHandler.failure(parsed.id, parsed.payload);
      default:
        // ignore
        return _.noop;
    }
  };
}

module.exports = MessageHandler;
