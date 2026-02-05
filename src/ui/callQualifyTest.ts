// src/ui/callQualifySimpleTest.ts
import promptSync from 'prompt-sync';
import { CallService } from '../services/CallService';
import { FileTokenStorage } from '../storage/TokenStorage';

const prompt = promptSync();

console.log('📋 Teste de Qualificação de Chamada\n');
console.log(`Você precisará do call_id (obtido no evento 'call-was-connected')`);
console.log(`E do 'qualification_id' (ID da qualificação desejada)\n`);

const callId = prompt(`Digite o 'call_id': `);
const qualificationId = parseInt(prompt(`Digite o 'qualification_id': `));

(async () => {
  const storage = new FileTokenStorage();
  const authData = storage.getAuthData();
  
  if (!authData) {
    console.error('❌ Token não encontrado. Execute authenticateTest.ts antes.');
    process.exit(1);
  }
  
  const callService = new CallService(authData.domain);
  
  try {
    const result = await callService.qualify(callId, {
      qualification_id: qualificationId,
      qualification_note: ""
    });
    
    console.log('\n✅ Qualificação enviada com sucesso!');
    console.log(result);
  } catch (error: any) {
    console.error('\n❌ Erro ao qualificar!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message || error.response.data);
    } else {
      console.error('Erro:', error.message);
    }
  }
})();