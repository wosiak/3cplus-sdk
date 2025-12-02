// src/ui/intervalsTest.ts
import { IntervalService } from '../services/IntervalService';
import { FileTokenStorage } from '../storage/TokenStorage';

const storage = new FileTokenStorage();
const auth = storage.getAuthData();

if (!auth) {
  console.log('Nenhum token encontrado. Autentique-se executando authenticateTest.ts');
  process.exit(1);
}

(async () => {
  try {
    const intervalService = new IntervalService(auth.domain);
    const intervals = await intervalService.getAvailableIntervals();

    console.log('\n⏱️ Intervalos disponíveis:');
    intervals.forEach((interval, index) => {
      console.log(`${index + 1}. ${interval.name} (ID: ${interval.id})`);
    });

  } catch (error: any) {
    console.error('\nErro ao buscar intervalos');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message || error.response.data);
    } else {
      console.error('Erro desconhecido:', error.message);
    }
  }
})();