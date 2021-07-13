const _ = require('lodash');

const isValidAction = action => _.isString(action);
const isValidPayload = payload => _.isObject(payload) || _.isNull(payload);
const isValidUniqueId = uniqueId =>
  _.isString(uniqueId) || _.isNumber(uniqueId);
const isValidErrorCode = errorCode => _.isString(errorCode);
const isValidErrorDescription = errorDescription =>
  _.isString(errorDescription);
const isValidErrorDetails = errorDetails => _.isObject(errorDetails);

const invalidMessage = { type: null };

function parseCall(parsed) {
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

function parseCallResult(parsed) {
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

function parseCallError(parsed) {
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

function OCPPJParser(message) {
  const parsed = _.attempt(JSON.parse, message);
  if (_.isError(parsed)) {
    return invalidMessage;
  }
  if (!_.isArray(parsed)) {
    return invalidMessage;
  }

  const msgTypeId = _.chain(parsed).get('0').toSafeInteger().value();
  switch (msgTypeId) {
    case 2:
      return parseCall(parsed);
    case 3:
      return parseCallResult(parsed);
    case 4:
      return parseCallError(parsed);
    default:
      return invalidMessage;
  }
}

module.exports = OCPPJParser;
