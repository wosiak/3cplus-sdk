// src/api/ApiClientFactory.ts
import { ApiClient } from './ApiClient';
import { FileTokenStorage } from '../storage/TokenStorage';

export function createApiClient(domain: string): ApiClient {
  const token = new FileTokenStorage().getToken();

  if (!token) {
    throw new Error('Token não encontrado. Faça autenticação primeiro.');
  }

  const baseURL = `https://${domain}.3c.plus/api/v1/`;
  return new ApiClient(baseURL, token);
}
