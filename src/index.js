const _ = require('lodash');
const fp = require('lodash/fp');
const { nanoid } = require('nanoid');
const retry = require('async-retry');
const doWhilst = require('async/doWhilst');

// TODO: Need a more robust version identifier
/**
 * Gives the language to use
 * @param String Version
 * @returns String
 */
const transportLanguage = fp.pipe(
  _.toString,
  _.cond([
    [fp.endsWith('j'), _.constant('JSON')],
    [fp.endsWith('s'), _.constant('SOAP')],
    [fp.stubTrue, _.constant(null)],
  ]),
);

function formCall(version, action, payload = {}) {
  const language = transportLanguage(version);
  return {
    message: 'Not implemented',
    id: nanoid(10),
  };
}
function formCallResult(version, uniqueId, payload = {}) {
  const language = transportLanguage(version);
  return {
    message: 'Not implemented',
    id: uniqueId,
  };
}
function formCallError(version, uniqueId, errorCode, errorDescription = '', errorDetails = {}) {
  const language = transportLanguage(version);
  return {
    message: 'Not implemented',
    id: uniqueId,
  };
}

function OCPPJParser(message) {
  return {
    type: 'CALLRESULT',
    id: 'the unique id',
    action: null,
    payload: {},
  };
}

function OCPPSParser(message) {
  return {
    type: 'CALLRESULT',
    id: 'the unique id',
    action: null,
    payload: {},
  };
}

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

function extractSender(options, version) {
  return fp.pipe(
    fp.get(`senders.${version}`),
    _.cond([
      [_.isFunction, _.identity],
      [_.stubTrue, _.noop],
    ]),
  )(options);
}

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
    add, remove, success, failure,
  };
}

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

function getBuilders(version) {
  return {
    call(action, payload) {
      return formCall(version, action, payload);
    },
    callResult(id, payload) {
      return formCallResult(version, id, payload);
    },
    callError(id, errorCode, errorDescription, errorDetails) {
      return formCallError(version, id, errorCode, errorDescription, errorDetails);
    },
  };
}

function CSOS(options) {
  const sentCallsHandler = SentCallsManager();
  const receivedCallsHandler = ReceivedCallsManager();
  let currentVersion = null;
  let isConnected = false;
  let sender = _.noop;
  let msgHandler = _.noop;
  let builders = {};

  const language = () => transportLanguage(currentVersion);

  function received(message) {
    if (!isConnected) {
      throw new Error('Not connected to central system yet');
    }
    // Handle this message
    msgHandler(message);
  }

  function connected(version) {
    isConnected = true;
    currentVersion = version;
    sender = extractSender(options, currentVersion);
    builders = getBuilders(currentVersion);
    msgHandler = (() => {
      let parser = _.noop;
      const lang = language();
      if (lang === 'JSON') parser = OCPPJParser;
      else if (lang === 'SOAP') parser = OCPPSParser;

      return MessageHandler(
        parser,
        sentCallsHandler,
        receivedCallsHandler.execute,
        sender,
        builders,
      );
    })();
  }

  function disconnected() {
    isConnected = false;
    currentVersion = null;
    sender = _.noop;
    builders = {};
    msgHandler = _.noop;
  }

  /**
   * when sending call fails, it will reject with an error,
   * otherwise when an CALL ERROR is received, it will reject
   * with an ocpp message
   *
   * @param {String} action
   * @param {Object} payload
   */
  async function sendCall(action, payload) {
    return new Promise((resolve, reject) => {
      if (!isConnected) {
        return reject(new Error('Not connected to central system yet'));
      }

      const { message, id } = builders.call(action, payload);
      return retry(() => sender(message))
        .then(() => {
          // Record the id
          sentCallsHandler.add(id, resolve, reject);
        })
        .catch((error) => {
          // failed permanently
          reject(new Error(`The CALL couldn't be sent: ${_.get(error, 'message', _.toString(error))}`));
        });
    });
  }

  function onCall(action, handler) {
    receivedCallsHandler.add(action, handler);
  }

  async function bootNotification() {
    const { payload } = await sendCall('BootNotification', options);
    const status = _.get(payload, 'status');
    const interval = _.get(payload, 'interval', 90);
    const intervalMS = _.multiply(interval, 1000);

    if (status === 'Accepted') {
      // Start heartbeat loop in interval
      doWhilst(
        () => sendCall('Heartbeat'),
        // The minimum pause between two heartbeats
        (response, callback) => setTimeout(() => callback(null), intervalMS),
        _.noop,
      );
    } else {
      // Retry connection in interval
      setTimeout(bootNotification, intervalMS);
    }
  }

  // return object at the end
  return {
    connected,
    disconnected,
    received,
    sendCall,
    bootNotification,
    onCall,
    fresh: () => CSOS(options),
  };
}

module.exports = CSOS;
