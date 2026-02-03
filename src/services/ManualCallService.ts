// src/services/ManualCallService.ts
import { createApiClient } from '../api/ApiClientFactory';
import { ManualCallDial, ManualCallDialResponse, ManualCallQualify, ManualCallQualifyResponse } from '../models/ManualCall';

export class ManualCallService {
  private client;

  constructor(domain: string) {
    this.client = createApiClient(domain);
  }

  async manualCallEnter() {
    return this.client.instance.post('agent/manual_call/enter');
  }

  async manualCallDial(data: ManualCallDial): Promise<ManualCallDialResponse> {
    const response = await this.client.instance.post<ManualCallDialResponse>(
      'agent/manual_call/dial',
      data
    );
    return response.data;
  }

  async manualCallQualify(callId: string, data: ManualCallQualify): Promise<ManualCallQualifyResponse> {
    const response = await this.client.instance.post<ManualCallQualifyResponse>(
      `agent/manual_call/${callId}/qualify`,
      data
    );
    return response.data;
  }

  async manualCallHangup(callId: string) {
    return this.client.instance.post(`agent/call/${callId}/hangup`);
  }

  async manualCallExit() {
    return this.client.instance.post('agent/manual_call/exit');
  }
}
