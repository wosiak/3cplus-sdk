# 3C Plus - Interface Web do Operador

Interface web leve em HTML + JavaScript puro para integração com a plataforma 3C Plus.

## Fluxo da Aplicação

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   1. LOGIN      │────▶│  2. CAMPANHAS    │────▶│  3. CAMPANHA ATIVA  │
│  (ramal+senha)  │     │  (selecionar)    │     │   (modo dialer)     │
└─────────────────┘     └──────────────────┘     └──────────┬──────────┘
                                                           │
                                                           ▼
                                                ┌─────────────────────┐
                                                │   4. MODO MANUAL    │
                                                │  (tela amarelada)   │
                                                │  - digitar número   │
                                                │  - clicar em Ligar  │
                                                └─────────────────────┘
```

## Funcionalidades

### 1. Autenticação
- Login com domínio, ramal e senha
- Carrega iframe `/extension` para conexão SIP (áudio)
- Conecta ao WebSocket para eventos em tempo real

### 2. Seleção de Campanha
- Lista campanhas disponíveis (`GET /groups-and-campaigns`)
- Clique para entrar na campanha (`POST /agent/login`)

### 3. Campanha Ativa
- Visualiza campanha conectada
- Botão para entrar em Modo Manual
- Log de eventos em tempo real

### 4. Modo Manual (tela amarelada)
- Entra via `POST /agent/manual_call/enter`
- Campo para digitar número de telefone
- Botão "Ligar" (`POST /agent/manual_call/dial`)
- Exibe informações da chamada quando conectada
- Lista qualificações para selecionar e enviar

## Como Usar

### Opção 1: Abrir diretamente no navegador

Basta abrir o arquivo `index.html` diretamente no navegador.

> ⚠️ **Nota**: Devido às políticas de CORS, pode ser necessário usar um servidor HTTP local.

### Opção 2: Usar um servidor HTTP local

```bash
# Com Python 3
cd web
python3 -m http.server 8080

# Com Node.js (npx)
npx serve .

# Com PHP
php -S localhost:8080
```

Acesse: http://localhost:8080

## Estrutura

```
web/
├── index.html    # Página principal com HTML e CSS
├── app.js        # Lógica JavaScript (autenticação, socket, UI)
└── README.md     # Esta documentação
```

## API Endpoints Utilizados

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/authenticate` | Autenticação do usuário |
| GET | `/groups-and-campaigns?all=true&paused=0` | Lista campanhas disponíveis |
| POST | `/agent/login` | Login do agente em uma campanha |
| POST | `/agent/logout` | Logout do agente |
| POST | `/agent/manual_call/enter` | Entra em modo manual |
| POST | `/agent/manual_call/exit` | Sai do modo manual |
| POST | `/agent/manual_call/dial` | Disca um número manualmente |
| POST | `/calls/qualify` | Envia qualificação da chamada |
| GET | `/extension?api_token=TOKEN` | Página de conexão SIP (iframe) |

## Eventos WebSocket Suportados

| Evento | Descrição |
|--------|-----------|
| `call-was-connected` | Chamada conectada - exibe informações e qualificações |
| `call-was-finished` | Chamada finalizada |
| `agent-is-connected` | Agente conectado |
| `agent-is-idle` | Agente em espera |
| `agent-entered-manual` | Agente entrou em modo manual |
| `agent-entered-work-break` | Agente entrou em intervalo |
| `agent-left-work-break` | Agente saiu do intervalo |
| `agent-was-logged-out` | Agente deslogado |

## Conexão SIP (iframe /extension)

Após a autenticação, um iframe oculto carrega automaticamente:

```
https://{dominio}.3c.plus/extension?api_token={token}
```

Esta página é responsável pela **conexão SIP** que permite que o operador e o cliente se ouçam durante a chamada.

### ⚠️ Importante

- O iframe NUNCA deve ser fechado enquanto o operador estiver logado
- Se fechado, a 3C Plus irá deslogar o operador automaticamente
- O navegador deve ter permissão de microfone habilitada

## Interface Visual

Usa as cores oficiais da 3C Plus:

| Cor | Hex | Uso |
|-----|-----|-----|
| Azul | `#294ace` | Botões principais |
| Amarelo | `#FFBB3A` | Destaque 3C Plus, modo manual |
| Fundo | `#F9FAFC` | Background principal |
| Texto | `#373753` | Texto principal |

- **Tela de Login**: Fundo claro com botão azul
- **Seleção de Campanhas**: Cards com gradiente azul/amarelo
- **Campanha Ativa**: Fundo claro padrão
- **Modo Manual**: **Fundo amarelado** para indicar visualmente o modo especial

## Próximos Passos

- [ ] Adicionar modo automático (aguardar chamadas do discador)
- [ ] Implementar intervalos (work breaks)
- [ ] Adicionar reconexão automática do WebSocket
- [ ] Evoluir para extensão Chrome ou app React
