// src/ui/agentWorkBreakEnter.ts
import PromptSync from "prompt-sync";
import { AgentService } from "../services/AgentService";
import { FileTokenStorage } from "../storage/TokenStorage";

const prompt = PromptSync();
const storage = new FileTokenStorage();
const auth = storage.getAuthData();

if (!auth) {
  console.error("Token não encontrado. Execute authenticateTest.ts primeiro.");
  process.exit(1);
}

(async () => {
    try {
        const interval_id = Number(prompt('ID do Intervalo desejado: '));

        const agentService = new AgentService(auth.domain);

        await agentService.workBreakEnter(interval_id);

        console.log('\nAgente entrou em intervalo!');
    } catch (error: any) {
    console.error('\nErro ao entrar em intervalo.');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message || error.response.data);
    } else {
      console.error('Erro desconhecido:', error.message);
    }
  }
})();