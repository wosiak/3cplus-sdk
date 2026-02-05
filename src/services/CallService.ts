// src/services/CallService.ts
import { createApiClient } from '../api/ApiClientFactory';
import { CallQualify, CallQualifyResponse } from '../models/Call';

export class CallService {
  private client;

  constructor(domain: string) {
    this.client = createApiClient(domain);
  }

  async qualify(callId: string, data: CallQualify): Promise<CallQualifyResponse> {
    const response = await this.client.instance.post<CallQualifyResponse>(
      `agent/call/${callId}/qualify`,
      data
    );
    return response.data;
  }

  async hangup(callId: string) {
    return this.client.instance.post(`agent/call/${callId}/hangup`);
  }
}