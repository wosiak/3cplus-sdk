// src/ui/manualCallEnterTest.ts
import { ManualCallService } from "../services/ManualCallService";
import { FileTokenStorage } from "../storage/TokenStorage";

const storage = new FileTokenStorage();
const auth = storage.getAuthData();

if (!auth) {
  console.error("Token não encontrado. Execute authenticateTest.ts primeiro.");
  process.exit(1);
}

(async () => {
    try {
        const manualCallService = new ManualCallService(auth.domain);

        await manualCallService.manualCallExit();

        console.log('\nAgente saiu do Modo Manual!');
    } catch (error: any) {
    console.error('\nErro ao sair do Modo Manual.');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message || error.response.data);
    } else {
      console.error('Erro desconhecido:', error.message);
    }
  }
})();