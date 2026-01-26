// src/socket/SocketHandler.js
const { SocketEvents } = require('./SocketEvents');

function setupSocketListeners(socket) {
  socket.onAny((event, data) => {
    switch (event) {
      case SocketEvents.CALL_WAS_CONNECTED:
        // Processa chamada conectada
        const { call, agent, qualification } = data || {};
        const qualifications = qualification?.qualifications || [];
        // Implemente sua lógica aqui
        break;

      case SocketEvents.AGENT_ENTERED_WORK_BREAK:
        // Agente entrou em intervalo
        break;

      default:
        // Outros eventos
        break;
    }
  });

  socket.on('connect', () => {
    // Conectado ao WebSocket
  });

  socket.on('error', (err) => {
    console.error('❌ Erro no WebSocket:', err.message);
  });
}

module.exports = { setupSocketListeners };