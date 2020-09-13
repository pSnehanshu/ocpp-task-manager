# OCPP Task manager

[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/pSnehanshu/pointsim-ocpp-task-manager)

A general purpose [OCPP](https://www.openchargealliance.org/) framework 
that can be used to build anything related to OCPP.

You can build software for a physical chargepoint or a virtual simulator,
you can also use it to build Backends or Charging Station Management Systems (CSMS).

It is transport layer agnostic, so that you have the full power to define
how the messages are sent and received.

## Installation

[![NPM](https://nodei.co/npm/ocpp-task-manager.png?compact=true)](https://nodei.co/npm/ocpp-task-manager/)


## Usage

OCPP Task manager being transport layer agnostic, you have to define how to send
a message to the other connected entity, i.e. either a charge point or a central system,
depending on what you are building.

```javascript
const OCPPTaskManager = require('ocpp-task-manager');

const device = OCPPTaskManager({
  sender: (message, version) => {
    // define how to send the message for the given OCPP version
  },
});
```

Here, we define a `sender` function which will receive a `message` parameter, which
is a `String`, whose contents you shouldn't care about. Just send it! The `version`
parameter stores the current active OCPP version, as defined in `device.connected`.

Similarly, you will also have to let to know OCPP Task Manager when a message is received from the other entity. You can do it in the following way.

```javascript
// Assuming `message` variable holds the received message in string format
device.received(message);
```

Before actually receiving any messages, you will also have to notify OCPP Task Manager that a connection has been established, because, as I already said, the framework doesn't know or care anything about how the connection part works, its concern is just handling OCPP messages.

You must also pass the version of OCPP which is to be used for the current connection.

```javascript
// Assuming `ocppVersion` variable holds the OCPP version in string format
device.connected(ocppVersion);
```

If a connection was disconnected, notify using

```javascript
device.disconnected();
```

Regardless of you are building a Charge point or a central system, your device will have to respond to CALL messages, (if you don't know what it is, I highly recommend you to read  official OCPP documentation). This how you do that,

```javascript
device.onCall(action, (payload, { callResult, callError }) => {
  // `payload` hold the payload received with the CALL
  // do anything you want with it, although you might want to first sit and plan

  // You may either respond with a CALLRESULT
  callResult(responsePayload);
  // or with CALLERROR
  callError(errorCode, errorDesciption, errorDetails);
});
```

Sometimes, you may want to send a CALL message to the other entity, here's how you will do it,

```javascript
device.sendCall(action, payload)
  .then(response => {
    // This will run when you receive a CALLRESULT
  })
  .catch(error => {
    if (error instanceof Error) {
      // Most probably, your "sender" wasn't able to send the message
    } else {
      // This will run when you receive a CALLERROR
    }
  });
```

## Examples

### Charge point simulator

```javascript
const OCPPTaskManager = require('ocpp-task-manager');
const WebSocket = require('ws'); // npm install ws

// Establishing a connection
const ws = new WebSocket('ws://example.com/ocpp/CP001'); // Where CP001 is the chargepoint unique identifier

// Instantiate your device
const device = OCPPTaskManager({
  sender: (message, version) => {
    ws.send(message)
  },
});

// Define what to do when calls are received
device.onCall('Reset', (payload, { callResult, callError }) => {
  if (payload.type === 'Hard') {
    // Some how do a Hard reset, depends on your implementation
    callResult({ status: 'Accepted' });
  } else if (type === 'Soft') {
    // Some how do a Soft reset, depends on your implementation
    callResult({ status: 'Rejected' });
  } else {
    callError('FormationViolation');
  }
});

// Similarly define handlers for all the CALLs you want to support

// Notify your device on connection open
ws.on('open', () => {
  device.connected('ocpp1.6j');

  // Send boot notification
  device.sendCall('BootNotification', { /* provide all the necessary payload items */ })
    .then(response => {
      if (response.status === 'Accepted') {
        // Start heartbeat loop
        setInterval(() => device.sendCall('Heartbeat'), payload.interval * 1000);
      }
    })
    .catch(error => {
      if (error instanceof Error) {
        // A connection error happended, try to reconnect
      } else {
        // You received a CALL ERROR
        console.log('CALLERROR received', error.errorCode, error.errorDescription, error.errorDetails);
      }
    });
});

// Notify your device about disconnection
ws.on('close', () => device.disconnected());

// Pass the received message to you device
ws.on('message', (data) => {
  device.received(data);
});
```

More examples coming soon...
