import call from './call';
import callResult from './callResult';
import callError from './callError';
import type { CallPayloadType, CallResultPayloadType } from '../types'

function builder(version: string, uniqueIdGenerator: () => string) {
  return {
    call(action: string, payload: CallPayloadType) {
      return call(version, action, payload, uniqueIdGenerator);
    },
    callResult(id: string, payload: CallResultPayloadType) {
      return callResult(version, id, payload);
    },
    callError(id: string, errorCode: string, errorDescription?: string, errorDetails?: any) {
      return callError(version, id, errorCode, errorDescription, errorDetails);
    },
  };
}

export default builder;
