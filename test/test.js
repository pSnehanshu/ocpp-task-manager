const { expect } = require('chai');
const { nanoid } = require('nanoid');

// Ours
const transportLanguage = require('../src/utils/transportLanguage');
const Builder = require('../src/builder');
const OCPPJParser = require('../src/parsers/json');
const ReceivedCallsManager = require('../src/managers/received');
const SentCallsManager = require('../src/managers/sent');

describe('TransportLanguage utility', function () {
  it('should return null for invalid OCPP version', function () {
    expect(transportLanguage('invalid version')).to.be.a('null');
  });

  it('should return JSON for OCPP1.5j', function () {
    expect(transportLanguage('ocpp1.5j')).to.equal('JSON');
  });

  it('should return SOAP for OCPP1.5s', function () {
    expect(transportLanguage('ocpp1.5s')).to.equal('SOAP');
  });
});

describe('Builder', function () {
  describe('OCPP-J', function () {
    const uniqueId = nanoid(5);
    const { call, callResult, callError } = Builder('ocpp1.6j', () => uniqueId);
    const {
      call: invalidCall,
      callResult: invalidCallResult,
      callError: invalidCallError
    } = Builder('Invalid OCPP version', () => uniqueId);

    describe('call', function () {
      it('should return correct OCPP message', function () {
        const action = 'Heartbeat';
        const payload = {};

        const { id, message } = call(action, payload);
        const parsed = JSON.parse(message);

        expect(id).to.equal(uniqueId);
        expect(parsed).to.be.an('array').of.length(4);
        expect(parsed[0]).to.equal(2);
        expect(parsed[1]).to.equal(uniqueId);
        expect(parsed[2]).to.equal(action);
        expect(parsed[3]).to.eql(payload);
      });

      it('should throw error for invalid OCPP version', function () {
        expect(() => invalidCall('Reset', { type: 'Soft' })).to.throw();
      });
    });

    describe('callResult', function () {
      it('should return correct OCPP message', function () {
        const payload = { currentTimestamp: (new Date).toISOString() };

        const { id, message } = callResult(uniqueId, payload);
        const parsed = JSON.parse(message);

        expect(id).to.equal(uniqueId);
        expect(parsed).to.be.an('array').of.length(3);
        expect(parsed[0]).to.equal(3);
        expect(parsed[1]).to.equal(uniqueId);
        expect(parsed[2]).to.eql(payload);
      });

      it('should throw error for invalid OCPP version', function () {
        expect(() => invalidCallResult(uniqueId, { status: 'Accepted' })).to.throw();
      });
    });

    describe('callError', function () {
      it('should return correct OCPP message', function () {
        const errorCode = 'NotImplemented';
        const errorDescription = 'This feature has not been implemented yet';
        const errorDetails = {
          type: 4,
          dummy: {
            a: 1,
            isFull: false,
          }
        };

        const { id, message } = callError(uniqueId, errorCode, errorDescription, errorDetails);
        const parsed = JSON.parse(message);

        expect(id).to.equal(uniqueId);
        expect(parsed).to.be.an('array').of.length(5);
        expect(parsed[0]).to.equal(4);
        expect(parsed[1]).to.equal(uniqueId);
        expect(parsed[2]).to.equal(errorCode);
        expect(parsed[3]).to.equal(errorDescription);
        expect(parsed[4]).to.eql(errorDetails);
      });

      it('should throw error for invalid OCPP version', function () {
        expect(() => invalidCallError(uniqueId, 'InternalError', '', {})).to.throw();
      });
    });
  })
});

describe('Parser', function () {
  describe('JSON', function () {
    it('should correctly parse CALL', function () {
      const uniqueId = nanoid(5);
      const action = 'Reset';
      const payload = { type: 'Soft' };
      const msg = JSON.stringify([2, uniqueId, action, payload]);

      const parsed = OCPPJParser(msg);

      expect(parsed).to.be.an('object');
      expect(parsed.type).to.equal('CALL');
      expect(parsed.action).to.equal(action);
      expect(parsed.id).to.equal(uniqueId);
      expect(parsed.payload).to.eql(payload);
    });

    it('should correctly parse CALLRESULT', function () {
      const uniqueId = nanoid(5);
      const payload = { status: 'Accepted' };
      const msg = JSON.stringify([3, uniqueId, payload]);

      const parsed = OCPPJParser(msg);

      expect(parsed).to.be.an('object');
      expect(parsed.type).to.equal('CALLRESULT');
      expect(parsed.id).to.equal(uniqueId);
      expect(parsed.payload).to.eql(payload);
    });

    it('should correctly parse CALLERROR', function () {
      const uniqueId = nanoid(5);
      const errorCode = 'NotImplemented';
      const errorDescription = 'This feature has not been implemented yet';
      const errorDetails = {
        dummy: Math.random() * 10000,
        dummy2: nanoid(5),
      };
      const msg = JSON.stringify([4, uniqueId, errorCode, errorDescription, errorDetails]);

      const parsed = OCPPJParser(msg);

      expect(parsed).to.be.an('object');
      expect(parsed.type).to.equal('CALLERROR');
      expect(parsed.id).to.equal(uniqueId);
      expect(parsed.payload).to.be.an('object');
      expect(parsed.payload.errorCode).to.equal(errorCode);
      expect(parsed.payload.errorDescription).to.equal(errorDescription);
      expect(parsed.payload.errorDetails).to.eql(errorDetails);
    });

    it('should be able to detect invalid OCPP messges', function () {
      const invalid1 = '[1, "Hello", {"a":23}]';
      const invalid2 = 'Not a message';
      const invalid3 = () => {};

      expect(OCPPJParser(invalid1).type).to.be.null;
      expect(OCPPJParser(invalid2).type).to.be.null;
      expect(OCPPJParser(invalid3).type).to.be.null;
    });
  });
});

