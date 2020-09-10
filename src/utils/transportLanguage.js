const _ = require('lodash');
const fp = require('lodash/fp');

// TODO: Need a more robust version identifier
/**
 * Gives the language to use
 * @param String Version
 * @returns String
 */
const transportLanguage = fp.pipe(
  _.toString,
  _.cond([
    [fp.endsWith('j'), _.constant('JSON')],
    [fp.endsWith('s'), _.constant('SOAP')],
    [fp.stubTrue, _.constant(null)],
  ]),
);

module.exports = transportLanguage;
