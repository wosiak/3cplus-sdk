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

export interface ManualCallQualify {
  qualification_id: number;
}

export interface ManualCallQualifyResponse {
  success: boolean;
  message?: string;
}
