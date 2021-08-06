import type { ParsedCallResultType } from '../types';

function OCPPSParser(message: string): ParsedCallResultType {
  return {
    type: 'CALLRESULT',
    id: 'the unique id',
    action: null,
    payload: {},
  };
}

export default OCPPSParser;
