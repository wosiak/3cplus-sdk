// src/models/Agent.ts
export interface AgentLoginRequest{
    campaign: number;
    mode: 'dialer';
}

export interface AgentWorkBreakEnter{
    interval_id: number;
}