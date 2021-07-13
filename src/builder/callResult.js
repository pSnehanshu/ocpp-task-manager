const _ = require('lodash');
const transportLanguage = require('../utils/transportLanguage');

function callResult(version, uniqueId, payload = {}) {
  const language = transportLanguage(version);

  switch (language) {
    case 'JSON':
      return {
        id: uniqueId,
        message: JSON.stringify([3, uniqueId, payload]),
      };
    case 'SOAP':
      throw new Error("SOAP hasn't been implemented yet");
    default:
      throw new Error(`Unknown transport language: ${_.toString(language)}`);
  }
}

module.exports = callResult;
