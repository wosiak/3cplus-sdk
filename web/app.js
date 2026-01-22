/**
 * 3C Plus - Operador 
 * 
 * FLUXO:
 * 1. Login (ramal + senha) → Autenticação
 * 2. Lista Campanhas disponíveis
 * 3. Operador seleciona campanha → Login do agente
 * 4. Na campanha, pode entrar em Modo Manual
 * 5. No Modo Manual, pode discar números
 */

// ============================================================================
// Estado Global da Aplicação
// ============================================================================

const AppState = {
  // Autenticação
  token: null,
  domain: null,
  extension: null,
  userName: null,
  companyName: null,
  sipExtensionUrl: null,
  sipLoaded: false,
  
  // Socket
  socket: null,
  isConnected: false,
  
  // Campanhas
  campaigns: [],
  currentCampaign: null,
  
  // Status do Agente
  agentStatus: null,
  
  // Modo
  isManualMode: false,
  
  // Chamada atual
  currentCall: null,
  callStartTime: null,
  callDurationInterval: null,
  
  // Qualificações
  qualifications: [],
  selectedQualification: null
};

// ============================================================================
// Configurações e Constantes
// ============================================================================

const Config = {
  SOCKET_URL: 'https://socket.3c.plus',
  API_BASE_URL: (domain) => `https://${domain}.3c.plus/api/v1`
};

const SocketEvents = {
  // Conexão
  AGENT_IS_CONNECTED: 'agent-is-connected',
  
  // Login/Logout
  AGENT_IS_IDLE: 'agent-is-idle',
  AGENT_LOGIN_FAILED: 'agent-login-failed',
  AGENT_WAS_LOGGED_OUT: 'agent-was-logged-out',
  
  // Modo Manual
  AGENT_ENTERED_MANUAL: 'agent-entered-manual',
  AGENT_MANUAL_ENTER_FAILED: 'agent-manual-enter-failed',
  
  // Chamadas
  CALL_WAS_CONNECTED: 'call-was-connected',
  CALL_WAS_FINISHED: 'call-was-finished',
  CALL_DIAL_FAILED: 'call-dial-failed',
  
  // Chamadas Manuais - Qualificação
  MANUAL_CALL_WAS_ANSWERED: 'manual-call-was-answered',
  CALL_HISTORY_WAS_CREATED: 'call-history-was-created',
  
  // Intervalos
  AGENT_ENTERED_WORK_BREAK: 'agent-entered-work-break',
  AGENT_LEFT_WORK_BREAK: 'agent-left-work-break',
  
  // Erros genéricos
  ERROR: 'error',
  EXCEPTION: 'exception'
};

// ============================================================================
// Status do Agente (agent.status)
// ============================================================================

const AgentStatus = {
  OFFLINE: 0,                    // O Agente está Offline
  IDLE: 1,                       // O Agente está ocioso
  ON_CALL: 2,                    // O Agente está em uma chamada
  ACW: 3,                        // O Agente está em pós atendimento
  ON_MANUAL_CALL: 4,             // O Agente está realizando uma chamada manual
  ON_MANUAL_CALL_CONNECTED: 5,   // O Agente está em uma chamada manual conectada
  ON_WORK_BREAK: 6,              // O Agente está em intervalo
  ON_MANUAL_CALL_ACW: 21,        // O Agente está em pós atendimento de chamada manual
  MANUAL_CALL_CONNECTED: 22      // O Agente está em uma chamada manual pós atendimento conectada
};

// Descrições dos status para exibição
const AgentStatusLabels = {
  [AgentStatus.OFFLINE]: 'Offline',
  [AgentStatus.IDLE]: 'Ocioso',
  [AgentStatus.ON_CALL]: 'Em chamada',
  [AgentStatus.ACW]: 'Pós atendimento',
  [AgentStatus.ON_MANUAL_CALL]: 'Chamada manual',
  [AgentStatus.ON_MANUAL_CALL_CONNECTED]: 'Chamada manual conectada',
  [AgentStatus.ON_WORK_BREAK]: 'Em intervalo',
  [AgentStatus.ON_MANUAL_CALL_ACW]: 'Pós atendimento manual',
  [AgentStatus.MANUAL_CALL_CONNECTED]: 'Chamada manual conectada'
};

// ============================================================================
// Sistema de Aguardar Evento (Promise-based)
// ============================================================================

/**
 * Aguarda um evento específico do socket com timeout
 * @param {string|string[]} successEvents - Evento(s) que indica(m) sucesso
 * @param {string|string[]} failureEvents - Evento(s) que indica(m) falha
 * @param {number} timeout - Timeout em ms (default 10s)
 * @returns {Promise<{event: string, data: any}>}
 */
function waitForSocketEvent(successEvents, failureEvents = [], timeout = 10000, shouldReject) {
  return new Promise((resolve, reject) => {
    if (!AppState.socket) {
      reject(new Error('Socket não conectado'));
      return;
    }
    
    const successList = Array.isArray(successEvents) ? successEvents : [successEvents];
    const failureList = Array.isArray(failureEvents) ? failureEvents : [failureEvents];
    
    let resolved = false;
    
    const successHandlers = new Map();
    const failureHandlers = new Map();
    
    const cleanup = () => {
      successHandlers.forEach((handler, evt) => AppState.socket.off(evt, handler));
      failureHandlers.forEach((handler, evt) => AppState.socket.off(evt, handler));
    };
    
    const successHandler = (event, data) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve({ event, data });
    };
    
    const failureHandler = (event, data) => {
      if (resolved) return;
      if (typeof shouldReject === 'function' && !shouldReject(event, data)) {
        return;
      }
      resolved = true;
      cleanup();
      reject(new Error(data?.message || data?.reason || 'Operação falhou'));
    };
    
    // Registra listeners
    successList.forEach((evt) => {
      const handler = (data) => successHandler(evt, data);
      successHandlers.set(evt, handler);
      AppState.socket.on(evt, handler);
    });
    failureList.forEach((evt) => {
      const handler = (data) => failureHandler(evt, data);
      failureHandlers.set(evt, handler);
      AppState.socket.on(evt, handler);
    });
    
    // Timeout
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      cleanup();
      // Não rejeita no timeout, apenas resolve sem dados (a requisição HTTP já passou)
      resolve({ event: 'timeout', data: null });
    }, timeout);
  });
}

