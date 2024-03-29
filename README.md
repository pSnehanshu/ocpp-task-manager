# OCPP Task manager

[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/pSnehanshu/pointsim-ocpp-task-manager)

A general purpose Node.js framework that can be used to build anything
related to [OCPP](https://www.openchargealliance.org/) (Open Charge Point Protocol).

You can build software for a physical chargepoint or a virtual simulator,
you can also use it to build Backends or Charging Station Management Systems (CSMS).

It is transport layer agnostic, so that you have the full power to define
how the messages are sent and received.

## Installation

[![NPM](https://nodei.co/npm/ocpp-task-manager.png?compact=true)](https://www.npmjs.com/package/ocpp-task-manager)

## Usage

OCPP Task manager being transport layer agnostic, you have to define how to send
a message to the other connected entity, i.e. either a charge point or a central system,
depending on what you are building.

Also, regardless of you are building a Charge point or a central system, your device will
have to respond to CALL messages, (if you don't know what it is, I highly recommend
you to read official OCPP documentation).

```javascript
const OCPPTaskManager = require('ocpp-task-manager');

const device = OCPPTaskManager({
  sender: (message, version) => {
    // define how to send the message for the given OCPP version
  },
  // Define the call handlers for all the CALLs you wan't to support
  callHandlers: {
    // Showing just BootNotification for example
    BootNotification: (payload, { callResult, callError }) => {
      // `payload` hold the payload received with the CALL
      // do anything you want with it, although you might want to first sit and plan

      // You may either respond with a CALLRESULT
      callResult(responsePayload);
      // or with CALLERROR
      callError(errorCode, errorDesciption, errorDetails);
    },
    // This is a catch-all handler, it is executed for any undefined action
    '*': (payload, { callResult, callError }) => {
      callError('NotImplemented');
    },
  },
});
```

Here, we define a `sender` function which will receive a `message` parameter, which
is a `String`, whose contents you shouldn't care about. Just send it! The `version`
parameter stores the current active OCPP version, as defined in `device.connected`.

Similarly, you will also have to let to know OCPP Task Manager when a message is received
from the other entity. You can do it in the following way.

```javascript
// Assuming `message` variable holds the received message in string format
device.received(message);
```

Before actually receiving any messages, you will also have to notify OCPP Task Manager that
a connection has been established, because, as I already said, the framework doesn't know or
care anything about how the connection part works, its concern is just handling OCPP messages.

You must also pass the version of OCPP which is to be used for the current connection.

```javascript
// Assuming `ocppVersion` variable holds the OCPP version in string format
device.connected(ocppVersion);
```

If a connection was disconnected, notify using

```javascript
device.disconnected();
```

Sometimes, you may want to send a CALL message to the other entity, here's how you will do it,

```javascript
device
  .sendCall(action, payload)
  .then(response => {
    // `response.payload` will contain the Payload received
    if (response.ok) {
      // You received a CALLRESULT
    } else {
      // You received a CALLERROR
    }
  })
  .catch(error => {
    // Handle error, this was thrown by your sender
  });
```

## Hooks

You can use hooks functionality to run custom code at different life cycles.

```javascript
device.hooks.before('messageReceived', ({ rawMsg }) => {
  console.log('Message has been received', rawMsg);
});

device.hooks.after('sendWsMsg', ({ rawMsg }) => {
  console.log('Message has been sent', rawMsg);
});
```

The following hooks are available

- sendWsMsg
- sendCallRespond
- sendCallError
- executeCallHandler
- executeCallResultHandler
- executeCallErrorHandler
- messageReceived
- sendCall

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
    ws.send(message);
  },
  // Define what to do when calls are received
  callHandlers: {
    Reset: (payload, { callResult, callError }) => {
      if (payload.type === 'Hard') {
        // Some how do a Hard reset, depends on your implementation
        callResult({ status: 'Accepted' });
      } else if (payload.type === 'Soft') {
        // Some how do a Soft reset, depends on your implementation
        callResult({ status: 'Rejected' });
      } else {
        callError('FormationViolation');
      }
    },
    // Similarly define handlers for all the CALLs you want to support
  },
});

// Notify your device on connection open
ws.on('open', () => {
  device.connected('ocpp1.6j');

  // Send boot notification
  device
    .sendCall('BootNotification', {
      /* provide all the necessary payload items */
    })
    .then(response => {
      if (response.ok) {
        if (response.payload.status === 'Accepted') {
          // Start heartbeat loop
          setInterval(
            () => device.sendCall('Heartbeat'),
            response.payload.interval * 1000,
          );
        }
      } else {
        // You received a CALLERROR
        console.log(
          'CALLERROR received',
          response.payload.errorCode,
          response.payload.errorDescription,
          response.payload.errorDetails,
        );
      }
    })
    .catch(error => {
      console.error(error);
    });
});

// Notify your device about disconnection
ws.on('close', () => device.disconnected());

// Pass the received message to you device
ws.on('message', data => {
  device.received(data);
});
```

### OCPP server

```javascript

// Import the 'http' module
const http = require('http');

// Define the port number to listen on
const port = 3000;

// Create an HTTP server that listens on the specified port
const server = http.createServer((req, res) => {
  // Your buisness logic or http route handlers goes here
  // Express handlers can be integrated here
});

// Start the server and listen on the specified port
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

// The websocket server that will handle wesocket connections
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', async (request, socket, head) => {
  try {
    // handle your websocket's upgrade process with your buisness logic
    wss.handleUpgrade(request, socket, head, async ws => {
      // Start the connection upgrade
      // your buisness logic

      // Emit connection event with your charger object
      // Charger object may include various properties like chargerId, name etc
      // Charger object is completely flexible to implement based on your buisness needs
      wss.emit('connection', ws, request, { charger });
    })
  } catch (err) {
    console.log('error', err);
  }
})

wss.on("connection", async (ws, request, charger) => {
  // Some other buisness logic

  // create new OCPP task manager
  const device = OCPPTaskManager({
    sender: message => {
      // send message through WebSocket
      ws.send(message);
    },
    callHandlers: {
      BootNotification: (payload, { callResult, callError }) => {
        // `payload` hold the payload received with the CALL
        // do anything you want with it, although you might want to first sit and plan

        // You may either respond with a CALLRESULT
        callResult({
          currentTime: new Date().toISOString(),
          interval: 30,
          status: 'Accepted',
        });
        // or with CALLERROR
        callError('InternalError');
      },
      // This is a catch-all handler, it is executed for any undefined action
      '*': (payload, { callResult, callError }) => {
        callError('NotImplemented');
      },
    }
  });

  // device connected with selected OCPP version
  device.connected(selectedOcppVersionOnBothSide);

  ws.on("close", (code, reason) => {
    // Any other buisness logic
    // ...
    // Inform OCPP Task manager that the connection has been closed
    device.disconnected();
    // close WebSocket connection
    ws.close();
  })

  ws.on('message', data => {
    // when message is received through WebSocket
    // pass message to device
    device.received(data);
  });
})


```
