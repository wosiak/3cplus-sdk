// src/ui/authenticateTest.ts
import promptSync from 'prompt-sync';
import { AuthService } from '../services/AuthService';
import { FileTokenStorage } from '../storage/TokenStorage';

const prompt = promptSync();

const domain = prompt('Domínio da Empresa: ');
const user = prompt('Ramal: ');
const password = prompt('Senha: ');

(async () => {
  const authService = new AuthService(domain);

  try {
    const result = await authService.authenticate({
      user,
      password,
      token_type: 'jwt'
    });

    console.log('\nAutenticação realizada com sucesso!');
    console.log('Api_token - JWT:', result.data.api_token);
    console.log('Operador:', result.data.name);
    console.log('Empresa:', result.data.company.name);

    const tokenStorage = new FileTokenStorage();
    tokenStorage.saveToken(result.data.api_token);
    
  } catch (error: any) {
    console.error('\n❌ Erro ao autenticar!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message || error.response.data);
    } else {
      console.error('Erro desconhecido:', error.message);
    }
  }
})();
