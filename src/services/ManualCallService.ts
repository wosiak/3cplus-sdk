// src/services/ManualCallService.ts
import { createApiClient } from '../api/ApiClientFactory';

export class ManualCallService {
    private client;

    constructor(domain: string) {
        this.client = createApiClient(domain);
    }

    async manualCallEnter(){
        return this.client.instance.post('/agent/manual_call/enter');
    }
}