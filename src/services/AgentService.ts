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

  async logout() {
    return this.client.instance.post('/agent/logout');
  }

  async workBreakEnter(interval_id: number) {
    return this.client.instance.post(`/agent/work_break/${interval_id}/enter`)
  }
  
  async workBreakExit() {
    return this.client.instance.post('/agent/work_break/exit');
  }
}
