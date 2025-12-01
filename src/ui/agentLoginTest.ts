// src/ui/agentLoginTest.ts

import PromptSync from "prompt-sync";
import { AgentService } from "../services/AgentService";
import { FileTokenStorage } from "../storage/TokenStorage";

const prompt = PromptSync();
const storage = new FileTokenStorage();
const auth = storage.getAuthData();

if (!auth) {
  console.error("❌ Token não encontrado. Execute authenticateTest.ts primeiro.");
  process.exit(1);
}

(async () => {
  try {
    const campaignId = Number(prompt('ID da campanha para login: '));

    const agentService = new AgentService(auth.domain);

    await agentService.login({
      campaign: campaignId,
      mode: 'dialer'
    });

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