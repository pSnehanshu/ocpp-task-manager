const { nanoid } = require('nanoid');
const transportLanguage = require('../utils/transportLanguage');

function call(version, action, payload = {}) {
  const language = transportLanguage(version);
  return {
    message: 'Not implemented',
    id: nanoid(10),
  };
}

module.exports = call;
