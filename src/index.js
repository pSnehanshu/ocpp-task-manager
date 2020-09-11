const _ = require('lodash');
const retry = require('async-retry');
const { nanoid } = require('nanoid');
const SentCallsManager = require('./managers/sent');
const ReceivedCallsManager = require('./managers/received');
const transportLanguage = require('./utils/transportLanguage');
const extractSender = require('./utils/extractSender');
const getBuilders = require('./builder');
const OCPPJParser = require('./parsers/json');
const OCPPSParser = require('./parsers/soap');
const MessageHandler = require('./handler');

const noopthunk = () => _.noop;

function CSOS(options) {
  const sentCallsHandler = SentCallsManager();
  const receivedCallsHandler = ReceivedCallsManager();
  let currentVersion = null;
  let isConnected = false;
  let sender = _.noop;
  let msgHandler = noopthunk;
  let builders = {};

  const language = () => transportLanguage(currentVersion);

  function received(message) {
    if (!isConnected) {
      throw new Error('Not connected yet, please call `connected()`');
    }
    // Handle this message
    msgHandler(message)();
  }

  function connected(version) {
    isConnected = true;
    currentVersion = version;
    sender = extractSender(options, currentVersion);
    builders = getBuilders(currentVersion, () => nanoid(10));
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
    msgHandler = noopthunk;
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
        return reject(new Error('Not connected yet, please call `connected()`'));
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

  // return object at the end
  return {
    connected,
    disconnected,
    received,
    sendCall,
    onCall,
    fresh: () => CSOS(options),
  };
}

module.exports = CSOS;
