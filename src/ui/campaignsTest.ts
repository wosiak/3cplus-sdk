// src/ui/campaignsTest.ts
import { CampaignService } from '../services/CampaignService';
import { FileTokenStorage } from '../storage/TokenStorage';

const storage = new FileTokenStorage();
const auth = storage.getAuthData();

if (!auth) {
  console.log('❌ Nenhum token encontrado. Autentique-se executando authenticateTest.ts');
  process.exit(1);
}

(async () => {
  try {
    const campaignService = new CampaignService(auth.domain);
    const campaigns = await campaignService.getAvailableCampaigns();

    console.log('\n📋 Campanhas disponíveis:');
    campaigns.forEach((camp, index) => {
      console.log(`${index + 1}. ${camp.name} (ID: ${camp.id})`);
    });

  } catch (error: any) {
    console.error('\n❌ Erro ao buscar campanhas');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message || error.response.data);
    } else {
      console.error('Erro desconhecido:', error.message);
    }
  }
})();
