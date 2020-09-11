const _ = require('lodash');

function senderNotFound(version) {
  throw new Error(`No sender defined for ${_.toString(version)}`);
}

function extractSender(options, version) {
  const sender = _.get(options, `senders['${version}']`);
  return _.isFunction(sender) ? sender : () => senderNotFound(version);
}

module.exports = extractSender;