// ============================================================================
// Elementos DOM
// ============================================================================

const DOM = {
  // Sections
  loginSection: document.getElementById('login-section'),
  campaignsSection: document.getElementById('campaigns-section'),
  campaignActiveSection: document.getElementById('campaign-active-section'),
  
  // Login
  loginForm: document.getElementById('login-form'),
  domainInput: document.getElementById('domain'),
  extensionInput: document.getElementById('extension'),
  passwordInput: document.getElementById('password'),
  loginBtn: document.getElementById('login-btn'),
  
  // Status
  connectionStatus: document.getElementById('connection-status'),
  statusText: document.getElementById('status-text'),
  headerRight: document.getElementById('header-right'),
  
  // Campaigns
  loadingCampaigns: document.getElementById('loading-campaigns'),
  campaignList: document.getElementById('campaign-list'),
  activeCampaignName: document.getElementById('active-campaign-name'),
  
  // Manual Mode (old separate section)
  phoneInput: document.getElementById('phone-input'),
  dialBtn: document.getElementById('dial-btn'),
  
  // Campaign Status Info
  campaignStatusInfo: document.getElementById('campaign-status-info'),
  
  // Manual Mode (inline in campaign)
  btnToggleManual: document.getElementById('btn-toggle-manual'),
  manualDialerSection: document.getElementById('manual-dialer-section'),
  phoneInputCampaign: document.getElementById('phone-input-campaign'),
  dialBtnCampaign: document.getElementById('dial-btn-campaign'),
  
  // Call Info (inline in campaign)
  callInfoCampaign: document.getElementById('call-info-campaign'),
  callPhoneCampaign: document.getElementById('call-phone-campaign'),
  callIdCampaign: document.getElementById('call-id-campaign'),
  callDurationCampaign: document.getElementById('call-duration-campaign'),
  
  // Qualifications (inline in campaign)
  qualificationsCampaign: document.getElementById('qualifications-campaign'),
  qualificationListCampaign: document.getElementById('qualification-list-campaign'),
  sendQualificationBtnCampaign: document.getElementById('send-qualification-btn-campaign'),
  
  // Events
  eventsLog: document.getElementById('events-log'),
  
  // Toast
  toastContainer: document.getElementById('toast-container'),
  
  // SIP Extension iframe
  sipExtensionFrame: document.getElementById('sip-extension-frame')
};

// ============================================================================
// Utilidades
// ============================================================================

/**
 * Exibe uma notificação toast
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  
  DOM.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Formata a duração em mm:ss
 */
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formata hora atual
 */
function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Formata número de telefone para exibição
 */
function formatPhone(phone) {
  if (!phone) return '--';
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Limpa número de telefone (só dígitos)
 */
function cleanPhone(phone) {
  return String(phone).replace(/\D/g, '');
}

/**
 * Extrai o ramal do payload de eventos do socket
 */
function getAgentExtensionFromEvent(data) {
  const agent = data?.agent;
  return (
    agent?.extension?.extension_number ??
    agent?.extension_number ??
    agent?.extension ??
    agent?.ramal ??
    null
  );
}

// ============================================================================
// Navegação entre Seções
// ============================================================================

/**
 * Mostra uma seção específica e esconde as outras
 */
function showSection(sectionId) {
  const sections = ['login-section', 'campaigns-section', 'campaign-active-section'];
  
  sections.forEach(id => {
    const section = document.getElementById(id);
    if (section) {
      section.classList.remove('active');
    }
  });
  
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
  }
}

/**
 * Atualiza o badge de status
 */
function updateStatusBadge(status) {
  DOM.connectionStatus.classList.remove('connected', 'disconnected', 'manual');
  
  switch(status) {
    case 'connected':
      DOM.connectionStatus.classList.add('connected');
      DOM.statusText.textContent = 'Conectado';
      break;
    case 'disconnected':
      DOM.connectionStatus.classList.add('disconnected');
      DOM.statusText.textContent = 'Desconectado';
      break;
    case 'manual':
      DOM.connectionStatus.classList.add('manual');
      DOM.statusText.textContent = 'Modo Manual';
      break;
  }
}

// ============================================================================
// API
// ============================================================================

/**
 * Faz requisição para a API da 3C Plus
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${Config.API_BASE_URL(AppState.domain)}/${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  if (AppState.token) {
    headers['Authorization'] = `Bearer ${AppState.token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  
  // Tenta parsear JSON, mas aceita resposta vazia (alguns endpoints não retornam body)
  let data = null;
  const contentType = response.headers.get('content-type');
  const text = await response.text();
  
  if (text && contentType && contentType.includes('application/json')) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Resposta não é JSON válido, mas pode ser sucesso
      console.warn('Resposta não é JSON válido:', text);
    }
  }
  
  if (!response.ok) {
    throw new Error(data?.message || `Erro ${response.status}: ${response.statusText}`);
  }
  
  return data;
}

/**
 * Autentica o usuário
 */
async function authenticate(domain, user, password) {
  AppState.domain = domain;
  
  const data = await apiRequest('authenticate', {
    method: 'POST',
    body: JSON.stringify({
      user,
      password,
      token_type: 'jwt'
    })
  });
  
  AppState.token = data.data.api_token;
  AppState.userName = data.data.name;
  AppState.companyName = data.data.company.name;
  AppState.extension = data.data.extension?.extension_number || AppState.extension;
  
  return data;
}

/**
 * Busca campanhas disponíveis
 */
