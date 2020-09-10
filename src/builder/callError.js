const transportLanguage = require('../utils/transportLanguage');

function callError(version, uniqueId, errorCode, errorDescription = '', errorDetails = {}) {
  const language = transportLanguage(version);
  return {
    message: 'Not implemented',
    id: uniqueId,
  };
}

module.exports = callError;
