// src/models/ManualCall.ts
export interface ManualCallDial {
  phone: number;
}

export interface ManualCallDialResponse {
  call: {
    id: string;
    number: string;
  };
  agent: {
    name: string;
    telephony_id: string;
  };
}