async function fetchCampaigns() {
  const data = await apiRequest('groups-and-campaigns?all=true&paused=0');
  return data.data || [];
}

/**
 * Login do agente em uma campanha
 */
async function agentLogin(campaignId) {
  return await apiRequest('agent/login', {
    method: 'POST',
    body: JSON.stringify({
      campaign: campaignId,
      mode: 'dialer'
    })
  });
}

/**
 * Logout do agente
 */
async function agentLogout() {
  return await apiRequest('agent/logout', {
    method: 'POST'
  });
}

/**
 * Entra em modo manual
 */
async function manualCallEnter() {
  return await apiRequest('agent/manual_call/enter', {
    method: 'POST'
  });
}

/**
 * Disca um número no modo manual
 */
async function manualCallDial(phone) {
  return await apiRequest('agent/manual_call/dial', {
    method: 'POST',
    body: JSON.stringify({
      phone: parseInt(phone)
    })
  });
}

/**
 * Sai do modo manual
 */
async function manualCallExit() {
  return await apiRequest('agent/manual_call/exit', {
    method: 'POST'
  });
}

/**
 * Desliga a chamada atual
 */
async function callHangup(callId) {
  return await apiRequest(`agent/call/${callId}/hangup`, {
    method: 'POST'
  });
}

/**
 * Envia qualificação para a chamada atual
 */
async function sendQualification(callId, qualificationId) {
  return await apiRequest('calls/qualify', {
    method: 'POST',
    body: JSON.stringify({
      call_id: callId,
      qualification_id: qualificationId
    })
  });
}

// ============================================================================
// SIP Extension
// ============================================================================

/**
 * Carrega o iframe do /extension para conexão SIP
 */
function loadSipExtension() {
  const extensionUrl = `https://${AppState.domain}.3c.plus/extension?api_token=${AppState.token}`;
  
  if (AppState.sipExtensionUrl === extensionUrl && AppState.sipLoaded) {
    return;
  }
  
  console.log('📞 Carregando SIP Extension:', extensionUrl);
  addEventLog('sip-loading', 'Carregando conexão SIP...');
  
  AppState.sipExtensionUrl = extensionUrl;
  DOM.sipExtensionFrame.src = extensionUrl;
  
  DOM.sipExtensionFrame.onload = () => {
    console.log('✅ SIP Extension carregado com sucesso!');
    AppState.sipLoaded = true;
    addEventLog('sip-loaded', 'Conexão SIP estabelecida');
  };
  
  DOM.sipExtensionFrame.onerror = () => {
    console.error('❌ Erro ao carregar SIP Extension');
    addEventLog('sip-error', 'Erro ao carregar conexão SIP');
    showToast('Erro ao estabelecer conexão SIP', 'error');
  };
}

/**
 * Descarrega o iframe do /extension
 */
function unloadSipExtension() {
  DOM.sipExtensionFrame.src = 'about:blank';
  AppState.sipLoaded = false;
  AppState.sipExtensionUrl = null;
  console.log('📞 SIP Extension descarregado');
}

// ============================================================================
// WebSocket
// ============================================================================

/**
 * Conecta ao WebSocket da 3C Plus
 */
function connectSocket() {
  if (AppState.socket) {
    AppState.socket.disconnect();
  }
  
  AppState.socket = io(Config.SOCKET_URL, {
    transports: ['websocket'],
    query: { token: AppState.token }
  });
  
  setupSocketListeners();
}

/**
 * Configura os listeners do socket
 */
function setupSocketListeners() {
  const socket = AppState.socket;
  
  socket.on('connect', () => {
    console.log('✅ Conectado ao WebSocket!');
    AppState.isConnected = true;
    updateStatusBadge(AppState.isManualMode ? 'manual' : 'connected');
    addEventLog('connect', 'Conectado ao servidor');
    showToast('Conectado ao servidor 3C Plus!', 'success');
  });
  
  socket.on('disconnect', (reason) => {
    console.log('❌ Desconectado do WebSocket:', reason);
    AppState.isConnected = false;
    updateStatusBadge('disconnected');
    addEventLog('disconnect', `Desconectado: ${reason}`);
    showToast('Desconectado do servidor', 'error');
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Erro de conexão:', error);
    addEventLog('connect_error', error.message);
    showToast('Erro ao conectar: ' + error.message, 'error');
  });
  
  socket.onAny((event, data) => {
    console.log(`📡 Evento recebido: ${event}`, data);
    handleSocketEvent(event, data);
  });
}

/**
 * Processa eventos recebidos do socket
 */
