# 3C Plus SDK

SDK de integração nativa com a plataforma **3C Plus** - uma solução de call center em nuvem.

Este projeto serve como **referência** para desenvolvedores que desejam integrar seus sistemas com a 3C Plus de forma simples e clara.

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Conceitos Importantes](#conceitos-importantes)
- [Fluxo de Integração](#fluxo-de-integração)
- [API Endpoints](#api-endpoints)
- [Eventos WebSocket](#eventos-websocket)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Exemplos de Uso](#exemplos-de-uso)
- [Interface Web (Demo)](#interface-web-demo)

---

## 🎯 Visão Geral

A 3C Plus é uma plataforma de call center que permite:
- Discagem automática (dialer) e manual
- Gerenciamento de campanhas
- Qualificação de chamadas
- Intervalos de trabalho (work breaks)
- Conexão SIP para áudio

### Este SDK oferece:

| Componente | Descrição |
|------------|-----------|
| **TypeScript SDK** (`src/`) | Serviços tipados para integração backend/Node.js |
| **Web Interface** (`web/`) | Interface HTML+JS pura como exemplo funcional |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        SEU SISTEMA                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │    │   Backend    │    │   Workers    │      │
│  │  (React/Vue) │    │  (Node/PHP)  │    │  (Scripts)   │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                   │
│                    ┌────────▼────────┐                          │
│                    │   3C Plus SDK   │                          │
│                    └────────┬────────┘                          │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ REST API │   │ WebSocket│   │   SIP    │
        │ HTTPS    │   │  Events  │   │ (iframe) │
        └──────────┘   └──────────┘   └──────────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────▼─────────┐
                    │     3C Plus       │
                    │   (Cloud PBX)     │
                    └───────────────────┘
```

---

## 🔑 Conceitos Importantes

### 1. Autenticação

```
POST https://{dominio}.3c.plus/api/v1/authenticate

Body: { user: "ramal", password: "senha", token_type: "jwt" }
Response: { data: { api_token: "JWT_TOKEN", name: "Operador", ... } }
```

O `api_token` (JWT) é usado para:
- Autorizar requisições REST (`Authorization: Bearer TOKEN`)
- Conectar ao WebSocket (`?token=TOKEN`)
- Carregar a tela SIP (`/extension?api_token=TOKEN`)

### 2. Conexão SIP (Áudio)

Para que operador e cliente se ouçam, é **obrigatório** carregar:

```
https://{dominio}.3c.plus/extension?api_token={token}
```

> ⚠️ **IMPORTANTE**: Esta página deve permanecer aberta (pode ser em iframe oculto).  
> Se fechada, o operador será deslogado automaticamente pela 3C Plus.

### 3. WebSocket (Eventos em Tempo Real)

Conectar ao WebSocket para receber eventos:

```javascript
const socket = io('https://socket.3c.plus', {
  transports: ['websocket'],
  query: { token: 'JWT_TOKEN' }
});

socket.on('call-was-connected', (data) => {
  console.log('Chamada conectada!', data);
});
```

### 4. Fluxo do Agente

```
Autenticar → Selecionar Campanha → Login na Campanha → Operar
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
              Modo Dialer          Modo Manual            Intervalo
           (aguarda chamadas)    (disca números)      (work break)
```

---

## 🔄 Fluxo de Integração

### Passo a Passo

```javascript
// 1. AUTENTICAR
const auth = await fetch('https://empresa.3c.plus/api/v1/authenticate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user: '1001', password: 'senha', token_type: 'jwt' })
});
const { data } = await auth.json();
const token = data.api_token;

// 2. CARREGAR SIP (em iframe oculto)
document.getElementById('sip-frame').src = 
  `https://empresa.3c.plus/extension?api_token=${token}`;

// 3. CONECTAR WEBSOCKET
const socket = io('https://socket.3c.plus', {
  transports: ['websocket'],
  query: { token }
});

// 4. BUSCAR CAMPANHAS
const campaigns = await fetch('https://empresa.3c.plus/api/v1/groups-and-campaigns?all=true&paused=0', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 5. ENTRAR NA CAMPANHA
await fetch('https://empresa.3c.plus/api/v1/agent/login', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` 
  },
  body: JSON.stringify({ campaign: 123, mode: 'dialer' })
});

// 6. ENTRAR EM MODO MANUAL (opcional)
await fetch('https://empresa.3c.plus/api/v1/agent/manual_call/enter', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

// 7. DISCAR
await fetch('https://empresa.3c.plus/api/v1/agent/manual_call/dial', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` 
  },
  body: JSON.stringify({ phone: 11999998888 })
});

// 8. ESCUTAR EVENTOS
socket.on('call-was-connected', (data) => {
  console.log('Telefone:', data.call.phone);
  console.log('Qualificações:', data.qualification.qualifications);
});

// 9. QUALIFICAR CHAMADA
await fetch('https://empresa.3c.plus/api/v1/calls/qualify', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` 
  },
  body: JSON.stringify({ call_id: 'abc123', qualification_id: 1 })
});
```

---

## 📡 API Endpoints

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/authenticate` | Autentica e retorna JWT |

### Campanhas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/groups-and-campaigns?all=true&paused=0` | Lista campanhas disponíveis |

### Agente

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/agent/login` | Entra em uma campanha |
| POST | `/agent/logout` | Sai da campanha |
| POST | `/agent/manual_call/enter` | Entra em modo manual |
| POST | `/agent/manual_call/exit` | Sai do modo manual |
| POST | `/agent/manual_call/dial` | Disca um número |
| POST | `/agent/call/{callId}/hangup` | Desliga a chamada atual |
| POST | `/agent/work_break/{id}/enter` | Entra em intervalo |
| POST | `/agent/work_break/exit` | Sai do intervalo |
| GET | `/agent/work_break_intervals` | Lista intervalos disponíveis |

### Chamadas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/calls/qualify` | Qualifica uma chamada |

### SIP

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/extension?api_token=TOKEN` | Página de conexão SIP |

---

## 📨 Eventos WebSocket

### Eventos de Sucesso

| Evento | Quando ocorre | Dados |
|--------|---------------|-------|
| `agent-is-connected` | Agente conectou | `{ agent }` |
| `agent-is-idle` | Agente está idle (pronto) | `{ agent }` |
| `agent-entered-manual` | Entrou em modo manual | `{ agent }` |
| `call-was-connected` | Chamada conectou | `{ call, agent, qualification, campaign }` |
| `call-was-finished` | Chamada terminou | `{ call }` |
| `agent-entered-work-break` | Entrou em intervalo | `{ interval }` |
| `agent-left-work-break` | Saiu do intervalo | `{ }` |

### Eventos de Erro

| Evento | Quando ocorre | Dados |
|--------|---------------|-------|
| `agent-login-failed` | Falha no login | `{ message, reason }` |
| `agent-manual-enter-failed` | Falha ao entrar manual | `{ message }` |
| `call-dial-failed` | Falha na discagem | `{ message }` |
| `agent-was-logged-out` | Agente foi deslogado | `{ reason }` |
| `error` | Erro genérico | `{ message }` |

### Estrutura do Evento `call-was-connected`

```javascript
{
  call: {
    id: "abc123",
    phone: "11999998888",
    // ...outros dados da chamada
  },
  agent: {
    name: "João Silva",
    extension: 1001,
    // ...outros dados do agente
  },
  campaign: {
    id: 123,
    name: "Campanha Vendas"
  },
  qualification: {
    qualifications: [
      { id: 1, name: "Venda realizada" },
      { id: 2, name: "Sem interesse" },
      { id: 3, name: "Retornar depois" }
    ]
  }
}
```

---

## 📁 Estrutura do Projeto

```
3cplus-sdk/
│
├── src/                          # SDK TypeScript
│   ├── api/
│   │   ├── ApiClient.ts          # Cliente HTTP base (axios)
│   │   └── ApiClientFactory.ts   # Factory para criar clientes autenticados
│   │
│   ├── models/                   # Interfaces/tipos TypeScript
│   │   ├── Auth.ts               # Tipos de autenticação
│   │   ├── Agent.ts              # Tipos do agente
│   │   ├── Campaign.ts           # Tipos de campanha
│   │   ├── Interval.ts           # Tipos de intervalo
│   │   └── ManualCall.ts         # Tipos de chamada manual
│   │
│   ├── services/                 # Serviços de negócio
│   │   ├── AuthService.ts        # Autenticação
│   │   ├── AgentService.ts       # Operações do agente
│   │   ├── CampaignService.ts    # Campanhas
│   │   ├── IntervalService.ts    # Intervalos
│   │   └── ManualCallService.ts  # Chamadas manuais
│   │
│   ├── socket/                   # WebSocket
│   │   ├── SocketClient.ts       # Cria conexão socket
│   │   ├── SocketEvents.ts       # Constantes de eventos
│   │   └── SocketHandler.js      # Handler de eventos
│   │
│   ├── storage/
│   │   └── TokenStorage.ts       # Persistência de token (arquivo)
│   │
│   └── ui/                       # Scripts de teste CLI
│       ├── authenticateTest.ts
│       ├── agentLoginTest.ts
│       └── ...
│
├── web/                          # Interface Web (Demo)
│   ├── index.html                # Página HTML + CSS
│   ├── app.js                    # Lógica JavaScript pura
│   └── README.md                 # Documentação da interface
│
├── package.json
├── tsconfig.json
└── README.md                     # Esta documentação
```

---

## 💻 Exemplos de Uso

### TypeScript/Node.js

```typescript
import { AuthService } from './services/AuthService';
import { AgentService } from './services/AgentService';
import { createSocket } from './socket/SocketClient';

// Autenticar
const authService = new AuthService('empresa');
const result = await authService.authenticate({
  user: '1001',
  password: 'senha',
  token_type: 'jwt'
});

// Conectar socket
const socket = createSocket(result.data.api_token);

// Login na campanha
const agentService = new AgentService('empresa');
await agentService.login({ campaign: 123, mode: 'dialer' });

// Escutar eventos
socket.on('call-was-connected', (data) => {
  console.log('Chamada:', data.call.phone);
});
```

### JavaScript Puro (Browser)

Veja o arquivo `web/app.js` para um exemplo completo de integração usando apenas JavaScript vanilla.

---

## 🌐 Interface Web (Demo)

A pasta `web/` contém uma interface funcional de exemplo:

```bash
cd web
python3 -m http.server 8080
# Acesse: http://localhost:8080
```

### Funcionalidades da Demo

1. ✅ Login (domínio, ramal, senha)
2. ✅ Conexão SIP automática (iframe)
3. ✅ Conexão WebSocket
4. ✅ Seleção de campanha
5. ✅ Modo manual com discagem
6. ✅ Exibição de chamada ativa
7. ✅ Qualificação de chamadas
8. ✅ Log de eventos em tempo real

---

## 🎨 Identidade Visual

A interface usa as cores oficiais da 3C Plus:

| Cor | Hex | Uso |
|-----|-----|-----|
| Azul | `#294ace` | Botões principais |
| Amarelo | `#FFBB3A` | Destaque 3C Plus |
| Fundo | `#F9FAFC` | Background |
| Texto | `#373753` | Texto principal |

---

## 📝 Licença

Este SDK é fornecido como referência para integração com a 3C Plus.

---

## 🤝 Contribuição

Sugestões e melhorias são bem-vindas! Este projeto visa facilitar a integração de outros sistemas com a plataforma 3C Plus.

