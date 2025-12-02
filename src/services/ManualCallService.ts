// src/services/ManualCallService.ts
import { createApiClient } from '../api/ApiClientFactory';
import { ManualCallDial, ManualCallDialResponse } from '../models/ManualCall';

export class ManualCallService {
  private client;

  constructor(domain: string) {
    this.client = createApiClient(domain);
  }

  async manualCallEnter() {
    return this.client.instance.post('/agent/manual_call/enter');
  }

  async manualCallDial(data: ManualCallDial): Promise<ManualCallDialResponse> {
    const response = await this.client.instance.post<ManualCallDialResponse>(
      '/agent/manual_call/dial',
      data
    );
    return response.data;
  }
}