function handleSocketEvent(event, data) {
  addEventLog(event, JSON.stringify(data || {}).substring(0, 100));
  
  switch (event) {
    // ===== Eventos de Sucesso =====
    case SocketEvents.CALL_WAS_CONNECTED:
      handleCallConnected(data);
      break;
      
    case SocketEvents.CALL_WAS_FINISHED:
      handleCallFinished(data);
      break;
      
    case SocketEvents.AGENT_IS_CONNECTED:
      showToast('Agente conectado', 'success');
      break;
      
    case SocketEvents.AGENT_IS_IDLE:
      // Verifica o status real do agente
      handleAgentStatusChange(data);
      break;
      
    case SocketEvents.AGENT_ENTERED_MANUAL:
      // Confirmação de entrada no modo manual - MUDA PARA TELA AMARELA
      console.log('✅ Entrou em modo manual - confirmado');
      handleAgentEnteredManual();
      break;
      
    case SocketEvents.MANUAL_CALL_WAS_ANSWERED:
      // Chamada manual foi atendida - MOSTRA QUALIFICAÇÕES
      console.log('✅ Chamada manual atendida - mostrando qualificações');
      handleManualCallAnswered(data);
      break;
      
    case SocketEvents.CALL_HISTORY_WAS_CREATED:
      // Histórico de chamada criado - MOSTRA QUALIFICAÇÕES (se não qualificada)
      console.log('✅ Histórico de chamada criado');
      handleCallHistoryCreated(data);
      break;
      
    case SocketEvents.AGENT_ENTERED_WORK_BREAK:
      showToast('Entrou em intervalo', 'info');
      break;
      
    case SocketEvents.AGENT_LEFT_WORK_BREAK:
      showToast('Saiu do intervalo', 'info');
      break;
      
    // ===== Eventos de Erro/Falha =====
    case SocketEvents.AGENT_LOGIN_FAILED:
      showToast('Falha no login: ' + (data?.message || data?.reason || 'Erro desconhecido'), 'error');
      // Volta para seleção de campanha
      AppState.currentCampaign = null;
      showSection('campaigns-section');
      break;
      
    case SocketEvents.AGENT_MANUAL_ENTER_FAILED:
      showToast('Falha ao entrar no modo manual: ' + (data?.message || data?.reason || 'Erro desconhecido'), 'error');
      AppState.isManualMode = false;
      break;
      
    case SocketEvents.CALL_DIAL_FAILED:
      showToast('Falha na discagem: ' + (data?.message || data?.reason || 'Erro desconhecido'), 'error');
      // Reabilita botão inline
      if (DOM.dialBtnCampaign) {
        DOM.dialBtnCampaign.disabled = false;
        DOM.dialBtnCampaign.innerHTML = '📞 Ligar';
      }
      break;
      
    case SocketEvents.AGENT_WAS_LOGGED_OUT:
      showToast('Agente deslogado', 'error');
      // Volta para seleção de campanha
      AppState.currentCampaign = null;
      AppState.isManualMode = false;
      showSection('campaigns-section');
      loadCampaigns();
      break;
      
    case SocketEvents.ERROR:
    case SocketEvents.EXCEPTION:
      showToast('Erro: ' + (data?.message || data?.reason || 'Erro desconhecido'), 'error');
      console.error('Socket error/exception:', data);
      break;
  }
}

/**
 * Processa mudança de status do agente
 * Baseado no campo agent.status
 */
function handleAgentStatusChange(data) {
  const agentStatus = data?.agent?.status;
  const statusLabel = AgentStatusLabels[agentStatus] || `Status ${agentStatus}`;
  
  console.log(`📊 Status do agente: ${agentStatus} (${statusLabel})`);
  
  // Atualiza o estado baseado no status
  switch (agentStatus) {
    case AgentStatus.IDLE:
      // Agente ocioso - pronto para receber chamadas
      console.log('✅ Agente está ocioso - pronto para chamadas');
      AppState.isManualMode = false;
      
      // Restaura a UI para o estado inicial (aguardando chamadas)
      if (DOM.campaignStatusInfo) {
        DOM.campaignStatusInfo.style.display = 'block';
      }
      if (DOM.btnToggleManual) {
        DOM.btnToggleManual.style.display = 'flex';
        DOM.btnToggleManual.classList.remove('active');
      }
      if (DOM.manualDialerSection) {
        DOM.manualDialerSection.style.display = 'none';
      }
      if (DOM.callInfoCampaign) {
        DOM.callInfoCampaign.style.display = 'none';
      }
      if (DOM.qualificationsCampaign) {
        DOM.qualificationsCampaign.style.display = 'none';
      }
      break;
      
    case AgentStatus.ON_MANUAL_CALL:
      // Agente está realizando uma chamada manual (discando)
      console.log('📱 Agente em chamada manual (discando)');
      handleAgentEnteredManual();
      break;
      
    case AgentStatus.ON_MANUAL_CALL_CONNECTED:
    case AgentStatus.MANUAL_CALL_CONNECTED:
      // Agente está em chamada manual conectada
      console.log('📞 Agente em chamada manual conectada');
      AppState.isManualMode = true;
      // Mantém o modo manual ativo
      if (DOM.manualDialerSection) {
        DOM.manualDialerSection.style.display = 'block';
      }
      if (DOM.btnToggleManual) {
        DOM.btnToggleManual.classList.add('active');
      }
      break;
      
    case AgentStatus.ON_CALL:
      // Agente está em chamada (automática)
      console.log('📞 Agente em chamada automática');
      break;
      
    case AgentStatus.ACW:
    case AgentStatus.ON_MANUAL_CALL_ACW:
      // Agente está em pós atendimento
      console.log('📝 Agente em pós atendimento');
      // Mantém qualificações visíveis se houver
      break;
      
    case AgentStatus.ON_WORK_BREAK:
      // Agente está em intervalo
      console.log('☕ Agente em intervalo');
      showToast('Em intervalo', 'info');
      break;
      
    case AgentStatus.OFFLINE:
      // Agente offline
      console.log('🔴 Agente offline');
      break;
      
    default:
      console.log(`❓ Status desconhecido: ${agentStatus}`);
  }
  
  // Atualiza o status na UI (se houver elemento)
  updateAgentStatusUI(agentStatus, statusLabel);
}

/**
 * Atualiza a UI com o status do agente
 */
function updateAgentStatusUI(status, label) {
  // Pode ser usado para mostrar o status em algum lugar da interface
  const statusElement = document.getElementById('agent-status-label');
  if (statusElement) {
    statusElement.textContent = label;
  }
  
  // Armazena o status atual
  AppState.agentStatus = status;
}

/**
 * Processa evento de agente entrou em modo manual
 * Mostra o discador inline na tela da campanha
 */
function handleAgentEnteredManual() {
  // Se já está no modo manual, não faz nada
  if (AppState.isManualMode) return;
  
  AppState.isManualMode = true;
  
  // Esconde a mensagem de "Aguardando chamadas"
  if (DOM.campaignStatusInfo) {
    DOM.campaignStatusInfo.style.display = 'none';
  }
  
  // Mostra o discador inline
  if (DOM.manualDialerSection) {
    DOM.manualDialerSection.style.display = 'block';
  }
  
  // Atualiza o botão
  if (DOM.btnToggleManual) {
    DOM.btnToggleManual.classList.add('active');
  }
  
  showToast('Modo manual ativado!', 'success');
  
  // Foca no input de telefone
  setTimeout(() => {
    if (DOM.phoneInputCampaign) DOM.phoneInputCampaign.focus();
  }, 100);
}

