// src/services/AgentService.ts
import { createApiClient } from '../api/ApiClientFactory';
import { AgentLoginRequest } from '../models/Agent';

export class AgentService {
  private client;

  constructor(domain: string) {
    this.client = createApiClient(domain);
  }

  async login(data: AgentLoginRequest) {
    return this.client.instance.post('/agent/login', data);
  }
}
