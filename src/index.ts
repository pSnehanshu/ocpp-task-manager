import _ from 'lodash';
import retry from 'async-retry';
import { nanoid } from 'nanoid';
import SentCallsManager from './managers/sent';
import ReceivedCallsManager from './managers/received';
import transportLanguage from './utils/transportLanguage';
import extractSender from './utils/extractSender';
import getBuilders from './builder';
import OCPPJParser from './parsers/json';
import OCPPSParser from './parsers/soap';
import MessageHandler from './handler';
import Hooks from './utils/hooks';
import type { CallPayloadType } from './types';

const noopthunk = () => _.noop;

interface OCPPTaskManagerOptions {
  sender(): void;
  callHandlers: Object;
};

function OCPPTaskManager(options: OCPPTaskManagerOptions) {
  const sentCallsHandler = SentCallsManager();
  const receivedCallsHandler = ReceivedCallsManager();
  let currentVersion: (string | null) = null;
  let isConnected = false;
  let msgHandler: Function | void;
  let builders;
  const hooks = new Hooks();

  const language = () => transportLanguage(currentVersion);

  // Configuring sender
  const sender = extractSender(options);
  const send = (message: string) =>
    hooks.execute('sendWsMsg', () => sender(message, currentVersion), {
      rawMsg: message,
    });

  // Configure call handlers
  _.map(_.get(options, 'callHandlers', {}), (handler, action) =>
    receivedCallsHandler.add(action, handler),
  );

  function received(message: string) {
    if (!isConnected) {
      throw new Error('Not connected yet, please call `connected()`');
    }
    // Handle this message
    hooks.execute('messageReceived', () => _.isFunction(msgHandler) && msgHandler(message)(), {
      rawMsg: message,
    });
  }

  function connected(version: string) {
    isConnected = true;
    currentVersion = version;
    builders = getBuilders(currentVersion, () => nanoid(10));
    msgHandler = (() => {
      let parser;
      const lang = language();
      if (lang === 'JSON') parser = OCPPJParser;
      else if (lang === 'SOAP') parser = OCPPSParser;
      else throw new TypeError(`Invalid Transport Language: ${lang}`);

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
    // builders = {};
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
  async function sendCall(action: string, payload: CallPayloadType) {
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