/**
 * Processa evento de chamada manual atendida
 * Mostra as qualificações disponíveis
 */
function handleManualCallAnswered(data) {
  console.log('📞 manual-call-was-answered data:', data);
  
  // Tenta buscar qualificações de diferentes lugares no payload
  const qualification = data?.qualification || data;
  const qualifications = qualification?.qualifications || data?.qualifications || [];
  
  console.log('📋 Qualificações encontradas:', qualifications);
  
  // Armazena qualificações
  if (qualifications.length > 0) {
    AppState.qualifications = qualifications;
  }
  
  // Atualiza info da chamada se disponível
  if (data?.call) {
    AppState.currentCall = {
      ...AppState.currentCall,
      id: data.call.id || AppState.currentCall?.id,
      phone: data.call.phone || data.call.number || AppState.currentCall?.phone
    };
  }
  
  // Mostra qualificações (usa as armazenadas se não vieram no evento)
  const qualsToShow = qualifications.length > 0 ? qualifications : AppState.qualifications;
  
  if (qualsToShow && qualsToShow.length > 0) {
    renderQualificationsInline(qualsToShow);
    showToast('Chamada atendida! Selecione uma qualificação.', 'info');
  } else {
    console.warn('⚠️ Nenhuma qualificação disponível');
    showToast('Chamada atendida!', 'success');
  }
  
  // Reabilita o botão de ligar (a chamada foi atendida, pode fazer outra depois)
  if (DOM.dialBtnCampaign) {
    DOM.dialBtnCampaign.disabled = false;
    DOM.dialBtnCampaign.innerHTML = '📞 Ligar';
  }
}

/**
 * Processa evento de histórico de chamada criado
 * Mostra as qualificações se a chamada ainda não foi qualificada
 */
function handleCallHistoryCreated(data) {
  const { qualification, call } = data || {};
  
  // Verifica se já foi qualificada
  if (call?.qualified || call?.qualification_id) {
    console.log('Chamada já foi qualificada, ignorando...');
    return;
  }
  
  // Processa qualificações
  const qualifications = qualification?.qualifications || [];
  AppState.qualifications = qualifications;
  
  if (qualifications.length > 0) {
    renderQualificationsInline(qualifications);
    showToast('Qualifique a chamada', 'info');
  }
}

/**
 * Processa evento de chamada conectada
 */
function handleCallConnected(data) {
  console.log('📞 call-was-connected data:', data);
  
  const { call, agent, qualification, campaign } = data || {};
  
  AppState.currentCall = {
    id: call?.id,
    phone: call?.phone || call?.number,
    agentName: agent?.name,
    campaignName: campaign?.name || AppState.currentCampaign?.name || 'N/A'
  };
  
  // Esconde elementos que não são necessários durante a chamada
  if (DOM.campaignStatusInfo) {
    DOM.campaignStatusInfo.style.display = 'none';
  }
  if (DOM.btnToggleManual) {
    DOM.btnToggleManual.style.display = 'none';
  }
  if (DOM.manualDialerSection) {
    DOM.manualDialerSection.style.display = 'none';
  }
  
  // Atualiza a UI com informações da chamada (inline)
  if (DOM.callPhoneCampaign) {
    DOM.callPhoneCampaign.textContent = formatPhone(AppState.currentCall.phone);
  }
  if (DOM.callIdCampaign) {
    DOM.callIdCampaign.textContent = AppState.currentCall.id || '--';
  }
  
  // Inicia o timer de duração
  startCallTimerInline();
  
  // Exibe o painel de chamada inline
  if (DOM.callInfoCampaign) {
    DOM.callInfoCampaign.style.display = 'block';
  }
  
  // IMPORTANTE: NÃO mostra qualificações aqui!
  // As qualificações só aparecem após:
  // - manual-call-was-answered (chamada manual atendida)
  // - call-history-was-created (histórico criado, se não qualificada)
  
  // Armazena qualificações para uso posterior
  const qualifications = qualification?.qualifications || [];
  if (qualifications.length > 0) {
    AppState.qualifications = qualifications;
    console.log('📋 Qualificações armazenadas:', qualifications.length);
  }
  
  showToast('Chamada conectada!', 'success');
}

/**
 * Processa evento de chamada finalizada
 */
function handleCallFinished(data) {
  stopCallTimer();
  
  // Mantém as qualificações visíveis para permitir qualificação pós-chamada
  if (AppState.currentCall) {
    showToast('Chamada finalizada. Selecione uma qualificação.', 'warning');
  }
  
  // Reabilita o botão de ligar (inline)
  if (DOM.dialBtnCampaign) {
    DOM.dialBtnCampaign.disabled = false;
    DOM.dialBtnCampaign.innerHTML = '📞 Ligar';
  }
}

/**
 * Inicia o timer de duração da chamada
 */
/**
 * Inicia o timer de duração da chamada
 */
function startCallTimerInline() {
  AppState.callStartTime = Date.now();
  
  if (AppState.callDurationInterval) {
    clearInterval(AppState.callDurationInterval);
  }
  
  AppState.callDurationInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - AppState.callStartTime) / 1000);
    if (DOM.callDurationCampaign) DOM.callDurationCampaign.textContent = formatDuration(elapsed);
  }, 1000);
}

/**
 * Para o timer de duração
 */
function stopCallTimer() {
  if (AppState.callDurationInterval) {
    clearInterval(AppState.callDurationInterval);
    AppState.callDurationInterval = null;
  }
}

// ============================================================================
// UI - Campanhas
// ============================================================================

