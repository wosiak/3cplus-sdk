// src/ui/agentWorkBreakExit.ts
import { AgentService } from "../services/AgentService";
import { FileTokenStorage } from "../storage/TokenStorage";

const storage = new FileTokenStorage();
const auth = storage.getAuthData();

if (!auth) {
  console.error("Token não encontrado. Execute authenticateTest.ts primeiro.");
  process.exit(1);
}

(async () => {
  try {
    const agentService = new AgentService(auth.domain);

    await agentService.workBreakExit();

    console.log('\nAgente saiu do intervalo!');
  } catch (error: any) {
    console.error('\nErro ao sair do intervalo.');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message || error.response.data);
    } else {
      console.error('Erro desconhecido:', error.message);
    }
  }
})();
