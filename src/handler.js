const _ = require('lodash');

function MessageHandler(parser, sentCallsHandler, callHandler, sender, builders) {
  return (message) => {
    const parsed = parser(message);
    switch (parsed.type) {
      case 'CALL':
        callHandler(parsed.action, parsed.payload, {
          callResult(payload) {
            // Send response using the sender
            const message2send = _.invoke(builders, 'callResult', parsed.id, payload);
            if (!_.isUndefined(message2send)) {
              sender(message2send);
            }
          },
          callError(code, description, details) {
            // Send response using the sender
            const message2send = _.invoke(builders, 'callError', parsed.id, code, description, details);
            if (!_.isUndefined) {
              sender(message2send);
            }
          },
        });
        break;
      case 'CALLRESULT':
        sentCallsHandler.success(parsed.id, parsed.payload);
        break;
      case 'CALLERROR':
        sentCallsHandler.error(parsed.id, parsed.payload);
        break;
      default:
      // ignore
    }
  };
}

module.exports = MessageHandler;