/**
 * Carrega e renderiza as campanhas
 */
async function loadCampaigns() {
  DOM.loadingCampaigns.style.display = 'block';
  DOM.campaignList.style.display = 'none';
  
  try {
    const campaigns = await fetchCampaigns();
    AppState.campaigns = campaigns;
    renderCampaigns(campaigns);
  } catch (error) {
    console.error('Erro ao carregar campanhas:', error);
    showToast('Erro ao carregar campanhas: ' + error.message, 'error');
    DOM.loadingCampaigns.innerHTML = `
      <p style="color: var(--accent-red);">Erro ao carregar campanhas</p>
      <button class="btn btn-secondary" onclick="loadCampaigns()" style="margin-top: 1rem;">
        Tentar novamente
      </button>
    `;
  }
}

/**
 * Renderiza a lista de campanhas
 */
function renderCampaigns(campaigns) {
  DOM.loadingCampaigns.style.display = 'none';
  DOM.campaignList.style.display = 'flex';
  
  if (campaigns.length === 0) {
    DOM.campaignList.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <p>Nenhuma campanha disponível</p>
      </div>
    `;
    return;
  }
  
  DOM.campaignList.innerHTML = campaigns.map(campaign => `
    <div class="campaign-item" onclick="handleSelectCampaign(${campaign.id}, '${campaign.name.replace(/'/g, "\\'")}')">
      <div class="campaign-info">
        <div class="campaign-icon">📢</div>
        <div>
          <div class="campaign-name">${campaign.name}</div>
          <div class="campaign-id">ID: ${campaign.id}</div>
        </div>
      </div>
      <div class="campaign-arrow">→</div>
    </div>
  `).join('');
}

// Expõe globalmente
window.handleSelectCampaign = handleSelectCampaign;

// ============================================================================
// UI - Modo Manual Inline (na tela da campanha)
// ============================================================================

/**
 * Toggle do modo manual (mostra/esconde o discador inline)
 */
async function toggleManualMode() {
  if (AppState.isManualMode) {
    // Sair do modo manual
    await handleExitManualModeInline();
  } else {
    // Entrar no modo manual
    await handleEnterManualModeInline();
  }
}

// Expõe globalmente
window.toggleManualMode = toggleManualMode;

/**
 * Entra em modo manual (inline)
 */
async function handleEnterManualModeInline() {
  showToast('Entrando em modo manual...', 'info');
  
  try {
    await manualCallEnter();
    
    // O evento agent-entered-manual vai mostrar o discador
    // Mas podemos mostrar imediatamente também
    AppState.isManualMode = true;
    
    if (DOM.manualDialerSection) {
      DOM.manualDialerSection.style.display = 'block';
    }
    if (DOM.btnToggleManual) {
      DOM.btnToggleManual.classList.add('active');
    }
    
    showToast('Modo manual ativado!', 'success');
    addEventLog('manual-enter', 'Entrou em modo manual');
    
    setTimeout(() => {
      if (DOM.phoneInputCampaign) DOM.phoneInputCampaign.focus();
    }, 100);
    
  } catch (error) {
    console.error('Erro ao entrar em modo manual:', error);
    showToast('Erro ao entrar em modo manual: ' + error.message, 'error');
  }
}

/**
 * Sai do modo manual (inline)
 */
async function handleExitManualModeInline() {
  showToast('Saindo do modo manual...', 'info');
  
  try {
    await manualCallExit();
    
    AppState.isManualMode = false;
    
    // Esconde o discador
    if (DOM.manualDialerSection) {
      DOM.manualDialerSection.style.display = 'none';
    }
    if (DOM.btnToggleManual) {
      DOM.btnToggleManual.classList.remove('active');
    }
    
    // Limpa o input
    if (DOM.phoneInputCampaign) {
      DOM.phoneInputCampaign.value = '';
    }
    
    showToast('Saiu do modo manual', 'success');
    addEventLog('manual-exit', 'Saiu do modo manual');
    
  } catch (error) {
    console.error('Erro ao sair do modo manual:', error);
    showToast('Erro ao sair do modo manual: ' + error.message, 'error');
  }
}

/**
 * Disca do modo manual inline
 */
async function handleDialFromCampaign() {
  const phoneInput = DOM.phoneInputCampaign;
  const dialBtn = DOM.dialBtnCampaign;
  
  if (!phoneInput || !dialBtn) return;
  
  const phone = cleanPhone(phoneInput.value);
  
  if (!phone || phone.length < 10) {
    showToast('Digite um número válido', 'error');
    phoneInput.focus();
    return;
  }
  
  dialBtn.disabled = true;
  dialBtn.innerHTML = '<span class="spinner"></span> Discando...';
  
  try {
    await manualCallDial(phone);
    
    addEventLog('manual-dial', `Discando: ${formatPhone(phone)}`);
    showToast('Discando...', 'info');
    
    // Limpa o input
    phoneInput.value = '';
    
  } catch (error) {
    console.error('Erro ao discar:', error);
    showToast('Erro ao discar: ' + error.message, 'error');
    dialBtn.disabled = false;
    dialBtn.innerHTML = '📞 Ligar';
  }
}

// Expõe globalmente
window.handleDialFromCampaign = handleDialFromCampaign;

/**
 * Desliga a chamada atual
 */
async function handleHangup() {
  if (!AppState.currentCall?.id) {
    showToast('Nenhuma chamada ativa', 'error');
    return;
  }
  
  const hangupBtn = document.getElementById('hangup-btn');
  if (hangupBtn) {
    hangupBtn.disabled = true;
    hangupBtn.innerHTML = '📞 Desligando...';
  }
  
  try {
    await callHangup(AppState.currentCall.id);
    
    showToast('Chamada encerrada', 'success');
    addEventLog('call-hangup', `Chamada ${AppState.currentCall.id} desligada`);
    
  } catch (error) {
    console.error('Erro ao desligar:', error);
    showToast('Erro ao desligar: ' + error.message, 'error');
    
    if (hangupBtn) {
      hangupBtn.disabled = false;
      hangupBtn.innerHTML = '📞 Desligar';
    }
  }
}

// Expõe globalmente
window.handleHangup = handleHangup;

/**
 * Envia qualificação do modo inline
 */
async function handleSendQualificationFromCampaign() {
  if (!AppState.selectedQualification || !AppState.currentCall?.id) {
    showToast('Selecione uma qualificação', 'error');
    return;
  }
  
  const btn = DOM.sendQualificationBtnCampaign;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Enviando...';
  }
  
  try {
    await sendQualification(AppState.currentCall.id, AppState.selectedQualification);
    
    showToast('Qualificação enviada com sucesso!', 'success');
    addEventLog('qualification-sent', `Qualificação ID: ${AppState.selectedQualification}`);
    
    // Reseta o estado da chamada
    resetCallStateInline();
    
  } catch (error) {
    console.error('Erro ao enviar qualificação:', error);
    showToast('Erro ao enviar qualificação: ' + error.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Enviar Qualificação';
    }
  }
}

// Expõe globalmente
window.handleSendQualificationFromCampaign = handleSendQualificationFromCampaign;

/**
 * Reseta o estado da chamada (inline)
 */
function resetCallStateInline() {
  stopCallTimer();
  
  AppState.currentCall = null;
  AppState.qualifications = [];
  AppState.selectedQualification = null;
  
  // Esconde painéis inline
  if (DOM.callInfoCampaign) DOM.callInfoCampaign.style.display = 'none';
  if (DOM.qualificationsCampaign) DOM.qualificationsCampaign.style.display = 'none';
  if (DOM.qualificationListCampaign) DOM.qualificationListCampaign.innerHTML = '';
  
  // Reseta botão de qualificação
  if (DOM.sendQualificationBtnCampaign) {
    DOM.sendQualificationBtnCampaign.disabled = true;
    DOM.sendQualificationBtnCampaign.textContent = 'Enviar Qualificação';
  }
  
  // Reabilita botão de ligar
  if (DOM.dialBtnCampaign) {
    DOM.dialBtnCampaign.disabled = false;
    DOM.dialBtnCampaign.innerHTML = '📞 Ligar';
  }
  
  // Restaura a UI
  // Se ainda está em modo manual, mostra o discador
  if (AppState.isManualMode) {
    if (DOM.manualDialerSection) DOM.manualDialerSection.style.display = 'block';
    if (DOM.btnToggleManual) DOM.btnToggleManual.style.display = 'flex';
  } else {
    // Se não está em modo manual, mostra a mensagem de aguardando
    if (DOM.campaignStatusInfo) DOM.campaignStatusInfo.style.display = 'block';
    if (DOM.btnToggleManual) DOM.btnToggleManual.style.display = 'flex';
  }
}

/**
 * Seleciona uma campanha e faz login do agente
 */
async function handleSelectCampaign(campaignId, campaignName) {
  showToast('Entrando na campanha...', 'info');
  
  // Desabilita cliques enquanto processa
  DOM.campaignList.style.pointerEvents = 'none';
  
  try {
    // Faz a requisição HTTP
    await agentLogin(campaignId);
    
    // Aguarda confirmação via socket (agent-is-idle = sucesso, agent-login-failed = falha)
    const result = await waitForSocketEvent(
      [SocketEvents.AGENT_IS_IDLE, SocketEvents.AGENT_IS_CONNECTED],
      [SocketEvents.AGENT_LOGIN_FAILED],
      8000,
      (event, data) => {
        const eventExtension = getAgentExtensionFromEvent(data);
        if (!eventExtension || !AppState.extension) return false;
        return String(eventExtension) === String(AppState.extension);
      }
    );
    
    // Se chegou aqui, foi sucesso (ou timeout sem erro)
    AppState.currentCampaign = { id: campaignId, name: campaignName };
    DOM.activeCampaignName.textContent = campaignName;
    
    showSection('campaign-active-section');
    showToast(`Conectado à campanha: ${campaignName}`, 'success');
    addEventLog('agent-login', `Entrou na campanha: ${campaignName}`);
    
  } catch (error) {
    console.error('Erro ao entrar na campanha:', error);
    showToast('Falha ao entrar na campanha: ' + error.message, 'error');
    AppState.currentCampaign = null;
  } finally {
    DOM.campaignList.style.pointerEvents = 'auto';
  }
}

/**
 * Sai da campanha atual
 */
async function handleLeaveCampaign() {
  try {
    await agentLogout();
    
    AppState.currentCampaign = null;
    AppState.isManualMode = false;
    
    showSection('campaigns-section');
    showToast('Saiu da campanha', 'info');
    addEventLog('agent-logout', 'Saiu da campanha');
    
    // Recarrega campanhas
    loadCampaigns();
    
  } catch (error) {
    console.error('Erro ao sair da campanha:', error);
    showToast('Erro ao sair da campanha: ' + error.message, 'error');
  }
}

// Expõe globalmente
window.handleLeaveCampaign = handleLeaveCampaign;

// ============================================================================
// UI - Log de Eventos
// ============================================================================
function renderQualificationsInline(qualifications) {
  if (!DOM.qualificationListCampaign) return;
  
  DOM.qualificationListCampaign.innerHTML = qualifications.map(q => `
    <div class="qualification-item" data-id="${q.id}" onclick="selectQualificationInline(${q.id})">
      <div class="qualification-radio"></div>
      <div>
        <div class="qualification-name">${q.name}</div>
        <div class="qualification-id">ID: ${q.id}</div>
      </div>
    </div>
  `).join('');
  
  // Mostra a seção de qualificações
  if (DOM.qualificationsCampaign) {
    DOM.qualificationsCampaign.style.display = 'block';
  }
  
  AppState.selectedQualification = null;
  if (DOM.sendQualificationBtnCampaign) DOM.sendQualificationBtnCampaign.disabled = true;
}

/**
 * Seleciona uma qualificação (inline)
 */
function selectQualificationInline(id) {
  AppState.selectedQualification = id;
  
  // Atualiza UI
  const container = DOM.qualificationListCampaign;
  if (container) {
    container.querySelectorAll('.qualification-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    const selectedItem = container.querySelector(`.qualification-item[data-id="${id}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
    }
  }
  
  if (DOM.sendQualificationBtnCampaign) {
    DOM.sendQualificationBtnCampaign.disabled = false;
  }
}

