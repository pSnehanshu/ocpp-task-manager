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
const Hooks = require('./utils/hooks');

const noopthunk = () => _.noop;

function OCPPTaskManager(options) {
  const sentCallsHandler = SentCallsManager();
  const receivedCallsHandler = ReceivedCallsManager();
  let currentVersion = null;
  let isConnected = false;
  let msgHandler = noopthunk;
  let builders = {};
  const hooks = new Hooks();

  const language = () => transportLanguage(currentVersion);

  // Configuring sender
  const sender = extractSender(options);
  const send = message =>
    hooks.execute('sendWsMsg', () => sender(message, currentVersion), {
      rawMsg: message,
    });

  // Configure call handlers
  _.map(_.get(options, 'callHandlers', {}), (handler, action) =>
    receivedCallsHandler.add(action, handler),
  );

  function received(message) {
    if (!isConnected) {
      throw new Error('Not connected yet, please call `connected()`');
    }
    // Handle this message
    hooks.execute('messageReceived', msgHandler(message), {
      rawMsg: message,
    });
  }

  function connected(version) {
    isConnected = true;
    currentVersion = version;
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
        send,
        builders,
        hooks,
      );
    })();
  }

  function disconnected() {
    isConnected = false;
    currentVersion = null;
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
        return reject(
          new Error('Not connected yet, please call `connected()`'),
        );
      }

      const { message, id } = builders.call(action, payload);
      return retry(() =>
        hooks.execute('sendCall', () => send(message), { msg: message }),
      )
        .then(() => {
          // Record the id
          sentCallsHandler.add(
            id,
            data => resolve({ ok: true, payload: data }),
            data => resolve({ ok: false, payload: data }),
          );
        })
        .catch(error => {
          // failed permanently
          reject(
            new Error(
              `The CALL couldn't be sent: ${_.get(
                error,
                'message',
                _.toString(error),
              )}`,
            ),
          );
        });
    });
  }

  // return object at the end
  return {
    connected,
    disconnected,
    received,
    sendCall,
    hooks,
    fresh: () => OCPPTaskManager(options),
  };
}

module.exports = OCPPTaskManager;
