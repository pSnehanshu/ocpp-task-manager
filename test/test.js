const { expect } = require('chai');
const { nanoid } = require('nanoid');

// Ours
const transportLanguage = require('../src/utils/transportLanguage');
const Builder = require('../src/builder');

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
        expect(parsed).to.be.an('array');
        expect(parsed).to.have.length(4);
        expect(parsed[0]).to.equal(2);
        expect(parsed[1]).to.equal(uniqueId);
        expect(parsed[2]).to.equal(action);
        expect(parsed[3]).to.eql(payload);
      });

      it('should throw error for invalid OCPP version', function () {
        expect(() => invalidCall('Reset', { type: 'Soft' })).to.throw();
      });
    });
  })
});
