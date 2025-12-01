// src/ui/agentLoginTest.ts
import PromptSync from "prompt-sync";
import { AgentService } from "../services/AgentService";
import { AgentLoginRequest } from "../models/Agent";

const prompt = PromptSync();

const domain = prompt('Domínio da Empresa: ');

const campaignId = Number(prompt('ID da campanha: '));

(async () => {
  try {
    const agentService = new AgentService(domain);

    const request: AgentLoginRequest = {
      campaign: campaignId,
      mode: 'dialer'
    };

    await agentService.login(request);

    console.log('\n✅ Login do agente realizado com sucesso!');

  } catch (error: any) {
    console.error('\n❌ Erro ao realizar login do agente.');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message || error.response.data);
    } else {
      console.error('Erro desconhecido:', error.message);
    }
  }
})();
