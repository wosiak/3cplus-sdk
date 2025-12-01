// src/services/CampaignService.ts
import { createApiClient } from '../api/ApiClientFactory';
import { Campaign } from '../models/Campaign';

export class CampaignService {
  private client;

  constructor(domain: string) {
    this.client = createApiClient(domain);
  }

  async getAvailableCampaigns(): Promise<Campaign[]> {
    const response = await this.client.instance.get<{ data: Campaign[] }>(
      'groups-and-campaigns?all=true&paused=0'
    );
    return response.data.data;
  }
}
