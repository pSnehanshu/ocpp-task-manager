const _ = require('lodash');
const transportLanguage = require('../utils/transportLanguage');

function call(version, action, payload = {}, uniqueIdGenerator) {
  const language = transportLanguage(version);
  const uniqueId = uniqueIdGenerator();

  switch (language) {
    case 'JSON':
      return {
        id: uniqueId,
        message: JSON.stringify([2, uniqueId, action, payload]),
      };
    case 'SOAP':
      throw new Error("SOAP hasn't been implemented yet");
    default:
      throw new Error(`Unknown transport language: ${_.toString(language)}`);
  }
}

module.exports = call;
