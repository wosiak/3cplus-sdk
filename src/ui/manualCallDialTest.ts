// src/ui/manualCallDialTest.ts
import PromptSync from "prompt-sync";
import { FileTokenStorage } from "../storage/TokenStorage";
import { ManualCallService } from "../services/ManualCallService";

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

    await manualCall.manualCallDial({ phone });

    console.log(`\n📞 Ligação iniciada para o número: ${phone}`);
  } catch (error: any) {
    console.error('\n❌ Erro ao iniciar chamada manual.');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message || error.response.data);
    } else {
      console.error('Erro desconhecido:', error.message);
    }
  }
})();
