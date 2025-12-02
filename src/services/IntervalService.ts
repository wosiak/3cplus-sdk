// src/services/IntervalService.ts
import { createApiClient } from "../api/ApiClientFactory";
import { Interval } from "../models/Interval";

export class IntervalService {
  private client;

  constructor(domain: string) {
    this.client = createApiClient(domain);
  }

  async getAvailableIntervals(): Promise<Interval[]> {
    const response = await this.client.instance.get<{ data: Interval[] }>(
      '/agent/work_break_intervals?per_page=-1'
    );
    return response.data.data;
  }
}
