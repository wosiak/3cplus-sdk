// src/ui/callHangupTest.ts
import promptSync from 'prompt-sync';
import { CallService } from '../services/CallService';
import { FileTokenStorage } from '../storage/TokenStorage';

const prompt = promptSync();

console.log('Teste de Desligar Chamada\n');
console.log(`Você precisará do call_id (obtido no evento 'call-was-connected')\n`);

const callId = prompt(`Digite o 'call_id': `);

(async () => {
  const storage = new FileTokenStorage();
  const authData = storage.getAuthData();
  
  if (!authData) {
    console.error('❌ Token não encontrado. Execute authenticateTest.ts antes.');
    process.exit(1);
  }
  
  const callService = new CallService(authData.domain);
  
  try {
    await callService.hangup(callId);
    
    console.log('\n✅ Chamada desligada com sucesso!');
  } catch (error: any) {
    console.error('\n❌ Erro ao desligar chamada!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message || error.response.data);
    } else {
      console.error('Erro:', error.message);
    }
  }
})();