// Expõe globalmente
window.selectQualificationInline = selectQualificationInline;

// ============================================================================
// UI - Log de Eventos
// ============================================================================

/**
 * Adiciona um evento ao log
 */
function addEventLog(eventType, data) {
  const eventItem = document.createElement('div');
  eventItem.className = 'event-item';
  eventItem.innerHTML = `
    <span class="event-time">${formatTime()}</span>
    <span class="event-type">${eventType}</span>
    <span class="event-data">${data || ''}</span>
  `;
  
  // Adiciona no log
  if (DOM.eventsLog) {
    DOM.eventsLog.insertBefore(eventItem, DOM.eventsLog.firstChild);
    while (DOM.eventsLog.children.length > 50) {
      DOM.eventsLog.removeChild(DOM.eventsLog.lastChild);
    }
  }
}

/**
 * Atualiza o header com informações do usuário
 */
function updateHeaderWithUser() {
  // Remove info anterior se existir
  const existingInfo = DOM.headerRight.querySelector('.user-info');
  if (existingInfo) existingInfo.remove();
  
  const userInfo = document.createElement('div');
  userInfo.className = 'user-info';
  userInfo.innerHTML = `
    <div class="user-details">
      <div class="user-name">${AppState.userName}</div>
      <div class="user-company">${AppState.companyName}</div>
    </div>
    <button class="btn btn-danger btn-sm" onclick="handleLogout()">
      Sair
    </button>
  `;
  
  DOM.headerRight.insertBefore(userInfo, DOM.connectionStatus);
}

