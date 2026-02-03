// src/services/CallService.ts
import { createApiClient } from '../api/ApiClientFactory';
import { ManualCallQualify, ManualCallQualifyResponse } from '../models/ManualCall';

export class CallService {
  private client;

  constructor(domain: string) {
    this.client = createApiClient(domain);
  }

  async qualify(callId: string, data: ManualCallQualify): Promise<ManualCallQualifyResponse> {
    const response = await this.client.instance.post<ManualCallQualifyResponse>(
      `agent/call/${callId}/qualify`,
      data
    );
    return response.data;
  }

  async hangup(callId: string) {
    return this.client.instance.post(`agent/call/${callId}/hangup`);
  }
}
