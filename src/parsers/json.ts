import _ from 'lodash';
import type { RawCallType, RawCallResultType, RawCallErrorType, ParsedCallType, ParsedCallResultType, ParsedCallErrorType, InvalidMessageType } from '../types';

const isValidAction = (action: any) => _.isString(action);
const isValidPayload = (payload: any) => _.isObject(payload) || _.isNull(payload);
const isValidUniqueId = (uniqueId: any) =>
  _.isString(uniqueId) || _.isNumber(uniqueId);
const isValidErrorCode = (errorCode: any) => _.isString(errorCode);
const isValidErrorDescription = (errorDescription: any) =>
  _.isString(errorDescription);
const isValidErrorDetails = (errorDetails: any) => _.isObject(errorDetails);

const invalidMessage = { type: null };

function parseCall(parsed: RawCallType): ParsedCallType | InvalidMessageType {
  const uniqueId = _.get(parsed, '1');
  const action = _.get(parsed, '2');
  const payload = _.get(parsed, '3');

  return isValidAction(action) &&
    isValidPayload(payload) &&
    isValidUniqueId(uniqueId)
    ? {
        type: 'CALL',
        id: uniqueId,
        action,
        payload,
      }
    : invalidMessage;
}

function parseCallResult(parsed: RawCallResultType): ParsedCallResultType | InvalidMessageType {
  const uniqueId = _.get(parsed, '1');
  const payload = _.get(parsed, '2');

  return isValidPayload(payload) && isValidUniqueId(uniqueId)
    ? {
        type: 'CALLRESULT',
        id: uniqueId,
        action: null,
        payload,
      }
    : invalidMessage;
}

function parseCallError(parsed: RawCallErrorType): ParsedCallErrorType | InvalidMessageType {
  const uniqueId = _.get(parsed, '1');
  const errorCode = _.get(parsed, '2');
  const errorDescription = _.get(parsed, '3');
  const errorDetails = _.get(parsed, '4');

  return isValidErrorCode(errorCode) &&
    isValidErrorDescription(errorDescription) &&
    isValidErrorDetails(errorDetails) &&
    isValidUniqueId(uniqueId)
    ? {
        type: 'CALLERROR',
        id: uniqueId,
        action: null,
        payload: {
          errorCode,
          errorDescription,
          errorDetails,
        },
      }
    : invalidMessage;
}

function OCPPJParser(message: string) {
  const parsed = _.attempt(JSON.parse, message);
  if (_.isError(parsed)) {
    return invalidMessage;
  }
  if (!_.isArray(parsed)) {
    return invalidMessage;
  }

  const msgTypeId = _.chain(parsed).get(0).toSafeInteger().value();
  switch (msgTypeId) {
    case 2:
      return parseCall(parsed as RawCallType);
    case 3:
      return parseCallResult(parsed as RawCallResultType);
    case 4:
      return parseCallError(parsed as RawCallErrorType);
    default:
      return invalidMessage;
  }
}

export default OCPPJParser;