describe('Managers', function () {
  describe('Received Manager', function () {
    it ('should execute the given handler', function (done) {
      const manager = ReceivedCallsManager();
      const action = 'Heatbeat';
      const handler = () => done();
      
      manager.add(action, handler);
      manager.execute(action);
    });

    it ('should execute the given handler with appropriate arguments', function (done) {
      const manager = ReceivedCallsManager();
      const action = 'Heatbeat';
      const providedArgs = ['Hello', 'World', { a: 123 }];
      const handler = (...receivedArgs) => {
        expect(receivedArgs).to.eql(providedArgs);
        done();
      };
      
      manager.add(action, handler);
      manager.execute(action, ...providedArgs);
    });

    it('should return the return value of the handler', function () {
      const manager = ReceivedCallsManager();
      const action = 'Heatbeat';
      const value2return = ['Hello', 'World', { a: 123 }];
      const handler = () => value2return;

      manager.add(action, handler);
      const returnedValue = manager.execute(action);

      expect(returnedValue).to.eql(value2return);
    });

    it('should not call a handler once it is removed', function () {
      const manager = ReceivedCallsManager();
      const action = 'Heatbeat';
      const handler = () => { throw new Error('Not supposed to be called') };

      manager.add(action, handler);
      manager.remove(action);
      manager.execute(action);
    });
  });

  describe('Sent Manager', function () {
    it('should call the success handler', function (done) {
      const manager = SentCallsManager();
      const uniqueId = nanoid(5);
      const success = () => done();
      const failure = () => done();

      manager.add(uniqueId, success, failure);
      manager.success(uniqueId);
    });

    it('should call the failure handler', function (done) {
      const manager = SentCallsManager();
      const uniqueId = nanoid(5);
      const success = () => done();
      const failure = () => done();

      manager.add(uniqueId, success, failure);
      manager.failure(uniqueId);
    });

    it('should pass the given argument to onSuccess', function (done) {
      const manager = SentCallsManager();
      const uniqueId = nanoid(5);
      const providedArgs = ['Hello', 'World', { a: 123 }];;
      const success = (...receivedArgs) => {
        expect(receivedArgs).to.eql(providedArgs);
        done()
      };
      const failure = () => {};

      manager.add(uniqueId, success, failure);
      manager.success(uniqueId, ...providedArgs);
    });

    it('should pass the given argument to onFailure', function (done) {
      const manager = SentCallsManager();
      const uniqueId = nanoid(5);
      const providedArgs = ['Hello', 'World', { a: 123 }];;
      const failure = (...receivedArgs) => {
        expect(receivedArgs).to.eql(providedArgs);
        done()
      };
      const success = () => {};

      manager.add(uniqueId, success, failure);
      manager.failure(uniqueId, ...providedArgs);
    });

    it('should return the return value of onSuccess', function () {
      const manager = SentCallsManager();
      const uniqueId = nanoid(5);
      const value2return = nanoid(5);
      const success = () => value2return;
      const failure = () => {};

      manager.add(uniqueId, success, failure);
      const returnedValue = manager.success(uniqueId);

      expect(returnedValue).to.eql(value2return);
    });

    it('should return the return value of onFailure', function () {
      const manager = SentCallsManager();
      const uniqueId = nanoid(5);
      const value2return = nanoid(5);
      const failure = () => value2return;
      const success = () => {};

      manager.add(uniqueId, success, failure);
      const returnedValue = manager.failure(uniqueId);

      expect(returnedValue).to.eql(value2return);
    });

    it('should not call onSuccess or onFailure after removing', function () {
      const manager = SentCallsManager();
      const uniqueId = nanoid(5);
      const success = () => { throw new Error('onSuccess was called') };
      const failure = () => { throw new Error('onFailure was called') };

      manager.add(uniqueId, success, failure);
      manager.remove(uniqueId);
      manager.success(uniqueId);
      manager.failure(uniqueId);
    });

    it('should not call onSuccess/onFailure once onSuccess was called', function (done) {
      const manager = SentCallsManager();
      const uniqueId = nanoid(5);
      const success = () => done();
      const failure = () => done();

      manager.add(uniqueId, success, failure);
      manager.success(uniqueId);

      manager.success(uniqueId);
      manager.failure(uniqueId);
    });

    it('should not call onSuccess/onFailure once onFailure was called', function (done) {
      const manager = SentCallsManager();
      const uniqueId = nanoid(5);
      const success = () => done();
      const failure = () => done();

      manager.add(uniqueId, success, failure);
      manager.failure(uniqueId);

      manager.success(uniqueId);
      manager.failure(uniqueId);
    });
  });
});
