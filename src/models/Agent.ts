// src/models/Agent.ts
export interface AgentLoginRequest{
    campaign: number;
    mode: 'dialer';
}

export interface AgentLogoutRequest{
    // Não é necessário corpo na requisição de logout
}