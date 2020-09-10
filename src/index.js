const _ = require('lodash');
const fp = require('lodash/fp');
const { nanoid } = require('nanoid');
const retry = require('async-retry');

function formCall(version, action, payload) {
  const language = transportLanguage(version);
  return {
    message: 'Not implemented',
    id: nanoid(10),
  };
}

function OCPPJParser(message) {
  return {
    type: 'CALLRESLT',
    id: 'the unique id',
    payload: {},
  };
}

function OCPPSParser(message) {
  return {
    type: 'CALLRESLT',
    id: 'the unique id',
    payload: {},
  };
}

function MessageHandler(parser, callManager) {
  return (message) => {
    const parsed = parser(message);
    switch (parsed.type) {
      case 'CALL': break;
      case 'CALLRESULT':
        callManager.success(parsed.id, parsed.payload);
        break;
      case 'CALLERROR':
        callManager.error(parsed.id, parsed.payload);
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

function CSOS(options) {
  const callManager = SentCallsManager();
  let currentVersion = null;
  let isConnected = false;
  let sender = _.noop;
  const language = () => transportLanguage(currentVersion);

  const msgHandler = (() => {
    let parser = _.noop;
    const lang = language();
    if (lang === 'JSON') parser = OCPPJParser;
    else if (lang === 'SOAP') parser = OCPPSParser;

    return MessageHandler(parser, callManager);
  })();

  function received(message) {
    if (!isConnected) {
      throw new Error('Not connected to central system yet');
    }
    // Handle this message
    msgHandler(message);
  }

  function connected(version) {
    currentVersion = version;
    isConnected = true;
    sender = extractSender(options, currentVersion);
  }

  function disconnected() {
    currentVersion = null;
    isConnected = false;
    sender = _.noop;
  }

  async function sendCall(action, payload) {
    return new Promise((resolve, reject) => {
      if (!isConnected) {
        return reject(new Error('Not connected to central system yet'));
      }

      const { message, id } = formCall(currentVersion, action, payload);
      return retry(() => sender(message))
        .then(() => {
          // Record the id
          callManager.add(id, resolve, reject);
        })
        .catch((error) => {
          // failed permanently
        });
    });
  }

  async function bootNotification() {
    const { payload } = await sendCall('BootNotification', options);
    const status = _.get(payload, 'status');
    const interval = _.get(payload, 'interval', 90);

    if (status === 'Accepted') {
      // Start heartbeat loop in interval
    } else {
      // Retry connection in interval
      setTimeout(bootNotification, _.multiply(interval, 1000));
    }
  }

  // return object at the end
  return {
    connected,
    disconnected,
    received,
    sendCall,
    bootNotification,
    fresh: () => CSOS(options),
  };
}

module.exports = CSOS;
