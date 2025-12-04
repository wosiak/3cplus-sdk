// src/socket/SocketHandler.js
const { SocketEvents } = require('./SocketEvents');

function setupSocketListeners(socket) {
  socket.onAny((event, data) => {
    console.log(`📡 Evento recebido: ${event}`);

    switch (event) {
      case SocketEvents.CALL_WAS_CONNECTED:
        const { call, agent } = data || {};
        console.log('Chamada conectada!');
        console.log(`Número: ${call?.phone}`);
        console.log(`ID da Chamada: ${call?.id}`);
        console.log(`Agente: ${agent?.name}`);

        const qualifications = data?.qualification?.qualifications;

        if (qualifications && qualifications.length > 0) {
          console.log(`\n📋 Qualificações disponíveis (${qualifications.length}):`);
          qualifications.forEach((q, index) => {
            console.log(`${index + 1}. [${q.id}] ${q.name}`);
          });
        } else {
          console.log('Nenhuma qualificação disponível para esta chamada.');
        }
      break;

      case SocketEvents.AGENT_ENTERED_WORK_BREAK:
        console.log('Agente entrou em intervalo.');
        break;

      default:
        console.log('Evento não tratado especificamente:', event);
    }
  });

  socket.on('connect', () => {
    console.log('✅ Conectado ao WebSocket!');
  });

  socket.on('error', (err) => {
    console.error('❌ Erro no WebSocket:', err.message);
  });
}

module.exports = { setupSocketListeners };