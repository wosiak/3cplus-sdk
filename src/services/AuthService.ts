// src/services/AuthService.ts

import { ApiClient } from '../api/ApiClient';
import { LoginRequest, LoginResponse } from '../models/Auth';

export class AuthService {
  private client: ApiClient;

  constructor(companyDomain: string) {
    const baseURL = `https://${companyDomain}.3c.plus/api/v1/`;
    this.client = new ApiClient(baseURL);
  }

  async authenticate(request: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.instance.post<LoginResponse>(
      'authenticate',
      request
    );
    return response.data;
  }
}