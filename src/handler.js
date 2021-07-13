const _ = require('lodash');

/**
 * This function returns the actual received  OCPP messages handler.
 * @param {Function} parser OCPP message parser function
 * @param {Object} sentCallsHandler It should have properties `success` and `error`, both functions
 * @param {Function} callHandler A function that handles received CALLS
 * @param {Function} sender A function that can send OCPP messages
 * @param {Object} builders It should have properties `callResult` and `callError`, both functions
 * @param {Hooks} hooks Instance of the Hooks class
 * @returns A handler function
 */
function MessageHandler(
  parser,
  sentCallsHandler,
  callHandler,
  sender,
  builders,
  hooks,
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
        return () => {
          const callResult = payload => {
            // Send response using the sender
            const message2send = _.invoke(
              builders,
              'callResult',
              parsed.id,
              payload,
            );
            hooks.execute(
              'sendCallRespond',
              () => {
                if (!_.isUndefined(message2send)) {
                  sender(message2send.message);
                }
              },
              { message2send },
            );
          };

          const callError = (code, description, details) => {
            // Send response using the sender
            const message2send = _.invoke(
              builders,
              'callError',
              parsed.id,
              code,
              description,
              details,
            );

            hooks.execute(
              'sendCallError',
              () => {
                if (!_.isUndefined(message2send)) {
                  sender(message2send.message);
                }
              },
              { message2send },
            );
          };

          return hooks.execute(
            'executeCallHandler',
            () =>
              callHandler(parsed.action, parsed.payload, {
                callResult,
                callError,
              }),
            {
              msg: parsed,
              res: {
                success: callResult,
                error: callError,
              },
            },
          );
        };

      case 'CALLRESULT':
        return () =>
          hooks.execute(
            'executeCallResultHandler',
            () => sentCallsHandler.success(parsed.id, parsed.payload),
            { msg: parsed },
          );
      case 'CALLERROR':
        return () =>
          hooks.execute(
            'executeCallErrorHandler',
            () => sentCallsHandler.failure(parsed.id, parsed.payload),
            { msg: parsed },
          );
      default:
        // ignore
        return _.noop;
    }
  };
}

module.exports = MessageHandler;
