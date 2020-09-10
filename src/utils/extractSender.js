const _ = require('lodash');
const fp = require('lodash/fp');

function extractSender(options, version) {
  return fp.pipe(
    fp.get(`senders.${version}`),
    _.cond([
      [_.isFunction, _.identity],
      [_.stubTrue, _.noop],
    ]),
  )(options);
}

module.exports = extractSender;
