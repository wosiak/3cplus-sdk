// src/services/AuthService.ts
import { ApiClient } from '../api/ApiClient';
import { AuthenticationRequest, AuthenticationResponse } from '../models/Auth';

export class AuthService {
  private client: ApiClient;

  constructor(companyDomain: string) {
    const baseURL = `https://${companyDomain}.3c.plus/api/v1/`;
    this.client = new ApiClient(baseURL); // sem token
  }

  async authenticate(request: AuthenticationRequest): Promise<AuthenticationResponse> {
    const response = await this.client.instance.post<AuthenticationResponse>(
      'authenticate',
      request
    );
    return response.data;
  }
}