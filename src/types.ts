export type CallPayloadType = Object;

export type CallResultPayloadType = Object;

export interface CallErrorPayload {
  errorCode: string;
  errorDescription: string;
  errorDetails: any;
};

export type RawCallType = [number, string, string, CallPayloadType ];

export interface ParsedCallType {
  type: 'CALL';
  id: string;
  action: string;
  payload: CallPayloadType;
};

export type RawCallResultType = [number, string, CallResultPayloadType ];

export interface ParsedCallResultType {
  type: 'CALLRESULT',
  id: string,
  action: null,
  payload: CallResultPayloadType,
};

export type RawCallErrorType = [number, string, string, string, any ];

export interface ParsedCallErrorType {
  type: 'CALLERROR';
  id: string;
  action: null;
  payload: CallErrorPayload,
};

export interface InvalidMessageType {
  type: null;
};

export type ParsedMessageType = ParsedCallType | ParsedCallResultType | ParsedCallErrorType | InvalidMessageType;

export type ParserType = (message: string) => ParsedMessageType;

export type CallResultSender = (payload: CallResultPayloadType) => void;

export type CallErrorSender = (errorCode: string, errorDesciption?: string, errorDetails?: any) => void;

export interface BuiltMessage { id: string; message: string };
