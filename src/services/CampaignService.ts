// src/services/CampaignService.ts
import { ApiClient } from "../api/ApiClient";
import { FileTokenStorage } from "../storage/TokenStorage";
import { Campaign } from "../models/Campaign";

export class CampaignService {
    private client: ApiClient;

    constructor(domain : string){
        const baseUrl = `https://${domain}.3c.plus/api/v1/`
        const token = new FileTokenStorage().getToken();

        if (!token) throw new Error('Token não encontrado. Autentique-se primeiro!');

        this.client = new ApiClient(baseUrl, token);
    }

    async getAvailableCampaigns() : Promise<Campaign[]> {
        const response = await this.client.instance.get<{ data: Campaign[] }>(
            'groups-and-campaigns?all=true&paused=0'
        );
        return response.data.data;
    }
}