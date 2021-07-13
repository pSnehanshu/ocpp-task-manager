const _ = require('lodash');
const transportLanguage = require('../utils/transportLanguage');

function callError(
  version,
  uniqueId,
  errorCode,
  errorDescription = '',
  errorDetails = {},
) {
  const language = transportLanguage(version);

  switch (language) {
    case 'JSON':
      return {
        id: uniqueId,
        message: JSON.stringify([
          4,
          uniqueId,
          errorCode,
          errorDescription,
          errorDetails,
        ]),
      };
    case 'SOAP':
      throw new Error("SOAP hasn't been implemented yet");
    default:
      throw new Error(`Unknown transport language: ${_.toString(language)}`);
  }
}

module.exports = callError;
