// src/socket/SocketTest.ts
import { FileTokenStorage } from '../storage/TokenStorage';
import { createSocket } from './SocketClient';
const { setupSocketListeners } = require('./SocketHandler');

const storage = new FileTokenStorage();
const auth = storage.getAuthData();

if (!auth) {
  console.error('⚠️ Token não encontrado. Execute authenticateTest.ts antes.');
  process.exit(1);
}

const socket = createSocket(auth.token);
setupSocketListeners(socket);