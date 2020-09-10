const transportLanguage = require('../utils/transportLanguage');

function callResult(version, uniqueId, payload = {}) {
  const language = transportLanguage(version);
  return {
    message: 'Not implemented',
    id: uniqueId,
  };
}

module.exports = callResult;
