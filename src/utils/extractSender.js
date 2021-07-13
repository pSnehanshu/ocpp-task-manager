const _ = require('lodash');

function senderNotFound() {
  throw new Error("A sender wasn't provided");
}

function extractSender(options) {
  const sender = _.get(options, 'sender');
  return _.isFunction(sender) ? sender : () => senderNotFound();
}

module.exports = extractSender;
