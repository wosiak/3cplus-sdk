// src/models/Auth.ts
export interface LoginRequest {
  user: string;
  password: string;
  token_type: 'jwt';
}

export interface ExtensionInfo {
  extension_number: number;
}

export interface CompanyInfo {
  id: number;
  name: string;
  domain: string;
}

export interface LoginResponse {
  status: number;
  data: {
    api_token: string;
    name: string;
    extension: ExtensionInfo;
    company: CompanyInfo;
  };
}
