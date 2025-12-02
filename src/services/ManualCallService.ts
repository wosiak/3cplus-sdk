// src/services/ManualCallService.ts
import { createApiClient } from '../api/ApiClientFactory';
import { ManualCallDial } from '../models/ManualCall';

export class ManualCallService {
  private client;

  constructor(domain: string) {
    this.client = createApiClient(domain);
  }

  async manualCallEnter() {
    return this.client.instance.post('/agent/manual_call/enter');
  }

  async manualCallDial(data: ManualCallDial) {
    return this.client.instance.post('/agent/manual_call/dial', data);
  }
}
