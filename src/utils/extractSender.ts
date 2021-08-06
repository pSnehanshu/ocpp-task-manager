import _ from 'lodash';

function senderNotFound(): never {
  throw new Error("A sender wasn't provided");
}

function extractSender(options: { sender: Function }) {
  const sender = _.get(options, 'sender');
  return _.isFunction(sender) ? sender : () => senderNotFound();
}

export default extractSender;
