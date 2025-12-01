// src/ui/campaignsTest.ts

import promptSync from 'prompt-sync';
import { CampaignService } from '../services/CampaignService';

const prompt = promptSync();
const domain = prompt('Domínio da Empresa: ');

(async () => {
  try {
    const campaignService = new CampaignService(domain);
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
