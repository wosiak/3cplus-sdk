// src/ui/manualCallDialTest.ts
import PromptSync from "prompt-sync";
import { ManualCallService } from "../services/ManualCallService";
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
    const phone = Number(prompt('Digite o número desejado: '));

    const manualCall = new ManualCallService(auth.domain);
    const result = await manualCall.manualCallDial({ phone });

    const callId = result.call.id;
    console.log(`\nLigação iniciada para ${result.call.number}`);
    console.log(`ID da Chamada: ${callId}`);
    console.log(`Agente: ${result.agent.name}`);


  } catch (error: any) {
    console.error('\nErro ao iniciar chamada.');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message || error.response.data);
    } else {
      console.error('Erro desconhecido:', error.message);
    }
  }
})();