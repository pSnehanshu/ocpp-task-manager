import _ from 'lodash';
import Hook from './utils/hooks';
import type { ParserType, CallResultPayloadType, CallErrorPayload, CallPayloadType, CallResultSender, CallErrorSender, BuiltMessage } from './types'

function MessageHandler(
  parser: ParserType,
  sentCallsHandler: { success(id: string, payload: CallResultPayloadType): void, failure(id: string, payload: CallErrorPayload): void },
  callHandler: (action: string, payload: CallPayloadType, responders: { callResult: CallResultSender, callError: CallErrorSender }) => void,
  sender: (message: string) => void,
  builders: { callResult: (id: string, payload: CallPayloadType) => BuiltMessage, callError: (id: string, errorCode: string, errorDescription?: string, errorDetails?: any) => BuiltMessage },
  hooks: Hook,
) {
  /**
   * Handler function that returns a thunk
   * @param {String} message The OCPP message received
   * @returns Thunk that when executed performs the actual task
   */
  return function handler(message: string) {
    const parsed = parser(message);

    switch (parsed.type) {
      case 'CALL':
        return () => {
          const callResult = (payload: CallResultPayloadType) => {
            // Send response using the sender
            const message2send = builders.callResult(parsed.id, payload);

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

          const callError = (code: string, description?: string, details?: any) => {
            const message2send = builders.callError(parsed.id, code, description, details);

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

export default MessageHandler;