// ============================================================================
// Autenticação e Logout
// ============================================================================

/**
 * Processa o login
 */
async function handleLogin(e) {
  e.preventDefault();
  
  const domain = DOM.domainInput.value.trim();
  const extension = DOM.extensionInput.value.trim();
  const password = DOM.passwordInput.value;
  
  if (!domain || !extension || !password) {
    showToast('Preencha todos os campos', 'error');
    return;
  }
  
  DOM.loginBtn.disabled = true;
  DOM.loginBtn.innerHTML = '<span class="spinner"></span> Conectando...';
  
  try {
    AppState.extension = extension;
    await authenticate(domain, extension, password);
    
    showToast('Autenticação realizada com sucesso!', 'success');
    
    // Atualiza header
    updateHeaderWithUser();
    
    // Carrega SIP Extension
    loadSipExtension();
    
    // Conecta ao WebSocket
    connectSocket();
    
    // Vai para seleção de campanhas
    showSection('campaigns-section');
    loadCampaigns();
    
  } catch (error) {
    console.error('Erro ao autenticar:', error);
    showToast('Erro ao autenticar: ' + error.message, 'error');
    DOM.loginBtn.disabled = false;
    DOM.loginBtn.textContent = 'Conectar';
  }
}

/**
 * Processa o logout
 */
async function handleLogout() {
  // Tenta fazer logout do agente se estiver em campanha
  if (AppState.currentCampaign) {
    try {
      await agentLogout();
    } catch (e) {
      console.warn('Erro ao fazer logout do agente:', e);
    }
  }
  
  // Desconecta o socket
  if (AppState.socket) {
    AppState.socket.disconnect();
  }
  
  // Descarrega o iframe do SIP Extension
  unloadSipExtension();
  
  // Limpa o estado
  AppState.token = null;
  AppState.domain = null;
  AppState.userName = null;
  AppState.companyName = null;
  AppState.socket = null;
  AppState.isConnected = false;
  AppState.campaigns = [];
  AppState.currentCampaign = null;
  AppState.isManualMode = false;
  
  resetCallState();
  
  // Remove user info do header
  const userInfo = DOM.headerRight.querySelector('.user-info');
  if (userInfo) userInfo.remove();
  
  // Reseta o status
  updateStatusBadge('disconnected');
  
  // Limpa o formulário
  DOM.loginForm.reset();
  DOM.loginBtn.disabled = false;
  DOM.loginBtn.textContent = 'Conectar';
  
  // Limpa eventos
  if (DOM.eventsLog) DOM.eventsLog.innerHTML = '';
  
  // Volta para login
  showSection('login-section');
  
  showToast('Desconectado com sucesso', 'info');
}

// Expõe globalmente
window.handleLogout = handleLogout;

// ============================================================================
// Inicialização
// ============================================================================

function init() {
  // Event listeners
  DOM.loginForm.addEventListener('submit', handleLogin);
  
  // Enter no input de telefone (inline na campanha)
  if (DOM.phoneInputCampaign) {
    DOM.phoneInputCampaign.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleDialFromCampaign();
      }
    });
    
    // Máscara simples para o telefone
    DOM.phoneInputCampaign.addEventListener('input', applyPhoneMask);
  }
  
  console.log('🚀 3C Plus Operador inicializado!');
}

/**
 * Aplica máscara de telefone no input
 */
function applyPhoneMask(e) {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 11) value = value.slice(0, 11);
  
  if (value.length > 6) {
    value = `(${value.slice(0,2)}) ${value.slice(2,7)}-${value.slice(7)}`;
  } else if (value.length > 2) {
    value = `(${value.slice(0,2)}) ${value.slice(2)}`;
  } else if (value.length > 0) {
    value = `(${value}`;
  }
  
  e.target.value = value;
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);
